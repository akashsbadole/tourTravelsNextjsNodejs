"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Calendar, 
  DollarSign, 
  User, 
  Edit, 
  Download,
  Filter,
  Search,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";

export default function ModificationHistory({ bookingId, bookingData }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date");

  useEffect(() => {
    fetchModificationHistory();
  }, [bookingId]);

  const fetchModificationHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/flight-modifications?bookingId=${bookingId}`);
      const result = await response.json();
      
      if (result.success) {
        setHistory(result.data || []);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to fetch modification history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-blue-500';
      case 'pending_approval':
        return 'bg-yellow-500';
      case 'requested':
        return 'bg-orange-500';
      case 'failed':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <Clock className="h-4 w-4" />;
      case 'pending_approval':
        return <Clock className="h-4 w-4" />;
      case 'requested':
        return <Edit className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'processing':
        return 'Processing';
      case 'pending_approval':
        return 'Pending Approval';
      case 'requested':
        return 'Requested';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getModificationTypeIcon = (type) => {
    switch (type) {
      case 'date_change':
        return <Calendar className="h-4 w-4" />;
      case 'passenger_update':
        return <User className="h-4 w-4" />;
      case 'seat_change':
        return <Edit className="h-4 w-4" />;
      case 'baggage_change':
        return <Edit className="h-4 w-4" />;
      case 'meal_change':
        return <Edit className="h-4 w-4" />;
      case 'class_upgrade':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Edit className="h-4 w-4" />;
    }
  };

  const getModificationTypeText = (type) => {
    return type.replace('_', ' ').toUpperCase();
  };

  const filteredHistory = history.filter(item => {
    const matchesFilter = filter === "all" || item.status === filter;
    const matchesSearch = searchTerm === "" || 
      item.modificationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.modifications.some(mod => mod.type.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  const sortedHistory = [...filteredHistory].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.requestedAt) - new Date(a.requestedAt);
      case 'status':
        return a.status.localeCompare(b.status);
      case 'type':
        return a.modifications[0]?.type.localeCompare(b.modifications[0]?.type);
      case 'amount':
        return (b.totalAdditionalCost || 0) - (a.totalAdditionalCost || 0);
      default:
        return 0;
    }
  });

  const handleDownloadReceipt = async (modificationId) => {
    try {
      const response = await fetch(`/api/flight-modifications/${modificationId}/receipt`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `modification-receipt-${modificationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading receipt:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
          <p className="text-lg font-medium">Loading modification history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Modification History</h2>
          <p className="text-muted-foreground">
            Track all changes made to your booking {bookingData.pnrCode}
          </p>
        </div>
        <Button onClick={fetchModificationHistory} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search modifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <Tabs value={filter} onValueChange={setFilter} className="w-full lg:w-auto">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="requested">Requested</TabsTrigger>
                <TabsTrigger value="processing">Processing</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="failed">Failed</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="date">Sort by Date</option>
              <option value="status">Sort by Status</option>
              <option value="type">Sort by Type</option>
              <option value="amount">Sort by Amount</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      {sortedHistory.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No Modifications Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filter !== "all" 
                    ? "No modifications match your search criteria" 
                    : "No modifications have been made to this booking"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedHistory.map((item) => (
            <Card key={item.modificationId} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  {/* Left Column - Modification Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge 
                        className={`${getStatusColor(item.status)} text-white`}
                      >
                        <span className="flex items-center gap-1">
                          {getStatusIcon(item.status)}
                          {getStatusText(item.status)}
                        </span>
                      </Badge>
                      <span className="font-mono text-sm text-muted-foreground">
                        {item.modificationId}
                      </span>
                    </div>

                    {/* Modification Details */}
                    <div className="space-y-2">
                      {item.modifications.map((mod, index) => (
                        <div key={index} className="flex items-center gap-2">
                          {getModificationTypeIcon(mod.type)}
                          <div>
                            <p className="font-medium">
                              {getModificationTypeText(mod.type)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {mod.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Timeline */}
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>Requested: {format(new Date(item.requestedAt), 'PPP')}</span>
                      </div>
                      {item.processedAt && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-muted-foreground" />
                          <span>Processed: {format(new Date(item.processedAt), 'PPP')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Actions and Amount */}
                  <div className="text-right space-y-3">
                    {/* Financial Info */}
                    {(item.totalAdditionalCost > 0 || item.totalRefundAmount > 0) && (
                      <div className="space-y-1">
                        {item.totalAdditionalCost > 0 && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Paid:</span>
                            <span className="font-semibold text-primary ml-1">
                              ${item.totalAdditionalCost} {item.currency}
                            </span>
                          </div>
                        )}
                        {item.totalRefundAmount > 0 && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Refunded:</span>
                            <span className="font-semibold text-green-600 ml-1">
                              ${item.totalRefundAmount} {item.currency}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-2">
                      {item.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReceipt(item.modificationId)}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Receipt
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.location.href = `/flight-modifications/${item.modificationId}`}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {item.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Notes:</span> {item.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{history.length}</p>
                <p className="text-sm text-muted-foreground">Total Modifications</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {history.filter(h => h.status === 'completed').length}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {history.filter(h => h.status === 'processing').length}
                </p>
                <p className="text-sm text-muted-foreground">Processing</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  ${history.reduce((sum, h) => sum + (h.totalAdditionalCost || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Spent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}