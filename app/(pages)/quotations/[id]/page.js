"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuotationCard } from "@/components/travel/QuotationCard";
import { RequirementCard } from "@/components/travel/RequirementCard";
import { MessageThread } from "@/components/travel/MessageThread";
import { AgentProfileCard } from "@/components/travel/AgentProfileCard";
import { 
  ArrowLeft, 
  Download, 
  Share, 
  MessageCircle, 
  CheckCircle, 
  XCircle, 
  Clock,
  DollarSign,
  Calendar,
  FileText,
  User,
  Edit,
  Send,
  AlertCircle,
  Star,
  Eye
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function QuotationDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [quotation, setQuotation] = useState(null);
  const [requirement, setRequirement] = useState(null);
  const [communications, setCommunications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [responding, setResponding] = useState(false);
  const [responseNotes, setResponseNotes] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackPath=/quotations/" + params.id);
    }
  }, [status, router, params.id]);

  useEffect(() => {
    if (session?.user && params.id) {
      fetchQuotationDetails();
      fetchCommunications();
    }
  }, [session, params.id]);

  const fetchQuotationDetails = async () => {
    try {
      const response = await fetch(`/api/quotations/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch quotation");
      }

      setQuotation(data.data);
      setRequirement(data.data.requirementId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunications = async () => {
    try {
      const response = await fetch(`/api/communications?requirementId=${quotation?.requirementId?._id}`);
      const data = await response.json();

      if (response.ok) {
        setCommunications(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch communications:", err);
    }
  };

  const handleRespond = async (action) => {
    try {
      setResponding(true);
      setError(null);

      const response = await fetch(`/api/quotations/${params.id}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          notes: responseNotes
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to respond to quotation");
      }

      setQuotation(prev => ({ ...prev, ...data.data }));
      setResponseNotes("");
      
      // Show success message
      setTimeout(() => {
        router.push(`/quotations/${params.id}`);
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setResponding(false);
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
            requirementId: quotation.requirementId._id,
            participants: [{
              user: quotation.agentId._id,
              userType: "agent"
            }]
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
      sent: "bg-blue-100 text-blue-800",
      viewed: "bg-purple-100 text-purple-800",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      expired: "bg-orange-100 text-orange-800",
      withdrawn: "bg-gray-100 text-gray-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status) => {
    const icons = {
      draft: <FileText className="w-4 h-4" />,
      sent: <Send className="w-4 h-4" />,
      viewed: <Eye className="w-4 h-4" />,
      accepted: <CheckCircle className="w-4 h-4" />,
      rejected: <XCircle className="w-4 h-4" />,
      expired: <Clock className="w-4 h-4" />,
      withdrawn: <XCircle className="w-4 h-4" />
    };
    return icons[status] || <FileText className="w-4 h-4" />;
  };

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const isExpired = () => {
    if (!quotation?.validityPeriod) return false;
    return new Date() > new Date(quotation.validityPeriod.endsAt);
  };

  const canRespond = () => {
    return quotation?.status === "sent" && !isExpired() && 
           quotation.userId._id === session?.user?.id;
  };

  const canEdit = () => {
    return quotation?.agentId._id === session?.user?.id && 
           ["draft", "sent"].includes(quotation?.status);
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

  if (!quotation) {
    return (
      <main className="mx-auto mb-[90px] w-[95%] sm:w-[90%]">
        <Card>
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Quotation Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The quotation you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => router.push("/quotations")}>
              Back to Quotations
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto mb-[90px] w-[95%] sm:w-[90%]">
      <div className="mb-6">
        <Link href="/quotations" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Quotations
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getStatusColor(quotation.status)}`}>
              {getStatusIcon(quotation.status)}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{quotation.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getStatusColor(quotation.status)}>
                  {quotation.status}
                </Badge>
                {quotation.isRecommended && (
                  <Badge className="bg-yellow-100 text-yellow-800">Recommended</Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  Sent {format(new Date(quotation.createdAt), "MMM dd, yyyy")}
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
            {canEdit() && (
              <Button asChild size="sm">
                <Link href={`/quotations/${quotation._id}/edit`}>
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
          <TabsTrigger value="requirement">Requirement</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Quotation Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Quotation Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {quotation.description}
                    </p>
                  </div>

                  {quotation.itinerary && (
                    <div>
                      <h3 className="font-semibold mb-2">Itinerary</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {quotation.itinerary}
                      </p>
                    </div>
                  )}

                  {/* Pricing Breakdown */}
                  <div>
                    <h3 className="font-semibold mb-3">Pricing Breakdown</h3>
                    <div className="space-y-2">
                      {quotation.items?.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-muted rounded">
                          <div className="flex-1">
                            <p className="font-medium">{item.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} × {formatCurrency(item.unitPrice, item.currency)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(item.totalPrice, item.currency)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Summary */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold mb-3">Price Summary</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatCurrency(quotation.pricing?.subtotal || 0, quotation.pricing?.currency)}</span>
                      </div>
                      {quotation.pricing?.tax > 0 && (
                        <div className="flex justify-between">
                          <span>Tax</span>
                          <span>{formatCurrency(quotation.pricing.tax, quotation.pricing?.currency)}</span>
                        </div>
                      )}
                      {quotation.pricing?.serviceFee > 0 && (
                        <div className="flex justify-between">
                          <span>Service Fee</span>
                          <span>{formatCurrency(quotation.pricing.serviceFee, quotation.pricing?.currency)}</span>
                        </div>
                      )}
                      {quotation.pricing?.discount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount</span>
                          <span>-{formatCurrency(quotation.pricing.discount, quotation.pricing?.currency)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>{formatCurrency(quotation.pricing?.total || 0, quotation.pricing?.currency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Inclusions & Exclusions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quotation.inclusions?.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Inclusions</h3>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {quotation.inclusions.map((inclusion, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{inclusion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {quotation.exclusions?.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">Exclusions</h3>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {quotation.exclusions.map((exclusion, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                              <span>{exclusion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Terms & Conditions */}
                  <div>
                    <h3 className="font-semibold mb-2">Terms & Conditions</h3>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <div>
                        <p className="font-medium">Payment Terms:</p>
                        <p>{quotation.termsAndConditions?.paymentTerms}</p>
                      </div>
                      <div>
                        <p className="font-medium">Cancellation Policy:</p>
                        <p>{quotation.termsAndConditions?.cancellationPolicy}</p>
                      </div>
                      <div>
                        <p className="font-medium">Refund Policy:</p>
                        <p>{quotation.termsAndConditions?.refundPolicy}</p>
                      </div>
                    </div>
                  </div>

                  {/* Validity Period */}
                  <div className={`p-4 rounded-lg border ${
                    isExpired() ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5" />
                      <h3 className="font-semibold">Validity Period</h3>
                    </div>
                    <p className="text-sm">
                      {format(new Date(quotation.validityPeriod?.startsAt), "MMM dd, yyyy")} - {format(new Date(quotation.validityPeriod?.endsAt), "MMM dd, yyyy")}
                    </p>
                    <p className={`text-sm mt-1 ${isExpired() ? "text-red-600" : "text-green-600"}`}>
                      {isExpired() ? "This quotation has expired" : "This quotation is still valid"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Agent Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Agent Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <AgentProfileCard
                    agent={quotation.agentId}
                    compact={true}
                    showActions={true}
                    showContactInfo={false}
                  />
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {canRespond() && (
                    <>
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Add notes for your response (optional)..."
                          value={responseNotes}
                          onChange={(e) => setResponseNotes(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleRespond("accept")} 
                          disabled={responding}
                          className="flex-1"
                        >
                          {responding ? "Processing..." : "Accept Quotation"}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => handleRespond("reject")}
                          disabled={responding}
                          className="flex-1"
                        >
                          {responding ? "Processing..." : "Reject Quotation"}
                        </Button>
                      </div>
                    </>
                  )}

                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/communications/new?quotation=${quotation._id}`}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message Agent
                    </Link>
                  </Button>

                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </CardContent>
              </Card>

              {/* Status Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Status Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium">Created</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(quotation.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                      </p>
                    </div>
                  </div>

                  {quotation.sentAt && (
                    <div className="flex items-center gap-3">
                      <Send className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-medium">Sent</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(quotation.sentAt), "MMM dd, yyyy 'at' HH:mm")}
                        </p>
                      </div>
                    </div>
                  )}

                  {quotation.viewedAt && (
                    <div className="flex items-center gap-3">
                      <Eye className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="font-medium">Viewed</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(quotation.viewedAt), "MMM dd, yyyy 'at' HH:mm")}
                        </p>
                      </div>
                    </div>
                  )}

                  {quotation.respondedAt && (
                    <div className="flex items-center gap-3">
                      {quotation.status === "accepted" ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">
                          {quotation.status === "accepted" ? "Accepted" : "Rejected"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(quotation.respondedAt), "MMM dd, yyyy 'at' HH:mm")}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="requirement" className="space-y-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Original Requirement</h2>
            <p className="text-muted-foreground">
              View the travel requirement this quotation was created for
            </p>
          </div>

          {requirement && (
            <RequirementCard
              requirement={requirement}
              showActions={false}
              compact={false}
            />
          )}
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Messages</h2>
            <Button asChild>
              <Link href={`/communications/new?quotation=${quotation._id}`}>
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
                  Start a conversation about this quotation.
                </p>
                <Button asChild>
                  <Link href={`/communications/new?quotation=${quotation._id}`}>
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

        <TabsContent value="history" className="space-y-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Quotation History</h2>
            <p className="text-muted-foreground">
              Track all changes and updates to this quotation
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revision History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Original Version</p>
                    <p className="text-sm text-muted-foreground">
                      Created on {format(new Date(quotation.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                    </p>
                  </div>
                </div>

                {quotation.revisionCount > 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      This quotation has been revised {quotation.revisionCount} time{quotation.revisionCount > 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                {quotation.responseNotes && (
                  <div className="flex items-center gap-3 pb-3 border-b">
                    <MessageCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium">Client Response</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(quotation.respondedAt), "MMM dd, yyyy 'at' HH:mm")}
                      </p>
                      <p className="text-sm mt-1">{quotation.responseNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}