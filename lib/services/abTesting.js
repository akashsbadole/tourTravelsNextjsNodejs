import "server-only";
import { 
  Experiment, 
  UserExperimentAssignment 
} from "../db/models";
import { createOneDoc, updateOneDoc } from "../db/createOperationDB";
import { getOneDoc, getManyDocs } from "../db/getOperationDB";
import { v4 as uuidv4 } from "uuid";

/**
 * A/B Testing Service
 * Manages experiments, user assignments, and statistical analysis
 */

class ABTestingService {
  constructor() {
    this.defaultSampleSize = 1000;
    this.significanceLevel = 95; // 95% confidence level
    this.minVariants = 2;
    this.maxVariants = 10;
  }

  /**
   * Create a new A/B test experiment
   */
  async createExperiment(experimentData) {
    try {
      const {
        name,
        description,
        hypothesis,
        type,
        variants,
        goals,
        targeting,
        schedule,
        implementation,
        stakeholders,
        tags,
        priority
      } = experimentData;

      // Validate experiment data
      const validation = this.validateExperimentData(experimentData);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Generate experiment ID
      const experimentId = uuidv4();

      // Validate variants
      const validatedVariants = this.validateVariants(variants);

      // Create experiment
      const experiment = await createOneDoc("Experiment", {
        experimentId,
        name,
        description,
        hypothesis,
        status: 'draft',
        type,
        variants: validatedVariants,
        goals: goals || [],
        targeting: {
          percentage: targeting?.percentage || 100,
          criteria: targeting?.criteria || {},
          includeNewUsers: targeting?.includeNewUsers !== false,
          includeReturningUsers: targeting?.includeReturningUsers !== false,
          excludeFromOtherExperiments: targeting?.excludeFromOtherExperiments !== false,
          requiredTraffic: targeting?.requiredTraffic || this.defaultSampleSize
        },
        schedule: {
          startDate: schedule?.startDate ? new Date(schedule.startDate) : null,
          endDate: schedule?.endDate ? new Date(schedule.endDate) : null,
          duration: schedule?.duration || 30,
          autoStopOnSignificance: schedule?.autoStopOnSignificance !== false,
          significanceLevel: schedule?.significanceLevel || this.significanceLevel,
          minimumSampleSize: schedule?.minimumSampleSize || this.defaultSampleSize
        },
        implementation: {
          component: implementation?.component || '',
          changes: implementation?.changes || '',
          developer: implementation?.developer || '',
          reviewer: implementation?.reviewer || '',
          deploymentDate: implementation?.deploymentDate ? new Date(implementation.deploymentDate) : null
        },
        stakeholders: stakeholders || [],
        tags: tags || [],
        priority: priority || 'medium',
        risks: this.assessExperimentRisks(experimentData)
      });

      return experiment;
    } catch (error) {
      console.error("Error creating experiment:", error);
      throw error;
    }
  }

  /**
   * Start an experiment
   */
  async startExperiment(experimentId) {
    try {
      const experiment = await getOneDoc("Experiment", { experimentId });
      
      if (!experiment) {
        throw new Error('Experiment not found');
      }

      if (experiment.status !== 'draft') {
        throw new Error('Only draft experiments can be started');
      }

      // Update experiment status
      await updateOneDoc(
        "Experiment",
        { experimentId },
        {
          status: 'running',
          'schedule.startDate': new Date(),
          'results.startDate': new Date()
        }
      );

      return { success: true, experimentId, status: 'running' };
    } catch (error) {
      console.error("Error starting experiment:", error);
      throw error;
    }
  }

  /**
   * Pause an experiment
   */
  async pauseExperiment(experimentId) {
    try {
      const experiment = await getOneDoc("Experiment", { experimentId });
      
      if (!experiment) {
        throw new Error('Experiment not found');
      }

      if (!['running', 'paused'].includes(experiment.status)) {
        throw new Error('Only running or paused experiments can be paused');
      }

      await updateOneDoc(
        "Experiment",
        { experimentId },
        { status: 'paused' }
      );

      return { success: true, experimentId, status: 'paused' };
    } catch (error) {
      console.error("Error pausing experiment:", error);
      throw error;
    }
  }

