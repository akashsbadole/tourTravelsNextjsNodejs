"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  Key, 
  Smartphone, 
  Mail, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Download,
  Trash2,
  RefreshCw,
  UserX,
  Fingerprint,
  Bell,
  Globe,
  Database,
  FileText,
  Activity,
  Settings,
  Info,
  AlertCircle,
  Camera,
  MapPin,
  Calendar,
  CreditCard,
  Users,
  MessageSquare,
  Share2,
  Ban,
  ShieldCheck
} from "lucide-react";
import { format, subDays } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

export function PrivacySecurityControls({ 
  privacySettings, 
  securitySettings, 
  loginActivity, 
  connectedApps,
  onUpdatePrivacySettings,
  onUpdateSecuritySettings,
  onEnable2FA,
  onDisable2FA,
  onRevokeSession,
  onDisconnectApp,
  onExportData,
  onDeleteAccount
}) {
  const [activeTab, setActiveTab] = useState("privacy");
  const [is2FAEnabled, setIs2FAEnabled] = useState(securitySettings?.twoFactorEnabled || false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const { toast } = useToast();

  const handle2FAToggle = async () => {
    if (is2FAEnabled) {
      const result = await onDisable2FA();
      if (result.success) {
        setIs2FAEnabled(false);
        toast({
          title: "2FA Disabled",
          description: "Two-factor authentication has been disabled",
        });
      }
    } else {
      const result = await onEnable2FA();
      if (result.success) {
        setIs2FAEnabled(true);
        toast({
          title: "2FA Enabled",
          description: "Two-factor authentication has been enabled",
        });
      }
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match",
        variant: "destructive",
      });
      return;
    }

    // Password change logic would go here
    toast({
      title: "Password Updated",
      description: "Your password has been changed successfully",
    });
    
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleDataExport = async (dataType) => {
    const result = await onExportData(dataType);
    if (result.success) {
      toast({
        title: "Export Started",
        description: "Your data export is being prepared. You'll receive an email when it's ready.",
      });
    }
  };

  const handleAccountDeletion = async () => {
    if (deleteConfirmation !== "DELETE MY ACCOUNT") {
      toast({
        title: "Confirmation Required",
        description: "Please type 'DELETE MY ACCOUNT' to confirm deletion",
        variant: "destructive",
      });
      return;
    }

    setIsDeletingAccount(true);
    const result = await onDeleteAccount();
    
    if (result.success) {
      toast({
        title: "Account Deletion Scheduled",
        description: "Your account will be deleted in 30 days. You can cancel anytime.",
      });
    } else {
      toast({
        title: "Deletion Failed",
        description: result.message || "Failed to schedule account deletion",
        variant: "destructive",
      });
    }
    
    setIsDeletingAccount(false);
    setDeleteConfirmation("");
  };

  const PrivacyTab = () => (
    <div className="space-y-6">
      {/* Profile Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Profile Visibility
          </CardTitle>
          <CardDescription>
            Control who can see your profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Public Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Make your profile visible to other travelers
                  </p>
                </div>
                <Switch 
                  defaultChecked={privacySettings?.publicProfile || false}
                  onCheckedChange={(checked) => onUpdatePrivacySettings({ publicProfile: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Travel History</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your past trips on public profile
                  </p>
                </div>
                <Switch 
                  defaultChecked={privacySettings?.showTravelHistory || false}
                  onCheckedChange={(checked) => onUpdatePrivacySettings({ showTravelHistory: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Reviews</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your reviews and ratings publicly
                  </p>
                </div>
                <Switch 
                  defaultChecked={privacySettings?.showReviews || false}
                  onCheckedChange={(checked) => onUpdatePrivacySettings({ showReviews: checked })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Photos</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your travel photos publicly
                  </p>
                </div>
                <Switch 
                  defaultChecked={privacySettings?.showPhotos || false}
                  onCheckedChange={(checked) => onUpdatePrivacySettings({ showPhotos: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Achievements</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your travel badges and achievements
                  </p>
                </div>
                <Switch 
                  defaultChecked={privacySettings?.showAchievements || true}
                  onCheckedChange={(checked) => onUpdatePrivacySettings({ showAchievements: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Messages</Label>
                  <p className="text-sm text-muted-foreground">
                    Let other travelers send you messages
                  </p>
                </div>
                <Switch 
                  defaultChecked={privacySettings?.allowMessages || false}
                  onCheckedChange={(checked) => onUpdatePrivacySettings({ allowMessages: checked })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Sharing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Data Sharing Preferences
          </CardTitle>
          <CardDescription>
            Control how your data is shared with partners
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Travel Providers</Label>
                  <p className="text-sm text-muted-foreground">
                    Share preferences with airlines and hotels
                  </p>
                </div>
                <Switch 
                  defaultChecked={privacySettings?.shareWithProviders || true}
                  onCheckedChange={(checked) => onUpdatePrivacySettings({ shareWithProviders: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Loyalty Programs</Label>
                  <p className="text-sm text-muted-foreground">
                    Share travel data for better rewards
                  </p>
                </div>
                <Switch 
                  defaultChecked={privacySettings?.shareWithLoyalty || false}
                  onCheckedChange={(checked) => onUpdatePrivacySettings({ shareWithLoyalty: checked })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Travel Insurance</Label>
                  <p className="text-sm text-muted-foreground">
                    Share travel history for insurance benefits
                  </p>
                </div>
                <Switch 
                  defaultChecked={privacySettings?.shareWithInsurance || false}
                  onCheckedChange={(checked) => onUpdatePrivacySettings({ shareWithInsurance: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Analytics & Research</Label>
                  <p className="text-sm text-muted-foreground">
                    Contribute to travel research (anonymized)
                  </p>
                </div>
                <Switch 
                  defaultChecked={privacySettings?.shareForResearch || false}
                  onCheckedChange={(checked) => onUpdatePrivacySettings({ shareForResearch: checked })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Privacy
          </CardTitle>
          <CardDescription>
            Manage your location data and tracking preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Current Location</Label>
                  <p className="text-sm text-muted-foreground">
                    Share your current location while traveling
                  </p>
                </div>
                <Switch 
                  defaultChecked={privacySettings?.shareCurrentLocation || false}
                  onCheckedChange={(checked) => onUpdatePrivacySettings({ shareCurrentLocation: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Location History</Label>
                  <p className="text-sm text-muted-foreground">
                    Save and display your location history
                  </p>
                </div>
                <Switch 
                  defaultChecked={privacySettings?.saveLocationHistory || true}
                  onCheckedChange={(checked) => onUpdatePrivacySettings({ saveLocationHistory: checked })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Geotag Photos</Label>
                  <p className="text-sm text-muted-foreground">
                    Add location data to your photos
                  </p>
                </div>
                <Switch 
                  defaultChecked={privacySettings?.geotagPhotos || false}
                  onCheckedChange={(checked) => onUpdatePrivacySettings({ geotagPhotos: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Travel Tracking</Label>
                  <p className="text-sm text-muted-foreground">
                    Track your movements during trips
                  </p>
                </div>
                <Switch 
                  defaultChecked={privacySettings?.enableTravelTracking || false}
                  onCheckedChange={(checked) => onUpdatePrivacySettings({ enableTravelTracking: checked })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const SecurityTab = () => (
    <div className="space-y-6">
      {/* Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Authentication
          </CardTitle>
          <CardDescription>
            Manage your account security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Two-Factor Authentication */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5" />
              <div>
                <h3 className="font-medium">Two-Factor Authentication</h3>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={is2FAEnabled ? "default" : "secondary"}>
                {is2FAEnabled ? "Enabled" : "Disabled"}
              </Badge>
              <Button onClick={handle2FAToggle}>
                {is2FAEnabled ? "Disable" : "Enable"}
              </Button>
            </div>
          </div>

          {/* Password Change */}
          <div className="space-y-4">
            <h3 className="font-medium">Change Password</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Current Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div>
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              
              <div>
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            
            <Button onClick={handlePasswordChange} disabled={!currentPassword || !newPassword || !confirmPassword}>
              Update Password
            </Button>
          </div>

          {/* Biometric Authentication */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Fingerprint className="h-5 w-5" />
              <div>
                <h3 className="font-medium">Biometric Authentication</h3>
                <p className="text-sm text-muted-foreground">
                  Use fingerprint or face recognition to sign in
                </p>
              </div>
            </div>
            <Switch defaultChecked={securitySettings?.biometricEnabled || false} />
          </div>
        </CardContent>
      </Card>

      {/* Login Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Login Activity
          </CardTitle>
          <CardDescription>
            Monitor recent account access and active sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loginActivity?.map((session) => (
                <TableRow key={session._id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {session.deviceType === "mobile" ? <Smartphone className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                      <div>
                        <div className="font-medium">{session.deviceName}</div>
                        <div className="text-sm text-muted-foreground">{session.browser}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{session.location}</TableCell>
                  <TableCell className="font-mono text-sm">{session.ipAddress}</TableCell>
                  <TableCell>{format(new Date(session.lastActive), "PPP p")}</TableCell>
                  <TableCell>
                    <Badge variant={session.current ? "default" : "secondary"}>
                      {session.current ? "Current" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {!session.current && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onRevokeSession(session._id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Connected Apps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Connected Applications
          </CardTitle>
          <CardDescription>
            Manage third-party applications with access to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {connectedApps?.map((app) => (
              <div key={app._id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    {app.icon || <Globe className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="font-medium">{app.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Connected {format(new Date(app.connectedAt), "PPP")}
                    </p>
                    <div className="flex gap-2 mt-1">
                      {app.permissions.map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDisconnectApp(app._id)}
                >
                  Disconnect
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const DataManagementTab = () => (
    <div className="space-y-6">
      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Export
          </CardTitle>
          <CardDescription>
            Download your personal data in various formats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto p-4 flex-col items-start"
              onClick={() => handleDataExport("profile")}
            >
              <UserX className="h-6 w-6 mb-2" />
              <div className="text-left">
                <h3 className="font-medium">Profile Data</h3>
                <p className="text-sm text-muted-foreground">
                  Personal information, preferences, settings
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex-col items-start"
              onClick={() => handleDataExport("travel")}
            >
              <Calendar className="h-6 w-6 mb-2" />
              <div className="text-left">
                <h3 className="font-medium">Travel History</h3>
                <p className="text-sm text-muted-foreground">
                  Bookings, trips, itineraries
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex-col items-start"
              onClick={() => handleDataExport("documents")}
            >
              <FileText className="h-6 w-6 mb-2" />
              <div className="text-left">
                <h3 className="font-medium">Documents</h3>
                <p className="text-sm text-muted-foreground">
                  Uploaded documents, verification files
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex-col items-start"
              onClick={() => handleDataExport("payments")}
            >
              <CreditCard className="h-6 w-6 mb-2" />
              <div className="text-left">
                <h3 className="font-medium">Payment History</h3>
                <p className="text-sm text-muted-foreground">
                  Transactions, receipts, invoices
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex-col items-start"
              onClick={() => handleDataExport("communications")}
            >
              <MessageSquare className="h-6 w-6 mb-2" />
              <div className="text-left">
                <h3 className="font-medium">Communications</h3>
                <p className="text-sm text-muted-foreground">
                  Messages, notifications, support tickets
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-auto p-4 flex-col items-start"
              onClick={() => handleDataExport("all")}
            >
              <Database className="h-6 w-6 mb-2" />
              <div className="text-left">
                <h3 className="font-medium">Complete Data</h3>
                <p className="text-sm text-muted-foreground">
                  All your data in a single archive
                </p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Data Retention Settings
          </CardTitle>
          <CardDescription>
            Control how long your data is stored
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Travel History Retention</Label>
                <Select defaultValue="5years">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1year">1 Year</SelectItem>
                    <SelectItem value="2years">2 Years</SelectItem>
                    <SelectItem value="5years">5 Years</SelectItem>
                    <SelectItem value="10years">10 Years</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Payment History Retention</Label>
                <Select defaultValue="7years">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1year">1 Year</SelectItem>
                    <SelectItem value="2years">2 Years</SelectItem>
                    <SelectItem value="5years">5 Years</SelectItem>
                    <SelectItem value="7years">7 Years (Legal Requirement)</SelectItem>
                    <SelectItem value="10years">10 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Location Data Retention</Label>
                <Select defaultValue="1year">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3months">3 Months</SelectItem>
                    <SelectItem value="6months">6 Months</SelectItem>
                    <SelectItem value="1year">1 Year</SelectItem>
                    <SelectItem value="2years">2 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Communication History</Label>
                <Select defaultValue="2years">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6months">6 Months</SelectItem>
                    <SelectItem value="1year">1 Year</SelectItem>
                    <SelectItem value="2years">2 Years</SelectItem>
                    <SelectItem value="5years">5 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Some data types have legal minimum retention periods and cannot be deleted earlier.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Account Deletion */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <UserX className="h-5 w-5" />
            Delete Account
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> This action cannot be undone. All your data will be permanently deleted after a 30-day grace period.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label htmlFor="delete-confirmation">Type "DELETE MY ACCOUNT" to confirm</Label>
              <Input
                id="delete-confirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                className="mt-1"
              />
            </div>

            <Button
              variant="destructive"
              onClick={handleAccountDeletion}
              disabled={deleteConfirmation !== "DELETE MY ACCOUNT" || isDeletingAccount}
            >
              {isDeletingAccount ? "Processing..." : "Delete Account"}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>• Account will be scheduled for deletion in 30 days</p>
            <p>• You can cancel deletion anytime during this period</p>
            <p>• All data will be permanently removed after grace period</p>
            <p>• Some data may be retained for legal requirements</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Privacy & Security</h2>
        <p className="text-muted-foreground">Manage your privacy settings and account security</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="data">Data Management</TabsTrigger>
        </TabsList>

        <TabsContent value="privacy">
          <PrivacyTab />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="data">
          <DataManagementTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}