import {
  authenticateWithGoogle,
  authenticateWithFacebook,
  authenticateWithApple,
  authenticateWithTwitter,
  authenticateWithLinkedIn,
  authenticateWithInstagram,
} from "@/lib/actions";
import Image from "next/image";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { useState } from "react";

export function AuthenticateWith({ message, showLabels = false }) {
  const [isLoading, setIsLoading] = useState(null);

  const handleSocialLogin = async (provider, action) => {
    setIsLoading(provider);
    try {
      await action();
    } catch (error) {
      console.error(`Error logging in with ${provider}:`, error);
      setIsLoading(null);
    }
  };

  const socialProviders = [
    {
      name: "Google",
      icon: "/icons/google.svg",
      action: authenticateWithGoogle,
      bgColor: "bg-white hover:bg-gray-50",
      textColor: "text-gray-700",
      borderColor: "border-gray-300"
    },
    {
      name: "Facebook",
      icon: "/icons/facebook.svg",
      action: authenticateWithFacebook,
      bgColor: "bg-blue-600 hover:bg-blue-700",
      textColor: "text-white",
      borderColor: "border-blue-600"
    },
    {
      name: "Apple",
      icon: "/icons/apple.svg",
      action: authenticateWithApple,
      bgColor: "bg-black hover:bg-gray-800",
      textColor: "text-white",
      borderColor: "border-black"
    },
    {
      name: "Twitter",
      icon: "/icons/twitter.svg",
      action: authenticateWithTwitter,
      bgColor: "bg-sky-500 hover:bg-sky-600",
      textColor: "text-white",
      borderColor: "border-sky-500"
    },
    {
      name: "LinkedIn",
      icon: "/icons/linkedin.svg",
      action: authenticateWithLinkedIn,
      bgColor: "bg-blue-700 hover:bg-blue-800",
      textColor: "text-white",
      borderColor: "border-blue-700"
    },
    {
      name: "Instagram",
      icon: "/icons/instagram.svg",
      action: authenticateWithInstagram,
      bgColor: "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600",
      textColor: "text-white",
      borderColor: "border-purple-500"
    }
  ];

  return (
    <>
      <div className="relative h-auto">
        {message && (
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-400 text-sm inline-block bg-white rounded-lg px-3 py-1">
            {message}
          </span>
        )}
        <Separator className="my-10" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {socialProviders.map((provider) => (
          <Button
            key={provider.name}
            className={`w-full ${provider.bgColor} ${provider.textColor} ${provider.borderColor} border-2 transition-all duration-200 flex items-center justify-center gap-2`}
            variant="outline"
            onClick={() => handleSocialLogin(provider.name.toLowerCase(), provider.action)}
            disabled={isLoading !== null}
            type="button"
          >
            <Image
              src={provider.icon}
              alt={`${provider.name.toLowerCase()}_icon`}
              height={20}
              width={20}
              className="object-contain"
            />
            {showLabels && (
              <span className="text-sm font-medium">
                {isLoading === provider.name.toLowerCase() ? `Connecting...` : `Continue with ${provider.name}`}
              </span>
            )}
            {isLoading === provider.name.toLowerCase() && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current ml-2"></div>
            )}
          </Button>
        ))}
      </div>
      
      {/* Additional social login options */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 mb-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-xs">
          <button className="text-blue-600 hover:text-blue-800 underline" onClick={() => handleSocialLogin('google', authenticateWithGoogle)}>
            Google
          </button>
          <button className="text-blue-600 hover:text-blue-800 underline" onClick={() => handleSocialLogin('facebook', authenticateWithFacebook)}>
            Facebook
          </button>
          <button className="text-gray-800 hover:text-black underline" onClick={() => handleSocialLogin('apple', authenticateWithApple)}>
            Apple
          </button>
          <button className="text-sky-600 hover:text-sky-800 underline" onClick={() => handleSocialLogin('twitter', authenticateWithTwitter)}>
            Twitter/X
          </button>
          <button className="text-blue-700 hover:text-blue-900 underline" onClick={() => handleSocialLogin('linkedin', authenticateWithLinkedIn)}>
            LinkedIn
          </button>
          <button className="text-purple-600 hover:text-purple-800 underline" onClick={() => handleSocialLogin('instagram', authenticateWithInstagram)}>
            Instagram
          </button>
        </div>
      </div>
    </>
  );
}