  /**
   * Complete an experiment
   */
  async completeExperiment(experimentId, results = {}) {
    try {
      const experiment = await getOneDoc("Experiment", { experimentId });
      
      if (!experiment) {
        throw new Error('Experiment not found');
      }

      // Calculate experiment results
      const calculatedResults = await this.calculateExperimentResults(experimentId);

      // Update experiment with results
      await updateOneDoc(
        "Experiment",
        { experimentId },
        {
          status: 'completed',
          'results.endDate': new Date(),
          'results.totalParticipants': calculatedResults.totalParticipants,
          'results.totalConversions': calculatedResults.totalConversions,
          'results.overallConversionRate': calculatedResults.overallConversionRate,
          'results.winner': calculatedResults.winner,
          'results.confidence': calculatedResults.confidence,
          'results.recommendations': calculatedResults.recommendations,
          'results.insights': calculatedResults.insights
        }
      );

      return { success: true, experimentId, results: calculatedResults };
    } catch (error) {
      console.error("Error completing experiment:", error);
      throw error;
    }
  }

  /**
   * Assign user to experiment variant
   */
  async assignUserToVariant(userId, experimentId, context = {}) {
    try {
      const experiment = await getOneDoc("Experiment", { experimentId });
      
      if (!experiment) {
        throw new Error('Experiment not found');
      }

      if (experiment.status !== 'running') {
        throw new Error('Experiment is not running');
      }

      // Check if user meets targeting criteria
      if (!this.meetsTargetingCriteria(userId, experiment.targeting)) {
        return { success: false, reason: 'User does not meet targeting criteria' };
      }

      // Get existing assignment
      const existingAssignment = await getOneDoc("UserExperimentAssignment", {
        userId,
        'assignments.experimentId': experimentId
      });

      if (existingAssignment) {
        return { success: false, reason: 'User already assigned to this experiment' };
      }

      // Select variant based on traffic allocation
      const selectedVariant = this.selectVariant(experiment.variants);

      // Create assignment
      const assignment = await createOneDoc("UserExperimentAssignment", {
        userId,
        sessionId: context.sessionId || '',
        assignments: [{
          experimentId,
          variantId: selectedVariant.variantId,
          assignedAt: new Date(),
          firstSeenAt: new Date()
        }],
        exclusionReasons: []
      });

      // Update variant participant count
      await this.updateVariantMetrics(experimentId, selectedVariant.variantId, 'participant');

      return { 
        success: true, 
        experimentId, 
        variantId: selectedVariant.variantId,
        variantName: selectedVariant.name
      };
    } catch (error) {
      console.error("Error assigning user to variant:", error);
      throw error;
    }
  }

  /**
   * Track conversion for user assignment
   */
  async trackConversion(userId, experimentId, conversionData) {
    try {
      const assignment = await getOneDoc("UserExperimentAssignment", {
        userId,
        'assignments.experimentId': experimentId
      });

      if (!assignment) {
        throw new Error('User assignment not found');
      }

      const assignmentIndex = assignment.assignments.findIndex(
        a => a.experimentId === experimentId
      );

      if (assignmentIndex === -1) {
        throw new Error('Experiment assignment not found');
      }

      // Add conversion event
      const conversionEvent = {
        eventType: conversionData.eventType || 'conversion',
        timestamp: new Date(),
        value: conversionData.value || 0,
        currency: conversionData.currency || 'USD',
        metadata: conversionData.metadata || {}
      };

      await updateOneDoc(
        "UserExperimentAssignment",
        { userId },
        {
          $push: {
            [`assignments.${assignmentIndex}.conversionEvents`]: conversionEvent
          },
          $set: {
            [`assignments.${assignmentIndex}.hasConverted`]: true
          }
        }
      );

      // Update variant metrics
      await this.updateVariantMetrics(experimentId, assignment.assignments[assignmentIndex].variantId, 'conversion');

      return { success: true, conversionEvent };
    } catch (error) {
      console.error("Error tracking conversion:", error);
      throw error;
    }
  }

