import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOneDoc, updateOneDoc, deleteOneDoc, createOneDoc } from "@/lib/db";
import { strToObjectId } from "@/lib/db/utilsDB";
import { revalidateTag } from "next/cache";

/**
 * GET /api/user/social-accounts
 * Get user's linked social accounts
 */
export async function GET(request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = strToObjectId(session.user.id);
    
    // Get all accounts linked to this user
    const accounts = await getOneDoc(
      "Account",
      { userId },
      [],
      false,
      { sort: { createdAt: -1 } }
    );

    // Get user profile with linked providers info
    const user = await getOneDoc(
      "User",
      { _id: userId },
      [],
      false
    );

    const linkedProviders = user?.linkedProviders || [];

    return NextResponse.json({
      success: true,
      data: {
        accounts: accounts || [],
        linkedProviders: linkedProviders,
        totalLinked: linkedProviders.length
      }
    });

  } catch (error) {
    console.error("Error fetching social accounts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/social-accounts
 * Link a new social account
 */
export async function POST(request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { provider, providerAccountId, accessToken, refreshToken, profile } = body;

    if (!provider || !providerAccountId) {
      return NextResponse.json(
        { error: "Provider and provider account ID are required" },
        { status: 400 }
      );
    }

    const userId = strToObjectId(session.user.id);

    // Check if this provider is already linked
    const existingAccount = await getOneDoc(
      "Account",
      { 
        userId,
        provider,
        providerAccountId
      },
      [],
      false
    );

    if (existingAccount) {
      return NextResponse.json(
        { error: "This social account is already linked" },
        { status: 409 }
      );
    }

    // Check if another user has already linked this account
    const otherUserAccount = await getOneDoc(
      "Account",
      { 
        provider,
        providerAccountId
      },
      [],
      false
    );

    if (otherUserAccount) {
      return NextResponse.json(
        { error: "This social account is already linked to another user" },
        { status: 409 }
      );
    }

    // Create new account link
    const newAccount = await createOneDoc("Account", {
      userId,
      provider,
      providerAccountId,
      type: "oauth",
      accessToken,
      refreshToken,
      scope: body.scope || null,
      idToken: body.idToken || null,
      expiresAt: body.expiresAt || null,
      tokenType: body.tokenType || "Bearer",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Update user's linked providers
    await updateOneDoc(
      "User",
      { _id: userId },
      {
        $push: {
          linkedProviders: {
            provider,
            providerAccountId,
            linkedAt: new Date(),
            profile: profile || null
          }
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );

    // Revalidate user profile cache
    revalidateTag(`user-${session.user.id}`);

    return NextResponse.json({
      success: true,
      data: {
        account: newAccount,
        message: `${provider} account linked successfully`
      }
    });

  } catch (error) {
    console.error("Error linking social account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/social-accounts
 * Unlink a social account
 */
export async function DELETE(request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");
    const providerAccountId = searchParams.get("providerAccountId");

    if (!provider) {
      return NextResponse.json(
        { error: "Provider is required" },
        { status: 400 }
      );
    }

    const userId = strToObjectId(session.user.id);

    // Find the account to unlink
    const accountToDelete = await getOneDoc(
      "Account",
      { 
        userId,
        provider,
        ...(providerAccountId && { providerAccountId })
      },
      [],
      false
    );

    if (!accountToDelete) {
      return NextResponse.json(
        { error: "Social account not found" },
        { status: 404 }
      );
    }

    // Check if this is the user's only login method
    const userAccounts = await getOneDoc(
      "Account",
      { userId },
      [],
      false
    );

    if (userAccounts.length <= 1) {
      return NextResponse.json(
        { 
          error: "Cannot unlink the only authentication method. Please add another login method first." 
        },
        { status: 400 }
      );
    }

    // Delete the account link
    await deleteOneDoc("Account", {
      _id: strToObjectId(accountToDelete._id)
    });

    // Update user's linked providers
    await updateOneDoc(
      "User",
      { _id: userId },
      {
        $pull: {
          linkedProviders: {
            provider,
            ...(providerAccountId && { providerAccountId })
          }
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );

    // Revalidate user profile cache
    revalidateTag(`user-${session.user.id}`);

    return NextResponse.json({
      success: true,
      data: {
        message: `${provider} account unlinked successfully`
      }
    });

  } catch (error) {
    console.error("Error unlinking social account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}