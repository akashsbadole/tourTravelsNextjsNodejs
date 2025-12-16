"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Star, 
  Upload, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check,
  Camera,
  Video,
  Plus,
  Trash2,
  AlertCircle,
  Info
} from "lucide-react";
import { generateStars } from "@/lib/utils.client";
import { RatingStar } from "@/components/local-ui/ratingStar";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: 'comfort', label: 'Comfort', description: 'Seat comfort, legroom, overall comfort' },
  { key: 'service', label: 'Service', description: 'Crew attitude, helpfulness, professionalism' },
  { key: 'food', label: 'Food & Beverages', description: 'Meal quality, variety, presentation' },
  { key: 'punctuality', label: 'Punctuality', description: 'On-time performance, schedule adherence' },
  { key: 'cleanliness', label: 'Cleanliness', description: 'Aircraft cleanliness, hygiene standards' },
  { key: 'amenities', label: 'Amenities', description: 'Entertainment, WiFi, power outlets' },
  { key: 'value', label: 'Value', description: 'Price vs. quality ratio' }
];

const TRIP_TYPES = [
  { value: 'business', label: 'Business', icon: '💼' },
  { value: 'leisure', label: 'Leisure', icon: '🏖️' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
  { value: 'solo', label: 'Solo', icon: '🧑' },
  { value: 'couple', label: 'Couple', icon: '💑' },
  { value: 'group', label: 'Group', icon: '👥' }
];

const TRAVEL_CLASSES = [
  { value: 'economy', label: 'Economy', icon: '✈️' },
  { value: 'premium_economy', label: 'Premium Economy', icon: '⭐' },
  { value: 'business', label: 'Business', icon: '💼' },
  { value: 'first', label: 'First Class', icon: '💎' }
];

export function ReviewSubmissionWizard({ flightData, existingReview, onSubmit, onCancel }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [reviewData, setReviewData] = useState({
    // Basic info
    title: existingReview?.title || '',
    rating: existingReview?.rating || 0,
    comment: existingReview?.comment || '',
    
    // Category ratings
    categoryRatings: existingReview?.categoryRatings || {
      comfort: 0,
      service: 0,
      food: 0,
      punctuality: 0,
      cleanliness: 0,
      amenities: 0,
      value: 0
    },
    
    // Trip details
    tripType: existingReview?.tripType || '',
    travelClass: existingReview?.travelClass || '',
    ticketPrice: existingReview?.ticketPrice || '',
    flightDate: existingReview?.flightDate || '',
    bookingReference: existingReview?.bookingReference || '',
    
    // Pros and cons
    pros: existingReview?.pros || [],
    cons: existingReview?.cons || [],
    recommendations: existingReview?.recommendations || '',
    
    // Media
    images: existingReview?.images || [],
    videos: existingReview?.videos || [],
    
    // Verification
    bookingConfirmed: existingReview?.bookingConfirmed || false
  });

  const [newPro, setNewPro] = useState('');
  const [newCon, setNewCon] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedVideos, setUploadedVideos] = useState([]);

  const steps = [
    { id: 'basic', title: 'Basic Info', description: 'Overall rating and main review' },
    { id: 'categories', title: 'Category Ratings', description: 'Rate specific aspects' },
    { id: 'details', title: 'Trip Details', description: 'Flight and travel information' },
    { id: 'proscons', title: 'Pros & Cons', description: 'What you liked and disliked' },
    { id: 'media', title: 'Media', description: 'Add photos and videos' },
    { id: 'review', title: 'Review & Submit', description: 'Review your submission' }
  ];

  const totalSteps = steps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const validateCurrentStep = () => {
    switch (steps[currentStep].id) {
      case 'basic':
        if (!reviewData.rating || reviewData.rating < 1) {
          toast({
            title: "Rating required",
            description: "Please provide an overall rating",
            variant: "destructive"
          });
          return false;
        }
        if (!reviewData.comment.trim()) {
          toast({
            title: "Comment required",
            description: "Please write a review comment",
            variant: "destructive"
          });
          return false;
        }
        return true;
      
      case 'categories':
        // Category ratings are optional
        return true;
      
      case 'details':
        if (!reviewData.tripType) {
          toast({
            title: "Trip type required",
            description: "Please select your trip type",
            variant: "destructive"
          });
          return false;
        }
        if (!reviewData.travelClass) {
          toast({
            title: "Travel class required",
            description: "Please select your travel class",
            variant: "destructive"
          });
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(reviewData);
      toast({
        title: "Review submitted",
        description: "Your review has been submitted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addPro = () => {
    if (newPro.trim()) {
      setReviewData(prev => ({
        ...prev,
        pros: [...prev.pros, newPro.trim()]
      }));
      setNewPro('');
    }
  };

  const removePro = (index) => {
    setReviewData(prev => ({
      ...prev,
      pros: prev.pros.filter((_, i) => i !== index)
    }));
  };

  const addCon = () => {
    if (newCon.trim()) {
      setReviewData(prev => ({
        ...prev,
        cons: [...prev.cons, newCon.trim()]
      }));
      setNewCon('');
    }
  };

  const removeCon = (index) => {
    setReviewData(prev => ({
      ...prev,
      cons: prev.cons.filter((_, i) => i !== index)
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      url: URL.createObjectURL(file),
      caption: '',
      file: file
    }));
    setUploadedImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleVideoUpload = (e) => {
    const files = Array.from(e.target.files);
    const newVideos = files.map(file => ({
      url: URL.createObjectURL(file),
      caption: '',
      file: file,
      thumbnail: ''
    }));
    setUploadedVideos(prev => [...prev, ...newVideos]);
  };

  const removeVideo = (index) => {
    setUploadedVideos(prev => prev.filter((_, i) => i !== index));
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base font-medium">Review Title</Label>
              <Input
                id="title"
                placeholder="Summarize your experience in a few words"
                value={reviewData.title}
                onChange={(e) => setReviewData(prev => ({ ...prev, title: e.target.value }))}
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">Overall Rating</Label>
              <div className="flex items-center gap-4">
                <RatingStar
                  defaultRating={reviewData.rating}
                  onRatingChange={(rating) => setReviewData(prev => ({ ...prev, rating }))}
                  size="large"
                />
                {reviewData.rating > 0 && (
                  <span className="text-lg font-semibold">{reviewData.rating.toFixed(1)}</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment" className="text-base font-medium">Your Review</Label>
              <Textarea
                id="comment"
                placeholder="Share your experience with this flight..."
                value={reviewData.comment}
                onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))}
                rows={6}
                className="text-base"
              />
              <p className="text-sm text-gray-600">
                {reviewData.comment.length}/500 characters
              </p>
            </div>
          </div>
        );

      case 'categories':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-2">Rate Specific Categories</h3>
              <p className="text-gray-600">Help others understand specific aspects of your experience</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CATEGORIES.map(category => (
                <div key={category.key} className="space-y-3 p-4 border rounded-lg">
                  <div>
                    <Label className="font-medium">{category.label}</Label>
                    <p className="text-sm text-gray-600">{category.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <RatingStar
                      defaultRating={reviewData.categoryRatings[category.key]}
                      onRatingChange={(rating) => setReviewData(prev => ({
                        ...prev,
                        categoryRatings: {
                          ...prev.categoryRatings,
                          [category.key]: rating
                        }
                      }))}
                      size="small"
                    />
                    {reviewData.categoryRatings[category.key] > 0 && (
                      <span className="font-medium">{reviewData.categoryRatings[category.key].toFixed(1)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-base font-medium">Trip Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {TRIP_TYPES.map(type => (
                    <div
                      key={type.value}
                      className={cn(
                        "p-3 border rounded-lg cursor-pointer transition-all hover:border-primary",
                        reviewData.tripType === type.value && "border-primary bg-primary/10"
                      )}
                      onClick={() => setReviewData(prev => ({ ...prev, tripType: type.value }))}
                    >
                      <div className="text-2xl mb-1">{type.icon}</div>
                      <div className="font-medium">{type.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium">Travel Class</Label>
                <div className="grid grid-cols-2 gap-3">
                  {TRAVEL_CLASSES.map(travelClass => (
                    <div
                      key={travelClass.value}
                      className={cn(
                        "p-3 border rounded-lg cursor-pointer transition-all hover:border-primary",
                        reviewData.travelClass === travelClass.value && "border-primary bg-primary/10"
                      )}
                      onClick={() => setReviewData(prev => ({ ...prev, travelClass: travelClass.value }))}
                    >
                      <div className="text-2xl mb-1">{travelClass.icon}</div>
                      <div className="font-medium">{travelClass.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="ticketPrice" className="text-base font-medium">Ticket Price</Label>
                <Input
                  id="ticketPrice"
                  type="number"
                  placeholder="0.00"
                  value={reviewData.ticketPrice}
                  onChange={(e) => setReviewData(prev => ({ ...prev, ticketPrice: e.target.value }))}
                  prefix="$"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="flightDate" className="text-base font-medium">Flight Date</Label>
                <Input
                  id="flightDate"
                  type="date"
                  value={reviewData.flightDate}
                  onChange={(e) => setReviewData(prev => ({ ...prev, flightDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bookingReference" className="text-base font-medium">Booking Reference (Optional)</Label>
              <Input
                id="bookingReference"
                placeholder="Enter your booking reference for verification"
                value={reviewData.bookingReference}
                onChange={(e) => setReviewData(prev => ({ ...prev, bookingReference: e.target.value }))}
              />
              <p className="text-sm text-gray-600">
                Providing your booking reference helps verify your review
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="bookingConfirmed"
                checked={reviewData.bookingConfirmed}
                onCheckedChange={(checked) => setReviewData(prev => ({ ...prev, bookingConfirmed: checked }))}
              />
              <Label htmlFor="bookingConfirmed" className="text-base">
                I confirm this review is based on actual travel experience
              </Label>
            </div>
          </div>
        );

      case 'proscons':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium text-green-700">What You Liked (Pros)</Label>
                  <p className="text-sm text-gray-600 mb-3">Add specific positive aspects of your experience</p>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a positive point..."
                    value={newPro}
                    onChange={(e) => setNewPro(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addPro()}
                  />
                  <Button onClick={addPro} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {reviewData.pros.map((pro, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                      <span className="flex-1 text-sm">{pro}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePro(index)}
                        className="h-6 w-6 p-0 text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium text-red-700">What Could Be Improved (Cons)</Label>
                  <p className="text-sm text-gray-600 mb-3">Add specific areas for improvement</p>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Add an area for improvement..."
                    value={newCon}
                    onChange={(e) => setNewCon(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCon()}
                  />
                  <Button onClick={addCon} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {reviewData.cons.map((con, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                      <span className="flex-1 text-sm">{con}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCon(index)}
                        className="h-6 w-6 p-0 text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recommendations" className="text-base font-medium">Recommendations</Label>
              <Textarea
                id="recommendations"
                placeholder="Any recommendations for other travelers or the airline?"
                value={reviewData.recommendations}
                onChange={(e) => setReviewData(prev => ({ ...prev, recommendations: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
        );

      case 'media':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Photos</Label>
                  <p className="text-sm text-gray-600">Add photos to illustrate your experience</p>
                </div>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 mb-2">Click to upload photos</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Select Photos
                    </label>
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {uploadedImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image.url}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Videos</Label>
                  <p className="text-sm text-gray-600">Add videos to share your experience</p>
                </div>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 mb-2">Click to upload videos</p>
                  <input
                    type="file"
                    multiple
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                    id="video-upload"
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="video-upload" className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Select Videos
                    </label>
                  </Button>
                </div>

                <div className="space-y-3">
                  {uploadedVideos.map((video, index) => (
                    <div key={index} className="relative group">
                      <video
                        src={video.url}
                        className="w-full h-24 object-cover rounded-lg"
                        controls={false}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeVideo(index)}
                        className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2">Review Your Submission</h3>
              <p className="text-gray-600">Please review your review before submitting</p>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-lg">{reviewData.title || 'Untitled Review'}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {generateStars(reviewData.rating)}
                        <span className="font-medium">{reviewData.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{reviewData.tripType}</Badge>
                      <Badge variant="outline" className="ml-2">{reviewData.travelClass}</Badge>
                    </div>
                  </div>

                  <p className="text-gray-700">{reviewData.comment}</p>

                  {reviewData.pros.length > 0 && (
                    <div>
                      <h5 className="font-medium text-green-700 mb-2">Pros:</h5>
                      <ul className="list-disc list-inside space-y-1">
                        {reviewData.pros.map((pro, index) => (
                          <li key={index} className="text-sm text-green-600">{pro}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {reviewData.cons.length > 0 && (
                    <div>
                      <h5 className="font-medium text-red-700 mb-2">Cons:</h5>
                      <ul className="list-disc list-inside space-y-1">
                        {reviewData.cons.map((con, index) => (
                          <li key={index} className="text-sm text-red-600">{con}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(uploadedImages.length > 0 || uploadedVideos.length > 0) && (
                    <div>
                      <h5 className="font-medium mb-2">Media:</h5>
                      <div className="flex gap-2">
                        {uploadedImages.length > 0 && (
                          <Badge variant="outline">
                            <Camera className="h-3 w-3 mr-1" />
                            {uploadedImages.length} photos
                          </Badge>
                        )}
                        {uploadedVideos.length > 0 && (
                          <Badge variant="outline">
                            <Video className="h-3 w-3 mr-1" />
                            {uploadedVideos.length} videos
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-blue-900">Submission Guidelines</h5>
                  <ul className="text-sm text-blue-800 mt-2 space-y-1">
                    <li>• Your review will be published after moderation</li>
                    <li>• Be honest and constructive in your feedback</li>
                    <li>• Include relevant details to help other travelers</li>
                    <li>• You can edit your review after submission</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Write a Review</h2>
          <span className="text-sm text-gray-600">
            Step {currentStep + 1} of {totalSteps}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-2 text-xs",
                index <= currentStep ? "text-primary" : "text-gray-400"
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                index <= currentStep ? "bg-primary text-white" : "bg-gray-200"
              )}>
                {index < currentStep ? <Check className="h-3 w-3" /> : index + 1}
              </div>
              <span className="hidden sm:inline">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {steps[currentStep].title}
          </CardTitle>
          <p className="text-gray-600">
            {steps[currentStep].description}
          </p>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>

        <div className="flex items-center gap-2">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isSubmitting}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}

          {currentStep < totalSteps - 1 ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Review"}
              <Check className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}