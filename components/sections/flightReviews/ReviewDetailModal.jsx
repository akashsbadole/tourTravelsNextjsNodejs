"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Star, 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  Shield, 
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  Flag,
  Camera,
  Video,
  ExternalLink,
  Clock,
  Edit,
  Trash2
} from "lucide-react";
import { generateStars } from "@/lib/utils.client";
import { getVerificationBadge } from "@/lib/services/reviewVerification";
import { cn } from "@/lib/utils";
import Image from "next/image";

export function ReviewDetailModal({ review, session, isOpen, onClose, onVote, onFlag, onEdit, onDelete }) {
  const [activeTab, setActiveTab] = useState("details");
  const [userVote, setUserVote] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [isFlagging, setIsFlagging] = useState(false);

  // Check if current user has voted
  useEffect(() => {
    if (session?.user?.id) {
      if (review.helpfulVotes?.includes(session.user.id)) {
        setUserVote('helpful');
      } else if (review.notHelpfulVotes?.includes(session.user.id)) {
        setUserVote('not_helpful');
      }
    }
  }, [review.helpfulVotes, review.notHelpfulVotes, session?.user?.id]);

  const handleVote = async (voteType) => {
    if (!session?.user) {
      alert("Please sign in to vote on reviews");
      return;
    }

    setIsVoting(true);
    try {
      await onVote(review._id, voteType);
      setUserVote(voteType);
    } catch (error) {
      console.error("Error voting:", error);
      alert("Failed to record your vote");
    } finally {
      setIsVoting(false);
    }
  };

  const handleFlag = async () => {
    if (!session?.user) {
      alert("Please sign in to flag reviews");
      return;
    }

    setIsFlagging(true);
    try {
      await onFlag(review._id);
      alert("Review flagged successfully");
    } catch (error) {
      console.error("Error flagging:", error);
      alert("Failed to flag review");
    } finally {
      setIsFlagging(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Flight Review - ${review.title || 'Untitled Review'}`,
        text: review.comment,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Review link copied to clipboard");
    }
  };

  const isOwner = session?.user?.id === review.reviewer?._id;
  const verificationBadge = getVerificationBadge(review.verificationLevel);
  const helpfulnessScore = review.helpfulnessScore || 0;
  const totalVotes = (review.helpfulVotes?.length || 0) + (review.notHelpfulVotes?.length || 0);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTravelClassIcon = (travelClass) => {
    switch (travelClass) {
      case 'first': return '💎';
      case 'business': return '💼';
      case 'premium_economy': return '⭐';
      default: return '✈️';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-xl font-semibold">Review Details</DialogTitle>
          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(review)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(review._id)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-8 w-8 p-0"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFlag}
              disabled={isFlagging}
              className={cn(
                "h-8 w-8 p-0",
                review.flagged?.includes(session?.user?.id) && "text-red-500"
              )}
            >
              <Flag className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="responses">Responses</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-6">
            {/* Review Header */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={review.reviewer?.profileImage} alt={review.reviewer?.name} />
                <AvatarFallback className="text-lg">
                  {review.reviewer?.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{review.reviewer?.name || 'Anonymous'}</h3>
                  
                  {/* Verification Badges */}
                  <div className="flex items-center gap-2">
                    {review.verified && (
                      <Badge className={cn("text-xs", verificationBadge.color === 'gold' ? 'bg-yellow-100 text-yellow-800' : 
                                       verificationBadge.color === 'green' ? 'bg-green-100 text-green-800' : 
                                       'bg-blue-100 text-blue-800')}>
                        {verificationBadge.icon} {verificationBadge.text}
                      </Badge>
                    )}
                    {review.bookingConfirmed && (
                      <Badge className="text-xs bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Booking Confirmed
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(review.createdAt)}
                  </span>
                  {review.tripType && (
                    <Badge variant="outline" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {review.tripType}
                    </Badge>
                  )}
                  {review.travelClass && (
                    <Badge variant="outline" className="text-xs">
                      {getTravelClassIcon(review.travelClass)} {review.travelClass.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Review Title and Rating */}
            <div className="space-y-3">
              {review.title && (
                <h2 className="text-2xl font-bold">{review.title}</h2>
              )}
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {generateStars(review.rating)}
                  <span className="text-2xl font-bold">{review.rating.toFixed(1)}</span>
                </div>
                
                {review.flightNumber && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    {review.flightNumber}
                  </div>
                )}
                
                {review.ticketPrice && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <DollarSign className="h-4 w-4" />
                    ${review.ticketPrice}
                  </div>
                )}
              </div>
            </div>

            {/* Flight Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <h4 className="font-semibold">Flight Information</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Route:</span>
                    <span className="font-medium">
                      {review.departureAirportId} → {review.arrivalAirportId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">
                      {review.flightDate ? formatDate(review.flightDate) : 'Not specified'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Aircraft:</span>
                    <span className="font-medium">{review.airplaneModelName}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold">Trip Details</h4>
                <div className="space-y-1 text-sm">
                  {review.tripType && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium capitalize">{review.tripType}</span>
                    </div>
                  )}
                  {review.bookingReference && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Booking:</span>
                      <span className="font-medium">{review.bookingReference}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Category Ratings */}
            {review.categoryRatings && Object.values(review.categoryRatings).some(r => r > 0) && (
              <div className="p-4 bg-white border rounded-lg">
                <h4 className="font-semibold mb-4">Category Ratings</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(review.categoryRatings).map(([category, rating]) => (
                    rating > 0 && (
                      <div key={category} className="text-center">
                        <div className="text-xs text-gray-600 capitalize mb-2">
                          {category.replace('_', ' ')}
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          {generateStars(rating, "h-4 w-4")}
                          <span className="font-medium">{rating.toFixed(1)}</span>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Pros and Cons */}
            {(review.pros?.length > 0 || review.cons?.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {review.pros?.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-3">Pros</h4>
                    <ul className="space-y-2">
                      {review.pros.map((pro, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-green-700">
                          <span className="text-green-500 mt-0.5">•</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {review.cons?.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-3">Cons</h4>
                    <ul className="space-y-2">
                      {review.cons.map((con, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-red-700">
                          <span className="text-red-500 mt-0.5">•</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Main Review Content */}
            <div className="space-y-3">
              <h4 className="font-semibold">Review</h4>
              <p className="text-gray-700 leading-relaxed">{review.comment}</p>
            </div>

            {/* Recommendations */}
            {review.recommendations && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Recommendations</h4>
                <p className="text-sm text-blue-700">{review.recommendations}</p>
              </div>
            )}

            {/* Engagement Section */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                {/* Voting */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={userVote === 'helpful' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleVote('helpful')}
                    disabled={isVoting}
                    className="h-8 px-3"
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    Helpful
                    {review.helpfulVotes?.length > 0 && (
                      <span className="ml-1 text-xs">({review.helpfulVotes.length})</span>
                    )}
                  </Button>
                  
                  <Button
                    variant={userVote === 'not_helpful' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleVote('not_helpful')}
                    disabled={isVoting}
                    className="h-8 px-3"
                  >
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    Not Helpful
                    {review.notHelpfulVotes?.length > 0 && (
                      <span className="ml-1 text-xs">({review.notHelpfulVotes.length})</span>
                    )}
                  </Button>
                </div>

                {/* Response Count */}
                {review.responseCount > 0 && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MessageSquare className="h-4 w-4" />
                    {review.responseCount} responses
                  </div>
                )}
              </div>

              {/* Helpfulness Score */}
              {totalVotes > 0 && (
                <div className="text-right">
                  <div className="text-xs text-gray-600">Helpfulness</div>
                  <div className="text-lg font-semibold">
                    {helpfulnessScore.toFixed(0)}%
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-6 mt-6">
            {/* Images */}
            {review.images?.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold">Photos</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {review.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <Image
                        src={image.url}
                        alt={image.caption || `Review image ${index + 1}`}
                        width={300}
                        height={200}
                        className="rounded-lg object-cover w-full h-48"
                      />
                      {image.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-xs rounded-b-lg">
                          {image.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Videos */}
            {review.videos?.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold">Videos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {review.videos.map((video, index) => (
                    <div key={index} className="relative group">
                      <video
                        src={video.url}
                        poster={video.thumbnail}
                        className="rounded-lg object-cover w-full h-48"
                        controls
                      />
                      {video.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-xs rounded-b-lg">
                          {video.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!review.images || review.images.length === 0) && (!review.videos || review.videos.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No media attached to this review</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sentiment Analysis */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">Sentiment Analysis</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Sentiment:</span>
                    <Badge className={cn(
                      "text-xs",
                      review.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                      review.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    )}>
                      {review.sentiment || 'neutral'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Score:</span>
                    <span className="font-medium">
                      {review.sentimentScore?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Keywords */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-3">Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {review.keywords?.map((keyword, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Review Statistics */}
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-3">Review Statistics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {review.helpfulVotes?.length || 0}
                  </div>
                  <div className="text-xs text-gray-600">Helpful Votes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {review.notHelpfulVotes?.length || 0}
                  </div>
                  <div className="text-xs text-gray-600">Not Helpful Votes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {helpfulnessScore.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-600">Helpfulness</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {review.flagged?.length || 0}
                  </div>
                  <div className="text-xs text-gray-600">Flags</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="responses" className="space-y-6 mt-6">
            {/* Airline Response */}
            {review.airlineResponse?.content && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-blue-100 text-blue-800 text-xs">Airline Response</Badge>
                  <span className="text-xs text-gray-600">
                    {formatDate(review.airlineResponse.respondedAt)}
                  </span>
                </div>
                <p className="text-gray-700 mb-3">{review.airlineResponse.content}</p>
                <p className="text-xs text-gray-500">
                  - {review.airlineResponse.respondedBy?.name || 'Airline Representative'}
                </p>
              </div>
            )}

            {/* User Responses */}
            <div className="space-y-4">
              <h4 className="font-semibold">User Responses</h4>
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No responses yet. Be the first to respond!</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}