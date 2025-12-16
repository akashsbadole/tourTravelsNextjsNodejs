"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { 
  DollarSign, 
  Calendar, 
  Clock, 
  User, 
  Star,
  CheckCircle,
  XCircle,
  Eye,
  MessageCircle,
  FileText,
  Timer
} from "lucide-react";
import Link from "next/link";

export function QuotationCard({ quotation, showActions = true, compact = false }) {
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
      sent: <MessageCircle className="w-4 h-4" />,
      viewed: <Eye className="w-4 h-4" />,
      accepted: <CheckCircle className="w-4 h-4" />,
      rejected: <XCircle className="w-4 h-4" />,
      expired: <Timer className="w-4 h-4" />,
      withdrawn: <XCircle className="w-4 h-4" />
    };
    return icons[status] || <FileText className="w-4 h-4" />;
  };

  const getValidityProgress = () => {
    if (!quotation.validityPeriod) return 0;
    const now = new Date();
    const start = new Date(quotation.validityPeriod.startsAt);
    const end = new Date(quotation.validityPeriod.endsAt);
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const isExpired = () => {
    if (!quotation.validityPeriod) return false;
    return new Date() > new Date(quotation.validityPeriod.endsAt);
  };

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-sm line-clamp-1">{quotation.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1">{quotation.description}</p>
            </div>
            <Badge className={`text-xs flex items-center gap-1 ${getStatusColor(quotation.status)}`}>
              {getStatusIcon(quotation.status)}
              {quotation.status}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-primary">
              {formatCurrency(quotation.pricing?.total || 0, quotation.pricing?.currency)}
            </div>
            {quotation.isRecommended && (
              <Badge className="bg-yellow-100 text-yellow-800 text-xs">Recommended</Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Valid until {format(new Date(quotation.validityPeriod?.endsAt), "MMM dd")}</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{quotation.agentId?.user?.firstName}</span>
            </div>
          </div>

          {quotation.validityPeriod && (
            <div className="mt-2">
              <Progress value={getValidityProgress()} className="h-1" />
              <p className="text-xs text-muted-foreground mt-1">
                {isExpired() ? "Expired" : `${Math.round(100 - getValidityProgress())}% remaining`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">{quotation.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {quotation.description}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Badge className={`flex items-center gap-1 ${getStatusColor(quotation.status)}`}>
              {getStatusIcon(quotation.status)}
              {quotation.status}
            </Badge>
            {quotation.isRecommended && (
              <Badge className="bg-yellow-100 text-yellow-800">Recommended</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <p className="text-sm font-medium">Total Price</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(quotation.pricing?.total || 0, quotation.pricing?.currency)}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="text-muted-foreground">Subtotal</p>
            <p>{formatCurrency(quotation.pricing?.subtotal || 0, quotation.pricing?.currency)}</p>
            {quotation.pricing?.tax > 0 && (
              <p className="text-muted-foreground">Tax: {formatCurrency(quotation.pricing?.tax, quotation.pricing?.currency)}</p>
            )}
            {quotation.pricing?.serviceFee > 0 && (
              <p className="text-muted-foreground">Service: {formatCurrency(quotation.pricing?.serviceFee, quotation.pricing?.currency)}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Agent</p>
              <p className="text-muted-foreground">
                {quotation.agentId?.user?.firstName} {quotation.agentId?.user?.lastName}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Rating</p>
              <p className="text-muted-foreground">
                {quotation.agentId?.rating || "0.0"} ({quotation.agentId?.reviewCount || 0} reviews)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Valid Until</p>
              <p className="text-muted-foreground">
                {format(new Date(quotation.validityPeriod?.endsAt), "MMM dd, yyyy")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Sent</p>
              <p className="text-muted-foreground">
                {quotation.sentAt ? format(new Date(quotation.sentAt), "MMM dd, yyyy") : "Not sent"}
              </p>
            </div>
          </div>
        </div>

        {quotation.validityPeriod && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Validity Period</span>
              <span>{isExpired() ? "Expired" : `${Math.round(100 - getValidityProgress())}% remaining`}</span>
            </div>
            <Progress value={getValidityProgress()} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {format(new Date(quotation.validityPeriod.startsAt), "MMM dd")} - {format(new Date(quotation.validityPeriod.endsAt), "MMM dd, yyyy")}
            </p>
          </div>
        )}

        {quotation.items && quotation.items.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Included Items</p>
            <div className="space-y-1">
              {quotation.items.slice(0, 3).map((item, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="flex-1 line-clamp-1">{item.description}</span>
                  <span className="text-muted-foreground">
                    {formatCurrency(item.totalPrice, item.currency)}
                  </span>
                </div>
              ))}
              {quotation.items.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{quotation.items.length - 3} more items
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            <span>{quotation.items?.length || 0} items</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>Revision {quotation.revisionCount || 0}</span>
          </div>
          {quotation.comparisonScore && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4" />
              <span>Match: {quotation.comparisonScore}%</span>
            </div>
          )}
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="pt-3">
          <div className="flex gap-2 w-full">
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/quotations/${quotation._id}`}>
                View Details
              </Link>
            </Button>
            {quotation.status === "sent" && !isExpired() && (
              <>
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/quotations/${quotation._id}/respond`}>
                    Respond
                  </Link>
                </Button>
                <Button asChild className="flex-1">
                  <Link href={`/quotations/${quotation._id}/accept`}>
                    Accept
                  </Link>
                </Button>
              </>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}