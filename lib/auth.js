import NextAuth from "next-auth";
import MongoDBAdapter from "./db/MongoDBAdapter";
import authConfig from "../auth.config";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import TwitterProvider from "next-auth/providers/twitter";
import LinkedInProvider from "next-auth/providers/linkedin";
import InstagramProvider from "next-auth/providers/instagram";
import CredentialProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { createOneDoc } from "./db/createOperationDB";
import { getOneDoc } from "./db/getOperationDB";
import { updateOneDoc } from "./db/updateOperationDB";
import { deleteOneDoc } from "./db/deleteOperationDB";
import mongoose from "mongoose";
import { strToObjectId } from "./db/utilsDB";

const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  cookies: {
    sessionToken: {
      name: "authjs.session_token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
      },
    },
  },
  session: {
    strategy: "database",
    jwt: false,
    maxAge: 60 * 60 * 24 * 30, //30 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  adapter: MongoDBAdapter,
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
        }
      }
    }),
    FacebookProvider({
      clientId: process.env.AUTH_FACEBOOK_ID,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET,
      authorization: {
        params: {
          scope: "email,public_profile",
        }
      }
    }),
    AppleProvider({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
    }),
    TwitterProvider({
      clientId: process.env.AUTH_TWITTER_ID,
      clientSecret: process.env.AUTH_TWITTER_SECRET,
      version: "2.0", // Twitter API v2
      authorization: {
        params: {
          scope: "users.read tweet.read offline.access",
        }
      }
    }),
    LinkedInProvider({
      clientId: process.env.AUTH_LINKEDIN_ID,
      clientSecret: process.env.AUTH_LINKEDIN_SECRET,
      authorization: {
        params: {
          scope: "openid profile email",
        }
      }
    }),
    InstagramProvider({
      clientId: process.env.AUTH_INSTAGRAM_ID,
      clientSecret: process.env.AUTH_INSTAGRAM_SECRET,
      authorization: {
        params: {
          scope: "user_profile user_media",
        }
      }
    }),
    CredentialProvider(credentialProviderConfig()),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider === "credentials") {
        const expires = new Date(Date.now() + 60 * 60 * 24 * 30 * 1000);
        const sessionToken = randomUUID();
        const session = await createOneDoc("Session", {
          sessionToken,
          userId: new mongoose.Types.ObjectId(user._id),
          expires,
        });

        token.sessionId = session.sessionToken;
        return token;
      }
      
      // Handle social provider tokens
      if (account?.provider && account.provider !== "credentials") {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
      }
      
      return token;
    },

    async session({ session, user, token }) {
      session.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        provider: token.provider,
        providerAccountId: token.providerAccountId
      };
      
      // Add social profile information if available
      if (token.provider) {
        session.user.provider = token.provider;
        session.user.providerAccountId = token.providerAccountId;
      }
      
      return session;
    },

    async signIn({ user, account, profile }) {
      if (account?.provider && account.provider !== "credentials") {
        try {
          // Check if user already exists with this provider
          const existingUser = await getOneDoc("User", {
            email: user.email
          }, [], false);

          if (existingUser) {
            // Check if this provider is already linked to user
            const existingAccount = await getOneDoc("Account", {
              userId: strToObjectId(existingUser._id),
              provider: account.provider
            }, [], false);

            if (!existingAccount) {
              // Link new provider to existing user
              await createOneDoc("Account", {
                userId: strToObjectId(existingUser._id),
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                type: account.type,
                accessToken: account.access_token,
                refreshToken: account.refresh_token,
                scope: account.scope,
                idToken: account.id_token,
                sessionState: account.session_state,
                expiresAt: account.expires_at,
                tokenType: account.token_type
              });

              // Update user profile with social data
              await updateOneDoc("User",
                { _id: strToObjectId(existingUser._id) },
                {
                  $set: {
                    name: user.name || existingUser.name,
                    image: user.image || existingUser.image,
                    lastLoginProvider: account.provider,
                    updatedAt: new Date()
                  },
                  $push: {
                    linkedProviders: {
                      provider: account.provider,
                      providerAccountId: account.providerAccountId,
                      linkedAt: new Date()
                    }
                  }
                }
              );
            } else {
              // Update existing account with new tokens
              await updateOneDoc("Account",
                { _id: strToObjectId(existingAccount._id) },
                {
                  $set: {
                    accessToken: account.access_token,
                    refreshToken: account.refresh_token,
                    scope: account.scope,
                    idToken: account.id_token,
                    expiresAt: account.expires_at,
                    updatedAt: new Date()
                  }
                }
              );

              // Update last login provider
              await updateOneDoc("User",
                { _id: strToObjectId(existingUser._id) },
                {
                  $set: {
                    lastLoginProvider: account.provider,
                    updatedAt: new Date()
                  }
                }
              );
            }
          } else {
            // New user - create user and account
            const newUser = await createOneDoc("User", {
              email: user.email,
              name: user.name,
              image: user.image,
              emailVerified: new Date(),
              linkedProviders: [{
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                linkedAt: new Date()
              }],
              lastLoginProvider: account.provider,
              createdAt: new Date(),
              updatedAt: new Date()
            });

            await createOneDoc("Account", {
              userId: strToObjectId(newUser._id),
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              type: account.type,
              accessToken: account.access_token,
              refreshToken: account.refresh_token,
              scope: account.scope,
              idToken: account.id_token,
              sessionState: account.session_state,
              expiresAt: account.expires_at,
              tokenType: account.token_type
            });
          }

          return true;
        } catch (error) {
          console.error("Error in signIn callback:", error);
          return false;
        }
      }
      return true;
    },

    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 30,
    async encode(string) {
      // eslint-disable-next-line no-undef
      return string.token?.sessionId ?? encode(string);
    },
  },
  events: {
    async signOut({ session, token }) {
      if (session?.sessionToken) {
        await deleteOneDoc("Session", { sessionToken: session.sessionToken });
      }
      
      // Log social authentication events for analytics
      if (token?.provider && token?.providerAccountId) {
        console.log(`User signed out from ${token.provider} provider`);
        // Here you could add analytics tracking
      }
    },
    
    async signIn({ user, account, profile, isNewUser }) {
      // Track social authentication events for analytics
      if (account?.provider && account?.provider !== "credentials") {
        console.log(`User signed in with ${account.provider} provider`, {
          isNewUser,
          provider: account.provider,
          userId: user.id
        });
        
        // Here you could add analytics tracking
        // Example: trackSocialLogin(account.provider, user.id, isNewUser);
      }
    },
    
    async createUser({ user }) {
      console.log("New user created:", user.id);
      // Here you could add welcome email or onboarding flow
    },
  },
});

async function isLoggedIn() {
  try {
    return !!(await auth())?.user;
  } catch (error) {
    throw error;
  }
}

function credentialProviderConfig() {
  return {
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const userDetails = await getOneDoc(
        "User",
        { email: credentials.email.trim() },
        ["userDetails"],
        false,
      );
      if (!userDetails || !Object.keys(userDetails).length) {
        return null;
      }

      const userId = strToObjectId(userDetails._id);
      const { password } = await getOneDoc(
        "Account",
        {
          userId,
          provider: "credentials",
        },
        ["userAccount"],
        false,
      );
      const isValid = bcrypt.compareSync(credentials.password, password);
      if (isValid) {
        return userDetails;
      }
      return null;
    },
  };
}

export { handlers, auth, signIn, signOut, isLoggedIn };