  /**
   * Get experiment results
   */
  async getExperimentResults(experimentId) {
    try {
      const experiment = await getOneDoc("Experiment", { experimentId });
      
      if (!experiment) {
        throw new Error('Experiment not found');
      }

      const results = await this.calculateExperimentResults(experimentId);

      return { success: true, experiment, results };
    } catch (error) {
      console.error("Error getting experiment results:", error);
      throw error;
    }
  }

  /**
   * Get all experiments
   */
  async getAllExperiments(status = null) {
    try {
      const filter = {};
      if (status) {
        filter.status = status;
      }

      const experiments = await getManyDocs("Experiment", filter, [], false, {
        sort: { 'schedule.startDate': -1 }
      });

      return { success: true, experiments };
    } catch (error) {
      console.error("Error getting experiments:", error);
      throw error;
    }
  }

  /**
   * Validate experiment data
   */
  validateExperimentData(data) {
    const errors = [];

    if (!data.name || data.name.trim() === '') {
      errors.push('Experiment name is required');
    }

    if (!data.hypothesis || data.hypothesis.trim() === '') {
      errors.push('Hypothesis is required');
    }

    if (!data.type || !['ui_test', 'feature_test', 'pricing_test', 'content_test', 'algorithm_test'].includes(data.type)) {
      errors.push('Invalid experiment type');
    }

    if (!data.variants || data.variants.length < this.minVariants) {
      errors.push(`At least ${this.minVariants} variants are required`);
    }

    if (data.variants && data.variants.length > this.maxVariants) {
      errors.push(`Maximum ${this.maxVariants} variants allowed`);
    }

    // Validate traffic allocation
    if (data.variants) {
      const totalAllocation = data.variants.reduce((sum, variant) => sum + (variant.trafficAllocation || 0), 0);
      if (totalAllocation !== 100) {
        errors.push('Traffic allocation must sum to 100%');
      }
    }

    return {
      isValid: errors.length === 0,
      error: errors.join('; ')
    };
  }

  /**
   * Validate variants
   */
  validateVariants(variants) {
    return variants.map(variant => ({
      variantId: uuidv4(),
      name: variant.name || 'Control',
      description: variant.description || '',
      trafficAllocation: variant.trafficAllocation || (100 / variants.length),
      isActive: variant.isActive !== false,
      configuration: variant.configuration || {},
      targeting: {
        criteria: variant.targeting?.criteria || {},
        includeNewUsers: variant.targeting?.includeNewUsers !== false,
        includeReturningUsers: variant.targeting?.includeReturningUsers !== false
      },
      metrics: {
        participants: 0,
        conversions: 0,
        conversionRate: 0,
        revenue: 0,
        averageOrderValue: 0,
        bounceRate: 0,
        averageSessionDuration: 0,
        statisticalSignificance: 0,
        confidenceInterval: { lower: 0, upper: 0 },
        pValue: 1,
        isWinner: false
      }
    }));
  }

  /**
   * Select variant for user based on traffic allocation
   */
  selectVariant(variants) {
    const random = Math.random() * 100;
    let cumulativeAllocation = 0;

    for (const variant of variants) {
      cumulativeAllocation += variant.trafficAllocation;
      if (random < cumulativeAllocation) {
        return variant;
      }
    }

    // Fallback to first variant
    return variants[0];
  }

  /**
   * Check if user meets targeting criteria
   */
  meetsTargetingCriteria(userId, targeting) {
    // This would integrate with your user service
    // For now, return true as placeholder
    return true;
  }

