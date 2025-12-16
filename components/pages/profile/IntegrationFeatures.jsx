"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  CreditCard, 
  Shield, 
  Plane, 
  Hotel, 
  Car, 
  Coffee, 
  ShoppingBag, 
  Award,
  Star,
  TrendingUp,
  Link,
  Unlink,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Settings,
  Plus,
  ExternalLink,
  Download,
  Upload,
  FileText,
  Globe,
  Smartphone,
  Calendar,
  MapPin,
  Target,
  Gift,
  Percent,
  Zap,
  Users,
  ChevronRight,
  Info,
  AlertTriangle,
  Check
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

export function IntegrationFeatures({ 
  loyaltyPrograms, 
  connectedServices, 
  insuranceProviders,
  syncSettings,
  onConnectService,
  onDisconnectService,
  onSyncData,
  onUpdateSettings,
  onClaimReward,
  onTransferPoints
}) {
  const [activeTab, setActiveTab] = useState("loyalty");
  const [connectingService, setConnectingService] = useState(null);
  const [syncProgress, setSyncProgress] = useState({});
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const { toast } = useToast();

  const handleConnectService = async (serviceId) => {
    setConnectingService(serviceId);
    try {
      const result = await onConnectService(serviceId);
      if (result.success) {
        toast({
          title: "Service Connected",
          description: `${serviceId} has been connected successfully`,
        });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect service",
        variant: "destructive",
      });
    } finally {
      setConnectingService(null);
    }
  };

  const handleDisconnectService = async (serviceId) => {
    try {
      const result = await onDisconnectService(serviceId);
      if (result.success) {
        toast({
          title: "Service Disconnected",
          description: `${serviceId} has been disconnected`,
        });
      }
    } catch (error) {
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect service",
        variant: "destructive",
      });
    }
  };

  const handleSyncData = async (serviceId) => {
    setSyncProgress(prev => ({ ...prev, [serviceId]: 0 }));
    
    try {
      // Simulate progress
      const interval = setInterval(() => {
        setSyncProgress(prev => {
          const newProgress = prev[serviceId] + 20;
          if (newProgress >= 100) {
            clearInterval(interval);
            return { ...prev, [serviceId]: 100 };
          }
          return { ...prev, [serviceId]: newProgress };
        });
      }, 500);

      const result = await onSyncData(serviceId);
      if (result.success) {
        toast({
          title: "Sync Complete",
          description: "Your data has been synchronized",
        });
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to synchronize data",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setSyncProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[serviceId];
          return newProgress;
        });
      }, 2000);
    }
  };

  const handleTransferPoints = async () => {
    if (!transferAmount || !transferFrom || !transferTo) {
      toast({
        title: "Missing Information",
        description: "Please fill in all transfer details",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await onTransferPoints({
        from: transferFrom,
        to: transferTo,
        amount: transferAmount
      });

      if (result.success) {
        toast({
          title: "Transfer Complete",
          description: `${transferAmount} points transferred successfully`,
        });
        setTransferAmount("");
        setTransferFrom("");
        setTransferTo("");
      }
    } catch (error) {
      toast({
        title: "Transfer Failed",
        description: "Failed to transfer points",
        variant: "destructive",
      });
    }
  };

  const LoyaltyProgramsTab = () => (
    <div className="space-y-6">
      {/* Loyalty Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Loyalty Program Overview
          </CardTitle>
          <CardDescription>
            Manage your loyalty programs and rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold">{loyaltyPrograms?.totalPoints || 0}</p>
              <p className="text-sm text-muted-foreground">Total Points</p>
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold">{loyaltyPrograms?.activePrograms || 0}</p>
              <p className="text-sm text-muted-foreground">Active Programs</p>
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold">{loyaltyPrograms?.rewardsAvailable || 0}</p>
              <p className="text-sm text-muted-foreground">Available Rewards</p>
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold">{loyaltyPrograms?.tier || "Silver"}</p>
              <p className="text-sm text-muted-foreground">Current Tier</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Loyalty Programs */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Programs</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Program
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loyaltyPrograms?.programs?.map((program) => (
              <Card key={program._id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                      {program.type === "airline" && <Plane className="h-6 w-6" />}
                      {program.type === "hotel" && <Hotel className="h-6 w-6" />}
                      {program.type === "car" && <Car className="h-6 w-6" />}
                      {program.type === "retail" && <ShoppingBag className="h-6 w-6" />}
                      {program.type === "dining" && <Coffee className="h-6 w-6" />}
                    </div>
                    <div>
                      <h3 className="font-semibold">{program.name}</h3>
                      <p className="text-sm text-muted-foreground">{program.memberId}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{program.tier}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {program.points} points
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSyncData(program._id)}
                      disabled={syncProgress[program._id] !== undefined}
                    >
                      {syncProgress[program._id] !== undefined ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProgram(program)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDisconnectService(program._id)}
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {syncProgress[program._id] !== undefined && (
                  <div className="mt-3">
                    <Progress value={syncProgress[program._id]} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Syncing... {syncProgress[program._id]}%
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Points Transfer */}
      <Card>
        <CardHeader>
          <CardTitle>Points Transfer</CardTitle>
          <CardDescription>
            Transfer points between loyalty programs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>From Program</Label>
              <Select value={transferFrom} onValueChange={setTransferFrom}>
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {loyaltyPrograms?.programs?.map((program) => (
                    <SelectItem key={program._id} value={program._id}>
                      {program.name} ({program.points} pts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>To Program</Label>
              <Select value={transferTo} onValueChange={setTransferTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {loyaltyPrograms?.programs?.map((program) => (
                    <SelectItem key={program._id} value={program._id}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder="Enter points"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
              />
            </div>
            
            <div className="flex items-end">
              <Button onClick={handleTransferPoints} className="w-full">
                Transfer Points
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Available Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loyaltyPrograms?.rewards?.map((reward) => (
              <Card key={reward._id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{reward.category}</Badge>
                    <span className="text-sm font-medium">{reward.points} pts</span>
                  </div>
                  
                  <h3 className="font-semibold">{reward.title}</h3>
                  <p className="text-sm text-muted-foreground">{reward.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Expires {format(new Date(reward.expiryDate), "PPP")}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => onClaimReward(reward._id)}
                    >
                      Claim
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const InsuranceTab = () => (
    <div className="space-y-6">
      {/* Insurance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Travel Insurance
          </CardTitle>
          <CardDescription>
            Manage your travel insurance policies and claims
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold">{insuranceProviders?.activePolicies || 0}</p>
              <p className="text-sm text-muted-foreground">Active Policies</p>
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold">${insuranceProviders?.totalCoverage || 0}</p>
              <p className="text-sm text-muted-foreground">Total Coverage</p>
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold">{insuranceProviders?.openClaims || 0}</p>
              <p className="text-sm text-muted-foreground">Open Claims</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Insurance Providers */}
      <Card>
        <CardHeader>
          <CardTitle>Insurance Providers</CardTitle>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Provider
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insuranceProviders?.providers?.map((provider) => (
              <Card key={provider._id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                      <Shield className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{provider.name}</h3>
                      <p className="text-sm text-muted-foreground">Policy: {provider.policyNumber}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={provider.status === "active" ? "default" : "secondary"}>
                          {provider.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          ${provider.coverage} coverage
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      View Policy
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      File Claim
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Claims Management */}
      <Card>
        <CardHeader>
          <CardTitle>Claims Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim ID</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insuranceProviders?.claims?.map((claim) => (
                <TableRow key={claim._id}>
                  <TableCell className="font-mono text-sm">{claim.claimId}</TableCell>
                  <TableCell>{claim.provider}</TableCell>
                  <TableCell>{claim.type}</TableCell>
                  <TableCell>${claim.amount}</TableCell>
                  <TableCell>
                    <Badge variant={claim.status === "approved" ? "default" : "secondary"}>
                      {claim.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(claim.date), "PPP")}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const ConnectedServicesTab = () => (
    <div className="space-y-6">
      {/* Service Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Services</CardTitle>
          <CardDescription>
            Manage third-party service integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Travel Services */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Travel Services
              </h3>
              <div className="space-y-3">
                {[
                  { name: "Google Flights", connected: true, icon: "G" },
                  { name: "Skyscanner", connected: false, icon: "S" },
                  { name: "Kayak", connected: true, icon: "K" },
                ].map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center font-bold">
                        {service.icon}
                      </div>
                      <span className="text-sm font-medium">{service.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {service.connected && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      
                      <Button
                        size="sm"
                        variant={service.connected ? "destructive" : "default"}
                        onClick={() => service.connected 
                          ? handleDisconnectService(service.name)
                          : handleConnectService(service.name)
                        }
                        disabled={connectingService === service.name}
                      >
                        {connectingService === service.name ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                        ) : service.connected ? (
                          "Disconnect"
                        ) : (
                          "Connect"
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Accommodation */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Hotel className="h-4 w-4" />
                Accommodation
              </h3>
              <div className="space-y-3">
                {[
                  { name: "Booking.com", connected: true, icon: "B" },
                  { name: "Airbnb", connected: false, icon: "A" },
                  { name: "Expedia", connected: true, icon: "E" },
                ].map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center font-bold">
                        {service.icon}
                      </div>
                      <span className="text-sm font-medium">{service.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {service.connected && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      
                      <Button
                        size="sm"
                        variant={service.connected ? "destructive" : "default"}
                        onClick={() => service.connected 
                          ? handleDisconnectService(service.name)
                          : handleConnectService(service.name)
                        }
                      >
                        {service.connected ? "Disconnect" : "Connect"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transportation */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Car className="h-4 w-4" />
                Transportation
              </h3>
              <div className="space-y-3">
                {[
                  { name: "Uber", connected: true, icon: "U" },
                  { name: "Lyft", connected: false, icon: "L" },
                  { name: "Rental Cars", connected: true, icon: "R" },
                ].map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded flex items-center justify-center font-bold">
                        {service.icon}
                      </div>
                      <span className="text-sm font-medium">{service.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {service.connected && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      
                      <Button
                        size="sm"
                        variant={service.connected ? "destructive" : "default"}
                        onClick={() => service.connected 
                          ? handleDisconnectService(service.name)
                          : handleConnectService(service.name)
                        }
                      >
                        {service.connected ? "Disconnect" : "Connect"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sync Settings
          </CardTitle>
          <CardDescription>
            Configure data synchronization between services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium">Auto-Sync</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Bookings</div>
                    <div className="text-sm text-muted-foreground">
                      Sync new bookings automatically
                    </div>
                  </div>
                  <Switch defaultChecked={syncSettings?.autoSyncBookings || true} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Loyalty Points</div>
                    <div className="text-sm text-muted-foreground">
                      Update points balance automatically
                    </div>
                  </div>
                  <Switch defaultChecked={syncSettings?.autoSyncPoints || true} />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Profile Data</div>
                    <div className="text-sm text-muted-foreground">
                      Keep profile information synchronized
                    </div>
                  </div>
                  <Switch defaultChecked={syncSettings?.autoSyncProfile || false} />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium">Sync Frequency</h3>
              <div className="space-y-3">
                <div>
                  <Label>Bookings Sync</Label>
                  <Select defaultValue="daily">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Real-time</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Points Sync</Label>
                  <Select defaultValue="daily">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Real-time</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={() => onUpdateSettings(syncSettings)}>
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Integrations</h2>
        <p className="text-muted-foreground">Manage your connected services and loyalty programs</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="loyalty">Loyalty Programs</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
          <TabsTrigger value="services">Connected Services</TabsTrigger>
        </TabsList>

        <TabsContent value="loyalty">
          <LoyaltyProgramsTab />
        </TabsContent>

        <TabsContent value="insurance">
          <InsuranceTab />
        </TabsContent>

        <TabsContent value="services">
          <ConnectedServicesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}