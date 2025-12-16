"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Trophy, Star, Gift, Award, Target, Lock, Unlock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function ProfileCompletionTracker({ profileData, onRewardClaim }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [claimedRewards, setClaimedRewards] = useState(new Set());
  const { toast } = useToast();

  const completionPercentage = profileData?.profileCompletion?.overallPercentage || 0;
  const sections = profileData?.profileCompletion?.sections || {};
  const rewards = profileData?.profileCompletion?.rewards || [];

  const getSectionIcon = (section) => {
    const icons = {
      basicInfo: "👤",
      personalDetails: "📝",
      preferences: "⚙️",
      documents: "📄",
      emergency: "🚨",
      verification: "✅",
      social: "👥",
      security: "🔒"
    };
    return icons[section] || "📋";
  };

  const getSectionTitle = (section) => {
    const titles = {
      basicInfo: "Basic Information",
      personalDetails: "Personal Details",
      preferences: "Travel Preferences",
      documents: "Travel Documents",
      emergency: "Emergency Contacts",
      verification: "Profile Verification",
      social: "Social Features",
      security: "Security Settings"
    };
    return titles[section] || section;
  };

  const getCompletionColor = (percentage) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 80) return "bg-blue-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getCompletionText = (percentage) => {
    if (percentage >= 100) return "Complete! 🎉";
    if (percentage >= 80) return "Almost There! 🎯";
    if (percentage >= 50) return "Making Progress! 📈";
    return "Just Getting Started 🌱";
  };

  const handleClaimReward = async (reward) => {
    if (claimedRewards.has(reward._id)) {
      toast({
        title: "Already Claimed",
        description: "You have already claimed this reward",
        variant: "default",
      });
      return;
    }

    try {
      const result = await onRewardClaim(reward);
      
      if (result.success) {
        setClaimedRewards(new Set([...claimedRewards, reward._id]));
        toast({
          title: "Reward Claimed!",
          description: result.message || "Reward claimed successfully",
          variant: "default",
        });
      } else {
        toast({
          title: "Claim Failed",
          description: result.message || "Failed to claim reward",
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

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Profile Completion
          </CardTitle>
          <CardDescription>
            Complete your profile to unlock rewards and enhanced features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">
              {completionPercentage}%
            </div>
            <Badge 
              variant={completionPercentage >= 80 ? "default" : "secondary"}
              className="mb-4"
            >
              {getCompletionText(completionPercentage)}
            </Badge>
          </div>
          
          <Progress 
            value={completionPercentage} 
            className="w-full h-3"
          />
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(sections).length}
              </div>
              <div className="text-sm text-muted-foreground">
                Sections
              </div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {rewards.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Rewards Available
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Section Breakdown</CardTitle>
          <CardDescription>
            See which sections need your attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(sections).map(([section, percentage]) => (
              <div key={section} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {getSectionIcon(section)}
                  </span>
                  <div>
                    <div className="font-medium">
                      {getSectionTitle(section)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {percentage}% complete
                    </div>
                  </div>
                </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Progress 
                    value={percentage} 
                    className="w-20 h-2"
                  />
                  {percentage >= 100 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const RewardsTab = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Available Rewards
          </CardTitle>
          <CardDescription>
            Claim rewards for completing profile sections
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rewards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No rewards available yet.</p>
              <p className="text-sm">
                Complete more profile sections to unlock rewards!
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {rewards.map((reward) => (
                <Card key={reward._id} className="relative overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {reward.type === 'badge' && <Award className="h-5 w-5 text-yellow-500" />}
                          {reward.type === 'points' && <Star className="h-5 w-5 text-blue-500" />}
                          {reward.type === 'discount' && <Gift className="h-5 w-5 text-green-500" />}
                          <Badge variant="outline">
                            {reward.type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        
                        <h3 className="font-semibold mb-1">
                          {reward.description}
                        </h3>
                        
                        {reward.type === 'points' && (
                          <p className="text-2xl font-bold text-blue-600">
                            +{reward.value} points
                          </p>
                        )}
                        
                        {reward.type === 'discount' && (
                          <p className="text-lg font-semibold text-green-600">
                            {reward.value.percentage}% off
                          </p>
                        )}
                        
                        {reward.type === 'badge' && (
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🏆</span>
                            <span className="font-medium">
                              {reward.value.name}
                            </span>
                          </div>
                        )}
                        
                        <p className="text-sm text-muted-foreground mt-2">
                          Unlocked: {new Date(reward.unlockedAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        {claimedRewards.has(reward._id) ? (
                          <Badge variant="secondary" className="w-full justify-center">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Claimed
                          </Badge>
                        ) : (
                          <Button
                            onClick={() => handleClaimReward(reward)}
                            size="sm"
                            className="w-full"
                          >
                            Claim Reward
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const MilestonesTab = () => {
    const milestones = [
      { percentage: 25, title: "Profile Starter", description: "Complete 25% of your profile", icon: "🌟" },
      { percentage: 50, title: "Profile Explorer", description: "Complete 50% of your profile", icon: "🚀" },
      { percentage: 75, title: "Profile Expert", description: "Complete 75% of your profile", icon: "⭐" },
      { percentage: 100, title: "Profile Master", description: "Complete 100% of your profile", icon: "👑" },
    ];

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Completion Milestones
            </CardTitle>
            <CardDescription>
              Track your progress towards profile mastery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {milestones.map((milestone, index) => {
                const isAchieved = completionPercentage >= milestone.percentage;
                const isNext = completionPercentage < milestone.percentage && 
                  (index === 0 || completionPercentage >= milestones[index - 1].percentage);
                
                return (
                  <div 
                    key={milestone.percentage}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      isAchieved ? 'bg-green-50 border-green-200' : 
                      isNext ? 'bg-blue-50 border-blue-200' : 
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {isAchieved ? milestone.icon : '🔒'}
                      </span>
                      <div>
                        <h3 className="font-semibold">
                          {milestone.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold mb-1">
                        {milestone.percentage}%
                      </div>
                      {isAchieved ? (
                        <Badge className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Achieved
                        </Badge>
                      ) : isNext ? (
                        <Badge variant="outline" className="border-blue-500 text-blue-500">
                          Next Goal
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Locked
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="rewards">
          <RewardsTab />
        </TabsContent>

        <TabsContent value="milestones">
          <MilestonesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}