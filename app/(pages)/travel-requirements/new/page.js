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
import { Progress } from "@/components/ui/progress";
import { DatePicker } from "@/components/local-ui/DatePicker";
import { 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  X, 
  MapPin, 
  Calendar, 
  Users, 
  DollarSign,
  Info,
  CheckCircle
} from "lucide-react";
import Link from "next/link";

const steps = [
  { id: 1, title: "Basic Info", description: "Tell us about your travel needs" },
  { id: 2, title: "Destination & Dates", description: "Where and when do you want to travel?" },
  { id: 3, title: "Travelers & Budget", description: "Who's traveling and what's your budget?" },
  { id: 4, title: "Preferences", description: "Customize your travel experience" },
  { id: 5, title: "Review & Submit", description: "Review and submit your requirement" }
];

const categories = [
  { value: "flight", label: "Flight", icon: "✈️" },
  { value: "hotel", label: "Hotel", icon: "🏨" },
  { value: "package", label: "Package", icon: "📦" },
  { value: "custom", label: "Custom", icon: "⚙️" }
];

const priorities = [
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-800" },
  { value: "medium", label: "Medium", color: "bg-blue-100 text-blue-800" },
  { value: "high", label: "High", color: "bg-orange-100 text-orange-800" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-800" }
];

const accommodationTypes = [
  "hotel", "apartment", "villa", "resort", "hostel"
];

const flightClasses = [
  "economy", "premium_economy", "business", "first"
];

const mealPreferences = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "none", label: "No Preference" }
];

const transportationTypes = [
  "flight", "train", "bus", "car_rental", "mixed"
];

