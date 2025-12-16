"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  Settings, 
  Shield, 
  FileText, 
  BarChart, 
  Users, 
  Smartphone, 
  Award, 
  Globe, 
  Lock, 
  Bell, 
  CreditCard, 
  Camera,
  Edit,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Star,
  MapPin,
  Calendar,
  Plane,
  Hotel,
  Heart,
  MessageCircle,
  Share2,
  Target,
  Zap,
  Crown,
  Diamond,
  Gem,
  Medal
} from "lucide-react";
import { format } from "date-fns";

// Import all the profile components
import { EnhancedProfileEditor } from "./EnhancedProfileEditor";
import { ProfileCompletionTracker } from "./ProfileCompletionTracker";
import { ProfileVerification } from "./ProfileVerification";
import { TravelPreferencesManager } from "./TravelPreferencesManager";
import { DocumentManager } from "./DocumentManager";
import { TravelAnalyticsDashboard } from "./TravelAnalyticsDashboard";
import { PrivacySecurityControls } from "./PrivacySecurityControls";
import { SocialTravelFeatures } from "./SocialTravelFeatures";
import { MobileProfileInterface } from "./MobileProfileInterface";
import { IntegrationFeatures } from "./IntegrationFeatures";
import { AdminProfileManagement } from "./AdminProfileManagement";

