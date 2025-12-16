"use client";
import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { 
  ThumbsUp, 
  ThumbsDown, 
  Flag, 
  Share2, 
  MessageSquare, 
  Star, 
  Calendar,
  MapPin,
  Users,
  DollarSign,
  CheckCircle,
  Shield,
  Camera,
  Video,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink
} from "lucide-react";
import { generateStars } from "@/lib/utils.client";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import Image from "next/image";

export function EnhancedReviewCard({ review, session, onVote, onFlag, onEdit, onDelete, onShare }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [isFlagging, setIsFlagging] = useState(false);
  const textRef = useRef(null);
  const { toast } = useToast();

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

  // Check if text should be truncated
  useEffect(() => {
    if (textRef.current) {
      const lineHeight = parseFloat(getComputedStyle(textRef.current).lineHeight);
      const maxHeight = lineHeight * 4;
      if (textRef.current.scrollHeight > maxHeight) {
        setShowFullText(true);
      }
    }
  }, [review.comment]);

  const handleVote = async (voteType) => {
    if (!session?.user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to vote on reviews",
        variant: "destructive"
      });
      return;
    }

    setIsVoting(true);
    try {
      await onVote(review._id, voteType);
      setUserVote(voteType);
      toast({
        title: "Vote recorded",
        description: `You found this review ${voteType === 'helpful' ? 'helpful' : 'not helpful'}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record your vote",
        variant: "destructive"
      });
    } finally {
      setIsVoting(false);
    }
  };

  const handleFlag = async () => {
    if (!session?.user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to flag reviews",
        variant: "destructive"
      });
      return;
    }

    setIsFlagging(true);
    try {
      await onFlag(review._id);
      toast({
        title: "Review flagged",
        description: "Thank you for helping maintain review quality"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to flag review",
        variant: "destructive"
      });
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
      toast({
        title: "Link copied",
        description: "Review link copied to clipboard"
      });
    }
  };

  const isOwner = session?.user?.id === review.reviewer?._id;
  const helpfulnessScore = review.helpfulnessScore || 0;
  const totalVotes = (review.helpfulVotes?.length || 0) + (review.notHelpfulVotes?.length || 0);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50';
      case 'negative': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
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
    <Card className="w-full transition-all duration-200 hover:shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={review.reviewer?.profileImage} alt={review.reviewer?.name} />
              <AvatarFallback>
                {review.reviewer?.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm">{review.reviewer?.name || 'Anonymous'}</h3>
                
                {/* Verification Badges */}
                <div className="flex items-center gap-1">
                  {review.verified && (
                    <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {review.bookingConfirmed && (
                    <Badge variant="secondary" className="text-xs bg-green-50 text-green-600">
                      <Shield className="h-3 w-3 mr-1" />
                      Confirmed
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{formatDate(review.createdAt)}</span>
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
          
          <div className="flex items-center gap-2">
            {/* Sentiment Badge */}
            {review.sentiment && (
              <Badge className={cn("text-xs", getSentimentColor(review.sentiment))}>
                {review.sentiment}
              </Badge>
            )}
            
            {/* Actions Menu */}
            <div className="flex items-center gap-1">
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
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Review Title and Overall Rating */}
        <div>
          {review.title && (
            <h4 className="font-semibold text-base mb-2">{review.title}</h4>
          )}
          
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-1">
              {generateStars(review.rating)}
              <span className="font-semibold text-lg">{review.rating.toFixed(1)}</span>
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

        {/* Category Ratings */}
        {review.categoryRatings && Object.values(review.categoryRatings).some(r => r > 0) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg">
            {Object.entries(review.categoryRatings).map(([category, rating]) => (
              rating > 0 && (
                <div key={category} className="text-center">
                  <div className="text-xs text-gray-600 capitalize mb-1">
                    {category.replace('_', ' ')}
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    {generateStars(rating, "h-3 w-3")}
                    <span className="text-xs font-medium">{rating.toFixed(1)}</span>
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {/* Review Content */}
        <div className="space-y-3">
          {/* Pros and Cons */}
          {(review.pros?.length > 0 || review.cons?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {review.pros?.length > 0 && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="font-medium text-sm text-green-800 mb-2">Pros</div>
                  <ul className="space-y-1">
                    {review.pros.map((pro, index) => (
                      <li key={index} className="text-xs text-green-700">• {pro}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {review.cons?.length > 0 && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="font-medium text-sm text-red-800 mb-2">Cons</div>
                  <ul className="space-y-1">
                    {review.cons.map((con, index) => (
                      <li key={index} className="text-xs text-red-700">• {con}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Main Comment */}
          <div>
            <p
              ref={textRef}
              className={cn(
                "text-sm leading-relaxed text-gray-700",
                !isExpanded && showFullText && "line-clamp-4"
              )}
            >
              {review.comment}
            </p>
            
            {showFullText && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs p-0 h-auto mt-2"
              >
                {isExpanded ? "Show less" : "Show more"}
              </Button>
            )}
          </div>
        </div>

        {/* Media Attachments */}
        {(review.images?.length > 0 || review.videos?.length > 0) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {review.images?.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Camera className="h-3 w-3 mr-1" />
                  {review.images.length} photos
                </Badge>
              )}
              {review.videos?.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Video className="h-3 w-3 mr-1" />
                  {review.videos.length} videos
                </Badge>
              )}
            </div>
            
            {/* Image Gallery */}
            {review.images?.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {review.images.slice(0, 3).map((image, index) => (
                  <Dialog key={index}>
                    <DialogTrigger asChild>
                      <div className="relative flex-shrink-0 cursor-pointer">
                        <Image
                          src={image.url}
                          alt={image.caption || `Review image ${index + 1}`}
                          width={100}
                          height={100}
                          className="rounded-lg object-cover"
                        />
                        {index === 2 && review.images.length > 3 && (
                          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                            <span className="text-white font-semibold">+{review.images.length - 3}</span>
                          </div>
                        )}
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <div className="relative">
                        <Image
                          src={image.url}
                          alt={image.caption || `Review image ${index + 1}`}
                          width={800}
                          height={600}
                          className="rounded-lg object-contain w-full"
                        />
                        {image.caption && (
                          <p className="text-sm text-gray-600 mt-2 text-center">{image.caption}</p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Airline Response */}
        {review.airlineResponse?.content && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-blue-100 text-blue-800 text-xs">Airline Response</Badge>
              <span className="text-xs text-gray-600">
                {formatDate(review.airlineResponse.respondedAt)}
              </span>
            </div>
            <p className="text-sm text-gray-700">{review.airlineResponse.content}</p>
            <p className="text-xs text-gray-500 mt-2">
              - {review.airlineResponse.respondedBy?.name || 'Airline Representative'}
            </p>
          </div>
        )}

        {/* Engagement Section */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-4">
            {/* Helpful Voting */}
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
              <div className="text-sm font-semibold">
                {helpfulnessScore.toFixed(0)}%
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}