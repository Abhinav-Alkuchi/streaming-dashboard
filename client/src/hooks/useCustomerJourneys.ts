import { useState, useCallback } from 'react';
import type { CustomerJourney, JourneyMetrics } from '../types';

const USE_MOCK_DATA = import.meta.env.VITE_APP_USE_MOCK_DATA === 'true';

/**
 * Enhanced journey analysis with better step tracking and pattern recognition
 */
const countJourneysReachedStep = (journeys: CustomerJourney[], step: string): number => {
    return journeys.filter(journey => 
      journey.steps.some(s => s.step === step)
    ).length;
};

/**
 * Calculate time spent between steps for deeper insights
 */
const calculateStepTransitionTimes = (journeys: CustomerJourney[]) => {
  const transitionTimes: { [key: string]: number[] } = {};
  
  journeys.forEach(journey => {
    const steps = journey.steps.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    for (let i = 0; i < steps.length - 1; i++) {
      const currentStep = steps[i];
      const nextStep = steps[i + 1];
      const transitionKey = `${currentStep.step}_to_${nextStep.step}`;
      const timeDiff = (new Date(nextStep.timestamp).getTime() - new Date(currentStep.timestamp).getTime()) / 1000;
      
      if (!transitionTimes[transitionKey]) {
        transitionTimes[transitionKey] = [];
      }
      transitionTimes[transitionKey].push(timeDiff);
    }
  });
  
  return transitionTimes;
};

/**
 * Calculate engagement score based on journey characteristics
 */
const calculateEngagementScore = (journey: CustomerJourney): number => {
  const stepWeight = Math.min(journey.steps.length / 7, 1); // Max 7 steps
  const timeWeight = Math.min(journey.total_time / 600, 1); // Max 10 minutes
  const depthWeight = journey.steps.some(s => s.step === 'payment_info') ? 1 : 
                    journey.steps.some(s => s.step === 'checkout_start') ? 0.7 :
                    journey.steps.some(s => s.step === 'add_to_cart') ? 0.4 : 0.2;
  
  return (stepWeight + timeWeight + depthWeight) / 3;
};

