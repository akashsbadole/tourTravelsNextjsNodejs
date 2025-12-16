"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, 
  Shield, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Ban, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  UserCheck, 
  UserX, 
  Settings, 
  BarChart, 
  FileText, 
  Mail, 
  MessageSquare, 
  Star, 
  Award, 
  TrendingUp, 
  Activity, 
  Calendar, 
  MapPin, 
  Globe, 
  Lock, 
  Unlock, 
  Edit, 
  Trash2, 
  Plus, 
  MoreHorizontal,
  AlertCircle,
  Check,
  X,
  UserPlus,
  UserMinus,
  ShieldCheck,
  ShieldOff,
  Flag,
  Archive,
  Restore,
  Copy,
  ExternalLink,
  Zap,
  Target,
  Crown,
  Diamond,
  Gem,
  Medal
} from "lucide-react";
import { format, subDays } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

export function AdminProfileManagement({ 
  users, 
  verificationRequests, 
  analytics, 
  bulkOperations,
  onVerifyUser,
  onRejectUser,
  onSuspendUser,
  onActivateUser,
  onBulkAction,
  onExportData,
  onSendMessage,
  onUpdateUserStatus
}) {
  const [activeTab, setActiveTab] = useState("users");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVerification, setFilterVerification] = useState("all");
  const [bulkAction, setBulkAction] = useState("");
  const [messageDialog, setMessageDialog] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  const [viewingUser, setViewingUser] = useState(null);
  const { toast } = useToast();

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user._id));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.length === 0) {
      toast({
        title: "Action Required",
        description: "Please select an action and users",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await onBulkAction({
        action: bulkAction,
        userIds: selectedUsers
      });

      if (result.success) {
        toast({
          title: "Bulk Action Completed",
          description: `${bulkAction} applied to ${selectedUsers.length} users`,
        });
        setSelectedUsers([]);
        setBulkAction("");
      }
    } catch (error) {
      toast({
        title: "Action Failed",
        description: "Failed to perform bulk action",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async () => {
    if (!messageSubject || !messageContent || selectedUsers.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields and select users",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await onSendMessage({
        subject: messageSubject,
        content: messageContent,
        userIds: selectedUsers
      });

      if (result.success) {
        toast({
          title: "Message Sent",
          description: `Message sent to ${selectedUsers.length} users`,
        });
        setMessageDialog(false);
        setMessageSubject("");
        setMessageContent("");
        setSelectedUsers([]);
      }
    } catch (error) {
      toast({
        title: "Send Failed",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users?.filter(user => {
    const matchesSearch = user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || user.status === filterStatus;
    const matchesVerification = filterVerification === "all" || user.verificationStatus === filterVerification;
    
    return matchesSearch && matchesStatus && matchesVerification;
  }) || [];

  const UsersManagementTab = () => (
    <div className="space-y-6">
      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{analytics?.totalUsers || 0}</p>
                <p className="text-xs text-muted-foreground">
                  +12% from last month
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold">{analytics?.verifiedUsers || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round((analytics?.verifiedUsers / analytics?.totalUsers) * 100) || 0}% rate
                </p>
              </div>
              <ShieldCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{analytics?.pendingVerifications || 0}</p>
                <p className="text-xs text-muted-foreground">
                  Need review
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Suspended</p>
                <p className="text-2xl font-bold">{analytics?.suspendedUsers || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round((analytics?.suspendedUsers / analytics?.totalUsers) * 100) || 0}% rate
                </p>
              </div>
              <Ban className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterVerification} onValueChange={setFilterVerification}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Verification</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedUsers.length} users selected
                </span>
                
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Choose action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="verify">Verify Users</SelectItem>
                    <SelectItem value="suspend">Suspend Users</SelectItem>
                    <SelectItem value="activate">Activate Users</SelectItem>
                    <SelectItem value="message">Send Message</SelectItem>
                    <SelectItem value="export">Export Data</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button onClick={handleBulkAction} disabled={!bulkAction}>
                  Apply Action
                </Button>
                
                {bulkAction === "message" && (
                  <Button onClick={() => setMessageDialog(true)} variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    Compose Message
                  </Button>
                )}
              </div>
              
              <Button variant="outline" onClick={() => setSelectedUsers([])}>
                Clear Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>User Management</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length}
                    onChange={handleSelectAllUsers}
                    className="rounded"
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user._id)}
                      onChange={() => handleSelectUser(user._id)}
                      className="rounded"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.profilePicture} />
                        <AvatarFallback>
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      user.status === "active" ? "default" :
                      user.status === "suspended" ? "destructive" : "secondary"
                    }>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      user.verificationStatus === "verified" ? "default" :
                      user.verificationStatus === "pending" ? "secondary" : "destructive"
                    }>
                      {user.verificationStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.createdAt), "PPP")}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{user.totalTrips || 0} trips</div>
                      <div className="text-muted-foreground">
                        Last active {format(new Date(user.lastActive), "PPP")}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingUser(user)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {user.status === "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSuspendUser(user._id)}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onActivateUser(user._id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button size="sm" variant="outline">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const VerificationTab = () => (
    <div className="space-y-6">
      {/* Verification Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{verificationRequests?.pending || 0}</p>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{verificationRequests?.approved || 0}</p>
            <p className="text-sm text-muted-foreground">Approved Today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <X className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold">{verificationRequests?.rejected || 0}</p>
            <p className="text-sm text-muted-foreground">Rejected Today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{verificationRequests?.avgTime || "24h"}</p>
            <p className="text-sm text-muted-foreground">Avg. Review Time</p>
          </CardContent>
        </Card>
      </div>

      {/* Verification Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Queue</CardTitle>
          <CardDescription>
            Review and process user verification requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {verificationRequests?.requests?.map((request) => (
              <Card key={request._id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarImage src={request.user.profilePicture} />
                      <AvatarFallback>
                        {request.user.firstName?.[0]}{request.user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold">
                          {request.user.firstName} {request.user.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground">{request.user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">
                            {request.type} Verification
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Submitted {format(new Date(request.submittedAt), "PPP")}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Documents:</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {request.documents.map((doc, index) => (
                            <div key={index} className="border rounded p-2 text-center">
                              <FileText className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                              <p className="text-xs">{doc.type}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {request.notes && (
                        <div className="text-sm">
                          <span className="font-medium">User Notes:</span>
                          <p className="text-muted-foreground">{request.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => onVerifyUser(request._id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onRejectUser(request._id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      Review
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

  const AnalyticsTab = () => (
    <div className="space-y-6">
      {/* User Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>User Analytics</CardTitle>
          <CardDescription>
            Comprehensive insights into user behavior and trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center space-y-2">
              <p className="text-3xl font-bold">{analytics?.newUsersThisMonth || 0}</p>
              <p className="text-sm text-muted-foreground">New Users (This Month)</p>
              <p className="text-xs text-green-600">+15% from last month</p>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-3xl font-bold">{analytics?.activeUsersThisMonth || 0}</p>
              <p className="text-sm text-muted-foreground">Active Users (This Month)</p>
              <p className="text-xs text-green-600">+8% from last month</p>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-3xl font-bold">{analytics?.retentionRate || 0}%</p>
              <p className="text-sm text-muted-foreground">Retention Rate</p>
              <p className="text-xs text-red-600">-2% from last month</p>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-3xl font-bold">{analytics?.avgSessionTime || "0m"}</p>
              <p className="text-sm text-muted-foreground">Avg. Session Time</p>
              <p className="text-xs text-green-600">+12% from last month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Engagement */}
      <Card>
        <CardHeader>
          <CardTitle>User Engagement Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Profile Completion</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Complete Profiles</span>
                  <span className="font-medium">{analytics?.completeProfiles || 0}%</span>
                </div>
                <Progress value={analytics?.completeProfiles || 0} className="h-2" />
                
                <div className="flex justify-between">
                  <span>Partial Profiles</span>
                  <span className="font-medium">{analytics?.partialProfiles || 0}%</span>
                </div>
                <Progress value={analytics?.partialProfiles || 0} className="h-2" />
                
                <div className="flex justify-between">
                  <span>Empty Profiles</span>
                  <span className="font-medium">{analytics?.emptyProfiles || 0}%</span>
                </div>
                <Progress value={analytics?.emptyProfiles || 0} className="h-2" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Feature Usage</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Document Upload</span>
                  <span className="font-medium">{analytics?.documentUploadUsage || 0}%</span>
                </div>
                <Progress value={analytics?.documentUploadUsage || 0} className="h-2" />
                
                <div className="flex justify-between">
                  <span>Social Features</span>
                  <span className="font-medium">{analytics?.socialUsage || 0}%</span>
                </div>
                <Progress value={analytics?.socialUsage || 0} className="h-2" />
                
                <div className="flex justify-between">
                  <span>Loyalty Programs</span>
                  <span className="font-medium">{analytics?.loyaltyUsage || 0}%</span>
                </div>
                <Progress value={analytics?.loyaltyUsage || 0} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Trips</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Referrals</TableHead>
                <TableHead>Engagement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics?.topUsers?.map((user, index) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center font-bold text-yellow-600">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{user.totalTrips}</TableCell>
                  <TableCell>{user.points}</TableCell>
                  <TableCell>{user.referrals}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.engagementScore}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Admin Profile Management</h2>
          <p className="text-muted-foreground">Manage users, verifications, and analytics</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersManagementTab />
        </TabsContent>

        <TabsContent value="verification">
          <VerificationTab />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
      </Tabs>

      {/* Message Dialog */}
      <Dialog open={messageDialog} onOpenChange={setMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message to Users</DialogTitle>
            <DialogDescription>
              Send a message to {selectedUsers.length} selected users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Input
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="Enter message subject"
              />
            </div>
            
            <div>
              <Label>Message</Label>
              <Textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Enter your message here..."
                rows={4}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMessageDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendMessage}>
                Send Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {viewingUser && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Personal Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span>{viewingUser.firstName} {viewingUser.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{viewingUser.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{viewingUser.phone || "Not provided"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span>{viewingUser.location || "Not provided"}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-semibold">Account Status</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={viewingUser.status === "active" ? "default" : "destructive"}>
                        {viewingUser.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Verification:</span>
                      <Badge variant={viewingUser.verificationStatus === "verified" ? "default" : "secondary"}>
                        {viewingUser.verificationStatus}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member Since:</span>
                      <span>{format(new Date(viewingUser.createdAt), "PPP")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Active:</span>
                      <span>{format(new Date(viewingUser.lastActive), "PPP")}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold">Travel Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{viewingUser.totalTrips || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Trips</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{viewingUser.countriesVisited || 0}</p>
                    <p className="text-sm text-muted-foreground">Countries</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{viewingUser.points || 0}</p>
                    <p className="text-sm text-muted-foreground">Points</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{viewingUser.referrals || 0}</p>
                    <p className="text-sm text-muted-foreground">Referrals</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                
                {viewingUser.status === "active" ? (
                  <Button variant="destructive" onClick={() => onSuspendUser(viewingUser._id)}>
                    <Ban className="h-4 w-4 mr-2" />
                    Suspend User
                  </Button>
                ) : (
                  <Button onClick={() => onActivateUser(viewingUser._id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Activate User
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}