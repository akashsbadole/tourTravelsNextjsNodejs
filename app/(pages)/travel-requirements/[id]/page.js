"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequirementCard } from "@/components/travel/RequirementCard";
import { QuotationCard } from "@/components/travel/QuotationCard";
import { MessageThread } from "@/components/travel/MessageThread";
import { AgentProfileCard } from "@/components/travel/AgentProfileCard";
import { 
  ArrowLeft, 
  Edit, 
  MessageCircle, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Users,
  Star,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Share,
  Download
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function RequirementDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [requirement, setRequirement] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackPath=/travel-requirements/" + params.id);
    }
  }, [status, router, params.id]);

  useEffect(() => {
    if (session?.user && params.id) {
      fetchRequirementDetails();
      fetchQuotations();
      fetchCommunications();
    }
  }, [session, params.id]);

  const fetchRequirementDetails = async () => {
    try {
      const response = await fetch(`/api/requirements/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch requirement");
      }

      setRequirement(data.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchQuotations = async () => {
    try {
      const response = await fetch(`/api/quotations?requirementId=${params.id}`);
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
      const response = await fetch(`/api/communications?requirementId=${params.id}`);
      const data = await response.json();

      if (response.ok) {
        setCommunications(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch communications:", err);
    }
  };

  const handleSendMessage = async (messageData) => {
    try {
      let communication = communications.find(c => 
        c.participants.some(p => p.user._id === session.user.id)
      );

      if (!communication) {
        // Create new communication
        const createResponse = await fetch("/api/communications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requirementId: params.id,
            participants: requirement.assignedAgent ? [{
              user: requirement.assignedAgent._id,
              userType: "agent"
            }] : []
          }),
        });

        const createData = await createResponse.json();
        if (createResponse.ok) {
          communication = createData.data;
          setCommunications(prev => [...prev, communication]);
        }
      }

      if (communication) {
        const response = await fetch(`/api/communications/${communication._id}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messageData),
        });

        if (response.ok) {
          const data = await response.json();
          setCommunications(prev => 
            prev.map(c => 
              c._id === communication._id 
                ? { ...c, messages: [...c.messages, data.data] }
                : c
            )
          );
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: "bg-gray-100 text-gray-800",
      published: "bg-blue-100 text-blue-800",
      assigned: "bg-yellow-100 text-yellow-800",
      in_progress: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: "bg-gray-100 text-gray-800",
      medium: "bg-blue-100 text-blue-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800"
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
  };

  const getCategoryIcon = (category) => {
    const icons = {
      flight: "✈️",
      hotel: "🏨",
      package: "📦",
      custom: "⚙️"
    };
    return icons[category] || "📋";
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

  if (error) {
    return (
      <main className="mx-auto mb-[90px] w-[95%] sm:w-[90%]">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-destructive mb-2">Error</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => router.back()} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!requirement) {
    return (
      <main className="mx-auto mb-[90px] w-[95%] sm:w-[90%]">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Requirement Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The travel requirement you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => router.push("/travel-requirements")}>
              Back to Requirements
            </Button>
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getCategoryIcon(requirement.category)}</span>
            <div>
              <h1 className="text-3xl font-bold">{requirement.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getStatusColor(requirement.status)}>
                  {requirement.status}
                </Badge>
                <Badge className={getPriorityColor(requirement.priority)}>
                  {requirement.priority}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Posted {format(new Date(requirement.createdAt), "MMM dd, yyyy")}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            {requirement.userId._id === session?.user?.id && (
              <Button asChild size="sm">
                <Link href={`/travel-requirements/${requirement._id}/edit`}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="quotations">
            Quotations ({quotations.length})
          </TabsTrigger>
          <TabsTrigger value="messages">
            Messages ({communications.length})
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Requirement Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {requirement.description}
                    </p>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Route</p>
                          <p className="text-sm text-muted-foreground">
                            {requirement.destinationInfo.origin} → {requirement.destinationInfo.destination}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Travel Dates</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(requirement.travelDates.departureDate), "MMM dd, yyyy")}
                            {requirement.travelDates.returnDate && (
                              <> - {format(new Date(requirement.travelDates.returnDate), "MMM dd, yyyy")}</>
                            )}
                          </p>
                          {requirement.travelDates.flexibleDates && (
                            <p className="text-xs text-blue-600">
                              Flexible (±{requirement.travelDates.dateFlexibility} days)
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Travelers</p>
                          <p className="text-sm text-muted-foreground">
                            {requirement.travelerInfo.adults} adults
                            {requirement.travelerInfo.children > 0 && (
                              <>, {requirement.travelerInfo.children} children</>
                            )}
                            {requirement.travelerInfo.infants > 0 && (
                              <>, {requirement.travelerInfo.infants} infants</>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Budget</p>
                          <p className="text-sm text-muted-foreground">
                            {requirement.budget.currency} {requirement.budget.min} - {requirement.budget.max}
                          </p>
                        </div>
                      </div>

                      {requirement.deadline && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Quote Deadline</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(requirement.deadline), "MMM dd, yyyy")}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Views & Quotes</p>
                          <p className="text-sm text-muted-foreground">
                            {requirement.views} views, {requirement.quotesReceived} quotes
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {requirement.preferences && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold mb-3">Preferences</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {requirement.preferences.accommodationType?.length > 0 && (
                            <div>
                              <p className="font-medium">Accommodation</p>
                              <p className="text-muted-foreground">
                                {requirement.preferences.accommodationType.join(", ")}
                              </p>
                            </div>
                          )}
                          {requirement.preferences.flightClass?.length > 0 && (
                            <div>
                              <p className="font-medium">Flight Class</p>
                              <p className="text-muted-foreground">
                                {requirement.preferences.flightClass.join(", ")}
                              </p>
                            </div>
                          )}
                          {requirement.preferences.mealPreference && (
                            <div>
                              <p className="font-medium">Meal Preference</p>
                              <p className="text-muted-foreground">
                                {requirement.preferences.mealPreference}
                              </p>
                            </div>
                          )}
                          {requirement.preferences.transportation && (
                            <div>
                              <p className="font-medium">Transportation</p>
                              <p className="text-muted-foreground">
                                {requirement.preferences.transportation}
                              </p>
                            </div>
                          )}
                          {requirement.preferences.activities?.length > 0 && (
                            <div className="md:col-span-2">
                              <p className="font-medium">Activities</p>
                              <p className="text-muted-foreground">
                                {requirement.preferences.activities.join(", ")}
                              </p>
                            </div>
                          )}
                          {requirement.preferences.specialRequirements?.length > 0 && (
                            <div className="md:col-span-2">
                              <p className="font-medium">Special Requirements</p>
                              <ul className="text-muted-foreground list-disc list-inside">
                                {requirement.preferences.specialRequirements.map((req, index) => (
                                  <li key={index}>{req}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {quotations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Quotations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {quotations.slice(0, 3).map((quotation) => (
                        <QuotationCard
                          key={quotation._id}
                          quotation={quotation}
                          compact={true}
                          showActions={false}
                        />
                      ))}
                      {quotations.length > 3 && (
                        <Button variant="outline" className="w-full" onClick={() => setActiveTab("quotations")}>
                          View All Quotations ({quotations.length})
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              {requirement.assignedAgent && (
                <Card>
                  <CardHeader>
                    <CardTitle>Assigned Agent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AgentProfileCard
                      agent={requirement.assignedAgent}
                      compact={true}
                      showActions={true}
                      showContactInfo={false}
                    />
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {requirement.status === "published" && (
                    <Button className="w-full" onClick={() => setActiveTab("messages")}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contact Agents
                    </Button>
                  )}
                  {requirement.status === "assigned" && (
                    <Button className="w-full" onClick={() => setActiveTab("messages")}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message Agent
                    </Button>
                  )}
                  <Button variant="outline" className="w-full">
                    <FileText className="w-4 h-4 mr-2" />
                    Download Details
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {requirement.tags?.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                    {(!requirement.tags || requirement.tags.length === 0) && (
                      <p className="text-sm text-muted-foreground">No tags added</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="quotations" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Quotations ({quotations.length})</h2>
            <Button asChild>
              <Link href={`/quotations/new?requirement=${requirement._id}`}>
                <DollarSign className="w-4 h-4 mr-2" />
                Request Quote
              </Link>
            </Button>
          </div>

          {quotations.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Quotations Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Agents haven't submitted quotations for this requirement yet.
                </p>
                <Button asChild>
                  <Link href={`/quotations/new?requirement=${requirement._id}`}>
                    Request Quote
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
              <Link href={`/communications/new?requirement=${requirement._id}`}>
                <MessageCircle className="w-4 h-4 mr-2" />
                New Conversation
              </Link>
            </Button>
          </div>

          {communications.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Messages Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start a conversation with agents about this requirement.
                </p>
                <Button asChild>
                  <Link href={`/communications/new?requirement=${requirement._id}`}>
                    Start Conversation
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {communications.map((communication) => (
                <MessageThread
                  key={communication._id}
                  communication={communication}
                  currentUser={session.user}
                  onSendMessage={handleSendMessage}
                  className="h-[500px]"
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium">Requirement Created</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(requirement.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                    </p>
                  </div>
                </div>

                {requirement.assignedAt && (
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <Users className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Agent Assigned</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(requirement.assignedAt), "MMM dd, yyyy 'at' HH:mm")}
                      </p>
                    </div>
                  </div>
                )}

                {requirement.quotesReceived > 0 && (
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <FileText className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="font-medium">{requirement.quotesReceived} Quotation{requirement.quotesReceived > 1 ? 's' : ''} Received</p>
                      <p className="text-sm text-muted-foreground">
                        Last quotation received recently
                      </p>
                    </div>
                  </div>
                )}

                {requirement.completedAt && (
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium">Requirement Completed</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(requirement.completedAt), "MMM dd, yyyy 'at' HH:mm")}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Requirement Views</p>
                    <p className="text-sm text-muted-foreground">
                      {requirement.views} total views
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}