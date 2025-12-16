"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  Shield, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Star, 
  Award, 
  Camera, 
  FileText, 
  UserCheck,
  Lock,
  Unlock
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function ProfileVerification({ verificationData, onVerificationSubmit, onDocumentUpload }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const { toast } = useToast();

  const verificationLevel = verificationData?.verificationLevel || 'basic';
  const verificationMethods = verificationData?.verificationMethods || [];
  const badges = verificationData?.badges || [];
  const trustScore = verificationData?.trustScore || 0;

  const getVerificationIcon = (method) => {
    const icons = {
      email: <FileText className="h-5 w-5" />,
      phone: <FileText className="h-5 w-5" />,
      document: <Upload className="h-5 w-5" />,
      video: <Camera className="h-5 w-5" />,
      social: <UserCheck className="h-5 w-5" />,
      government_id: <Shield className="h-5 w-5" />
    };
    return icons[method] || <FileText className="h-5 w-5" />;
  };

  const getVerificationStatus = (method) => {
    const methodData = verificationMethods.find(m => m.type === method);
    return methodData?.isCompleted ? 'completed' : 'pending';
  };

  const getBadgeIcon = (badgeType) => {
    const icons = {
      verified_traveler: <Shield className="h-6 w-6 text-blue-500" />,
      premium_member: <Star className="h-6 w-6 text-yellow-500" />,
      frequent_flyer: <Award className="h-6 w-6 text-purple-500" />,
      trusted_reviewer: <CheckCircle className="h-6 w-6 text-green-500" />,
      early_adopter: <Clock className="h-6 w-6 text-orange-500" />,
      community_leader: <Award className="h-6 w-6 text-red-500" />
    };
    return icons[badgeType] || <Shield className="h-6 w-6" />;
  };

  const handleFileUpload = async (event, documentType) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);
    formData.append('userId', verificationData.userId);

    setUploadProgress(prev => ({ ...prev, [documentType]: 0 }));

    try {
      const result = await onDocumentUpload(formData);
      
      if (result.success) {
        toast({
          title: "Document Uploaded",
          description: "Your document has been uploaded successfully",
          variant: "default",
        });
      } else {
        toast({
          title: "Upload Failed",
          description: result.message || "Failed to upload document",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setUploadProgress(prev => {
        const newState = { ...prev };
        delete newState[documentType];
        return newState;
      });
    }
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Verification Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Verification Status
          </CardTitle>
          <CardDescription>
            Current verification level and trust score
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold capitalize">
                {verificationLevel} Level
              </div>
              <Badge variant={verificationLevel === 'premium' ? 'default' : 'secondary'}>
                {verificationLevel === 'basic' && 'Basic Verification'}
                {verificationLevel === 'enhanced' && 'Enhanced Verification'}
                {verificationLevel === 'premium' && 'Premium Verification'}
              </Badge>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Trust Score</div>
              <div className="text-3xl font-bold text-green-600">
                {trustScore}/100
              </div>
            </div>
          </div>
          
          <Progress value={trustScore} className="w-full h-2" />
          
          <div className="text-sm text-muted-foreground">
            {trustScore >= 80 && 'Excellent trust level - Maximum benefits unlocked'}
            {trustScore >= 60 && trustScore < 80 && 'Good trust level - Most benefits available'}
            {trustScore >= 40 && trustScore < 60 && 'Moderate trust level - Some benefits available'}
            {trustScore < 40 && 'Basic trust level - Complete verification to unlock more benefits'}
          </div>
        </CardContent>
      </Card>

      {/* Verification Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Methods</CardTitle>
          <CardDescription>
            Complete verification methods to increase your trust score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {['email', 'phone', 'document', 'video', 'social', 'government_id'].map(method => {
              const methodData = verificationMethods.find(m => m.type === method);
              const isCompleted = methodData?.isCompleted || false;
              
              return (
                <div key={method} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getVerificationIcon(method)}
                    <div>
                      <div className="font-medium capitalize">
                        {method.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {isCompleted ? 'Verified' : 'Not Verified'}
                      </div>
                      {methodData?.expiresAt && (
                        <div className="text-xs text-orange-600">
                          Expires: {new Date(methodData.expiresAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Button size="sm" onClick={() => setActiveTab(method)}>
                        Verify
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      {badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Earned Badges
            </CardTitle>
            <CardDescription>
              Show off your achievements and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {badges.map((badge) => (
                <div key={badge._id} className="text-center p-4 border rounded-lg">
                  <div className="flex justify-center mb-2">
                    {getBadgeIcon(badge.type)}
                  </div>
                  <div className="font-medium text-sm">
                    {badge.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {badge.description}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Earned: {new Date(badge.earnedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const DocumentVerificationTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Document Verification</CardTitle>
          <CardDescription>
            Upload official documents to verify your identity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {['passport', 'visa', 'driver_license', 'national_id', 'health_certificate', 'travel_insurance'].map(docType => (
            <div key={docType} className="space-y-3">
              <div>
                <Label htmlFor={`${docType}_upload`} className="capitalize">
                  {docType.replace('_', ' ')} Document
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    id={`${docType}_upload`}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, docType)}
                    className="flex-1"
                  />
                  {uploadProgress[docType] !== undefined && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                  )}
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                Accepted formats: JPG, PNG, PDF (Max 5MB)
              </div>
            </div>
          ))}
          
          <Separator />
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              All documents are encrypted and stored securely. They are only used for verification purposes 
              and will never be shared without your consent.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );

  const VideoVerificationTab = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordedVideo, setRecordedVideo] = useState(null);

    const handleStartRecording = () => {
      setIsRecording(true);
      // Implementation would use WebRTC API for video recording
    };

    const handleStopRecording = () => {
      setIsRecording(false);
      // Implementation would stop recording and save video
    };

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Video Verification</CardTitle>
            <CardDescription>
              Record a short video to verify your identity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              <div className="mx-auto w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                {recordedVideo ? (
                  <video 
                    src={recordedVideo} 
                    className="w-full h-full rounded-lg"
                    controls
                  />
                ) : (
                  <Camera className="h-12 w-12 text-gray-400" />
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Record a 30-second video saying:
                </p>
                <div className="bg-muted p-3 rounded-lg text-sm">
                  "My name is [Your Name] and I am verifying my identity for [Travel Agency Name]"
                </div>
              </div>
              
              <div className="flex justify-center gap-4">
                {!isRecording ? (
                  <Button onClick={handleStartRecording}>
                    <Camera className="mr-2 h-4 w-4" />
                    Start Recording
                  </Button>
                ) : (
                  <Button onClick={handleStopRecording} variant="destructive">
                    <div className="animate-pulse mr-2 h-4 w-4 bg-red-500 rounded-full" />
                    Stop Recording
                  </Button>
                )}
                
                {recordedVideo && (
                  <Button onClick={() => onVerificationSubmit('video', recordedVideo)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Submit Video
                  </Button>
                )}
              </div>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Make sure you are in a well-lit area and speak clearly. 
                The video will be reviewed by our verification team.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  };

  const SocialVerificationTab = () => {
    const [socialAccounts, setSocialAccounts] = useState({
      facebook: '',
      twitter: '',
      linkedin: '',
      google: ''
    });

    const handleSocialConnect = (platform) => {
      // Implementation would connect to social media APIs
      toast({
        title: "Social Connection",
        description: `Connecting to ${platform}...`,
        variant: "default",
      });
    };

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Social Verification</CardTitle>
            <CardDescription>
              Connect social media accounts to verify your identity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(socialAccounts).map(([platform, username]) => (
              <div key={platform} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold">
                      {platform.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium capitalize">
                      {platform}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {username || 'Not connected'}
                    </div>
                  </div>
                </div>
                
                <Button 
                  size="sm" 
                  onClick={() => handleSocialConnect(platform)}
                  disabled={!!username}
                >
                  {username ? 'Connected' : 'Connect'}
                </Button>
              </div>
            ))}
            
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                We only verify your account exists and matches your profile information. 
                No posts or personal data will be accessed.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Trust Score Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-blue-900">
                Your Trust Score
              </div>
              <div className="text-3xl font-bold text-blue-900">
                {trustScore}/100
              </div>
              <div className="text-sm text-blue-700">
                {trustScore >= 80 && 'Excellent - All features available'}
                {trustScore >= 60 && trustScore < 80 && 'Good - Most features available'}
                {trustScore >= 40 && trustScore < 60 && 'Moderate - Some features available'}
                {trustScore < 40 && 'Basic - Complete verification for more features'}
              </div>
            </div>
            <div className="text-right">
              <Badge variant={trustScore >= 80 ? 'default' : 'secondary'} className="mb-2">
                {verificationLevel.toUpperCase()}
              </Badge>
              <div className="text-sm text-blue-700">
                Next Level: {verificationLevel === 'basic' ? 'Enhanced' : 
                          verificationLevel === 'enhanced' ? 'Premium' : 'Maximum'}
              </div>
              <Progress value={trustScore} className="w-full h-2 mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="document">Documents</TabsTrigger>
          <TabsTrigger value="video">Video</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="document">
          <DocumentVerificationTab />
        </TabsContent>

        <TabsContent value="video">
          <VideoVerificationTab />
        </TabsContent>

        <TabsContent value="social">
          <SocialVerificationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}