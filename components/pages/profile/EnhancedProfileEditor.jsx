"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, UploadIcon, SaveIcon, AlertCircleIcon, CheckCircleIcon } from "lucide-react";
import { format } from "date-fns";

// Form validation schemas
const personalInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50, "First name must be less than 50 characters"),
  lastName: z.string().min(1, "Last name is required").max(50, "Last name must be less than 50 characters"),
  dateOfBirth: z.date().optional(),
  address: z.string().max(200, "Address must be less than 200 characters").optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
});

const travelPreferencesSchema = z.object({
  travelStyle: z.enum(["budget", "mid_range", "luxury", "backpacker", "family", "business", "adventure"]),
  accommodationTypes: z.array(z.string()).min(1, "Select at least one accommodation type"),
  transportModes: z.array(z.string()).min(1, "Select at least one transport mode"),
  tripDuration: z.object({
    min: z.number().min(1).max(365),
    max: z.number().min(1).max(365),
  }),
  budgetRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
    currency: z.string().default("USD"),
  }),
  flightPreferences: z.object({
    preferredAirlines: z.array(z.string()).optional(),
    preferredCabinClass: z.enum(["economy", "premium_economy", "business", "first"]),
    seatPreferences: z.array(z.string()).optional(),
    mealPreferences: z.array(z.string()).optional(),
  }),
  hotelPreferences: z.object({
    preferredChains: z.array(z.string()).optional(),
    roomType: z.enum(["standard", "deluxe", "suite", "presidential"]),
    bedPreferences: z.array(z.string()).optional(),
    amenities: z.array(z.string()).optional(),
  }),
});

const emergencyContactSchema = z.object({
  name: z.string().min(1, "Contact name is required").max(100, "Name must be less than 100 characters"),
  relationship: z.string().min(1, "Relationship is required").max(50, "Relationship must be less than 50 characters"),
  phone: z.object({
    number: z.string().regex(/^\d+$/, "Invalid phone number"),
    dialCode: z.string().min(1, "Country code is required"),
  }),
  email: z.string().email("Invalid email address").optional(),
  address: z.string().max(200, "Address must be less than 200 characters").optional(),
  isPrimary: z.boolean().default(false),
});

const privacySettingsSchema = z.object({
  profileVisibility: z.enum(["public", "friends_only", "private"]),
  dataSharing: z.object({
    analytics: z.boolean(),
    marketing: z.boolean(),
    personalization: z.boolean(),
    partners: z.boolean(),
  }),
  communicationPreferences: z.object({
    email: z.object({
      promotional: z.boolean(),
      transactional: z.boolean(),
      newsletter: z.boolean(),
      priceAlerts: z.boolean(),
    }),
    sms: z.object({
      promotional: z.boolean(),
      transactional: z.boolean(),
      alerts: z.boolean(),
    }),
    push: z.object({
      promotional: z.boolean(),
      transactional: z.boolean(),
      recommendations: z.boolean(),
    }),
  }),
  socialSettings: z.object({
    allowFriendRequests: z.boolean(),
    showTravelHistory: z.boolean(),
    showCurrentTrips: z.boolean(),
    showWishlist: z.boolean(),
    allowTagging: z.boolean(),
  }),
});

