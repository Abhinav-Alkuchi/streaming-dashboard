// types.ts - Complete types for the abandoned cart dashboard

export interface JourneyStep {
  step: string;
  timestamp: string;
  duration: number;
}

export interface CustomerJourney {
  customer_id: string;
  customer_email: string;
  session_id: string;
  platform: string;
  steps: JourneyStep[];
  total_time: number;
  abandoned: boolean;
  conversion_likelihood?: 'high' | 'medium' | 'low';
  behavioral_pattern?: 'browser' | 'researcher' | 'impulse' | 'hesitant';
  engagement_score?: number;
  potential_recovery_value?: number;
}

export interface JourneyMetrics {
  total_journeys: number;
  completed_journeys: number;
  abandoned_journeys: number;
  avg_journey_time: number;
  avg_steps_per_journey: number;
  common_drop_off_points: Array<{
    step: string;
    count: number;
    percentage: number;
    avgTimeInStep?: number;
  }>;
  conversion_funnel: Array<{
    step: string;
    count: number;
    conversionRate: number;
    dropOffRate: number;
    progressionRate?: number;
  }>;
  avg_transition_times?: { [key: string]: number };
  journey_completion_rate?: number;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  product_image: string;
  price: number;
  quantity: number;
  category: string;
  sku_id: number;
}

export interface AbandonedCartItem {
  id: string;
  customer_id: string;
  customer_email: string;
  session_id: string;
  cart_items: CartItem[];
  total_amount: number;
  currency: string;
  abandoned_at: string;
  created_at: string;
  last_activity: string;
  recovery_attempts: number;
  recovered: boolean;
  platform: string;
  browser: string;
  location: string;
}

export interface AbandonedCartMetrics {
  total_abandoned_carts: number;
  total_abandoned_revenue: number;
  recovery_rate: number;
  average_cart_value: number;
  abandonment_rate: number;
  period_comparison: {
    previous_period: number;
    change_percentage: number;
  };
}

export interface AbandonedCartMetricsCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ComponentType<unknown>;
  color: string;
}

// Heat Map Types
export interface HeatMapInteraction {
  element: string;
  count: number;
  timestamp: string;
}

export interface HeatMapSession {
  sessionId: string;
  userId: string;
  startTime: string;
  endTime: string;
  pageViews: number;
  clicks: number;
  scrollDepth: number;
  interactions: HeatMapInteraction[];
  conversion: boolean;
  revenue: number;
  device_type?: string;
  time_on_page?: number;
}

export interface HeatMapData {
  sessionId: string;
  userId: string;
  startTime: string;
  endTime: string;
  pageViews: number;
  clicks: HeatMapInteraction[];
  scrollDepth: number;
  interactions: HeatMapInteraction[];
  conversion: boolean;
  revenue: number;
  device_type: string;
  time_on_page: number;
  page_url: string;
}

export interface HeatMapPoint {
  x: number;
  y: number;
  intensity: number;
  count: number;
  elements?: string[];
}

export interface PopularElement {
  element: string;
  click_count: number;
}

export interface PeakActivityTime {
  hour: number;
  activity: number;
}

export interface HeatMapAggregate {
  totalSessions: number;
  totalUsers: number;
  averageSessionDuration: number;
  conversionRate: number;
  totalRevenue: number;
  mostActiveElements: PopularElement[];
  peakActivityTimes: PeakActivityTime[];
  click_heatmap: HeatMapPoint[];
  popular_elements: PopularElement[];
}

// Purchase Journey Types
export interface PurchaseJourneyStage {
  stage: string;
  users: number;
  dropoffs: number;
  conversionRate: number;
  averageTime: number;
}

export interface CommonPath {
  path: string[];
  frequency: number;
  conversionRate: number;
}

export interface DropoffReason {
  reason: string;
  percentage: number;
}

export interface DropoffAnalysis {
  stage: string;
  reasons: DropoffReason[];
}

export interface PurchaseJourneyData {
  journeyStages: PurchaseJourneyStage[];
  commonPaths: CommonPath[];
  dropoffAnalysis: DropoffAnalysis[];
  // Enhanced properties for heatmap integration
  successful_journey?: {
    total_clicks: number;
    heatmap: {
      global: HeatMapPoint[];
    };
  };
  abandoned_journey?: {
    total_clicks: number;
    heatmap: {
      global: HeatMapPoint[];
    };
  };
  insights?: Array<{
    type: 'high_performing_elements' | 'problem_elements' | 'conversion_insight';
    title: string;
    description: string;
    elements?: Array<{
      element: string;
      conversion_rate: number;
    }>;
  }>;
  conversion_flow?: Array<{
    from_stage: string;
    to_stage: string;
    conversion_rate: number;
    drop_off_rate: number;
  }>;
  stage_heatmaps?: {
    [stage: string]: {
      global: HeatMapPoint[];
    };
  };
  element_analysis?: Array<{
    element: string;
    successful_clicks: number;
    abandoned_clicks: number;
    total_clicks: number;
    conversion_rate: number;
  }>;
}

// Journey Funnel Types
export interface FunnelStage {
  name: string;
  value: number;
}

export interface Funnel {
  name: string;
  stages: FunnelStage[];
  conversionRate: number;
}

export interface TimeDistribution {
  timeRange: string;
  percentage: number;
}

export interface TouchpointDistribution {
  touchpoints: number | string;
  percentage: number;
}

export interface JourneyFunnelData {
  funnels: Funnel[];
  timeToConvert: {
    average: number;
    distribution: TimeDistribution[];
  };
  touchpoints: {
    averageTouchpoints: number;
    distribution: TouchpointDistribution[];
  };
  funnel_stages?: {
    [key: string]: {
      count: number;
      dropoff_rate: number;
      avg_time: number;
    };
  };
}

// Insight Types
export interface JourneyInsight {
  type: 'success' | 'warning' | 'error';
  title: string;
  message: string;
  suggestion: string;
}

// Hook Return Types
export interface UseAbandonedCartsReturn {
  data: AbandonedCartItem[];
  metrics: AbandonedCartMetrics | null;
  journeys: CustomerJourney[];
  isLoading: boolean;
  error: string | null;
  fetchAbandonedCarts: (startDate: string, endDate: string) => Promise<void>;
  recoverCart: (cartId: string) => Promise<{ success: boolean }>;
}

export interface UseCustomerJourneysReturn {
  journeys: CustomerJourney[];
  journeyMetrics: JourneyMetrics | null;
  transitionAnalytics: { [key: string]: number };
  isLoading: boolean;
  error: string | null;
  fetchCustomerJourneys: (startDate: string, endDate: string) => Promise<void>;
  getJourneyInsights: () => JourneyInsight[] | null;
}

export interface UseHeatMapReturn {
  heatMapData: HeatMapData[];
  aggregateData: HeatMapAggregate | null;
  purchaseJourneyData: PurchaseJourneyData | null;
  journeyFunnelData: JourneyFunnelData | null;
  isLoading: boolean;
  error: string | null;
  fetchHeatMapData: (startDate: string, endDate: string, pageUrl?: string, analysisType?: 'basic' | 'purchase-journey' | 'journey-funnel') => Promise<void>;
  fetchPurchaseJourneyData: (startDate: string, endDate: string, pageUrl?: string) => Promise<void>;
  fetchJourneyFunnelData: (startDate: string, endDate: string) => Promise<void>;
}