export const useCustomerJourneys = () => {
  const [journeys, setJourneys] = useState<CustomerJourney[]>([]);
  const [journeyMetrics, setJourneyMetrics] = useState<JourneyMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transitionAnalytics, setTransitionAnalytics] = useState<{[key: string]: number}>({});

  // Enhanced journey metrics calculation
  const calculateJourneyMetrics = useCallback((journeys: CustomerJourney[]): JourneyMetrics => {
    const totalJourneys = journeys.length;
    const completedJourneys = journeys.filter(j => !j.abandoned).length;
    const abandonedJourneys = totalJourneys - completedJourneys;
    
    // Calculate average journey time
    const avgJourneyTime = totalJourneys > 0 
      ? journeys.reduce((sum, journey) => sum + journey.total_time, 0) / totalJourneys
      : 0;
    
    // Calculate average steps per journey
    const avgStepsPerJourney = totalJourneys > 0 
      ? journeys.reduce((sum, journey) => sum + journey.steps.length, 0) / totalJourneys
      : 0;
    
    // Enhanced drop-off analysis with step context
    const dropOffPoints = journeys
      .filter(j => j.abandoned)
      .map(journey => {
        const lastStep = journey.steps[journey.steps.length - 1];
        const previousStep = journey.steps[journey.steps.length - 2];
        return {
          step: lastStep?.step || 'unknown',
          previousStep: previousStep?.step,
          timeInStep: lastStep?.duration || 0
        };
      });
    
    const dropOffCounts: { [key: string]: { count: number, avgTime: number } } = {};
    dropOffPoints.forEach(({ step, timeInStep }) => {
      if (!dropOffCounts[step]) {
        dropOffCounts[step] = { count: 0, avgTime: 0 };
      }
      dropOffCounts[step].count += 1;
      dropOffCounts[step].avgTime += timeInStep;
    });

    // Calculate average time for each drop-off point
    Object.keys(dropOffCounts).forEach(step => {
      dropOffCounts[step].avgTime = dropOffCounts[step].avgTime / dropOffCounts[step].count;
    });

    const common_drop_off_points = Object.entries(dropOffCounts)
      .map(([step, data]) => {
        const percentage = abandonedJourneys > 0 ? (data.count / abandonedJourneys) * 100 : 0;
        return { 
          step, 
          count: data.count, 
          percentage,
          avgTimeInStep: data.avgTime
        };
      })
      .filter(point => point.count > 0)
      .sort((a, b) => b.count - a.count);
      
    // Enhanced conversion funnel with step progression
    const allSteps = [
        'landing_page', 'product_view', 'add_to_cart', 'cart_view', 
        'checkout_start', 'shipping_info', 'payment_info'
    ];
    
    const stepCounts: { [key: string]: number } = {};
    allSteps.forEach(step => {
        stepCounts[step] = countJourneysReachedStep(journeys, step);
    });

    // Add the final 'conversion' step
    stepCounts['conversion'] = completedJourneys;

    const conversionFunnel = allSteps
        .map((step, index) => {
            const currentCount = stepCounts[step];
            const previousCount = index === 0 ? totalJourneys : stepCounts[allSteps[index - 1]];
            const progressionRate = previousCount > 0 ? (currentCount / previousCount) * 100 : 0;
            
            return {
                step,
                count: currentCount,
                conversionRate: totalJourneys > 0 ? (currentCount / totalJourneys) * 100 : 0,
                dropOffRate: previousCount > 0 ? ((previousCount - currentCount) / previousCount) * 100 : 0,
                progressionRate: progressionRate
            };
        })
        .concat({
            step: 'conversion',
            count: completedJourneys,
            conversionRate: totalJourneys > 0 ? (completedJourneys / totalJourneys) * 100 : 0,
            dropOffRate: 0,
            progressionRate: stepCounts['payment_info'] > 0 ? (completedJourneys / stepCounts['payment_info']) * 100 : 0
        });

    // Calculate transition analytics
    const transitions = calculateStepTransitionTimes(journeys);
    const avgTransitionTimes: { [key: string]: number } = {};
    Object.keys(transitions).forEach(key => {
      avgTransitionTimes[key] = transitions[key].reduce((a, b) => a + b, 0) / transitions[key].length;
    });

    return {
        total_journeys: totalJourneys,
        completed_journeys: completedJourneys,
        abandoned_journeys: abandonedJourneys,
        avg_journey_time: avgJourneyTime,
        avg_steps_per_journey: avgStepsPerJourney,
        common_drop_off_points,
        conversion_funnel: conversionFunnel,
        avg_transition_times: avgTransitionTimes,
        journey_completion_rate: totalJourneys > 0 ? (completedJourneys / totalJourneys) * 100 : 0
    };
  }, []);

  // Enhanced journey pattern analysis with behavioral insights
  const analyzeJourneyPatterns = useCallback((journeys: CustomerJourney[]): CustomerJourney[] => {
    return journeys.map(journey => {
      const stepCount = journey.steps.length;
      const hasCheckout = journey.steps.some(step => step.step === 'checkout_start');
      const hasPayment = journey.steps.some(step => step.step === 'payment_info');
      const hasCart = journey.steps.some(step => step.step === 'add_to_cart');
      
      // Enhanced conversion likelihood calculation
      let conversion_likelihood: 'high' | 'medium' | 'low' = 'low';
      let behavioral_pattern: 'browser' | 'researcher' | 'impulse' | 'hesitant' = 'browser';
      
      // Calculate time patterns
      const totalJourneyTime = journey.total_time;
      const avgStepTime = totalJourneyTime / stepCount;
      
      if (hasPayment) {
        conversion_likelihood = 'high';
        behavioral_pattern = totalJourneyTime < 300 ? 'impulse' : 'researcher';
      } else if (hasCheckout && stepCount >= 4) {
        conversion_likelihood = 'medium';
        behavioral_pattern = avgStepTime > 60 ? 'hesitant' : 'researcher';
      } else if (hasCart && stepCount >= 3) {
        conversion_likelihood = 'low';
        behavioral_pattern = 'browser';
      }
      
      // Detect rapid exit patterns
      if (stepCount <= 2 && totalJourneyTime < 30) {
        behavioral_pattern = 'browser';
      }
      
      const engagement_score = calculateEngagementScore(journey);
      const potential_recovery_value = conversion_likelihood === 'high' ? 0.4 : 
                                     conversion_likelihood === 'medium' ? 0.2 : 0.1;
      
      return {
        ...journey,
        platform: journey.platform || 'desktop',
        conversion_likelihood,
        behavioral_pattern,
        engagement_score,
        potential_recovery_value
      };
    });
  }, []);

  const fetchCustomerJourneys = useCallback(async (startDate: string, endDate: string) => {
    if (isLoading) {
      console.log('--- Skipping fetch - already loading');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      if (USE_MOCK_DATA) {
        console.log('--- Using ENHANCED MOCK data for customer journeys');
        // Use enhanced mock data
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { getEnhancedMockJourneys } = await import('../mock/abandoned-carts');
        
        const enhancedJourneys = analyzeJourneyPatterns(getEnhancedMockJourneys());
        const metrics = calculateJourneyMetrics(enhancedJourneys);
        
        setJourneys(enhancedJourneys);
        setJourneyMetrics(metrics);
        setTransitionAnalytics(metrics.avg_transition_times || {});
        
      } else {
        console.log('--- Using REAL API for customer journeys');
        // Use real API calls
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(`${baseUrl}/api/customer-journeys?startDate=${startDate}&endDate=${endDate}`, {
          method: 'GET'
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Journey API returned non-OK status. Response body snippet:', errorText.substring(0, 200));
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error('Journey API returned error response');
        }

        const enhancedJourneys = analyzeJourneyPatterns(data.data || []);
        const metrics = calculateJourneyMetrics(enhancedJourneys);
        
        setJourneys(enhancedJourneys);
        setJourneyMetrics(metrics);
        setTransitionAnalytics(metrics.avg_transition_times || {});
        console.log('--- Enhanced journey data loaded successfully');
      }
    } catch (err) {
      console.error('--- Error fetching customer journeys:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to fetch customer journey data: ${errorMessage}`);
      
      // Fallback to enhanced mock data on API error
      if (!USE_MOCK_DATA) {
        console.log('--- Falling back to enhanced mock data due to API error');
        const { getEnhancedMockJourneys } = await import('../mock/abandoned-carts');
        const enhancedJourneys = analyzeJourneyPatterns(getEnhancedMockJourneys());
        const metrics = calculateJourneyMetrics(enhancedJourneys);
        
        setJourneys(enhancedJourneys);
        setJourneyMetrics(metrics);
        setTransitionAnalytics(metrics.avg_transition_times || {});
        setError(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, analyzeJourneyPatterns, calculateJourneyMetrics]);

  // New method to get journey insights
  const getJourneyInsights = useCallback(() => {
    if (!journeyMetrics) return null;
    
    const insights = [];
    
    // High drop-off insight
    const highestDropOff = journeyMetrics.common_drop_off_points[0];
    if (highestDropOff && highestDropOff.percentage > 30) {
      insights.push({
        type: 'warning' as const,
        title: 'High Drop-off Point',
        message: `${highestDropOff.percentage.toFixed(1)}% of users drop off at ${highestDropOff.step.replace('_', ' ')}`,
        suggestion: 'Consider optimizing this step to reduce abandonment'
      });
    }
    
    // Conversion rate insight
    if (
      journeyMetrics &&
      typeof journeyMetrics.journey_completion_rate === 'number' &&
      journeyMetrics.journey_completion_rate < 20
    ) {
      insights.push({
        type: 'error' as const,
        title: 'Low Conversion Rate',
        message: `Only ${journeyMetrics.journey_completion_rate.toFixed(1)}% of journeys complete successfully`,
        suggestion: 'Review funnel steps and identify bottlenecks'
      });
    }
    
    // Positive insight
    if (journeyMetrics.avg_steps_per_journey > 4) {
      insights.push({
        type: 'success' as const,
        title: 'Good User Engagement',
        message: `Users take an average of ${journeyMetrics.avg_steps_per_journey.toFixed(1)} steps per journey`,
        suggestion: 'Users are exploring your products thoroughly'
      });
    }
    
    return insights;
  }, [journeyMetrics]);

  return {
    journeys,
    journeyMetrics,
    transitionAnalytics,
    isLoading,
    error,
    fetchCustomerJourneys,
    getJourneyInsights
  };
};