"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Switch } from "../ui/switch";
import { toast } from "sonner";
import Image from "next/image";
import {
  authenticateWithGoogle,
  authenticateWithFacebook,
  authenticateWithApple,
  authenticateWithTwitter,
  authenticateWithLinkedIn,
  authenticateWithInstagram,
} from "@/lib/actions";

const socialProviders = [
  {
    name: "Google",
    id: "google",
    icon: "/icons/google.svg",
    color: "bg-blue-500",
    description: "Link your Google account for seamless login"
  },
  {
    name: "Facebook",
    id: "facebook",
    icon: "/icons/facebook.svg",
    color: "bg-blue-600",
    description: "Connect your Facebook profile"
  },
  {
    name: "Apple",
    id: "apple",
    icon: "/icons/apple.svg",
    color: "bg-gray-800",
    description: "Sign in with Apple ID"
  },
  {
    name: "Twitter/X",
    id: "twitter",
    icon: "/icons/twitter-black.svg",
    color: "bg-sky-500",
    description: "Link your Twitter/X account"
  },
  {
    name: "LinkedIn",
    id: "linkedin",
    icon: "/icons/linkedin.svg",
    color: "bg-blue-700",
    description: "Connect your professional LinkedIn profile"
  },
  {
    name: "Instagram",
    id: "instagram",
    icon: "/icons/instagram-black.svg",
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
    description: "Link your Instagram account"
  }
];

const authenticateActions = {
  google: authenticateWithGoogle,
  facebook: authenticateWithFacebook,
  apple: authenticateWithApple,
  twitter: authenticateWithTwitter,
  linkedin: authenticateWithLinkedIn,
  instagram: authenticateWithInstagram,
};

export function SocialAccountLinking({ linkedProviders = [], onLinkSuccess, onUnlinkSuccess }) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(null);
  const [linkedAccounts, setLinkedAccounts] = useState(linkedProviders);

  useEffect(() => {
    setLinkedAccounts(linkedProviders);
  }, [linkedProviders]);

  const handleLinkAccount = async (providerId) => {
    setIsLoading(providerId);
    try {
      const action = authenticateActions[providerId];
      if (action) {
        await action();
        toast.success(`${socialProviders.find(p => p.id === providerId)?.name} account linked successfully!`);
        onLinkSuccess?.(providerId);
      }
    } catch (error) {
      console.error(`Error linking ${providerId} account:`, error);
      toast.error(`Failed to link ${socialProviders.find(p => p.id === providerId)?.name} account`);
    } finally {
      setIsLoading(null);
    }
  };

  const handleUnlinkAccount = async (providerId) => {
    if (!confirm(`Are you sure you want to unlink your ${socialProviders.find(p => p.id === providerId)?.name} account?`)) {
      return;
    }

    setIsLoading(providerId);
    try {
      // API call to unlink account would go here
      // await unlinkSocialAccount(providerId);
      
      setLinkedAccounts(prev => prev.filter(p => p.provider !== providerId));
      toast.success(`${socialProviders.find(p => p.id === providerId)?.name} account unlinked successfully`);
      onUnlinkSuccess?.(providerId);
    } catch (error) {
      console.error(`Error unlinking ${providerId} account:`, error);
      toast.error(`Failed to unlink ${socialProviders.find(p => p.id === providerId)?.name} account`);
    } finally {
      setIsLoading(null);
    }
  };

  const isProviderLinked = (providerId) => {
    return linkedAccounts.some(account => account.provider === providerId);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Linked Social Accounts</CardTitle>
          <CardDescription>
            Connect your social media accounts for easier login and enhanced profile features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {socialProviders.map((provider) => {
            const isLinked = isProviderLinked(provider.id);
            const linkedAccount = linkedAccounts.find(account => account.provider === provider.id);
            
            return (
              <div key={provider.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full ${provider.color} flex items-center justify-center`}>
                    <Image
                      src={provider.icon}
                      alt={provider.name}
                      width={20}
                      height={20}
                      className="object-contain filter brightness-0 invert"
                    />
                  </div>
                  <div>
                    <h4 className="font-medium">{provider.name}</h4>
                    <p className="text-sm text-gray-500">{provider.description}</p>
                    {isLinked && linkedAccount && (
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          Linked
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {new Date(linkedAccount.linkedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isLinked ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnlinkAccount(provider.id)}
                      disabled={isLoading !== null}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {isLoading === provider.id ? "Unlinking..." : "Unlink"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLinkAccount(provider.id)}
                      disabled={isLoading !== null}
                    >
                      {isLoading === provider.id ? "Linking..." : "Link"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Social Login Preferences</CardTitle>
          <CardDescription>
            Manage how you use your social accounts for login
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Enable Social Login</h4>
              <p className="text-sm text-gray-500">
                Allow users to log in with linked social accounts
              </p>
            </div>
            <Switch defaultChecked={true} />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Profile Synchronization</h4>
              <p className="text-sm text-gray-500">
                Automatically sync profile data from social accounts
              </p>
            </div>
            <Switch defaultChecked={true} />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Social Sharing</h4>
              <p className="text-sm text-gray-500">
                Share travel updates on linked social accounts
              </p>
            </div>
            <Switch defaultChecked={false} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Security</CardTitle>
          <CardDescription>
            Manage security settings for your linked accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Two-Factor Authentication</h4>
              <p className="text-sm text-gray-500">
                Require 2FA for social logins
              </p>
            </div>
            <Switch defaultChecked={false} />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Login Notifications</h4>
              <p className="text-sm text-gray-500">
                Get notified when someone logs in with your social account
              </p>
            </div>
            <Switch defaultChecked={true} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}