export default function NewRequirementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    priority: "medium",
    destinationInfo: {
      origin: "",
      destination: "",
      multiCity: []
    },
    travelDates: {
      departureDate: "",
      returnDate: "",
      flexibleDates: false,
      dateFlexibility: 3
    },
    travelerInfo: {
      adults: 1,
      children: 0,
      infants: 0,
      childrenAges: []
    },
    budget: {
      min: "",
      max: "",
      currency: "USD"
    },
    preferences: {
      accommodationType: [],
      flightClass: [],
      mealPreference: "none",
      transportation: "flight",
      activities: [],
      specialRequirements: []
    },
    deadline: "",
    tags: [],
    isPublic: true
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackPath=/travel-requirements/new");
    }
  }, [status, router]);

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

  const addArrayItem = (section, field, item) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: [...(prev[section][field] || []), item]
      }
    }));
  };

  const removeArrayItem = (section, field, index) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: prev[section][field].filter((_, i) => i !== index)
      }
    }));
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return formData.title && formData.description && formData.category;
      case 2:
        return formData.destinationInfo.origin && 
               formData.destinationInfo.destination && 
               formData.travelDates.departureDate;
      case 3:
        return formData.budget.min && formData.budget.max;
      case 4:
        return true; // Preferences are optional
      case 5:
        return true; // Review step
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/requirements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create requirement");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/travel-requirements/${data.data._id}`);
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <main className="mx-auto mb-[90px] w-[95%] sm:w-[90%]">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-muted rounded-lg"></div>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="mx-auto mb-[90px] w-[95%] sm:w-[90%]">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Requirement Created!</h2>
            <p className="text-muted-foreground mb-4">
              Your travel requirement has been created successfully.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to your requirement...
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto mb-[90px] w-[95%] sm:w-[90%]">
      <div className="mb-6">
        <Link href="/travel-requirements" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Requirements
        </Link>
        <h1 className="text-3xl font-bold mb-2">Create Travel Requirement</h1>
        <p className="text-muted-foreground">
          Tell us about your travel needs and we'll help you find the perfect solution
        </p>
      </div>

      {/* Progress */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? "border-primary bg-primary text-primary-foreground" 
                    : "border-muted-foreground text-muted-foreground"
                }`}>
                  {step.id}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-full h-0.5 mx-2 ${
                    currentStep > step.id ? "bg-primary" : "bg-muted-foreground"
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h3 className="font-semibold">{steps[currentStep - 1].title}</h3>
            <p className="text-sm text-muted-foreground">{steps[currentStep - 1].description}</p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="p-4">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Basic Info */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateFormData(null, "title", e.target.value)}
                placeholder="e.g., Family vacation to Hawaii"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateFormData(null, "description", e.target.value)}
                placeholder="Describe your travel requirements in detail..."
                className="mt-1"
                rows={4}
              />
            </div>

            <div>
              <Label>Category *</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                {categories.map((category) => (
                  <div
                    key={category.value}
                    onClick={() => updateFormData(null, "category", category.value)}
                    className={`p-3 border rounded-lg cursor-pointer text-center transition-colors ${
                      formData.category === category.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="text-2xl mb-1">{category.icon}</div>
                    <div className="text-sm font-medium">{category.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Priority</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {priorities.map((priority) => (
                  <Badge
                    key={priority.value}
                    variant={formData.priority === priority.value ? "default" : "outline"}
                    className={`cursor-pointer ${
                      formData.priority === priority.value ? priority.color : ""
                    }`}
                    onClick={() => updateFormData(null, "priority", priority.value)}
                  >
                    {priority.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPublic"
                checked={formData.isPublic}
                onCheckedChange={(checked) => updateFormData(null, "isPublic", checked)}
              />
              <Label htmlFor="isPublic" className="text-sm">
                Make this requirement public so agents can find it
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Destination & Dates */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Destination & Travel Dates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="origin">Origin *</Label>
                <Input
                  id="origin"
                  value={formData.destinationInfo.origin}
                  onChange={(e) => updateFormData("destinationInfo", "origin", e.target.value)}
                  placeholder="e.g., New York, USA"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="destination">Destination *</Label>
                <Input
                  id="destination"
                  value={formData.destinationInfo.destination}
                  onChange={(e) => updateFormData("destinationInfo", "destination", e.target.value)}
                  placeholder="e.g., Paris, France"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Departure Date *</Label>
                <DatePicker
                  date={formData.travelDates.departureDate}
                  setDate={(date) => updateFormData("travelDates", "departureDate", date)}
                  minDate={new Date()}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Return Date</Label>
                <DatePicker
                  date={formData.travelDates.returnDate}
                  setDate={(date) => updateFormData("travelDates", "returnDate", date)}
                  minDate={formData.travelDates.departureDate}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="flexibleDates"
                checked={formData.travelDates.flexibleDates}
                onCheckedChange={(checked) => updateFormData("travelDates", "flexibleDates", checked)}
              />
              <Label htmlFor="flexibleDates" className="text-sm">
                My travel dates are flexible
              </Label>
            </div>

            {formData.travelDates.flexibleDates && (
              <div>
                <Label htmlFor="dateFlexibility">Date Flexibility (days)</Label>
                <Input
                  id="dateFlexibility"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.travelDates.dateFlexibility}
                  onChange={(e) => updateFormData("travelDates", "dateFlexibility", parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label>Deadline for Quotes</Label>
              <DatePicker
                date={formData.deadline}
                setDate={(date) => updateFormData(null, "deadline", date)}
                minDate={new Date()}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Agents will need to respond before this date
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Travelers & Budget */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Travelers & Budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Number of Travelers</Label>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <Label htmlFor="adults" className="text-sm">Adults *</Label>
                  <Input
                    id="adults"
                    type="number"
                    min="1"
                    value={formData.travelerInfo.adults}
                    onChange={(e) => updateFormData("travelerInfo", "adults", parseInt(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="children" className="text-sm">Children</Label>
                  <Input
                    id="children"
                    type="number"
                    min="0"
                    value={formData.travelerInfo.children}
                    onChange={(e) => updateFormData("travelerInfo", "children", parseInt(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="infants" className="text-sm">Infants</Label>
                  <Input
                    id="infants"
                    type="number"
                    min="0"
                    value={formData.travelerInfo.infants}
                    onChange={(e) => updateFormData("travelerInfo", "infants", parseInt(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minBudget">Minimum Budget *</Label>
                <Input
                  id="minBudget"
                  type="number"
                  min="0"
                  value={formData.budget.min}
                  onChange={(e) => updateFormData("budget", "min", parseFloat(e.target.value))}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="maxBudget">Maximum Budget *</Label>
                <Input
                  id="maxBudget"
                  type="number"
                  min="0"
                  value={formData.budget.max}
                  onChange={(e) => updateFormData("budget", "max", parseFloat(e.target.value))}
                  placeholder="0"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={formData.budget.currency} onValueChange={(value) => updateFormData("budget", "currency", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Preferences */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Travel Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Accommodation Type</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {accommodationTypes.map((type) => (
                  <Badge
                    key={type}
                    variant={formData.preferences.accommodationType.includes(type) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (formData.preferences.accommodationType.includes(type)) {
                        removeArrayItem("preferences", "accommodationType", 
                          formData.preferences.accommodationType.indexOf(type));
                      } else {
                        addArrayItem("preferences", "accommodationType", type);
                      }
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Flight Class</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {flightClasses.map((classType) => (
                  <Badge
                    key={classType}
                    variant={formData.preferences.flightClass.includes(classType) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (formData.preferences.flightClass.includes(classType)) {
                        removeArrayItem("preferences", "flightClass", 
                          formData.preferences.flightClass.indexOf(classType));
                      } else {
                        addArrayItem("preferences", "flightClass", classType);
                      }
                    }}
                  >
                    {classType.replace("_", " ").charAt(0).toUpperCase() + classType.replace("_", " ").slice(1)}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Meal Preference</Label>
              <Select value={formData.preferences.mealPreference} onValueChange={(value) => updateFormData("preferences", "mealPreference", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mealPreferences.map((pref) => (
                    <SelectItem key={pref.value} value={pref.value}>
                      {pref.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Transportation</Label>
              <Select value={formData.preferences.transportation} onValueChange={(value) => updateFormData("preferences", "transportation", value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transportationTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace("_", " ").charAt(0).toUpperCase() + type.replace("_", " ").slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="activities">Activities</Label>
              <Input
                id="activities"
                value={formData.preferences.activities.join(", ")}
                onChange={(e) => updateFormData("preferences", "activities", e.target.value.split(", ").filter(Boolean))}
                placeholder="e.g., sightseeing, hiking, swimming"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate activities with commas
              </p>
            </div>

            <div>
              <Label htmlFor="specialRequirements">Special Requirements</Label>
              <Textarea
                id="specialRequirements"
                value={formData.preferences.specialRequirements.join("\n")}
                onChange={(e) => updateFormData("preferences", "specialRequirements", e.target.value.split("\n").filter(Boolean))}
                placeholder="Enter any special requirements, one per line"
                className="mt-1"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Review */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Review Your Requirement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Basic Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Title:</strong> {formData.title}</div>
                    <div><strong>Category:</strong> {formData.category}</div>
                    <div><strong>Priority:</strong> {formData.priority}</div>
                    <div><strong>Description:</strong> {formData.description}</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Destination & Dates</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Origin:</strong> {formData.destinationInfo.origin}</div>
                    <div><strong>Destination:</strong> {formData.destinationInfo.destination}</div>
                    <div><strong>Departure:</strong> {formData.travelDates.departureDate}</div>
                    <div><strong>Return:</strong> {formData.travelDates.returnDate || "One-way"}</div>
                    {formData.deadline && (
                      <div><strong>Deadline:</strong> {formData.deadline}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Travelers & Budget</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Travelers:</strong> {formData.travelerInfo.adults} adults
                      {formData.travelerInfo.children > 0 && `, ${formData.travelerInfo.children} children`}
                      {formData.travelerInfo.infants > 0 && `, ${formData.travelerInfo.infants} infants`}
                    </div>
                    <div>
                      <strong>Budget:</strong> {formData.budget.currency} {formData.budget.min} - {formData.budget.max}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Preferences</h3>
                  <div className="space-y-2 text-sm">
                    {formData.preferences.accommodationType.length > 0 && (
                      <div>
                        <strong>Accommodation:</strong> {formData.preferences.accommodationType.join(", ")}
                      </div>
                    )}
                    {formData.preferences.flightClass.length > 0 && (
                      <div>
                        <strong>Flight Class:</strong> {formData.preferences.flightClass.join(", ")}
                      </div>
                    )}
                    {formData.preferences.activities.length > 0 && (
                      <div>
                        <strong>Activities:</strong> {formData.preferences.activities.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Ready to submit?</p>
                  <p className="text-blue-700">
                    Once submitted, your requirement will be visible to agents who can provide quotes for your travel needs.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        {currentStep < steps.length ? (
          <Button onClick={nextStep} disabled={!validateStep(currentStep)}>
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Submit Requirement"}
          </Button>
        )}
      </div>
    </main>
  );
}