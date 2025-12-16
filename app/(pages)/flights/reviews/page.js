import { Suspense } from "react";
import { AdvancedFilterSidebar } from "@/components/sections/flightReviews/AdvancedFilterSidebar";
import { EnhancedReviewCard } from "@/components/sections/flightReviews/EnhancedReviewCard";
import { ReviewAnalytics } from "@/components/sections/flightReviews/ReviewAnalytics";
import { ReviewSubmissionWizard } from "@/components/sections/flightReviews/ReviewSubmissionWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Filter, 
  Plus, 
  BarChart3, 
  SortAsc, 
  SortDesc,
  Grid,
  List,
  RefreshCw
} from "lucide-react";
import { auth } from "@/lib/auth";

// Async components for data fetching
async function getFlightReviews(filters = {}, page = 1, limit = 10) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
    )
  });

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/flights/reviews?${params}`,
    {
      next: {
        revalidate: 60, // Cache for 1 minute
        tags: ['flightReviews']
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch reviews');
  }

  return response.json();
}

async function getReviewAnalytics(dateRange = '30days') {
  const params = new URLSearchParams({ dateRange });
  
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/flights/reviews/analytics?${params}`,
    {
      next: {
        revalidate: 300, // Cache for 5 minutes
        tags: ['reviewAnalytics']
      }
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch analytics');
  }

  return response.json();
}

