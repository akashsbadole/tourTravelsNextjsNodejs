"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  Download, 
  Trash2, 
  RefreshCw,
  Calendar,
  Shield,
  AlertCircle,
  X,
  Plus,
  Camera,
  FileImage,
  FolderOpen
} from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

export function DocumentManager({ documents, onDocumentUpload, onDocumentDelete, onDocumentUpdate }) {
  const [activeTab, setActiveTab] = useState("documents");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [viewMode, setViewMode] = useState("grid");
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    expiry: "all"
  });
  const { toast } = useToast();

  const getDocumentIcon = (type) => {
    const icons = {
      passport: <FileText className="h-5 w-5" />,
      visa: <FileText className="h-5 w-5" />,
      driver_license: <FileText className="h-5 w-5" />,
      national_id: <FileText className="h-5 w-5" />,
      health_certificate: <FileText className="h-5 w-5" />,
      travel_insurance: <Shield className="h-5 w-5" />
    };
    return icons[type] || <FileText className="h-5 w-5" />;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "yellow",
      verified: "green",
      rejected: "red",
      expired: "gray"
    };
    return colors[status] || "gray";
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <Clock className="h-4 w-4" />,
      verified: <CheckCircle className="h-4 w-4" />,
      rejected: <AlertTriangle className="h-4 w-4" />,
      expired: <AlertCircle className="h-4 w-4" />
    };
    return icons[status] || <Clock className="h-4 w-4" />;
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { status: "unknown", daysLeft: null };
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = differenceInDays(expiry, today);
    
    if (daysLeft < 0) return { status: "expired", daysLeft: Math.abs(daysLeft) };
    if (daysLeft <= 30) return { status: "expiring_soon", daysLeft };
    if (daysLeft <= 90) return { status: "expiring", daysLeft };
    
    return { status: "valid", daysLeft };
  };

  const handleFileUpload = async (event, documentType, documentId) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);
    if (documentId) {
      formData.append('documentId', documentId);
    }

    setUploadProgress(prev => ({ ...prev, [documentId || 'new']: 0 }));

    try {
      const result = await onDocumentUpload(formData);
      
      if (result.success) {
        toast({
          title: "Document Uploaded",
          description: "Your document has been uploaded successfully",
          variant: "default",
        });
      } else {
        toast({
          title: "Upload Failed",
          description: result.message || "Failed to upload document",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setUploadProgress(prev => {
        const newState = { ...prev };
        delete newState[documentId || 'new'];
        return newState;
      });
    }
  };

  const handleDeleteDocument = async (documentId) => {
    try {
      const result = await onDocumentDelete(documentId);
      
      if (result.success) {
        toast({
          title: "Document Deleted",
          description: "Document deleted successfully",
          variant: "default",
        });
        setSelectedDocument(null);
      } else {
        toast({
          title: "Delete Failed",
          description: result.message || "Failed to delete document",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (filters.type !== "all" && doc.documentType !== filters.type) return false;
    if (filters.status !== "all" && doc.verificationStatus !== filters.status) return false;
    
    if (filters.expiry !== "all") {
      const expiryStatus = getExpiryStatus(doc.expiryDate);
      if (filters.expiry !== expiryStatus.status) return false;
    }
    
    return true;
  });

  const DocumentsTab = () => (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Documents
          </CardTitle>
          <CardDescription>
            Upload your travel documents for verification and easy access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {['passport', 'visa', 'driver_license', 'national_id', 'health_certificate', 'travel_insurance'].map(docType => (
              <div key={docType} className="space-y-2">
                <Label htmlFor={`${docType}_upload`} className="capitalize">
                  {docType.replace('_', ' ')} Document
                </Label>
                <div className="flex items-center gap-4">
                  <Input
                    id={`${docType}_upload`}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, docType)}
                    className="flex-1"
                    disabled={isUploading}
                  />
                  {uploadProgress[docType] !== undefined && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                  )}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Accepted formats: JPG, PNG, PDF (Max 5MB)
                </div>
              </div>
            ))}
          </div>
          
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              All documents are encrypted and stored securely. They are only used for verification purposes 
              and will never be shared without your consent.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Document Filters
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              >
                {viewMode === "grid" ? "List View" : "Grid View"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Document Type</Label>
              <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="driver_license">Driver License</SelectItem>
                  <SelectItem value="national_id">National ID</SelectItem>
                  <SelectItem value="health_certificate">Health Certificate</SelectItem>
                  <SelectItem value="travel_insurance">Travel Insurance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Verification Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Expiry Status</Label>
              <Select value={filters.expiry} onValueChange={(value) => setFilters(prev => ({ ...prev, expiry: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Documents</SelectItem>
                  <SelectItem value="valid">Valid</SelectItem>
                  <SelectItem value="expiring">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid/List */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FileImage className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Documents Found</h3>
            <p className="text-muted-foreground">
              {filters.type === "all" && filters.status === "all" && filters.expiry === "all"
                ? "You haven't uploaded any documents yet."
                : "No documents match your current filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
          {filteredDocuments.map((document) => {
            const expiryStatus = getExpiryStatus(document.expiryDate);
            
            return (
              <Card key={document._id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getDocumentIcon(document.documentType)}
                      <div>
                        <h3 className="font-semibold capitalize">
                          {document.documentType.replace('_', ' ')}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {document.documentNumber}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={document.verificationStatus === "verified" ? "default" : "secondary"}>
                        {getStatusIcon(document.verificationStatus)}
                        <span className="ml-1">
                          {document.verificationStatus.replace('_', ' ').toUpperCase()}
                        </span>
                      </Badge>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedDocument(document)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Issuing Country:</span>
                      <span className="font-medium">{document.issuingCountry}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Issue Date:</span>
                      <span className="font-medium">
                        {format(new Date(document.issueDate), "PPP")}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expiry Date:</span>
                      <span className={`font-medium ${
                        expiryStatus.status === "expired" ? "text-red-600" :
                        expiryStatus.status === "expiring_soon" ? "text-orange-600" :
                        expiryStatus.status === "expiring" ? "text-yellow-600" :
                        "text-green-600"
                      }`}>
                        {format(new Date(document.expiryDate), "PPP")}
                      </span>
                    </div>
                    
                    {expiryStatus.status !== "valid" && (
                      <div className="text-center">
                        <Badge variant={expiryStatus.status === "expired" ? "destructive" : "secondary"}>
                          {expiryStatus.status === "expired" && "EXPIRED"}
                          {expiryStatus.status === "expiring_soon" && "EXPIRED"}
                          {expiryStatus.status === "expiring" && `Expires in ${expiryStatus.daysLeft} days`}
                        </Badge>
                      </div>
                    )}
                    
                    {document.verificationNotes && (
                      <div className="mt-2 p-2 bg-muted rounded">
                        <p className="text-sm">
                          <strong>Verification Notes:</strong> {document.verificationNotes}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between mt-4 pt-3 border-t">
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteDocument(document._id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const VerificationStatusTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Verification Status
          </CardTitle>
          <CardDescription>
            Track the status of your document verifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((document) => (
                <TableRow key={document._id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getDocumentIcon(document.documentType)}
                      <span className="font-medium">{document.documentNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">
                    {document.documentType.replace('_', ' ')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(document.verificationStatus)}>
                      {getStatusIcon(document.verificationStatus)}
                      <span className="ml-1">
                        {document.verificationStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(document.createdAt || new Date()), "PPP")}
                  </TableCell>
                  <TableCell>
                    {document.verifiedAt ? format(new Date(document.verifiedAt), "PPP") : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {format(new Date(document.expiryDate), "PPP")}
                      {getExpiryStatus(document.expiryDate).status === "expired" && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {document.verificationStatus === "pending" && (
                        <Button size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const DocumentPreview = () => {
    if (!selectedDocument) return null;

    return (
      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getDocumentIcon(selectedDocument.documentType)}
              Document Details
            </DialogTitle>
            <DialogDescription>
              {selectedDocument.documentType.replace('_', ' ').toUpperCase()} - {selectedDocument.documentNumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Document Preview */}
            {selectedDocument.documentUrl && (
              <div className="space-y-3">
                <h3 className="font-semibold">Document Preview</h3>
                <div className="border rounded-lg p-4 bg-muted">
                  {selectedDocument.documentType === 'travel_insurance' ? (
                    <div className="text-center">
                      <Shield className="h-16 w-16 mx-auto mb-4 text-blue-500" />
                      <p>Insurance Document</p>
                    </div>
                  ) : (
                    <img 
                      src={selectedDocument.documentUrl} 
                      alt="Document preview"
                      className="max-w-full h-auto max-h-96 mx-auto rounded"
                    />
                  )}
                </div>
                
                <div className="flex justify-center">
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Download Full Document
                  </Button>
                </div>
              </div>
            )}

            {/* Document Information */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Document Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Document Type:</span>
                    <span className="font-medium capitalize">
                      {selectedDocument.documentType.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Document Number:</span>
                    <span className="font-medium">{selectedDocument.documentNumber}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Issuing Country:</span>
                    <span className="font-medium">{selectedDocument.issuingCountry}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Issue Date:</span>
                    <span className="font-medium">
                      {format(new Date(selectedDocument.issueDate), "PPP")}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expiry Date:</span>
                    <span className={`font-medium ${
                      getExpiryStatus(selectedDocument.expiryDate).status === "expired" ? "text-red-600" :
                      getExpiryStatus(selectedDocument.expiryDate).status === "expiring_soon" ? "text-orange-600" :
                      "text-green-600"
                    }`}>
                      {format(new Date(selectedDocument.expiryDate), "PPP")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Verification Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Status:</span>
                    <Badge variant={getStatusColor(selectedDocument.verificationStatus)}>
                      {getStatusIcon(selectedDocument.verificationStatus)}
                      <span className="ml-1">
                        {selectedDocument.verificationStatus.replace('_', ' ').toUpperCase()}
                      </span>
                    </Badge>
                  </div>
                  
                  {selectedDocument.verifiedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Verified At:</span>
                      <span className="font-medium">
                        {format(new Date(selectedDocument.verifiedAt), "PPP")}
                      </span>
                    </div>
                  )}
                  
                  {selectedDocument.verifiedBy && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Verified By:</span>
                      <span className="font-medium">
                        Admin User
                      </span>
                    </div>
                  )}
                  
                  {selectedDocument.verificationNotes && (
                    <div>
                      <span className="text-muted-foreground">Verification Notes:</span>
                      <div className="mt-1 p-3 bg-muted rounded">
                        <p className="text-sm">{selectedDocument.verificationNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reminders */}
            <div className="space-y-4">
              <h3 className="font-semibold">Reminder Settings</h3>
              <div className="space-y-3">
                {selectedDocument.reminders?.map((reminder, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <div>
                        <div className="font-medium capitalize">
                          {reminder.type} Reminder
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {reminder.daysBeforeExpiry} days before expiry
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={reminder.enabled}
                        onChange={(checked) => {
                          // Update reminder logic would go here
                        }}
                      />
                      <span className="text-sm">
                        {reminder.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="verification">Verification Status</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <DocumentsTab />
        </TabsContent>

        <TabsContent value="verification">
          <VerificationStatusTab />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Document Settings</CardTitle>
              <CardDescription>
                Configure document management preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-semibold">Auto-Upload</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Auto-upload from bookings</div>
                      <div className="text-sm text-muted-foreground">
                        Automatically upload documents when booking flights
                      </div>
                    </div>
                    <Checkbox defaultChecked={true} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Auto-upload from hotels</div>
                      <div className="text-sm text-muted-foreground">
                        Automatically upload documents when booking hotels
                      </div>
                    </div>
                    <Checkbox defaultChecked={true} />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Notifications</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Expiry reminders</div>
                      <div className="text-sm text-muted-foreground">
                        Get notified before documents expire
                      </div>
                    </div>
                    <Checkbox defaultChecked={true} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Verification updates</div>
                      <div className="text-sm text-muted-foreground">
                        Get notified when verification status changes
                      </div>
                    </div>
                    <Checkbox defaultChecked={true} />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Privacy</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Share with travel providers</div>
                      <div className="text-sm text-muted-foreground">
                        Allow verified documents to be shared with travel partners
                      </div>
                    </div>
                    <Checkbox defaultChecked={false} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Document Preview Dialog */}
      <DocumentPreview />
    </div>
  );
}