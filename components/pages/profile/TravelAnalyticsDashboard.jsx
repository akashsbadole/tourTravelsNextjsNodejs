"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import { 
  Plane, 
  MapPin, 
  Calendar, 
  TrendingUp, 
  Award, 
  Leaf, 
  Target,
  Globe,
  Clock,
  DollarSign,
  Users,
  Hotel,
  Car,
  Coffee,
  ShoppingBag,
  Camera,
  Star,
  AlertCircle,
  CheckCircle,
  Info,
  Download,
  Filter,
  RefreshCw
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";

export function TravelAnalyticsDashboard({ 
  analyticsData, 
  travelHistory, 
  carbonFootprint, 
  travelGoals, 
  insights 
}) {
  const [timeRange, setTimeRange] = useState("year");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedMetric, setSelectedMetric] = useState("flights");
  const [isLoading, setIsLoading] = useState(false);

  // Sample data for demonstration
  const monthlyTravelData = [
    { month: "Jan", flights: 2, hotels: 3, carbon: 120, spend: 2500 },
    { month: "Feb", flights: 1, hotels: 2, carbon: 80, spend: 1800 },
    { month: "Mar", flights: 3, hotels: 4, carbon: 180, spend: 3200 },
    { month: "Apr", flights: 2, hotels: 2, carbon: 140, spend: 2100 },
    { month: "May", flights: 4, hotels: 5, carbon: 220, spend: 4100 },
    { month: "Jun", flights: 3, hotels: 3, carbon: 160, spend: 2800 },
  ];

  const destinationData = [
    { name: "Europe", value: 35, color: "#3b82f6" },
    { name: "Asia", value: 28, color: "#10b981" },
    { name: "Americas", value: 22, color: "#f59e0b" },
    { name: "Africa", value: 10, color: "#ef4444" },
    { name: "Oceania", value: 5, color: "#8b5cf6" },
  ];

  const travelPurposeData = [
    { purpose: "Business", count: 12, percentage: 40 },
    { purpose: "Leisure", count: 9, percentage: 30 },
    { purpose: "Family", count: 6, percentage: 20 },
    { purpose: "Adventure", count: 3, percentage: 10 },
  ];

  const carbonTrendData = [
    { month: "Jan", carbon: 120, offset: 30 },
    { month: "Feb", carbon: 80, offset: 20 },
    { month: "Mar", carbon: 180, offset: 45 },
    { month: "Apr", carbon: 140, offset: 35 },
    { month: "May", carbon: 220, offset: 55 },
    { month: "Jun", carbon: 160, offset: 40 },
  ];

  const travelPreferencesRadar = [
    { subject: "Adventure", A: 80, fullMark: 100 },
    { subject: "Culture", A: 65, fullMark: 100 },
    { subject: "Relaxation", A: 70, fullMark: 100 },
    { subject: "Business", A: 45, fullMark: 100 },
    { subject: "Family", A: 60, fullMark: 100 },
    { subject: "Luxury", A: 55, fullMark: 100 },
  ];

  const getCarbonLevel = (total) => {
    if (total < 500) return { level: "Low", color: "green", icon: <Leaf className="h-4 w-4" /> };
    if (total < 1500) return { level: "Medium", color: "yellow", icon: <AlertCircle className="h-4 w-4" /> };
    return { level: "High", color: "red", icon: <AlertCircle className="h-4 w-4" /> };
  };

  const getGoalProgress = (goal) => {
    const progress = (goal.current / goal.target) * 100;
    return Math.min(progress, 100);
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Trips</p>
                <p className="text-2xl font-bold">{analyticsData.totalTrips || 28}</p>
                <p className="text-xs text-muted-foreground">
                  +12% from last year
                </p>
              </div>
              <Plane className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Countries Visited</p>
                <p className="text-2xl font-bold">{analyticsData.countriesVisited || 15}</p>
                <p className="text-xs text-muted-foreground">
                  +3 new this year
                </p>
              </div>
              <Globe className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spend</p>
                <p className="text-2xl font-bold">${analyticsData.totalSpend || 12450}</p>
                <p className="text-xs text-muted-foreground">
                  +8% from last year
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Carbon Footprint</p>
                <p className="text-2xl font-bold">{analyticsData.totalCarbon || 890} kg</p>
                <p className="text-xs text-muted-foreground">
                  -5% from last year
                </p>
              </div>
              <Leaf className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Travel Pattern */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Travel Pattern</CardTitle>
            <CardDescription>Your travel activity over the past 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlyTravelData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="flights" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                <Area type="monotone" dataKey="hotels" stackId="1" stroke="#10b981" fill="#10b981" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Destination Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Destination Distribution</CardTitle>
            <CardDescription>Your travel by continent</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={destinationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {destinationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Travel Purpose & Preferences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Travel Purpose */}
        <Card>
          <CardHeader>
            <CardTitle>Travel Purpose</CardTitle>
            <CardDescription>Breakdown of your travel reasons</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {travelPurposeData.map((item) => (
                <div key={item.purpose} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{item.purpose}</span>
                    <span className="text-sm text-muted-foreground">{item.count} trips</span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Travel Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Travel Preferences</CardTitle>
            <CardDescription>Your travel style profile</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={travelPreferencesRadar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name="Preferences" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const CarbonFootprintTab = () => {
    const carbonLevel = getCarbonLevel(analyticsData.totalCarbon || 890);
    
    return (
      <div className="space-y-6">
        {/* Carbon Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5" />
              Carbon Footprint Summary
            </CardTitle>
            <CardDescription>
              Track your environmental impact and offset options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-2">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-${carbonLevel.color}-100 text-${carbonLevel.color}-800`}>
                  {carbonLevel.icon}
                  <span className="font-medium">{carbonLevel.level} Impact</span>
                </div>
                <p className="text-3xl font-bold">{analyticsData.totalCarbon || 890} kg CO₂</p>
                <p className="text-sm text-muted-foreground">Total this year</p>
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-3xl font-bold text-green-600">{analyticsData.carbonOffset || 225} kg</p>
                <p className="text-sm text-muted-foreground">Carbon Offset</p>
                <Button size="sm" className="mt-2">
                  Offset More
                </Button>
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-3xl font-bold">{analyticsData.netCarbon || 665} kg</p>
                <p className="text-sm text-muted-foreground">Net Carbon</p>
                <div className="text-xs text-muted-foreground">
                  After offsets
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Carbon Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Carbon Footprint Trend</CardTitle>
            <CardDescription>Monthly carbon emissions and offsets</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={carbonTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="carbon" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                <Area type="monotone" dataKey="offset" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.8} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Carbon Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Carbon Breakdown by Activity</CardTitle>
            <CardDescription>Where your carbon footprint comes from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4 text-blue-500" />
                    <span>Flights</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">520 kg</p>
                    <p className="text-sm text-muted-foreground">58%</p>
                  </div>
                </div>
                <Progress value={58} className="h-2" />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hotel className="h-4 w-4 text-green-500" />
                    <span>Hotels</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">180 kg</p>
                    <p className="text-sm text-muted-foreground">20%</p>
                  </div>
                </div>
                <Progress value={20} className="h-2" />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-yellow-500" />
                    <span>Transport</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">120 kg</p>
                    <p className="text-sm text-muted-foreground">13%</p>
                  </div>
                </div>
                <Progress value={13} className="h-2" />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coffee className="h-4 w-4 text-purple-500" />
                    <span>Activities</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">70 kg</p>
                    <p className="text-sm text-muted-foreground">9%</p>
                  </div>
                </div>
                <Progress value={9} className="h-2" />
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold">Offset Options</h3>
                <div className="space-y-3">
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Reforestation Project</h4>
                        <p className="text-sm text-muted-foreground">Plant trees in Amazon</p>
                      </div>
                      <Button size="sm">$25/ton</Button>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Renewable Energy</h4>
                        <p className="text-sm text-muted-foreground">Support wind farms</p>
                      </div>
                      <Button size="sm">$20/ton</Button>
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Carbon Capture</h4>
                        <p className="text-sm text-muted-foreground">Direct air capture</p>
                      </div>
                      <Button size="sm">$35/ton</Button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const TravelGoalsTab = () => (
    <div className="space-y-6">
      {/* Active Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Active Travel Goals
          </CardTitle>
          <CardDescription>
            Track your progress towards travel objectives
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {travelGoals?.map((goal) => (
              <Card key={goal._id} className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{goal.title}</h3>
                    <Badge variant={goal.completed ? "default" : "secondary"}>
                      {goal.completed ? "Completed" : "In Progress"}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{goal.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{goal.current} / {goal.target}</span>
                    </div>
                    <Progress value={getGoalProgress(goal)} className="h-2" />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Deadline</span>
                    <span>{format(new Date(goal.deadline), "PPP")}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      Update Progress
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Goal Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Goals</CardTitle>
          <CardDescription>
            Personalized goals based on your travel patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 border-dashed">
              <div className="text-center space-y-3">
                <Globe className="h-8 w-8 mx-auto text-blue-500" />
                <h3 className="font-semibold">Visit 25 Countries</h3>
                <p className="text-sm text-muted-foreground">
                  You've visited 15 countries. 10 more to reach this milestone!
                </p>
                <Button size="sm" className="w-full">
                  Set Goal
                </Button>
              </div>
            </Card>
            
            <Card className="p-4 border-dashed">
              <div className="text-center space-y-3">
                <Leaf className="h-8 w-8 mx-auto text-green-500" />
                <h3 className="font-semibold">Carbon Neutral Travel</h3>
                <p className="text-sm text-muted-foreground">
                  Offset all your carbon emissions this year
                </p>
                <Button size="sm" className="w-full">
                  Set Goal
                </Button>
              </div>
            </Card>
            
            <Card className="p-4 border-dashed">
              <div className="text-center space-y-3">
                <Award className="h-8 w-8 mx-auto text-yellow-500" />
                <h3 className="font-semibold">Elite Status</h3>
                <p className="text-sm text-muted-foreground">
                  Reach elite status in your loyalty program
                </p>
                <Button size="sm" className="w-full">
                  Set Goal
                </Button>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Achievement Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Travel Achievements
          </CardTitle>
          <CardDescription>
            Badges and milestones you've earned
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <Globe className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-xs font-medium">World Explorer</p>
              <p className="text-xs text-muted-foreground">15+ countries</p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <Leaf className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-xs font-medium">Eco Traveler</p>
              <p className="text-xs text-muted-foreground">Carbon offset</p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
              <p className="text-xs font-medium">Loyalty Elite</p>
              <p className="text-xs text-muted-foreground">Elite status</p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                <Camera className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-xs font-medium">Adventure Seeker</p>
              <p className="text-xs text-muted-foreground">10 adventures</p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <Plane className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-xs font-medium">Frequent Flyer</p>
              <p className="text-xs text-muted-foreground">25+ flights</p>
            </div>
            
            <div className="text-center space-y-2 opacity-50">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-xs font-medium">Social Traveler</p>
              <p className="text-xs text-muted-foreground">Share 5 trips</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const InsightsTab = () => (
    <div className="space-y-6">
      {/* Travel Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Personalized Travel Insights
          </CardTitle>
          <CardDescription>
            AI-powered recommendations based on your travel patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Travel Patterns</h3>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Peak Travel Season</p>
                      <p className="text-sm text-muted-foreground">
                        You travel most frequently in May-June. Consider booking in advance for better rates.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Budget Optimization</p>
                      <p className="text-sm text-muted-foreground">
                        Your average spend per trip is $444. You could save 15% by booking Tuesday flights.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Destination Gap</p>
                      <p className="text-sm text-muted-foreground">
                        You haven't visited Africa yet. Consider Morocco or Egypt for your next adventure.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Recommendations</h3>
              <div className="space-y-3">
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Premium Economy Upgrade</p>
                      <p className="text-sm text-muted-foreground">
                        Based on your flight patterns, you'd benefit from premium upgrades
                      </p>
                    </div>
                    <Button size="sm">Explore</Button>
                  </div>
                </Card>
                
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Travel Insurance Bundle</p>
                      <p className="text-sm text-muted-foreground">
                        Save 20% with annual coverage based on your travel frequency
                      </p>
                    </div>
                    <Button size="sm">Learn More</Button>
                  </div>
                </Card>
                
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Loyalty Program Match</p>
                      <p className="text-sm text-muted-foreground">
                        Your travel patterns match SkyTeam Alliance benefits
                      </p>
                    </div>
                    <Button size="sm">Compare</Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predictive Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Predictive Travel Analytics</CardTitle>
          <CardDescription>
            Forecast your future travel based on historical data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Next Trip Prediction</p>
              <p className="text-2xl font-bold">In 42 days</p>
              <p className="text-sm">Likely destination: Europe</p>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Annual Travel Forecast</p>
              <p className="text-2xl font-bold">32 trips</p>
              <p className="text-sm">+4 from current year</p>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Budget Projection</p>
              <p className="text-2xl font-bold">$18,500</p>
              <p className="text-sm">Based on current trends</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Travel Analytics</h2>
          <p className="text-muted-foreground">Comprehensive insights into your travel patterns</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="carbon">Carbon Footprint</TabsTrigger>
          <TabsTrigger value="goals">Travel Goals</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="carbon">
          <CarbonFootprintTab />
        </TabsContent>

        <TabsContent value="goals">
          <TravelGoalsTab />
        </TabsContent>

        <TabsContent value="insights">
          <InsightsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}