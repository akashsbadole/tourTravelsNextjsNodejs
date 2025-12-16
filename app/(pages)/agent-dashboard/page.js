"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequirementCard } from "@/components/travel/RequirementCard";
import { QuotationCard } from "@/components/travel/QuotationCard";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  Filter, 
  Plus, 
  TrendingUp, 
  Users, 
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  MessageCircle,
  FileText,
  AlertCircle,
  Star,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function AgentDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [agentProfile, setAgentProfile] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    category: ""
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackPath=/agent-dashboard");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchAgentProfile();
      fetchRequirements();
      fetchQuotations();
      fetchCommunications();
    }
  }, [session, filters]);

  const fetchAgentProfile = async () => {
    try {
      const response = await fetch("/api/agents/profile");
      const data = await response.json();

      if (response.ok) {
        setAgentProfile(data.data);
      } else if (response.status === 404) {
        // Agent profile doesn't exist, redirect to create profile
        router.push("/agent-profile/create");
      }
    } catch (err) {
      console.error("Failed to fetch agent profile:", err);
    }
  };

  const fetchRequirements = async () => {
    try {
      const queryParams = new URLSearchParams({
        assignedAgent: agentProfile?._id || "",
        limit: 10
      });

      if (filters.status) queryParams.append("status", filters.status);
      if (filters.priority) queryParams.append("priority", filters.priority);
      if (filters.category) queryParams.append("category", filters.category);

      const response = await fetch(`/api/requirements?${queryParams}`);
      const data = await response.json();

      if (response.ok) {
        setRequirements(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch requirements:", err);
    }
  };

  const fetchQuotations = async () => {
    try {
      const response = await fetch(`/api/quotations?agentId=${agentProfile?._id || ""}&limit=10`);
      const data = await response.json();

      if (response.ok) {
        setQuotations(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch quotations:", err);
    }
  };

  const fetchCommunications = async () => {
    try {
      const response = await fetch(`/api/communications?participantType=agent&limit=5`);
      const data = await response.json();

      if (response.ok) {
        setCommunications(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch communications:", err);
    }
  };

  const calculateStats = () => {
    if (!agentProfile?.performanceMetrics) return null;

    const metrics = agentProfile.performanceMetrics;
    const completionRate = metrics.totalRequirements > 0 
      ? Math.round((metrics.completedRequirements / metrics.totalRequirements) * 100)
      : 0;

    return {
      totalRequirements: metrics.totalRequirements,
      completedRequirements: metrics.completedRequirements,
      completionRate,
      averageResponseTime: metrics.averageResponseTime,
      customerSatisfaction: metrics.customerSatisfactionRating,
      totalRevenue: metrics.totalRevenue,
      rating: agentProfile.rating,
      reviewCount: agentProfile.reviewCount
    };
  };

  const stats = calculateStats();

  if (status === "loading" || loading) {
    return (
      <main className="mx-auto mb-[90px] w-[95%] sm:w-[90%]">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded-lg"></div>
        </div>
      </main>
    );
  }

  if (error) {
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
          <h1 className="text-3xl font-bold mb-2">Agent Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {agentProfile?.user?.firstName}! Manage your travel business.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/agent-profile">
              <FileText className="w-4 h-4 mr-2" />
              My Profile
            </Link>
          </Button>
          <Button asChild>
            <Link href="/quotations/new">
              <Plus className="w-4 h-4 mr-2" />
              New Quotation
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="quotations">Quotations</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Requirements</p>
                    <p className="text-2xl font-bold">{stats?.totalRequirements || 0}</p>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <ArrowUpRight className="w-3 h-3 text-green-500 mr-1" />
                      <span>12% from last month</span>
                    </div>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{stats?.completedRequirements || 0}</p>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <ArrowUpRight className="w-3 h-3 text-green-500 mr-1" />
                      <span>8% from last month</span>
                    </div>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                    <p className="text-2xl font-bold">{stats?.averageResponseTime || 0}m</p>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <ArrowDownRight className="w-3 h-3 text-green-500 mr-1" />
                      <span>15% faster</span>
                    </div>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Customer Rating</p>
                    <p className="text-2xl font-bold">{stats?.rating || "0.0"}</p>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
                      <span>{stats?.reviewCount || 0} reviews</span>
                    </div>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Star className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Performance</span>
                    <span className="text-sm font-bold">{stats?.completionRate || 0}%</span>
                  </div>
                  <Progress value={stats?.completionRate || 0} className="h-2" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Completed</p>
                      <p className="font-medium">{stats?.completedRequirements || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pending</p>
                      <p className="font-medium">
                        {(stats?.totalRequirements || 0) - (stats?.completedRequirements || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Revenue</span>
                    <span className="text-sm font-bold">${stats?.totalRevenue || 0}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div className="flex justify-between py-1">
                      <span>This Month</span>
                      <span>$2,450</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Last Month</span>
                      <span>$2,100</span>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-green-600">
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    <span>16.7% growth</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {requirements.slice(0, 5).map((requirement) => (
                    <div key={requirement._id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium line-clamp-1">{requirement.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(requirement.createdAt), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <Badge className={requirement.status === "completed" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>
                        {requirement.status}
                      </Badge>
                    </div>
                  ))}
                  {requirements.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No requirements assigned yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {communications.slice(0, 5).map((communication) => (
                    <div key={communication._id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium line-clamp-1">{communication.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(communication.lastMessageAt), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/communications/${communication._id}`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  ))}
                  {communications.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No messages yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-bold">Assigned Requirements</h2>
            <div className="flex gap-2">
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {requirements.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Requirements Assigned</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't been assigned any requirements yet. Check back later!
                </p>
                <Button asChild>
                  <Link href="/travel-requirements">
                    Browse Requirements
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {requirements.map((requirement) => (
                <RequirementCard
                  key={requirement._id}
                  requirement={requirement}
                  showActions={true}
                  compact={false}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="quotations" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">My Quotations</h2>
            <Button asChild>
              <Link href="/quotations/new">
                <Plus className="w-4 h-4 mr-2" />
                New Quotation
              </Link>
            </Button>
          </div>

          {quotations.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Quotations Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first quotation to start earning!
                </p>
                <Button asChild>
                  <Link href="/quotations/new">
                    Create Quotation
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quotations.map((quotation) => (
                <QuotationCard
                  key={quotation._id}
                  quotation={quotation}
                  showActions={true}
                  compact={false}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Messages</h2>
            <Button asChild>
              <Link href="/communications/new">
                <Plus className="w-4 h-4 mr-2" />
                New Message
              </Link>
            </Button>
          </div>

          {communications.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Messages</h3>
                <p className="text-muted-foreground mb-4">
                  Start conversations with clients to build relationships.
                </p>
                <Button asChild>
                  <Link href="/communications/new">
                    Start Conversation
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {communications.map((communication) => (
                <Card key={communication._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{communication.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {communication.lastMessagePreview}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>
                            {format(new Date(communication.lastMessageAt), "MMM dd, yyyy")}
                          </span>
                          <Badge variant="outline">{communication.status}</Badge>
                          <span>{communication.participants.length} participants</span>
                        </div>
                      </div>
                      <Button asChild>
                        <Link href={`/communications/${communication._id}`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{stats?.completionRate || 0}%</p>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{stats?.averageResponseTime || 0}m</p>
                    <p className="text-sm text-muted-foreground">Avg Response</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{stats?.customerSatisfaction || 0}</p>
                    <p className="text-sm text-muted-foreground">Satisfaction</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{stats?.reviewCount || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Reviews</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Earnings Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">This Month</span>
                    <span className="font-medium">$2,450</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Last Month</span>
                    <span className="font-medium">$2,100</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">This Quarter</span>
                    <span className="font-medium">$6,800</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">This Year</span>
                    <span className="font-medium">${stats?.totalRevenue || 0}</span>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center text-green-600">
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    <span className="font-medium">16.7% growth from last quarter</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <Star className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <p className="font-medium">Top Rated Agent</p>
                  <p className="text-sm text-muted-foreground">4.8+ rating for 6 months</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-medium">Fast Responder</p>
                  <p className="text-sm text-muted-foreground">Avg response under 30min</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium">Reliable Partner</p>
                  <p className="text-sm text-muted-foreground">95%+ completion rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}