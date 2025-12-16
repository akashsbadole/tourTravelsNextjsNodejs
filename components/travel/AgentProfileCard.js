"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Star, 
  CheckCircle, 
  Clock,
  Award,
  Users,
  DollarSign,
  Calendar,
  MessageCircle,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

export function AgentProfileCard({ 
  agent, 
  showActions = true, 
  compact = false, 
  showContactInfo = false,
  className = "" 
}) {
  const getVerificationStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      verified: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      suspended: "bg-gray-100 text-gray-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getVerificationStatusIcon = (status) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "rejected":
        return <Clock className="w-4 h-4" />;
      case "suspended":
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getSpecialtyIcon = (specialty) => {
    const icons = {
      flights: "✈️",
      hotels: "🏨",
      packages: "📦",
      corporate: "💼",
      luxury: "💎",
      adventure: "🏔️",
      medical: "🏥",
      education: "🎓"
    };
    return icons[specialty] || "🌍";
  };

  const formatWorkingHours = (workingHours) => {
    if (!workingHours) return "Not specified";
    
    const today = new Date().toLocaleLowerCase().slice(0, 3);
    const todayHours = workingHours[today];
    
    if (!todayHours || todayHours.closed) {
      return "Closed today";
    }
    
    return `${todayHours.open} - ${todayHours.close}`;
  };

  const calculateCompletionRate = (metrics) => {
    if (!metrics || metrics.totalRequirements === 0) return 0;
    return Math.round((metrics.completedRequirements / metrics.totalRequirements) * 100);
  };

  if (compact) {
    return (
      <Card className={`hover:shadow-md transition-shadow ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={agent.user?.profileImage} />
              <AvatarFallback>
                {agent.user?.firstName?.[0] || "A"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">
                {agent.user?.firstName} {agent.user?.lastName}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs">{agent.rating || "0.0"}</span>
                </div>
                <Badge className={`text-xs ${getVerificationStatusColor(agent.verificationStatus)}`}>
                  {agent.verificationStatus}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {agent.experience} years experience
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{agent.specialties?.slice(0, 2).join(", ")}</p>
              <p className="text-xs text-muted-foreground">
                {agent.performanceMetrics?.completedRequirements || 0} completed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`hover:shadow-lg transition-shadow ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={agent.user?.profileImage} />
              <AvatarFallback className="text-lg">
                {agent.user?.firstName?.[0] || "A"}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">
                {agent.user?.firstName} {agent.user?.lastName}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{agent.rating || "0.0"}</span>
                  <span className="text-muted-foreground">({agent.reviewCount || 0} reviews)</span>
                </div>
                <Badge className={`flex items-center gap-1 ${getVerificationStatusColor(agent.verificationStatus)}`}>
                  {getVerificationStatusIcon(agent.verificationStatus)}
                  {agent.verificationStatus}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                License: {agent.licenseNumber}
              </p>
            </div>
          </div>
          {showActions && (
            <div className="flex flex-col gap-2">
              <Button asChild size="sm">
                <Link href={`/agent-profile/${agent._id}`}>
                  View Profile
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/communications/new?agent=${agent._id}`}>
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Contact
                </Link>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {agent.bio && (
          <div>
            <p className="text-sm text-muted-foreground line-clamp-3">{agent.bio}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Experience</span>
            </div>
            <p className="text-sm">{agent.experience} years</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Completed</span>
            </div>
            <p className="text-sm">{agent.performanceMetrics?.completedRequirements || 0} requirements</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Avg Response</span>
            </div>
            <p className="text-sm">{agent.performanceMetrics?.averageResponseTime || 0} minutes</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Revenue</span>
            </div>
            <p className="text-sm">${agent.performanceMetrics?.totalRevenue || 0}</p>
          </div>
        </div>

        {agent.performanceMetrics && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Completion Rate</span>
              <span>{calculateCompletionRate(agent.performanceMetrics)}%</span>
            </div>
            <Progress value={calculateCompletionRate(agent.performanceMetrics)} className="h-2" />
          </div>
        )}

        <Separator />

        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-2">Specialties</h4>
            <div className="flex flex-wrap gap-1">
              {agent.specialties?.map((specialty, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  <span className="mr-1">{getSpecialtyIcon(specialty)}</span>
                  {specialty}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Languages</h4>
            <div className="flex flex-wrap gap-1">
              {agent.languages?.map((language, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {language}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Working Hours</h4>
            <p className="text-sm text-muted-foreground">
              {formatWorkingHours(agent.workingHours)}
            </p>
          </div>
        </div>

        {showContactInfo && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{agent.contactDetails?.phone}</span>
              </div>
              {agent.contactDetails?.alternatePhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{agent.contactDetails.alternatePhone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{agent.contactDetails?.officeAddress}</span>
              </div>
              {agent.contactDetails?.website && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <a 
                    href={agent.contactDetails.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {agent.contactDetails.website}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </>
        )}

        <div className="text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Member since {format(new Date(agent.createdAt), "MMMM yyyy")}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <CheckCircle className="w-3 h-3" />
            <span>License expires {format(new Date(agent.licenseExpiryDate), "MMMM yyyy")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}