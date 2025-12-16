"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Plus,
  Play,
  Pause,
  Square,
  TrendingUp,
  Users,
  Target,
  Calendar,
  Settings,
  Download,
  Eye,
  EyeOff,
} from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function ABTestingDashboard() {
  const { data: session } = useSession();
  const [experiments, setExperiments] = useState([]);
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [experimentResults, setExperimentResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Form state for creating experiment
  const [newExperiment, setNewExperiment] = useState({
    name: "",
    description: "",
    hypothesis: "",
    type: "ui_test",
    variants: [
      { name: "Control", trafficAllocation: 50, isActive: true },
      { name: "Variant A", trafficAllocation: 50, isActive: true }
    ],
    goals: [
      { type: "primary", metric: "conversion_rate", description: "Increase conversion rate" }
    ],
    targeting: {
      percentage: 100,
      criteria: {},
      includeNewUsers: true,
      includeReturningUsers: true
    },
    schedule: {
      duration: 30,
      autoStopOnSignificance: true,
      significanceLevel: 95
    },
    priority: "medium"
  });

  useEffect(() => {
    fetchExperiments();
  }, [filterStatus]);

  const fetchExperiments = async () => {
    try {
      const response = await fetch(
        `/api/analytics/abtesting/experiments${filterStatus !== "all" ? `?status=${filterStatus}` : ""}`
      );
      const data = await response.json();
      
      if (data.success) {
        setExperiments(data.data);
      }
    } catch (error) {
      console.error("Error fetching experiments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExperimentResults = async (experimentId) => {
    try {
      const response = await fetch(`/api/analytics/abtesting/experiments/${experimentId}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedExperiment(data.data.experiment);
        setExperimentResults(data.data.results);
      }
    } catch (error) {
      console.error("Error fetching experiment results:", error);
    }
  };

  const handleExperimentAction = async (experimentId, action) => {
    try {
      const response = await fetch(`/api/analytics/abtesting/experiments/${experimentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      
      if (data.success) {
        fetchExperiments();
        if (selectedExperiment) {
          fetchExperimentResults(experimentId);
        }
      }
    } catch (error) {
      console.error(`Error ${action}ing experiment:`, error);
    }
  };

  const handleCreateExperiment = async () => {
    try {
      const response = await fetch("/api/analytics/abtesting/experiments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newExperiment),
      });

      const data = await response.json();
      
      if (data.success) {
        setShowCreateDialog(false);
        fetchExperiments();
        // Reset form
        setNewExperiment({
          name: "",
          description: "",
          hypothesis: "",
          type: "ui_test",
          variants: [
            { name: "Control", trafficAllocation: 50, isActive: true },
            { name: "Variant A", trafficAllocation: 50, isActive: true }
          ],
          goals: [
            { type: "primary", metric: "conversion_rate", description: "Increase conversion rate" }
          ],
          targeting: {
            percentage: 100,
            criteria: {},
            includeNewUsers: true,
            includeReturningUsers: true
          },
          schedule: {
            duration: 30,
            autoStopOnSignificance: true,
            significanceLevel: 95
          },
          priority: "medium"
        });
      }
    } catch (error) {
      console.error("Error creating experiment:", error);
    }
  };

  const addVariant = () => {
    setNewExperiment(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        { name: `Variant ${String.fromCharCode(65 + prev.variants.length - 1)}`, trafficAllocation: 0, isActive: true }
      ]
    }));
  };

  const removeVariant = (index) => {
    if (newExperiment.variants.length > 2) {
      setNewExperiment(prev => ({
        ...prev,
        variants: prev.variants.filter((_, i) => i !== index)
      }));
    }
  };

  const updateVariant = (index, field, value) => {
    setNewExperiment(prev => ({
      ...prev,
      variants: prev.variants.map((variant, i) => 
        i === index ? { ...variant, [field]: value } : variant
      )
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "running":
        return "bg-green-500";
      case "paused":
        return "bg-yellow-500";
      case "completed":
        return "bg-blue-500";
      case "draft":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const filteredExperiments = experiments.filter(exp => 
    exp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const prepareConversionData = () => {
    if (!experimentResults?.variantResults) return [];
    
    return Object.entries(experimentResults.variantResults).map(([variantId, result]) => ({
      name: result.name,
      conversionRate: result.conversionRate,
      participants: result.participants,
      conversions: result.conversions,
      revenue: result.revenue
    }));
  };

  const prepareTrafficDistribution = () => {
    if (!experimentResults?.variantResults) return [];
    
    return Object.entries(experimentResults.variantResults).map(([variantId, result]) => ({
      name: result.name,
      value: result.participants,
      percentage: ((result.participants / experimentResults.totalParticipants) * 100).toFixed(1)
    }));
  };

  if (!session) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">A/B Testing Dashboard</h1>
          <p className="text-muted-foreground">
            Manage and analyze your A/B testing experiments
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Experiment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Experiment</DialogTitle>
              <DialogDescription>
                Set up a new A/B testing experiment to optimize your application
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newExperiment.name}
                  onChange={(e) => setNewExperiment(prev => ({ ...prev, name: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={newExperiment.description}
                  onChange={(e) => setNewExperiment(prev => ({ ...prev, description: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="hypothesis" className="text-right">
                  Hypothesis
                </Label>
                <Textarea
                  id="hypothesis"
                  value={newExperiment.hypothesis}
                  onChange={(e) => setNewExperiment(prev => ({ ...prev, hypothesis: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Type
                </Label>
                <Select
                  value={newExperiment.type}
                  onValueChange={(value) => setNewExperiment(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select experiment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ui_test">UI Test</SelectItem>
                    <SelectItem value="feature_test">Feature Test</SelectItem>
                    <SelectItem value="pricing_test">Pricing Test</SelectItem>
                    <SelectItem value="content_test">Content Test</SelectItem>
                    <SelectItem value="algorithm_test">Algorithm Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-4">
                <Label>Variants</Label>
                <div className="space-y-2 mt-2">
                  {newExperiment.variants.map((variant, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        value={variant.name}
                        onChange={(e) => updateVariant(index, 'name', e.target.value)}
                        placeholder="Variant name"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={variant.trafficAllocation}
                        onChange={(e) => updateVariant(index, 'trafficAllocation', parseInt(e.target.value))}
                        placeholder="Traffic %"
                        className="w-24"
                      />
                      <span>%</span>
                      {newExperiment.variants.length > 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeVariant(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addVariant}
                    className="w-full"
                  >
                    Add Variant
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateExperiment}>
                Create Experiment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="experiments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="experiments">Experiments</TabsTrigger>
          <TabsTrigger value="results">Results & Analysis</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="experiments" className="space-y-4">
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Search experiments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Experiments</CardTitle>
              <CardDescription>
                Manage your A/B testing experiments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div>Loading experiments...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Variants</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Conversion Rate</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExperiments.map((experiment) => (
                      <TableRow
                        key={experiment.experimentId}
                        className="cursor-pointer"
                        onClick={() => fetchExperimentResults(experiment.experimentId)}
                      >
                        <TableCell className="font-medium">
                          {experiment.name}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(experiment.status)}>
                            {experiment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{experiment.type}</TableCell>
                        <TableCell>{experiment.variants?.length || 0}</TableCell>
                        <TableCell>
                          {experiment.results?.totalParticipants || 0}
                        </TableCell>
                        <TableCell>
                          {experiment.results?.overallConversionRate?.toFixed(2) || 0}%
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {experiment.status === "draft" && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExperimentAction(experiment.experimentId, "start");
                                }}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            {experiment.status === "running" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExperimentAction(experiment.experimentId, "pause");
                                }}
                              >
                                <Pause className="h-4 w-4" />
                              </Button>
                            )}
                            {experiment.status === "paused" && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExperimentAction(experiment.experimentId, "start");
                                }}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            {experiment.status === "running" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExperimentAction(experiment.experimentId, "complete");
                                }}
                              >
                                <Square className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {selectedExperiment ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Rates by Variant</CardTitle>
                  <CardDescription>
                    Compare conversion rates across different variants
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={prepareConversionData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="conversionRate" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Traffic Distribution</CardTitle>
                  <CardDescription>
                    How users are distributed across variants
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={prepareTrafficDistribution()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {prepareTrafficDistribution().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Experiment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <p className="font-medium">{selectedExperiment.name}</p>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <p>{selectedExperiment.description}</p>
                  </div>
                  <div>
                    <Label>Hypothesis</Label>
                    <p>{selectedExperiment.hypothesis}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge className={getStatusColor(selectedExperiment.status)}>
                      {selectedExperiment.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Results Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {experimentResults && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Total Participants</Label>
                          <p className="font-medium">{experimentResults.totalParticipants}</p>
                        </div>
                        <div>
                          <Label>Total Conversions</Label>
                          <p className="font-medium">{experimentResults.totalConversions}</p>
                        </div>
                        <div>
                          <Label>Overall Conversion Rate</Label>
                          <p className="font-medium">
                            {experimentResults.overallConversionRate?.toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <Label>Confidence</Label>
                          <p className="font-medium">{experimentResults.confidence}%</p>
                        </div>
                      </div>
                      {experimentResults.winner && (
                        <div>
                          <Label>Winning Variant</Label>
                          <p className="font-medium">
                            {experimentResults.winner.name} ({experimentResults.winner.improvement?.toFixed(2)}% improvement)
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Experiment Selected</h3>
                  <p className="text-muted-foreground">
                    Select an experiment from the list to view detailed results
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Experiment Insights</CardTitle>
              <CardDescription>
                Key insights and recommendations from your experiments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {experimentResults?.insights?.length > 0 ? (
                <div className="space-y-4">
                  {experimentResults.insights.map((insight, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {insight.description}
                      </p>
                      <Badge variant={insight.priority === "high" ? "destructive" : "secondary"}>
                        {insight.priority} priority
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Insights Available</h3>
                  <p className="text-muted-foreground">
                    Complete an experiment to see insights and recommendations
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {experimentResults?.recommendations?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>
                  Actionable recommendations based on experiment results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {experimentResults.recommendations.map((rec, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">{rec.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {rec.description}
                      </p>
                      <Button size="sm" variant="outline">
                        Implement
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}