// Loading skeleton for reviews
function ReviewCardSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// Main reviews list component
function FlightReviewsList({ initialReviews, initialFilters, session }) {
  const [reviews, setReviews] = useState(initialReviews?.data?.reviews || []);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialReviews?.data?.pagination?.hasNextPage || false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(initialFilters || {});
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('list');
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showReviewWizard, setShowReviewWizard] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [dateRange, setDateRange] = useState('30days');

  // Load more reviews
  const loadMoreReviews = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const nextPage = page + 1;
      const result = await getFlightReviews(filters, nextPage, 10);
      
      setReviews(prev => [...prev, ...result.data.reviews]);
      setHasMore(result.data.pagination.hasNextPage);
      setPage(nextPage);
    } catch (error) {
      console.error('Error loading more reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = async (newFilters) => {
    setFilters(newFilters);
    setPage(1);
    setLoading(true);
    
    try {
      const result = await getFlightReviews(newFilters, 1, 10);
      setReviews(result.data.reviews);
      setHasMore(result.data.pagination.hasNextPage);
      setPage(1);
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle sort changes
  const handleSortChange = async (newSortBy) => {
    setSortBy(newSortBy);
    const sortFilters = { ...filters, sortBy: newSortBy };
    setFilters(sortFilters);
    setPage(1);
    setLoading(true);
    
    try {
      const result = await getFlightReviews(sortFilters, 1, 10);
      setReviews(result.data.reviews);
      setHasMore(result.data.pagination.hasNextPage);
      setPage(1);
    } catch (error) {
      console.error('Error sorting reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load analytics
  const loadAnalytics = async () => {
    try {
      const result = await getReviewAnalytics(dateRange);
      setAnalyticsData(result.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  // Handle review actions
  const handleVote = async (reviewId, voteType) => {
    try {
      const response = await fetch(`/api/flights/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType })
      });

      if (!response.ok) throw new Error('Failed to vote');

      const result = await response.json();
      
      // Update the review in state
      setReviews(prev => prev.map(review => 
        review._id === reviewId 
          ? { ...review, ...result.data }
          : review
      ));
    } catch (error) {
      console.error('Error voting on review:', error);
    }
  };

  const handleFlag = async (reviewId) => {
    try {
      const response = await fetch(`/api/flights/reviews/${reviewId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to flag review');

      // Update the review in state
      setReviews(prev => prev.map(review => 
        review._id === reviewId 
          ? { 
              ...review, 
              flagged: [...(review.flagged || []), session?.user?.id]
            }
          : review
      ));
    } catch (error) {
      console.error('Error flagging review:', error);
    }
  };

  const handleEdit = (review) => {
    setSelectedReview(review);
    setShowReviewWizard(true);
  };

  const handleDelete = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      const response = await fetch(`/api/flights/reviews/${reviewId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete review');

      // Remove the review from state
      setReviews(prev => prev.filter(review => review._id !== reviewId));
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  const handleReviewSubmit = async (reviewData) => {
    try {
      const response = await fetch('/api/flights/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData)
      });

      if (!response.ok) throw new Error('Failed to submit review');

      setShowReviewWizard(false);
      setSelectedReview(null);
      
      // Refresh reviews
      handleFilterChange(filters);
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  // Load analytics when tab is opened
  useEffect(() => {
    if (showAnalytics && !analyticsData) {
      loadAnalytics();
    }
  }, [showAnalytics]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Flight Reviews</h1>
          <p className="text-gray-600">
            Read and share experiences from real travelers
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="hidden md:flex"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          
          {session?.user && (
            <Button onClick={() => setShowReviewWizard(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Write Review
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Filters Sidebar */}
        <div className={cn(
          "w-80 flex-shrink-0 transition-all duration-300",
          showFilters ? "block" : "hidden lg:block"
        )}>
          <AdvancedFilterSidebar
            onFiltersChange={handleFilterChange}
            initialFilters={filters}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-4">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>

          <Tabs defaultValue="reviews" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="analytics" onClick={() => setShowAnalytics(true)}>
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reviews" className="space-y-6">
              {/* Search and Sort Bar */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search reviews..."
                          className="pl-10"
                          value={filters.keyword || ''}
                          onChange={(e) => handleFilterChange({ ...filters, keyword: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Select value={sortBy} onValueChange={handleSortChange}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest First</SelectItem>
                          <SelectItem value="oldest">Oldest First</SelectItem>
                          <SelectItem value="highest_rated">Highest Rated</SelectItem>
                          <SelectItem value="lowest_rated">Lowest Rated</SelectItem>
                          <SelectItem value="most_helpful">Most Helpful</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                      >
                        {viewMode === 'list' ? <Grid className="h-4 w-4" /> : <List className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reviews List */}
              <div className={cn(
                "space-y-6",
                viewMode === 'grid' && "grid grid-cols-1 md:grid-cols-2 gap-6"
              )}>
                {reviews.map((review) => (
                  <EnhancedReviewCard
                    key={review._id}
                    review={review}
                    session={session}
                    onVote={handleVote}
                    onFlag={handleFlag}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>

              {/* Loading State */}
              {loading && (
                <div className="space-y-6">
                  {[...Array(3)].map((_, i) => (
                    <ReviewCardSkeleton key={i} />
                  ))}
                </div>
              )}

              {/* Load More Button */}
              {hasMore && !loading && (
                <div className="text-center">
                  <Button onClick={loadMoreReviews} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Load More Reviews
                  </Button>
                </div>
              )}

              {/* No Reviews State */}
              {!loading && reviews.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="text-gray-400 mb-4">
                      <Search className="h-16 w-16 mx-auto" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No reviews found</h3>
                    <p className="text-gray-600 mb-6">
                      Try adjusting your filters or search terms
                    </p>
                    <Button onClick={() => handleFilterChange({})}>
                      Clear Filters
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="analytics">
              {analyticsData ? (
                <ReviewAnalytics
                  analyticsData={analyticsData}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                />
              ) : (
                <div className="space-y-6">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-32" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-32 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Review Submission Wizard Modal */}
      {showReviewWizard && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <ReviewSubmissionWizard
                flightData={{}}
                existingReview={selectedReview}
                onSubmit={handleReviewSubmit}
                onCancel={() => {
                  setShowReviewWizard(false);
                  setSelectedReview(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main page component
export default async function FlightReviewsPage({ searchParams }) {
  const session = await auth();
  
  // Parse initial filters from URL params
  const initialFilters = {
    airlineId: searchParams.airlineId || '',
    departureAirportId: searchParams.departureAirportId || '',
    arrivalAirportId: searchParams.arrivalAirportId || '',
    keyword: searchParams.keyword || '',
    minRating: searchParams.minRating ? parseFloat(searchParams.minRating) : 1,
    maxRating: searchParams.maxRating ? parseFloat(searchParams.maxRating) : 5,
    tripType: searchParams.tripType || '',
    travelClass: searchParams.travelClass ? searchParams.travelClass.split(',') : [],
    verified: searchParams.verified === 'true',
    sortBy: searchParams.sortBy || 'newest'
  };

  // Fetch initial data
  const initialReviews = await getFlightReviews(initialFilters, 1, 10);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FlightReviewsList
        initialReviews={initialReviews}
        initialFilters={initialFilters}
        session={session}
      />
    </Suspense>
  );
}