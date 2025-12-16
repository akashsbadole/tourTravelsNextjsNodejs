"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Star, 
  MessageSquare, 
  ThumbsUp,
  CheckCircle,
  Shield,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import { generateStars } from "@/lib/utils.client";
import { cn } from "@/lib/utils";

export function ReviewAnalytics({ analyticsData, dateRange, onDateRangeChange }) {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const {
    overview,
    ratingDistribution,
    categoryAverages,
    distributions,
    trends,
    topPerformers
  } = analyticsData;

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 3.5) return "text-yellow-600";
    return "text-red-600";
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderOverviewStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Reviews</p>
              <p className="text-2xl font-bold">{overview.totalReviews.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Rating</p>
              <div className="flex items-center gap-2">
                <p className={cn("text-2xl font-bold", getRatingColor(overview.averageRating))}>
                  {overview.averageRating.toFixed(1)}
                </p>
                <div className="flex">
                  {generateStars(Math.round(overview.averageRating), "h-4 w-4")}
                </div>
              </div>
            </div>
            <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Verification Rate</p>
              <p className="text-2xl font-bold">{overview.verificationRate.toFixed(1)}%</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Response Rate</p>
              <p className="text-2xl font-bold">87.3%</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderRatingDistribution = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Rating Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[5, 4, 3, 2, 1].map(rating => {
            const ratingData = ratingDistribution.find(r => r.rating === rating);
            const count = ratingData?.count || 0;
            const percentage = overview.totalReviews > 0 ? (count / overview.totalReviews) * 100 : 0;
            
            return (
              <div key={rating} className="flex items-center gap-4">
                <div className="flex items-center gap-1 w-20">
                  <span className="font-medium">{rating}</span>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <Progress value={percentage} className="h-2" />
                </div>
                <div className="w-16 text-right text-sm text-gray-600">
                  {count} ({percentage.toFixed(1)}%)
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const renderCategoryRatings = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Category Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(categoryAverages).map(([category, rating]) => (
            rating > 0 && (
              <div key={category} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium capitalize">
                    {category.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className={cn("font-semibold", getRatingColor(rating))}>
                      {rating.toFixed(1)}
                    </span>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </div>
                </div>
                <Progress value={(rating / 5) * 100} className="h-2" />
              </div>
            )
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderTripDistributions = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trip Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {distributions.tripType?.map(trip => (
              <div key={trip._id} className="flex items-center justify-between">
                <Badge variant="outline" className="capitalize">
                  {trip._id}
                </Badge>
                <div className="flex items-center gap-2">
                  <Progress value={(trip.count / overview.totalReviews) * 100} className="w-24 h-2" />
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {trip.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Travel Classes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {distributions.travelClass?.map(travelClass => (
              <div key={travelClass._id} className="flex items-center justify-between">
                <Badge variant="outline" className="capitalize">
                  {travelClass._id.replace('_', ' ')}
                </Badge>
                <div className="flex items-center gap-2">
                  <Progress value={(travelClass.count / overview.totalReviews) * 100} className="w-24 h-2" />
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {travelClass.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSentimentAnalysis = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Sentiment Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {distributions.sentiment?.map(sentiment => (
            <div key={sentiment._id} className="text-center p-4 rounded-lg border">
              <Badge className={cn("mb-2", getSentimentColor(sentiment._id))}>
                {sentiment._id}
              </Badge>
              <div className="text-2xl font-bold mb-1">
                {sentiment.count}
              </div>
              <div className="text-sm text-gray-600">
                {((sentiment.count / overview.totalReviews) * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderTopPerformers = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Rated Airlines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPerformers.airlines?.slice(0, 5).map((airline, index) => (
              <div key={airline._id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <span className="font-medium">{airline._id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className={cn("font-semibold", getRatingColor(airline.avgRating))}>
                      {airline.avgRating.toFixed(1)}
                    </span>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </div>
                  <span className="text-sm text-gray-600">
                    ({airline.count} reviews)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Most Helpful Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPerformers.helpfulReviews?.map((review, index) => (
              <div key={review._id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                      {index + 1}
                    </Badge>
                    <span className="font-medium text-sm">
                      {review.reviewer?.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">{review.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <ThumbsUp className="h-4 w-4" />
                    {review.helpfulVotes?.length || 0}
                  </div>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {review.comment}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTrends = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Review Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly">Monthly Trend</TabsTrigger>
            <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="monthly" className="mt-4">
            <div className="space-y-4">
              {trends.monthly?.slice(-6).map((month) => (
                <div key={`${month._id.year}-${month._id.month}`} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">
                      {new Date(month._id.year, month._id.month - 1).toLocaleDateString('en-US', { 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </div>
                    <div className="text-sm text-gray-600">
                      {month.count} reviews
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{month.avgRating.toFixed(1)}</span>
                    </div>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="recent" className="mt-4">
            <div className="space-y-3">
              {trends.recent?.slice(-7).map((day) => (
                <div key={`${day._id.year}-${day._id.month}-${day._id.day}`} className="flex items-center justify-between">
                  <div className="text-sm">
                    {new Date(day._id.year, day._id.month - 1, day._id.day).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm">
                      <MessageSquare className="h-4 w-4" />
                      {day.count}
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {day.avgRating.toFixed(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Review Analytics</h2>
        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 90 days</SelectItem>
            <SelectItem value="1year">Last year</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ratings">Ratings</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {renderOverviewStats()}
          {renderTopPerformers()}
        </TabsContent>

        <TabsContent value="ratings" className="space-y-6">
          {renderRatingDistribution()}
          {renderCategoryRatings()}
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          {renderCategoryRatings()}
          {renderTripDistributions()}
        </TabsContent>

        <TabsContent value="demographics" className="space-y-6">
          {renderTripDistributions()}
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-6">
          {renderSentimentAnalysis()}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {renderTrends()}
        </TabsContent>
      </Tabs>
    </div>
  );
}