  /**
   * Calculate experiment results
   */
  async calculateExperimentResults(experimentId) {
    try {
      // Get all assignments for this experiment
      const assignments = await getManyDocs("UserExperimentAssignment", {
        'assignments.experimentId': experimentId
      });

      // Get experiment details
      const experiment = await getOneDoc("Experiment", { experimentId });

      if (!experiment) {
        throw new Error('Experiment not found');
      }

      // Calculate results for each variant
      const variantResults = {};
      let totalParticipants = 0;
      let totalConversions = 0;
      let totalRevenue = 0;

      for (const variant of experiment.variants) {
        const variantAssignments = assignments.filter(
          a => a.assignments.some(assignment => 
            assignment.experimentId === experimentId && assignment.variantId === variant.variantId
          )
        );

        const participants = variantAssignments.length;
        const conversions = variantAssignments.filter(a => a.hasConverted).length;
        const revenue = variantAssignments.reduce((sum, a) => 
          sum + (a.conversionEvents?.reduce((convSum, event) => convSum + (event.value || 0), 0) || 0), 0
        );

        const conversionRate = participants > 0 ? (conversions / participants) * 100 : 0;

        variantResults[variant.variantId] = {
          variantId: variant.variantId,
          name: variant.name,
          participants,
          conversions,
          conversionRate,
          revenue,
          averageOrderValue: participants > 0 ? revenue / conversions : 0
        };

        totalParticipants += participants;
        totalConversions += conversions;
        totalRevenue += revenue;
      }

      // Determine winner
      const winner = this.determineWinner(variantResults, experiment.goals);

      // Calculate statistical significance
      const significance = this.calculateStatisticalSignificance(variantResults);

      return {
        totalParticipants,
        totalConversions,
        overallConversionRate: totalParticipants > 0 ? (totalConversions / totalParticipants) * 100 : 0,
        variantResults,
        winner,
        confidence: significance.confidence,
        insights: this.generateExperimentInsights(variantResults, winner, significance),
        recommendations: this.generateExperimentRecommendations(variantResults, winner, significance)
      };
    } catch (error) {
      console.error("Error calculating experiment results:", error);
      throw error;
    }
  }

  /**
   * Determine winning variant
   */
  determineWinner(variantResults, goals) {
    if (!goals || goals.length === 0) {
      return null;
    }

    const primaryGoal = goals.find(g => g.type === 'primary');
    const metric = primaryGoal?.metric || 'conversion_rate';

    let winner = null;
    let bestValue = 0;

    for (const [variantId, result] of Object.entries(variantResults)) {
      const value = result[metric];
      if (value > bestValue) {
        bestValue = value;
        winner = {
          variantId,
          name: result.name,
          value,
          improvement: 0 // Will be calculated relative to control
        };
      }
    }

    // Calculate improvement relative to control
    if (winner && variantResults.control) {
      const controlValue = variantResults.control[metric];
      winner.improvement = ((winner.value - controlValue) / controlValue) * 100;
    }

    return winner;
  }

  /**
   * Calculate statistical significance
   */
  calculateStatisticalSignificance(variantResults) {
    const variants = Object.values(variantResults);
    
    if (variants.length < 2) {
      return {
        confidence: 0,
        confidenceInterval: { lower: 0, upper: 0 },
        pValue: 1
      };
    }

    // Simplified chi-square test for conversion rates
    const control = variants.find(v => v.name === 'Control');
    const treatment = variants.find(v => v.name !== 'Control');

    if (!control || !treatment) {
      return {
        confidence: 0,
        confidenceInterval: { lower: 0, upper: 0 },
        pValue: 1
      };
    }

    const controlRate = control.conversionRate / 100;
    const treatmentRate = treatment.conversionRate / 100;
    const controlConversions = control.conversions;
    const treatmentConversions = treatment.conversions;
    const controlTotal = control.participants;
    const treatmentTotal = treatment.participants;

    // Chi-square calculation
    const expectedControlConversions = (controlTotal + treatmentTotal) * (controlConversions + treatmentConversions) / (controlTotal + treatmentTotal);
    const expectedTreatmentConversions = expectedControlConversions;

    const chiSquare = Math.pow(controlConversions - expectedControlConversions, 2) / expectedControlConversions +
                      Math.pow(treatmentConversions - expectedTreatmentConversions, 2) / expectedTreatmentConversions;

    // P-value calculation (simplified)
    const pValue = chiSquare > 3.84 ? 0.05 : 0.5; // Simplified

    // Confidence level
    const confidence = pValue < 0.05 ? 95 : 50;

    return {
      confidence,
      confidenceInterval: {
        lower: treatmentRate - 0.05,
        upper: treatmentRate + 0.05
      },
      pValue
    };
  }

