"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Calendar, 
  Award,
  Save,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  Star,
  Edit,
  Trash2,
  Plus,
  X
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

const specialties = [
  "flights", "hotels", "packages", "corporate", "luxury", "adventure", "medical", "education"
];

const accommodationTypes = [
  "hotel", "apartment", "villa", "resort", "hostel"
];

const flightClasses = [
  "economy", "premium_economy", "business", "first"
];

const mealPreferences = [
  "vegetarian", "vegan", "halal", "kosher", "none"
];

const transportationTypes = [
  "flight", "train", "bus", "car_rental", "mixed"
];

export default function AgentProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [agentProfile, setAgentProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    licenseNumber: "",
    licenseExpiryDate: "",
    experience: "",
    specialties: [],
    contactDetails: {
      phone: "",
      alternatePhone: "",
      officeAddress: "",
      website: ""
    },
    bio: "",
    languages: [],
    workingHours: {
      monday: { open: "09:00", close: "18:00", closed: false },
      tuesday: { open: "09:00", close: "18:00", closed: false },
      wednesday: { open: "09:00", close: "18:00", closed: false },
      thursday: { open: "09:00", close: "18:00", closed: false },
      friday: { open: "09:00", close: "18:00", closed: false },
      saturday: { open: "09:00", close: "18:00", closed: false },
      sunday: { open: "09:00", close: "18:00", closed: false }
    },
    commissionSettings: {
      flightCommission: 0,
      hotelCommission: 0,
      packageCommission: 0,
      customCommission: 0
    }
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackPath=/agent-profile");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchAgentProfile();
    }
  }, [session]);

  const fetchAgentProfile = async () => {
    try {
      const response = await fetch("/api/agents/profile");
      const data = await response.json();

      if (response.ok) {
        setAgentProfile(data.data);
        setFormData({
          licenseNumber: data.data.licenseNumber || "",
          licenseExpiryDate: data.data.licenseExpiryDate ? format(new Date(data.data.licenseExpiryDate), "yyyy-MM-dd") : "",
          experience: data.data.experience || "",
          specialties: data.data.specialties || [],
          contactDetails: {
            phone: data.data.contactDetails?.phone || "",
            alternatePhone: data.data.contactDetails?.alternatePhone || "",
            officeAddress: data.data.contactDetails?.officeAddress || "",
            website: data.data.contactDetails?.website || ""
          },
          bio: data.data.bio || "",
          languages: data.data.languages || [],
          workingHours: data.data.workingHours || {
            monday: { open: "09:00", close: "18:00", closed: false },
            tuesday: { open: "09:00", close: "18:00", closed: false },
            wednesday: { open: "09:00", close: "18:00", closed: false },
            thursday: { open: "09:00", close: "18:00", closed: false },
            friday: { open: "09:00", close: "18:00", closed: false },
            saturday: { open: "09:00", close: "18:00", closed: false },
            sunday: { open: "09:00", close: "18:00", closed: false }
          },
          commissionSettings: {
            flightCommission: data.data.commissionSettings?.flightCommission || 0,
            hotelCommission: data.data.commissionSettings?.hotelCommission || 0,
            packageCommission: data.data.commissionSettings?.packageCommission || 0,
            customCommission: data.data.commissionSettings?.customCommission || 0
          }
        });
      } else if (response.status === 404) {
        // Profile doesn't exist, redirect to create
        router.push("/agent-profile/create");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (section, field, value) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const updateWorkingHours = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: {
          ...prev.workingHours[day],
          [field]: value
        }
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch("/api/agents/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setAgentProfile(data.data);
      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (agentProfile) {
      setFormData({
        licenseNumber: agentProfile.licenseNumber || "",
        licenseExpiryDate: agentProfile.licenseExpiryDate ? format(new Date(agentProfile.licenseExpiryDate), "yyyy-MM-dd") : "",
        experience: agentProfile.experience || "",
        specialties: agentProfile.specialties || [],
        contactDetails: {
          phone: agentProfile.contactDetails?.phone || "",
          alternatePhone: agentProfile.contactDetails?.alternatePhone || "",
          officeAddress: agentProfile.contactDetails?.officeAddress || "",
          website: agentProfile.contactDetails?.website || ""
        },
        bio: agentProfile.bio || "",
        languages: agentProfile.languages || [],
        workingHours: agentProfile.workingHours || {
          monday: { open: "09:00", close: "18:00", closed: false },
          tuesday: { open: "09:00", close: "18:00", closed: false },
          wednesday: { open: "09:00", close: "18:00", closed: false },
          thursday: { open: "09:00", close: "18:00", closed: false },
          friday: { open: "09:00", close: "18:00", closed: false },
          saturday: { open: "09:00", close: "18:00", closed: false },
          sunday: { open: "09:00", close: "18:00", closed: false }
        },
        commissionSettings: {
          flightCommission: agentProfile.commissionSettings?.flightCommission || 0,
          hotelCommission: agentProfile.commissionSettings?.hotelCommission || 0,
          packageCommission: agentProfile.commissionSettings?.packageCommission || 0,
          customCommission: agentProfile.commissionSettings?.customCommission || 0
        }
      });
    }
    setIsEditing(false);
  };

  const getVerificationStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      verified: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      suspended: "bg-gray-100 text-gray-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getVerificationStatusIcon = (status) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "rejected":
        return <AlertCircle className="w-4 h-4" />;
      case "suspended":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (status === "loading" || loading) {
    return (
      <main className="mx-auto mb-[90px] w-[95%] sm:w-[90%]">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-6"></div>
          <div className="h-96 bg-muted rounded-lg"></div>
        </div>
      </main>
    );
  }

  if (error && !agentProfile) {
    return (
      <main className="mx-auto mb-[90px] w-[95%] sm:w-[90%]">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-destructive mb-2">Error</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto mb-[90px] w-[95%] sm:w-[90%]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Agent Profile</h1>
          <p className="text-muted-foreground">
            Manage your professional information and business details
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/agent-dashboard">
              Back to Dashboard
            </Link>
          </Button>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {success && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <span>Profile updated successfully!</span>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="licenseNumber">License Number *</Label>
                  <Input
                    id="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={(e) => updateFormData(null, "licenseNumber", e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="licenseExpiryDate">License Expiry Date *</Label>
                  <Input
                    id="licenseExpiryDate"
                    type="date"
                    value={formData.licenseExpiryDate}
                    onChange={(e) => updateFormData(null, "licenseExpiryDate", e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="experience">Years of Experience *</Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  value={formData.experience}
                  onChange={(e) => updateFormData(null, "experience", parseInt(e.target.value))}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Specialties</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {specialties.map((specialty) => (
                    <Badge
                      key={specialty}
                      variant={formData.specialties.includes(specialty) ? "default" : "outline"}
                      className={`cursor-pointer ${!isEditing ? "opacity-50" : ""}`}
                      onClick={() => {
                        if (isEditing) {
                          if (formData.specialties.includes(specialty)) {
                            updateFormData(null, "specialties", 
                              formData.specialties.filter(s => s !== specialty));
                          } else {
                            updateFormData(null, "specialties", 
                              [...formData.specialties, specialty]);
                          }
                        }
                      }}
                    >
                      {specialty.charAt(0).toUpperCase() + specialty.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => updateFormData(null, "bio", e.target.value)}
                  disabled={!isEditing}
                  placeholder="Tell clients about your experience and services..."
                  className="mt-1"
                  rows={4}
                />
              </div>

              <div>
                <Label>Languages</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Add a language"
                    disabled={!isEditing}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.target.value.trim() && isEditing) {
                        updateFormData(null, "languages", 
                          [...formData.languages, e.target.value.trim()]);
                        e.target.value = "";
                      }
                    }}
                  />
                  {isEditing && (
                    <Button type="button" variant="outline" size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.languages.map((language, index) => (
                    <Badge
                      key={index}
                      variant="default"
                      className="flex items-center gap-1"
                    >
                      {language}
                      {isEditing && (
                        <X
                          className="w-3 h-3 cursor-pointer"
                          onClick={() => updateFormData(null, "languages", 
                            formData.languages.filter((_, i) => i !== index))}
                        />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.contactDetails.phone}
                    onChange={(e) => updateFormData("contactDetails", "phone", e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="alternatePhone">Alternate Phone</Label>
                  <Input
                    id="alternatePhone"
                    value={formData.contactDetails.alternatePhone}
                    onChange={(e) => updateFormData("contactDetails", "alternatePhone", e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="officeAddress">Office Address *</Label>
                <Textarea
                  id="officeAddress"
                  value={formData.contactDetails.officeAddress}
                  onChange={(e) => updateFormData("contactDetails", "officeAddress", e.target.value)}
                  disabled={!isEditing}
                  placeholder="Your business address..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.contactDetails.website}
                  onChange={(e) => updateFormData("contactDetails", "website", e.target.value)}
                  disabled={!isEditing}
                  placeholder="https://yourwebsite.com"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Working Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Working Hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(formData.workingHours).map(([day, hours]) => (
                <div key={day} className="flex items-center gap-4">
                  <div className="w-24">
                    <Label className="capitalize">{day}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={!hours.closed}
                      onCheckedChange={(checked) => updateWorkingHours(day, "closed", !checked)}
                      disabled={!isEditing}
                    />
                    <span className="text-sm">Open</span>
                  </div>
                  {!hours.closed && (
                    <>
                      <Input
                        type="time"
                        value={hours.open}
                        onChange={(e) => updateWorkingHours(day, "open", e.target.value)}
                        disabled={!isEditing}
                        className="w-32"
                      />
                      <span>to</span>
                      <Input
                        type="time"
                        value={hours.close}
                        onChange={(e) => updateWorkingHours(day, "close", e.target.value)}
                        disabled={!isEditing}
                        className="w-32"
                      />
                    </>
                  )}
                  {hours.closed && (
                    <span className="text-sm text-muted-foreground">Closed</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Commission Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Commission Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="flightCommission">Flight Commission (%)</Label>
                  <Input
                    id="flightCommission"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.commissionSettings.flightCommission}
                    onChange={(e) => updateFormData("commissionSettings", "flightCommission", parseFloat(e.target.value))}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="hotelCommission">Hotel Commission (%)</Label>
                  <Input
                    id="hotelCommission"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.commissionSettings.hotelCommission}
                    onChange={(e) => updateFormData("commissionSettings", "hotelCommission", parseFloat(e.target.value))}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="packageCommission">Package Commission (%)</Label>
                  <Input
                    id="packageCommission"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.commissionSettings.packageCommission}
                    onChange={(e) => updateFormData("commissionSettings", "packageCommission", parseFloat(e.target.value))}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="customCommission">Custom Commission (%)</Label>
                  <Input
                    id="customCommission"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.commissionSettings.customCommission}
                    onChange={(e) => updateFormData("commissionSettings", "customCommission", parseFloat(e.target.value))}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={agentProfile?.user?.profileImage} />
                  <AvatarFallback className="text-2xl">
                    {agentProfile?.user?.firstName?.[0] || "A"}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="text-center">
                <h3 className="font-semibold text-lg">
                  {agentProfile?.user?.firstName} {agentProfile?.user?.lastName}
                </h3>
                <p className="text-muted-foreground">{agentProfile?.user?.email}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={`flex items-center gap-1 ${getVerificationStatusColor(agentProfile?.verificationStatus)}`}>
                    {getVerificationStatusIcon(agentProfile?.verificationStatus)}
                    {agentProfile?.verificationStatus}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{agentProfile?.rating || "0.0"}</span>
                  <span className="text-sm text-muted-foreground">
                    ({agentProfile?.reviewCount || 0} reviews)
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member Since</span>
                  <span>
                    {agentProfile?.createdAt ? format(new Date(agentProfile.createdAt), "MMM yyyy") : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span>{agentProfile?.performanceMetrics?.completedRequirements || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Response Time</span>
                  <span>{agentProfile?.performanceMetrics?.averageResponseTime || 0}m</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Completion Rate</span>
                  <span>
                    {agentProfile?.performanceMetrics?.totalRequirements > 0
                      ? Math.round((agentProfile.performanceMetrics.completedRequirements / agentProfile.performanceMetrics.totalRequirements) * 100)
                      : 0}%
                  </span>
                </div>
                <Progress 
                  value={
                    agentProfile?.performanceMetrics?.totalRequirements > 0
                      ? (agentProfile.performanceMetrics.completedRequirements / agentProfile.performanceMetrics.totalRequirements) * 100
                      : 0
                  } 
                  className="h-2" 
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Customer Satisfaction</span>
                  <span>{agentProfile?.performanceMetrics?.customerSatisfactionRating || 0}/5</span>
                </div>
                <Progress 
                  value={(agentProfile?.performanceMetrics?.customerSatisfactionRating || 0) * 20} 
                  className="h-2" 
                />
              </div>

              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold text-green-600">
                  ${agentProfile?.performanceMetrics?.totalRevenue || 0}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Verification Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {agentProfile?.verificationDocuments?.length > 0 ? (
                agentProfile.verificationDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">Document {index + 1}</span>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  No verification documents uploaded
                </p>
              )}
              {isEditing && (
                <Button variant="outline" className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}