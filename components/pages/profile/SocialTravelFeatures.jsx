"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  Share2, 
  Heart, 
  MessageCircle, 
  MapPin, 
  Calendar, 
  Camera, 
  Plus, 
  Search,
  Filter,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Star,
  TrendingUp,
  Clock,
  Send,
  Image as ImageIcon,
  Video,
  Map,
  Compass,
  UserPlus,
  UserCheck,
  UserX,
  Bell,
  Settings,
  Bookmark,
  Hash,
  AtSign,
  Link,
  MoreHorizontal,
  ThumbsUp,
  Award,
  Target,
  Plane,
  Hotel,
  Coffee,
  ShoppingBag
} from "lucide-react";
import { format, subDays } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

export function SocialTravelFeatures({ 
  userProfile, 
  socialConnections, 
  travelPosts, 
  travelWishlist,
  onUpdateSocialSettings,
  onCreatePost,
  onConnectWithUser,
  onDisconnectFromUser,
  onAddToWishlist,
  onRemoveFromWishlist,
  onShareProfile
}) {
  const [activeTab, setActiveTab] = useState("feed");
  const [postContent, setPostContent] = useState("");
  const [postType, setPostType] = useState("text");
  const [searchQuery, setSearchQuery] = useState("");
  const [connectionFilter, setConnectionFilter] = useState("all");
  const [wishlistFilter, setWishlistFilter] = useState("all");
  const [isSharingProfile, setIsSharingProfile] = useState(false);
  const [privacyLevel, setPrivacyLevel] = useState(userProfile?.socialSettings?.privacyLevel || "friends");
  const { toast } = useToast();

  const handleCreatePost = async () => {
    if (!postContent.trim()) {
      toast({
        title: "Empty Post",
        description: "Please add some content to your post",
        variant: "destructive",
      });
      return;
    }

    const postData = {
      content: postContent,
      type: postType,
      privacy: privacyLevel,
      // Additional post data would go here
    };

    const result = await onCreatePost(postData);
    if (result.success) {
      toast({
        title: "Post Published",
        description: "Your travel post has been shared successfully",
      });
      setPostContent("");
      setPostType("text");
    }
  };

  const handleConnect = async (userId) => {
    const result = await onConnectWithUser(userId);
    if (result.success) {
      toast({
        title: "Connection Request Sent",
        description: "Your connection request has been sent",
      });
    }
  };

  const handleDisconnect = async (userId) => {
    const result = await onDisconnectFromUser(userId);
    if (result.success) {
      toast({
        title: "Connection Removed",
        description: "You have been disconnected from this user",
      });
    }
  };

  const handleShareProfile = async () => {
    setIsSharingProfile(true);
    const result = await onShareProfile();
    
    if (result.success) {
      toast({
        title: "Profile Shared",
        description: "Your profile link has been copied to clipboard",
      });
    }
    
    setIsSharingProfile(false);
  };

  const SocialFeedTab = () => (
    <div className="space-y-6">
      {/* Create Post */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Share Your Travel Experience
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Avatar>
              <AvatarImage src={userProfile?.profilePicture} />
              <AvatarFallback>{userProfile?.firstName?.[0]}{userProfile?.lastName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="Share your travel story, tips, or experiences..."
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                className="min-h-[100px]"
              />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Select value={postType} onValueChange={setPostType}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="photo">Photo</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="location">Location</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button variant="outline" size="sm">
                    <ImageIcon className="h-4 w-4 mr-1" />
                    Photo
                  </Button>
                  
                  <Button variant="outline" size="sm">
                    <MapPin className="h-4 w-4 mr-1" />
                    Location
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select value={privacyLevel} onValueChange={setPrivacyLevel}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Public
                        </div>
                      </SelectItem>
                      <SelectItem value="friends">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Friends
                        </div>
                      </SelectItem>
                      <SelectItem value="private">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Private
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button onClick={handleCreatePost}>
                    <Send className="h-4 w-4 mr-2" />
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feed Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Select defaultValue="all">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Posts</SelectItem>
                  <SelectItem value="friends">Friends</SelectItem>
                  <SelectItem value="following">Following</SelectItem>
                  <SelectItem value="trending">Trending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
              <Button size="sm">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Feed */}
      <div className="space-y-4">
        {travelPosts?.map((post) => (
          <Card key={post._id}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Post Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={post.author?.profilePicture} />
                      <AvatarFallback>
                        {post.author?.firstName?.[0]}{post.author?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {post.author?.firstName} {post.author?.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {format(new Date(post.createdAt), "PPP")}
                        {post.location && (
                          <>
                            <MapPin className="h-3 w-3" />
                            {post.location}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {post.type === "photo" && <ImageIcon className="h-3 w-3 mr-1" />}
                      {post.type === "video" && <Video className="h-3 w-3 mr-1" />}
                      {post.type === "location" && <MapPin className="h-3 w-3 mr-1" />}
                      {post.type === "review" && <Star className="h-3 w-3 mr-1" />}
                      {post.type}
                    </Badge>
                    
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Post Content */}
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed">{post.content}</p>
                  
                  {post.media && (
                    <div className="grid grid-cols-2 gap-2">
                      {post.media.map((media, index) => (
                        <div key={index} className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                          {media.type === "image" ? (
                            <img src={media.url} alt="" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Video className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Post Actions */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="text-red-500">
                      <Heart className="h-4 w-4 mr-1" />
                      {post.likes?.length || 0}
                    </Button>
                    
                    <Button variant="ghost" size="sm">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      {post.comments?.length || 0}
                    </Button>
                    
                    <Button variant="ghost" size="sm">
                      <Share2 className="h-4 w-4 mr-1" />
                      Share
                    </Button>
                  </div>
                  
                  <Button variant="ghost" size="sm">
                    <Bookmark className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const ConnectionsTab = () => (
    <div className="space-y-6">
      {/* Connection Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{socialConnections?.friends?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Friends</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <UserCheck className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{socialConnections?.following?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Following</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <UserPlus className="h-8 w-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{socialConnections?.followers?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Followers</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{socialConnections?.travelBuddies?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Travel Buddies</p>
          </CardContent>
        </Card>
      </div>

      {/* Find Travelers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5" />
            Find Travelers
          </CardTitle>
          <CardDescription>
            Discover and connect with like-minded travelers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Input
              placeholder="Search travelers..."
              className="flex-1"
            />
            <Select defaultValue="all">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Travelers</SelectItem>
                <SelectItem value="similar">Similar Interests</SelectItem>
                <SelectItem value="nearby">Nearby</SelectItem>
                <SelectItem value="popular">Popular</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connections List */}
      <Card>
        <CardHeader>
          <CardTitle>My Connections</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={connectionFilter} onValueChange={setConnectionFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Connections</SelectItem>
                <SelectItem value="friends">Friends</SelectItem>
                <SelectItem value="following">Following</SelectItem>
                <SelectItem value="followers">Followers</SelectItem>
                <SelectItem value="buddies">Travel Buddies</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {socialConnections?.friends?.map((connection) => (
              <Card key={connection._id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={connection.profilePicture} />
                      <AvatarFallback>
                        {connection.firstName?.[0]}{connection.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {connection.firstName} {connection.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {connection.countriesVisited || 0} countries • {connection.totalTrips || 0} trips
                      </div>
                      <div className="flex gap-1 mt-1">
                        {connection.interests?.slice(0, 3).map((interest, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDisconnect(connection._id)}
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const WishlistTab = () => (
    <div className="space-y-6">
      {/* Add to Wishlist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add to Wishlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Destination</Label>
              <Input placeholder="Enter destination name..." />
            </div>
            <div>
              <Label>Category</Label>
              <Select defaultValue="destination">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="destination">Destination</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
SelectItem value="activity">Activity</SelectItem>
                  <SelectItem value="experience">Experience</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Date</Label>
              <Input type="date" />
            </div>
            <div>
              <Label>Estimated Budget</Label>
              <Input placeholder="Enter budget..." />
            </div>
          </div>
          
          <div className="mt-4">
            <Label>Notes</Label>
            <Textarea placeholder="Add notes about why you want to visit..." className="mt-1" />
          </div>
          
          <Button className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Add to Wishlist
          </Button>
        </CardContent>
      </Card>

      {/* Wishlist Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={wishlistFilter} onValueChange={setWishlistFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="destinations">Destinations</SelectItem>
                  <SelectItem value="hotels">Hotels</SelectItem>
                  <SelectItem value="activities">Activities</SelectItem>
                  <SelectItem value="experiences">Experiences</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share Wishlist
              </Button>
              
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wishlist Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {travelWishlist?.map((item) => (
          <Card key={item._id} className="overflow-hidden">
            <div className="aspect-video bg-muted relative">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              
              <div className="absolute top-2 right-2">
                <Badge variant={item.priority === "high" ? "destructive" : "secondary"}>
                  {item.priority}
                </Badge>
              </div>
            </div>
            
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">{item.location}</p>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Target Date:</span>
                  <span className="font-medium">
                    {item.targetDate ? format(new Date(item.targetDate), "PPP") : "Not set"}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="font-medium">${item.estimatedBudget || "Not set"}</span>
                </div>
                
                {item.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.notes}
                  </p>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Plane className="h-4 w-4 mr-1" />
                    Plan Trip
                  </Button>
                  
                  <Button size="sm" variant="outline" className="flex-1">
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onRemoveFromWishlist(item._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const ProfileSharingTab = () => (
    <div className="space-y-6">
      {/* Profile Sharing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Profile Sharing
          </CardTitle>
          <CardDescription>
            Control how your travel profile is shared and displayed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Profile Visibility</Label>
                <Select defaultValue={userProfile?.socialSettings?.profileVisibility || "public"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Public - Anyone can view
                      </div>
                    </SelectItem>
                    <SelectItem value="friends">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Friends Only
                      </div>
                    </SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Private - Only you
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Share Travel History</Label>
                <Select defaultValue={userProfile?.socialSettings?.shareTravelHistory || "friends"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="friends">Friends Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Share Achievements</Label>
                <Select defaultValue={userProfile?.socialSettings?.shareAchievements || "public"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="friends">Friends Only</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Allow Profile Search</Label>
                <Select defaultValue={userProfile?.socialSettings?.allowSearch || "everyone"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyone">Everyone</SelectItem>
                    <SelectItem value="friends">Friends Only</SelectItem>
                    <SelectItem value="none">Nobody</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share Profile Link */}
      <Card>
        <CardHeader>
          <CardTitle>Share Your Profile</CardTitle>
          <CardDescription>
            Share your travel profile with friends and family
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={`https://travelagency.com/profile/${userProfile?._id}`}
              readOnly
              className="flex-1"
            />
            <Button onClick={handleShareProfile} disabled={isSharingProfile}>
              {isSharingProfile ? "Copied!" : "Copy Link"}
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button variant="outline" size="sm">
              <MessageCircle className="h-4 w-4 mr-2" />
              Message
            </Button>
            
            <Button variant="outline" size="sm">
              <Send className="h-4 w-4 mr-2" />
              Email
            </Button>
            
            <Button variant="outline" size="sm">
              <Link className="h-4 w-4 mr-2" />
              Social Media
            </Button>
            
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              QR Code
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Social Media Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Social Media Integration
          </CardTitle>
          <CardDescription>
            Connect your social media accounts for enhanced sharing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: "Facebook", icon: "f", connected: false },
              { name: "Twitter", icon: "𝕏", connected: true },
              { name: "Instagram", icon: "📷", connected: false },
              { name: "LinkedIn", icon: "in", connected: true },
            ].map((platform) => (
              <div key={platform.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded flex items-center justify-center font-bold">
                    {platform.icon}
                  </div>
                  <div>
                    <h3 className="font-medium">{platform.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {platform.connected ? "Connected" : "Not connected"}
                    </p>
                  </div>
                </div>
                
                <Button variant={platform.connected ? "destructive" : "default"}>
                  {platform.connected ? "Disconnect" : "Connect"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Social Travel</h2>
        <p className="text-muted-foreground">Connect with travelers and share your experiences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="feed">Social Feed</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
          <TabsTrigger value="sharing">Profile Sharing</TabsTrigger>
        </TabsList>

        <TabsContent value="feed">
          <SocialFeedTab />
        </TabsContent>

        <TabsContent value="connections">
          <ConnectionsTab />
        </TabsContent>

        <TabsContent value="wishlist">
          <WishlistTab />
        </TabsContent>

        <TabsContent value="sharing">
          <ProfileSharingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}