  /**
   * Update variant metrics
   */
  async updateVariantMetrics(experimentId, variantId, metricType) {
    try {
      const experiment = await getOneDoc("Experiment", { experimentId });
      
      if (!experiment) {
        throw new Error('Experiment not found');
      }

      const variantIndex = experiment.variants.findIndex(v => v.variantId === variantId);
      
      if (variantIndex === -1) {
        throw new Error('Variant not found');
      }

      const updateField = `variants.${variantIndex}.metrics.${metricType}`;
      
      await updateOneDoc(
        "Experiment",
        { experimentId },
        { $inc: { [updateField]: 1 } }
      );

      return { success: true };
    } catch (error) {
      console.error("Error updating variant metrics:", error);
      throw error;
    }
  }

  /**
   * Generate experiment insights
   */
  generateExperimentInsights(variantResults, winner, significance) {
    const insights = [];

    // Winner significance insight
    if (winner && significance.confidence >= 95) {
      insights.push({
        type: 'statistical_significance',
        title: 'Statistically Significant Winner',
        description: `The winning variant (${winner.name}) shows statistically significant improvement with ${significance.confidence}% confidence.`,
        priority: 'high'
      });
    }

    // Sample size insight
    const totalParticipants = Object.values(variantResults).reduce((sum, v) => sum + v.participants, 0);
    if (totalParticipants < 1000) {
      insights.push({
        type: 'sample_size',
        title: 'Low Sample Size',
        description: `Total participants (${totalParticipants}) may be insufficient for statistical significance.`,
        priority: 'medium'
      });
    }

    // Conversion rate insight
    const conversionRates = Object.values(variantResults).map(v => v.conversionRate);
    const maxConversionRate = Math.max(...conversionRates);
    const minConversionRate = Math.min(...conversionRates);

    if (maxConversionRate > minConversionRate * 2) {
      insights.push({
        type: 'conversion_variance',
        title: 'High Conversion Variance',
        description: `Significant difference between variants (${maxConversionRate.toFixed(2)}% vs ${minConversionRate.toFixed(2)}%).`,
        priority: 'medium'
      });
    }

    return insights;
  }

  /**
   * Generate experiment recommendations
   */
  generateExperimentRecommendations(variantResults, winner, significance) {
    const recommendations = [];

    // Implement winner recommendation
    if (winner && significance.confidence >= 95) {
      recommendations.push({
        type: 'implement_winner',
        title: 'Implement Winning Variant',
        description: `Deploy ${winner.name} variant to all users.`,
        priority: 'high'
      });
    }

    // Continue experiment recommendation
    if (significance.confidence < 95) {
      recommendations.push({
        type: 'continue_experiment',
        title: 'Continue Experiment',
        description: 'Gather more data to achieve statistical significance.',
        priority: 'medium'
      });
    }

    // New experiment recommendation
    recommendations.push({
      type: 'new_experiment',
      title: 'Plan Next Experiment',
      description: 'Based on learnings, consider testing new hypotheses.',
      priority: 'low'
    });

    return recommendations;
  }

  /**
   * Assess experiment risks
   */
  assessExperimentRisks(experimentData) {
    const risks = [];

    // Technical risk
    if (experimentData.type === 'ui_test' && experimentData.implementation?.changes?.length > 5) {
      risks.push({
        type: 'technical',
        description: 'Multiple UI changes may introduce bugs',
        mitigation: 'Implement thorough testing and gradual rollout',
        probability: 'medium',
        impact: 'medium'
      });
    }

    // Business risk
    if (experimentData.type === 'pricing_test') {
      risks.push({
        type: 'business',
        description: 'Pricing changes may affect revenue',
        mitigation: 'Monitor revenue metrics closely',
        probability: 'medium',
        impact: 'high'
      });
    }

    return risks;
  }
}

// Singleton instance
const abTestingService = new ABTestingService();

export default abTestingService;