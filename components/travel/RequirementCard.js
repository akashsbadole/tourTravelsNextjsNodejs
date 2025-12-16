"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { 
  MapPin, 
  Calendar, 
  Users, 
  DollarSign, 
  Clock, 
  MessageCircle,
  Eye,
  Star,
  User
} from "lucide-react";
import Link from "next/link";

export function RequirementCard({ requirement, showActions = true, compact = false }) {
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

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getCategoryIcon(requirement.category)}</span>
              <h3 className="font-semibold text-sm line-clamp-1">{requirement.title}</h3>
            </div>
            <div className="flex gap-1">
              <Badge className={`text-xs ${getStatusColor(requirement.status)}`}>
                {requirement.status}
              </Badge>
              {requirement.priority !== "medium" && (
                <Badge className={`text-xs ${getPriorityColor(requirement.priority)}`}>
                  {requirement.priority}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{requirement.destinationInfo?.destination}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(requirement.travelDates?.departureDate), "MMM dd")}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{requirement.travelerInfo?.adults}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs">
              <DollarSign className="w-3 h-3" />
              <span>${requirement.budget?.min} - ${requirement.budget?.max}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{requirement.views || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                <span>{requirement.quotesReceived || 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getCategoryIcon(requirement.category)}</span>
            <div className="flex-1">
              <CardTitle className="text-lg line-clamp-2">{requirement.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {requirement.description}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Badge className={getStatusColor(requirement.status)}>
              {requirement.status}
            </Badge>
            <Badge className={getPriorityColor(requirement.priority)}>
              {requirement.priority}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Destination</p>
              <p className="text-muted-foreground">
                {requirement.destinationInfo?.origin} → {requirement.destinationInfo?.destination}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Travel Date</p>
              <p className="text-muted-foreground">
                {format(new Date(requirement.travelDates?.departureDate), "MMM dd, yyyy")}
                {requirement.travelDates?.returnDate && (
                  <> - {format(new Date(requirement.travelDates.returnDate), "MMM dd, yyyy")}</>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Travelers</p>
              <p className="text-muted-foreground">
                {requirement.travelerInfo?.adults} adults
                {requirement.travelerInfo?.children > 0 && (
                  <>, {requirement.travelerInfo.children} children</>
                )}
                {requirement.travelerInfo?.infants > 0 && (
                  <>, {requirement.travelerInfo.infants} infants</>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Budget</p>
              <p className="text-muted-foreground">
                ${requirement.budget?.min} - ${requirement.budget?.max} {requirement.budget?.currency}
              </p>
            </div>
          </div>
        </div>

        {requirement.assignedAgent && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <Avatar className="w-6 h-6">
              <AvatarImage src={requirement.assignedAgent?.user?.profileImage} />
              <AvatarFallback>
                {requirement.assignedAgent?.user?.firstName?.[0] || "A"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-xs font-medium">Assigned Agent</p>
              <p className="text-xs text-muted-foreground">
                {requirement.assignedAgent?.user?.firstName} {requirement.assignedAgent?.user?.lastName}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs">{requirement.assignedAgent?.rating || "0.0"}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{requirement.views || 0} views</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{requirement.quotesReceived || 0} quotes</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>Posted {format(new Date(requirement.createdAt), "MMM dd")}</span>
          </div>
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="pt-3">
          <div className="flex gap-2 w-full">
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/travel-requirements/${requirement._id}`}>
                View Details
              </Link>
            </Button>
            {requirement.status === "published" && (
              <Button asChild className="flex-1">
                <Link href={`/travel-requirements/${requirement._id}/quote`}>
                  Request Quote
                </Link>
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}