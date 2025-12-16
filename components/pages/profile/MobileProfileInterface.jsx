"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  User, 
  Camera, 
  Edit, 
  Settings, 
  Bell, 
  Shield, 
  Award, 
  MapPin, 
  Calendar, 
  Plane, 
  Hotel, 
  Star,
  Heart,
  MessageCircle,
  Share2,
  QrCode,
  Smartphone,
  Fingerprint,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  Home,
  Search,
  Plus,
  Menu,
  X,
  Image as ImageIcon,
  Video,
  FileText,
  Globe,
  Users,
  Target,
  TrendingUp,
  CreditCard,
  HelpCircle,
  LogOut,
  UserPlus,
  Bookmark,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Upload,
  Trash2,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

export function MobileProfileInterface({ 
  userProfile, 
  profileCompletion,
  recentActivity,
  quickActions,
  onProfileUpdate,
  onPhotoCapture,
  onBiometricAuth,
  onQuickAction
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [profilePicture, setProfilePicture] = useState(userProfile?.profilePicture);
  const { toast } = useToast();

  const handlePhotoCapture = async () => {
    try {
      const result = await onPhotoCapture();
      if (result.success) {
        setProfilePicture(result.photoUrl);
        toast({
          title: "Photo Updated",
          description: "Your profile picture has been updated",
        });
      }
    } catch (error) {
      toast({
        title: "Capture Failed",
        description: "Failed to capture photo",
        variant: "destructive",
      });
    }
  };

  const handleBiometricToggle = async () => {
    try {
      const result = await onBiometricAuth(!biometricEnabled);
      if (result.success) {
        setBiometricEnabled(!biometricEnabled);
        toast({
          title: "Biometric Authentication",
          description: biometricEnabled ? "Disabled" : "Enabled",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update biometric settings",
        variant: "destructive",
      });
    }
  };

  const handleQuickAction = async (action) => {
    const result = await onQuickAction(action);
    if (result.success) {
      toast({
        title: "Action Completed",
        description: `${action.label} completed successfully`,
      });
    }
  };

  const MobileHeader = () => (
    <div className="sticky top-0 z-50 bg-background border-b">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-2">
                <Button variant="ghost" className="w-full justify-start">
                  <Home className="h-4 w-4 mr-3" />
                  Home
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Search className="h-4 w-4 mr-3" />
                  Search
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-3" />
                  Bookings
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Heart className="h-4 w-4 mr-3" />
                  Favorites
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <MessageCircle className="h-4 w-4 mr-3" />
                  Messages
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-3" />
                  Settings
                </Button>
                <Button variant="ghost" className="w-full justify-start">
                  <HelpCircle className="h-4 w-4 mr-3" />
                  Help
                </Button>
                <Button variant="ghost" className="w-full justify-start text-red-600">
                  <LogOut className="h-4 w-4 mr-3" />
                  Log Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          
          <h1 className="text-lg font-semibold">Profile</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Bell className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="sm" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );

  const ProfileOverview = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-600"></div>
        <CardContent className="relative pb-6">
          <div className="flex flex-col items-center -mt-12">
            <div className="relative">
              <Avatar className="w-24 h-24 border-4 border-background">
                <AvatarImage src={profilePicture} />
                <AvatarFallback className="text-2xl">
                  {userProfile?.firstName?.[0]}{userProfile?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                onClick={handlePhotoCapture}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-center mt-4 space-y-1">
              <h2 className="text-xl font-bold">
                {userProfile?.firstName} {userProfile?.lastName}
              </h2>
              <p className="text-muted-foreground">@{userProfile?.username}</p>
              <div className="flex items-center justify-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{userProfile?.location}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-4">
              <Badge variant="secondary">
                <Award className="h-3 w-3 mr-1" />
                Level {userProfile?.loyaltyLevel || 1}
              </Badge>
              <Badge variant="outline">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Completion */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Profile Completion</CardTitle>
            <span className="text-sm font-medium">{profileCompletion?.percentage || 0}%</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={profileCompletion?.percentage || 0} className="h-2" />
          <div className="text-xs text-muted-foreground">
            Complete your profile to unlock more features and rewards
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Basic Info</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>Photo</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-yellow-500" />
              <span>Preferences</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-yellow-500" />
              <span>Documents</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center p-3">
          <Plane className="h-5 w-5 mx-auto mb-1 text-blue-500" />
          <p className="text-lg font-bold">{userProfile?.totalTrips || 0}</p>
          <p className="text-xs text-muted-foreground">Trips</p>
        </Card>
        
        <Card className="text-center p-3">
          <Globe className="h-5 w-5 mx-auto mb-1 text-green-500" />
          <p className="text-lg font-bold">{userProfile?.countriesVisited || 0}</p>
          <p className="text-xs text-muted-foreground">Countries</p>
        </Card>
        
        <Card className="text-center p-3">
          <Star className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
          <p className="text-lg font-bold">{userProfile?.points || 0}</p>
          <p className="text-xs text-muted-foreground">Points</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {quickActions?.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto p-3 flex-col gap-2"
                onClick={() => handleQuickAction(action)}
              >
                <action.icon className="h-5 w-5" />
                <span className="text-xs">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentActivity?.slice(0, 3).map((activity) => (
            <div key={activity._id} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <activity.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{activity.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(activity.date), "PPP")}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const MobileTabBar = () => (
    <div className="sticky bottom-0 z-50 bg-background border-t">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-16 bg-transparent">
          <TabsTrigger value="overview" className="flex-col gap-1 data-[state=active]:text-blue-600">
            <User className="h-5 w-5" />
            <span className="text-xs">Profile</span>
          </TabsTrigger>
          
          <TabsTrigger value="bookings" className="flex-col gap-1 data-[state=active]:text-blue-600">
            <Calendar className="h-5 w-5" />
            <span className="text-xs">Bookings</span>
          </TabsTrigger>
          
          <TabsTrigger value="travel" className="flex-col gap-1 data-[state=active]:text-blue-600">
            <Plane className="h-5 w-5" />
            <span className="text-xs">Travel</span>
          </TabsTrigger>
          
          <TabsTrigger value="social" className="flex-col gap-1 data-[state=active]:text-blue-600">
            <Users className="h-5 w-5" />
            <span className="text-xs">Social</span>
          </TabsTrigger>
          
          <TabsTrigger value="more" className="flex-col gap-1 data-[state=active]:text-blue-600">
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-xs">More</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );

  const BookingsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold">My Bookings</h2>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Booking
        </Button>
      </div>
      
      <div className="px-4 space-y-3">
        {[
          { type: "flight", title: "NYC to London", date: "2024-02-15", status: "upcoming" },
          { type: "hotel", title: "Marriott Paris", date: "2024-02-20", status: "confirmed" },
          { type: "flight", title: "London to Tokyo", date: "2024-03-10", status: "upcoming" },
        ].map((booking, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  {booking.type === "flight" ? <Plane className="h-5 w-5" /> : <Hotel className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-medium">{booking.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(booking.date), "PPP")}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>
                  {booking.status}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const TravelTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold">Travel Tools</h2>
        <Button size="sm">
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>
      
      <div className="px-4 grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <FileText className="h-8 w-8 mx-auto mb-2 text-blue-500" />
          <h3 className="font-medium text-sm">Documents</h3>
          <p className="text-xs text-muted-foreground">Manage travel docs</p>
        </Card>
        
        <Card className="p-4 text-center">
          <MapPin className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <h3 className="font-medium text-sm">Destinations</h3>
          <p className="text-xs text-muted-foreground">Explore places</p>
        </Card>
        
        <Card className="p-4 text-center">
          <Heart className="h-8 w-8 mx-auto mb-2 text-red-500" />
          <h3 className="font-medium text-sm">Wishlist</h3>
          <p className="text-xs text-muted-foreground">Saved places</p>
        </Card>
        
        <Card className="p-4 text-center">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-500" />
          <h3 className="font-medium text-sm">Analytics</h3>
          <p className="text-xs text-muted-foreground">Travel insights</p>
        </Card>
      </div>
      
      {/* Recent Trips */}
      <Card className="mx-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Trips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { destination: "Paris, France", dates: "Jan 15-22, 2024", status: "completed" },
            { destination: "Tokyo, Japan", dates: "Dec 10-18, 2023", status: "completed" },
          ].map((trip, index) => (
            <div key={index} className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-sm">{trip.destination}</h3>
                <p className="text-xs text-muted-foreground">{trip.dates}</p>
              </div>
              <Badge variant="outline">{trip.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  const SocialTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-semibold">Social Travel</h2>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Post
        </Button>
      </div>
      
      <div className="px-4 grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
          <h3 className="font-medium text-sm">Connections</h3>
          <p className="text-xs text-muted-foreground">245 friends</p>
        </Card>
        
        <Card className="p-4 text-center">
          <MessageCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
          <h3 className="font-medium text-sm">Messages</h3>
          <p className="text-xs text-muted-foreground">12 unread</p>
        </Card>
        
        <Card className="p-4 text-center">
          <Share2 className="h-8 w-8 mx-auto mb-2 text-purple-500" />
          <h3 className="font-medium text-sm">Feed</h3>
          <p className="text-xs text-muted-foreground">Latest posts</p>
        </Card>
        
        <Card className="p-4 text-center">
          <Bookmark className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
          <h3 className="font-medium text-sm">Saved</h3>
          <p className="text-xs text-muted-foreground">Bookmarked</p>
        </Card>
      </div>
    </div>
  );

  const MoreTab = () => (
    <div className="space-y-4">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">More Options</h2>
        
        <div className="space-y-2">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-blue-500" />
                <div>
                  <h3 className="font-medium text-sm">Privacy & Security</h3>
                  <p className="text-xs text-muted-foreground">Manage your privacy</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-green-500" />
                <div>
                  <h3 className="font-medium text-sm">Payment Methods</h3>
                  <p className="text-xs text-muted-foreground">Manage cards</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-yellow-500" />
                <div>
                  <h3 className="font-medium text-sm">Notifications</h3>
                  <p className="text-xs text-muted-foreground">Alert settings</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Fingerprint className="h-5 w-5 text-purple-500" />
                <div>
                  <h3 className="font-medium text-sm">Biometric Auth</h3>
                  <p className="text-xs text-muted-foreground">
                    {biometricEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>
              <Switch
                checked={biometricEnabled}
                onCheckedChange={handleBiometricToggle}
              />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-red-500" />
                <div>
                  <h3 className="font-medium text-sm">Help & Support</h3>
                  <p className="text-xs text-muted-foreground">Get assistance</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader />
      
      <div className="flex-1 overflow-auto pb-16">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="overview" className="mt-0">
            <ProfileOverview />
          </TabsContent>
          
          <TabsContent value="bookings" className="mt-0">
            <BookingsTab />
          </TabsContent>
          
          <TabsContent value="travel" className="mt-0">
            <TravelTab />
          </TabsContent>
          
          <TabsContent value="social" className="mt-0">
            <SocialTab />
          </TabsContent>
          
          <TabsContent value="more" className="mt-0">
            <MoreTab />
          </TabsContent>
        </Tabs>
      </div>
      
      <MobileTabBar />
    </div>
  );
}