export function EnhancedProfileManagement({ 
  userProfile, 
  isAdmin = false,
  isMobile = false,
  onProfileUpdate,
  onDocumentUpload,
  onVerificationSubmit,
  onSettingsUpdate
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [profileData, setProfileData] = useState(userProfile || {});
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Mock data for demonstration
  const mockProfileCompletion = {
    percentage: 75,
    sections: [
      { name: "Personal Information", completed: true, percentage: 100 },
      { name: "Travel Preferences", completed: true, percentage: 90 },
      { name: "Documents", completed: false, percentage: 60 },
      { name: "Social Profile", completed: false, percentage: 40 },
      { name: "Privacy Settings", completed: true, percentage: 85 }
    ],
    rewards: [
      { id: 1, title: "Profile Champion", description: "Complete 90% of your profile", points: 500, unlocked: false },
      { id: 2, title: "Travel Expert", description: "Add detailed travel preferences", points: 300, unlocked: true },
      { id: 3, title: "Verified Traveler", description: "Complete identity verification", points: 1000, unlocked: false }
    ]
  };

  const mockVerificationData = {
    status: "pending",
    documents: [
      { type: "passport", status: "verified", uploadedAt: "2024-01-15" },
      { type: "address", status: "pending", uploadedAt: "2024-01-20" },
      { type: "identity", status: "not_uploaded", uploadedAt: null }
    ],
    badges: [
      { id: 1, name: "Identity Verified", icon: Shield, earned: true, earnedAt: "2024-01-15" },
      { id: 2, name: "Travel History", icon: Calendar, earned: false, earnedAt: null },
      { id: 3, name: "Social Connector", icon: Users, earned: false, earnedAt: null }
    ]
  };

  const mockAnalyticsData = {
    totalTrips: 28,
    countriesVisited: 15,
    totalSpend: 12450,
    totalCarbon: 890,
    netCarbon: 665,
    carbonOffset: 225,
    loyaltyLevel: "Gold",
    points: 3500
  };

  const mockDocuments = [
    {
      _id: "1",
      documentType: "passport",
      documentNumber: "A12345678",
      issuingCountry: "United States",
      issueDate: "2020-01-15",
      expiryDate: "2030-01-15",
      verificationStatus: "verified",
      documentUrl: "/api/placeholder-passport.jpg",
      verifiedAt: "2024-01-15",
      verificationNotes: "Document verified successfully",
      reminders: [
        { type: "expiry", daysBeforeExpiry: 90, enabled: true },
        { type: "renewal", daysBeforeExpiry: 30, enabled: true }
      ]
    },
    {
      _id: "2",
      documentType: "driver_license",
      documentNumber: "DL987654",
      issuingCountry: "United States",
      issueDate: "2022-05-20",
      expiryDate: "2027-05-20",
      verificationStatus: "pending",
      documentUrl: "/api/placeholder-license.jpg",
      reminders: [
        { type: "expiry", daysBeforeExpiry: 60, enabled: true }
      ]
    }
  ];

  const mockSocialConnections = {
    friends: [
      { _id: "1", firstName: "John", lastName: "Doe", profilePicture: "/api/placeholder-user1.jpg", countriesVisited: 12, totalTrips: 15, interests: ["Adventure", "Photography"] },
      { _id: "2", firstName: "Jane", lastName: "Smith", profilePicture: "/api/placeholder-user2.jpg", countriesVisited: 8, totalTrips: 10, interests: ["Culture", "Food"] }
    ],
    following: [],
    followers: [],
    travelBuddies: []
  };

  const mockLoyaltyPrograms = {
    totalPoints: 3500,
    activePrograms: 3,
    rewardsAvailable: 5,
    tier: "Gold",
    programs: [
      { _id: "1", name: "SkyMiles", type: "airline", memberId: "SM123456", tier: "Gold", points: 2500 },
      { _id: "2", name: "Marriott Bonvoy", type: "hotel", memberId: "MB789012", tier: "Silver", points: 800 },
      { _id: "3", name: "Hertz Gold", type: "car", memberId: "HG345678", tier: "Gold", points: 200 }
    ],
    rewards: [
      { _id: "1", title: "Free Flight Upgrade", category: "Flights", points: 5000, description: "Upgrade to business class on your next flight", expiryDate: "2024-12-31" },
      { _id: "2", title: "Hotel Discount", category: "Hotels", points: 1000, description: "20% off at participating hotels", expiryDate: "2024-06-30" }
    ]
  };

  // Handle profile updates
  const handleProfileUpdate = async (updatedData) => {
    setIsLoading(true);
    try {
      setProfileData(prev => ({ ...prev, ...updatedData }));
      await onProfileUpdate?.(updatedData);
    } catch (error) {
      console.error("Profile update failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (formData) => {
    setIsLoading(true);
    try {
      const result = await onDocumentUpload?.(formData);
      return result;
    } catch (error) {
      console.error("Document upload failed:", error);
      return { success: false, message: "Upload failed" };
    } finally {
      setIsLoading(false);
    }
  };

  // Handle verification submission
  const handleVerificationSubmit = async (verificationData) => {
    setIsLoading(true);
    try {
      const result = await onVerificationSubmit?.(verificationData);
      return result;
    } catch (error) {
      console.error("Verification submission failed:", error);
      return { success: false, message: "Verification failed" };
    } finally {
      setIsLoading(false);
    }
  };

  // Mobile view
  if (isMobile) {
    return (
      <MobileProfileInterface
        userProfile={profileData}
        profileCompletion={mockProfileCompletion}
        recentActivity={[]}
        quickActions={[
          { id: 1, label: "Book Flight", icon: Plane },
          { id: 2, label: "Find Hotel", icon: Hotel },
          { id: 3, label: "Documents", icon: FileText },
          { id: 4, label: "Analytics", icon: BarChart }
        ]}
        onProfileUpdate={handleProfileUpdate}
        onPhotoCapture={() => ({ success: true, photoUrl: "/api/new-profile-pic.jpg" })}
        onBiometricAuth={(enabled) => ({ success: true, enabled })}
        onQuickAction={(action) => ({ success: true, action })}
      />
    );
  }

  // Admin view
  if (isAdmin) {
    return (
      <AdminProfileManagement
        users={[]}
        verificationRequests={[]}
        analytics={{}}
        bulkOperations={[]}
        onVerifyUser={(id) => ({ success: true })}
        onRejectUser={(id) => ({ success: true })}
        onSuspendUser={(id) => ({ success: true })}
        onActivateUser={(id) => ({ success: true })}
        onBulkAction={(data) => ({ success: true })}
        onExportData={(type) => ({ success: true })}
        onSendMessage={(data) => ({ success: true })}
        onUpdateUserStatus={(data) => ({ success: true })}
      />
    );
  }

  // Regular user profile view
  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>
        <CardContent className="relative pb-6">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16">
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-background">
                <AvatarImage src={profileData.profilePicture} />
                <AvatarFallback className="text-3xl">
                  {profileData.firstName?.[0]}{profileData.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                className="absolute -bottom-2 -right-2 rounded-full w-10 h-10 p-0"
              >
                <Camera className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold">
                {profileData.firstName} {profileData.lastName}
              </h1>
              <p className="text-muted-foreground">@{profileData.username}</p>
              <div className="flex items-center justify-center md:justify-start gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{profileData.location || "Location not set"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Joined {format(new Date(profileData.createdAt || "2024-01-01"), "MMM yyyy")}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Crown className="h-3 w-3" />
                {mockLoyaltyPrograms.tier} Member
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {mockVerificationData.status === "verified" ? "Verified" : "Verification Pending"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center p-4">
          <Plane className="h-8 w-8 mx-auto mb-2 text-blue-500" />
          <p className="text-2xl font-bold">{mockAnalyticsData.totalTrips}</p>
          <p className="text-sm text-muted-foreground">Total Trips</p>
        </Card>
        
        <Card className="text-center p-4">
          <Globe className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <p className="text-2xl font-bold">{mockAnalyticsData.countriesVisited}</p>
          <p className="text-sm text-muted-foreground">Countries Visited</p>
        </Card>
        
        <Card className="text-center p-4">
          <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
          <p className="text-2xl font-bold">{mockLoyaltyPrograms.totalPoints}</p>
          <p className="text-sm text-muted-foreground">Loyalty Points</p>
        </Card>
        
        <Card className="text-center p-4">
          <Award className="h-8 w-8 mx-auto mb-2 text-purple-500" />
          <p className="text-2xl font-bold">{mockProfileCompletion.percentage}%</p>
          <p className="text-sm text-muted-foreground">Profile Complete</p>
        </Card>
      </div>

      {/* Main Profile Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
          <TabsTrigger value="overview" className="hidden lg:flex">Overview</TabsTrigger>
          <TabsTrigger value="edit" className="hidden lg:flex">Edit Profile</TabsTrigger>
          <TabsTrigger value="completion" className="hidden lg:flex">Completion</TabsTrigger>
          <TabsTrigger value="verification" className="hidden lg:flex">Verification</TabsTrigger>
          <TabsTrigger value="preferences" className="hidden lg:flex">Preferences</TabsTrigger>
          <TabsTrigger value="documents" className="hidden lg:flex">Documents</TabsTrigger>
          <TabsTrigger value="analytics" className="hidden lg:flex">Analytics</TabsTrigger>
          <TabsTrigger value="privacy" className="hidden lg:flex">Privacy</TabsTrigger>
          <TabsTrigger value="social" className="hidden lg:flex">Social</TabsTrigger>
          <TabsTrigger value="integrations" className="hidden lg:flex">Integrations</TabsTrigger>
          
          {/* Mobile simplified tabs */}
          <TabsTrigger value="overview" className="lg:hidden">Profile</TabsTrigger>
          <TabsTrigger value="edit" className="lg:hidden">Edit</TabsTrigger>
          <TabsTrigger value="documents" className="lg:hidden">Docs</TabsTrigger>
          <TabsTrigger value="social" className="lg:hidden">Social</TabsTrigger>
          <TabsTrigger value="more" className="lg:hidden">More</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Overview</CardTitle>
              <CardDescription>Your travel profile at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Personal Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{profileData.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{profileData.phone || "Not provided"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Birthday:</span>
                      <span>{profileData.dateOfBirth ? format(new Date(profileData.dateOfBirth), "PPP") : "Not provided"}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold">Travel Stats</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Trips:</span>
                      <span>{mockAnalyticsData.totalTrips}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Countries:</span>
                      <span>{mockAnalyticsData.countriesVisited}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Carbon Footprint:</span>
                      <span>{mockAnalyticsData.totalCarbon} kg CO₂</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit">
          <EnhancedProfileEditor
            userProfile={profileData}
            onUpdate={handleProfileUpdate}
          />
        </TabsContent>

        <TabsContent value="completion">
          <ProfileCompletionTracker
            completionData={mockProfileCompletion}
            onClaimReward={(rewardId) => console.log("Claim reward:", rewardId)}
          />
        </TabsContent>

        <TabsContent value="verification">
          <ProfileVerification
            verificationData={mockVerificationData}
            onSubmitVerification={handleVerificationSubmit}
          />
        </TabsContent>

        <TabsContent value="preferences">
          <TravelPreferencesManager
            preferences={profileData.travelPreferences || {}}
            history={profileData.travelHistory || []}
            onUpdatePreferences={(preferences) => handleProfileUpdate({ travelPreferences: preferences })}
          />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentManager
            documents={mockDocuments}
            onDocumentUpload={handleDocumentUpload}
            onDocumentDelete={(id) => ({ success: true })}
            onDocumentUpdate={(id, data) => ({ success: true })}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <TravelAnalyticsDashboard
            analyticsData={mockAnalyticsData}
            travelHistory={profileData.travelHistory || []}
            carbonFootprint={mockAnalyticsData}
            travelGoals={profileData.travelGoals || []}
            insights={[]}
          />
        </TabsContent>

        <TabsContent value="privacy">
          <PrivacySecurityControls
            privacySettings={profileData.privacySettings || {}}
            securitySettings={profileData.securitySettings || {}}
            loginActivity={[]}
            connectedApps={[]}
            onUpdatePrivacySettings={(settings) => handleProfileUpdate({ privacySettings: settings })}
            onUpdateSecuritySettings={(settings) => handleProfileUpdate({ securitySettings: settings })}
            onEnable2FA={() => ({ success: true })}
            onDisable2FA={() => ({ success: true })}
            onRevokeSession={(id) => ({ success: true })}
            onDisconnectApp={(id) => ({ success: true })}
            onExportData={(type) => ({ success: true })}
            onDeleteAccount={() => ({ success: true })}
          />
        </TabsContent>

        <TabsContent value="social">
          <SocialTravelFeatures
            userProfile={profileData}
            socialConnections={mockSocialConnections}
            travelPosts={[]}
            travelWishlist={[]}
            onUpdateSocialSettings={(settings) => handleProfileUpdate({ socialSettings: settings })}
            onCreatePost={(post) => ({ success: true })}
            onConnectWithUser={(id) => ({ success: true })}
            onDisconnectFromUser={(id) => ({ success: true })}
            onAddToWishlist={(item) => ({ success: true })}
            onRemoveFromWishlist={(id) => ({ success: true })}
            onShareProfile={() => ({ success: true })}
          />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationFeatures
            loyaltyPrograms={mockLoyaltyPrograms}
            connectedServices={[]}
            insuranceProviders={[]}
            syncSettings={{}}
            onConnectService={(id) => ({ success: true })}
            onDisconnectService={(id) => ({ success: true })}
            onSyncData={(id) => ({ success: true })}
            onUpdateSettings={(settings) => ({ success: true })}
            onClaimReward={(id) => ({ success: true })}
            onTransferPoints={(data) => ({ success: true })}
          />
        </TabsContent>

        {/* Mobile "More" tab content */}
        <TabsContent value="more" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("completion")}>
              <div className="flex items-center gap-3">
                <Target className="h-8 w-8 text-blue-500" />
                <div>
                  <h3 className="font-semibold">Profile Completion</h3>
                  <p className="text-sm text-muted-foreground">Track your progress</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("verification")}>
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-green-500" />
                <div>
                  <h3 className="font-semibold">Verification</h3>
                  <p className="text-sm text-muted-foreground">Verify your identity</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("preferences")}>
              <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-purple-500" />
                <div>
                  <h3 className="font-semibold">Preferences</h3>
                  <p className="text-sm text-muted-foreground">Travel settings</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("analytics")}>
              <div className="flex items-center gap-3">
                <BarChart className="h-8 w-8 text-yellow-500" />
                <div>
                  <h3 className="font-semibold">Analytics</h3>
                  <p className="text-sm text-muted-foreground">Travel insights</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("privacy")}>
              <div className="flex items-center gap-3">
                <Lock className="h-8 w-8 text-red-500" />
                <div>
                  <h3 className="font-semibold">Privacy & Security</h3>
                  <p className="text-sm text-muted-foreground">Account settings</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("integrations")}>
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-indigo-500" />
                <div>
                  <h3 className="font-semibold">Integrations</h3>
                  <p className="text-sm text-muted-foreground">Connected services</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}