export function EnhancedProfileEditor({ initialData, onSave, onCancel }) {
  const [activeTab, setActiveTab] = useState("personal");
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [profileCompletion, setProfileCompletion] = useState(0);
  const { toast } = useToast();

  // Form hooks for different sections
  const personalForm = useForm({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: initialData?.personalInfo || {},
  });

  const travelForm = useForm({
    resolver: zodResolver(travelPreferencesSchema),
    defaultValues: initialData?.travelPreferences || {},
  });

  const emergencyForm = useForm({
    resolver: zodResolver(emergencyContactSchema),
    defaultValues: initialData?.emergencyContacts?.[0] || {},
  });

  const privacyForm = useForm({
    resolver: zodResolver(privacySettingsSchema),
    defaultValues: initialData?.privacy || {},
  });

  useEffect(() => {
    // Calculate profile completion
    const completion = calculateProfileCompletion(initialData);
    setProfileCompletion(completion);
  }, [initialData]);

  const calculateProfileCompletion = (data) => {
    let score = 0;
    const maxScore = 100;

    // Personal info (30%)
    if (data?.personalInfo?.firstName && data?.personalInfo?.lastName) score += 10;
    if (data?.personalInfo?.dateOfBirth) score += 5;
    if (data?.personalInfo?.address) score += 5;
    if (data?.personalInfo?.bio) score += 5;
    if (data?.personalInfo?.profileImage) score += 5;

    // Travel preferences (25%)
    if (data?.travelPreferences?.travelStyle) score += 5;
    if (data?.travelPreferences?.accommodationTypes?.length > 0) score += 5;
    if (data?.travelPreferences?.transportModes?.length > 0) score += 5;
    if (data?.travelPreferences?.flightPreferences) score += 5;
    if (data?.travelPreferences?.hotelPreferences) score += 5;

    // Emergency contacts (15%)
    if (data?.emergencyContacts?.length > 0) score += 15;

    // Privacy settings (20%)
    if (data?.privacy?.profileVisibility) score += 5;
    if (data?.privacy?.dataSharing) score += 5;
    if (data?.privacy?.communicationPreferences) score += 5;
    if (data?.privacy?.socialSettings) score += 5;

    // Documents (10%)
    if (data?.travelDocuments?.length > 0) score += 10;

    return Math.min(Math.round((score / maxScore) * 100), 100);
  };

  const handleSave = async (section, data) => {
    setIsSaving(true);
    setValidationErrors({});

    try {
      const result = await onSave(section, data);
      
      if (result.success) {
        toast({
          title: "Success",
          description: `${section} information saved successfully`,
          variant: "default",
        });
        
        // Update completion percentage
        const newCompletion = calculateProfileCompletion({
          ...initialData,
          [section]: data,
        });
        setProfileCompletion(newCompletion);
      } else {
        setValidationErrors(result.errors || {});
        toast({
          title: "Error",
          description: result.message || "Failed to save information",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const PersonalInfoSection = () => (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>
          Update your personal details and bio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={personalForm.handleSubmit((data) => handleSave("personalInfo", data))}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                {...personalForm.register("firstName")}
                error={personalForm.formState.errors.firstName?.message}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                {...personalForm.register("lastName")}
                error={personalForm.formState.errors.lastName?.message}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${
                    !personalForm.watch("dateOfBirth") && "text-muted-foreground"
                  }`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {personalForm.watch("dateOfBirth") ? (
                    format(personalForm.watch("dateOfBirth"), "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={personalForm.watch("dateOfBirth")}
                  onSelect={(date) => personalForm.setValue("dateOfBirth", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              {...personalForm.register("address")}
              error={personalForm.formState.errors.address?.message}
            />
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              {...personalForm.register("bio")}
              error={personalForm.formState.errors.bio?.message}
              placeholder="Tell us about yourself and your travel preferences..."
              className="min-h-[100px]"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const TravelPreferencesSection = () => (
    <Card>
      <CardHeader>
        <CardTitle>Travel Preferences</CardTitle>
        <CardDescription>
          Set your travel preferences for personalized recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={travelForm.handleSubmit((data) => handleSave("travelPreferences", data))}>
          <div>
            <Label>Travel Style</Label>
            <Select
              value={travelForm.watch("travelStyle")}
              onValueChange={(value) => travelForm.setValue("travelStyle", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your travel style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="budget">Budget</SelectItem>
                <SelectItem value="mid_range">Mid-Range</SelectItem>
                <SelectItem value="luxury">Luxury</SelectItem>
                <SelectItem value="backpacker">Backpacker</SelectItem>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="adventure">Adventure</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Accommodation Types</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {["hotel", "hostel", "apartment", "resort", "villa", "guesthouse"].map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={type}
                    checked={travelForm.watch("accommodationTypes")?.includes(type)}
                    onCheckedChange={(checked) => {
                      const current = travelForm.watch("accommodationTypes") || [];
                      if (checked) {
                        travelForm.setValue("accommodationTypes", [...current, type]);
                      } else {
                        travelForm.setValue("accommodationTypes", current.filter(t => t !== type));
                      }
                    }}
                  />
                  <Label htmlFor={type} className="capitalize">
                    {type.replace("_", " ")}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Transport Modes</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {["flight", "train", "bus", "car_rental", "cruise", "taxi"].map((mode) => (
                <div key={mode} className="flex items-center space-x-2">
                  <Checkbox
                    id={mode}
                    checked={travelForm.watch("transportModes")?.includes(mode)}
                    onCheckedChange={(checked) => {
                      const current = travelForm.watch("transportModes") || [];
                      if (checked) {
                        travelForm.setValue("transportModes", [...current, mode]);
                      } else {
                        travelForm.setValue("transportModes", current.filter(m => m !== mode));
                      }
                    }}
                  />
                  <Label htmlFor={mode} className="capitalize">
                    {mode.replace("_", " ")}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minDuration">Min Trip Duration (days)</Label>
              <Input
                id="minDuration"
                type="number"
                {...travelForm.register("tripDuration.min")}
                error={travelForm.formState.errors.tripDuration?.min?.message}
              />
            </div>
            <div>
              <Label htmlFor="maxDuration">Max Trip Duration (days)</Label>
              <Input
                id="maxDuration"
                type="number"
                {...travelForm.register("tripDuration.max")}
                error={travelForm.formState.errors.tripDuration?.max?.message}
              />
            </div>
          </div>

          <div>
            <Label>Flight Preferences</Label>
            <div className="space-y-3 mt-2">
              <div>
                <Label>Preferred Cabin Class</Label>
                <Select
                  value={travelForm.watch("flightPreferences.preferredCabinClass")}
                  onValueChange={(value) => travelForm.setValue("flightPreferences.preferredCabinClass", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cabin class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economy">Economy</SelectItem>
                    <SelectItem value="premium_economy">Premium Economy</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="first">First Class</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Seat Preferences</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {["window", "aisle", "middle", "exit_row", "front", "back"].map((seat) => (
                    <div key={seat} className="flex items-center space-x-2">
                      <Checkbox
                        id={seat}
                        checked={travelForm.watch("flightPreferences.seatPreferences")?.includes(seat)}
                        onCheckedChange={(checked) => {
                          const current = travelForm.watch("flightPreferences.seatPreferences") || [];
                          if (checked) {
                            travelForm.setValue("flightPreferences.seatPreferences", [...current, seat]);
                          } else {
                            travelForm.setValue("flightPreferences.seatPreferences", current.filter(s => s !== seat));
                          }
                        }}
                      />
                      <Label htmlFor={seat} className="capitalize">
                        {seat.replace("_", " ")}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="mr-2 h-4 w-4" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const EmergencyContactsSection = () => (
    <Card>
      <CardHeader>
        <CardTitle>Emergency Contacts</CardTitle>
        <CardDescription>
          Add emergency contacts for travel safety
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={emergencyForm.handleSubmit((data) => handleSave("emergencyContacts", [data]))}>
          <div>
            <Label htmlFor="contactName">Contact Name</Label>
            <Input
              id="contactName"
              {...emergencyForm.register("name")}
              error={emergencyForm.formState.errors.name?.message}
            />
          </div>

          <div>
            <Label htmlFor="relationship">Relationship</Label>
            <Input
              id="relationship"
              {...emergencyForm.register("relationship")}
              error={emergencyForm.formState.errors.relationship?.message}
              placeholder="e.g., Spouse, Parent, Friend"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dialCode">Country Code</Label>
              <Input
                id="dialCode"
                {...emergencyForm.register("phone.dialCode")}
                error={emergencyForm.formState.errors.phone?.dialCode?.message}
                placeholder="+1"
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                {...emergencyForm.register("phone.number")}
                error={emergencyForm.formState.errors.phone?.number?.message}
                placeholder="555-0123"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              {...emergencyForm.register("email")}
              error={emergencyForm.formState.errors.email?.message}
            />
          </div>

          <div>
            <Label htmlFor="emergencyAddress">Address (Optional)</Label>
            <Textarea
              id="emergencyAddress"
              {...emergencyForm.register("address")}
              error={emergencyForm.formState.errors.address?.message}
              placeholder="Contact's address"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPrimary"
              {...emergencyForm.register("isPrimary")}
            />
            <Label htmlFor="isPrimary">Primary Emergency Contact</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="mr-2 h-4 w-4" />
                  Save Contact
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const PrivacySettingsSection = () => (
    <Card>
      <CardHeader>
        <CardTitle>Privacy Settings</CardTitle>
        <CardDescription>
          Manage your privacy and communication preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={privacyForm.handleSubmit((data) => handleSave("privacy", data))}>
          <div>
            <Label>Profile Visibility</Label>
            <Select
              value={privacyForm.watch("profileVisibility")}
              onValueChange={(value) => privacyForm.setValue("profileVisibility", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="friends_only">Friends Only</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Data Sharing Preferences</Label>
            <div className="space-y-3 mt-2">
              {[
                { key: "analytics", label: "Analytics and Personalization" },
                { key: "marketing", label: "Marketing Communications" },
                { key: "personalization", label: "Personalized Recommendations" },
                { key: "partners", label: "Partner Services" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key}>{label}</Label>
                  <Checkbox
                    id={key}
                    checked={privacyForm.watch(`dataSharing.${key}`)}
                    onCheckedChange={(checked) => privacyForm.setValue(`dataSharing.${key}`, checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Social Settings</Label>
            <div className="space-y-3 mt-2">
              {[
                { key: "allowFriendRequests", label: "Allow Friend Requests" },
                { key: "showTravelHistory", label: "Show Travel History" },
                { key: "showCurrentTrips", label: "Show Current Trips" },
                { key: "showWishlist", label: "Show Wishlist" },
                { key: "allowTagging", label: "Allow Tagging" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key}>{label}</Label>
                  <Checkbox
                    id={key}
                    checked={privacyForm.watch(`socialSettings.${key}`)}
                    onCheckedChange={(checked) => privacyForm.setValue(`socialSettings.${key}`, checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Profile Completion Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Profile Completion
            <Badge variant={profileCompletion >= 80 ? "default" : "secondary"}>
              {profileCompletion}% Complete
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={profileCompletion} className="w-full" />
          <p className="text-sm text-muted-foreground mt-2">
            {profileCompletion >= 80
              ? "Great! Your profile is almost complete."
              : profileCompletion >= 50
              ? "You're making good progress. Keep adding information to complete your profile."
              : "Let's get your profile set up! Add more information to unlock all features."}
          </p>
          {profileCompletion < 80 && (
            <Alert className="mt-4">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertDescription>
                Complete your profile to unlock rewards, better recommendations, and enhanced features!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Main Editor Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="travel">Travel Preferences</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Contacts</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <PersonalInfoSection />
        </TabsContent>

        <TabsContent value="travel" className="space-y-4">
          <TravelPreferencesSection />
        </TabsContent>

        <TabsContent value="emergency" className="space-y-4">
          <EmergencyContactsSection />
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <PrivacySettingsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}