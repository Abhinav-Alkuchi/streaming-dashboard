/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ElementType, ReactNode } from "react";
import type { JourneyStep } from "./abandonedCart";

interface DatabricksData {
  [key: string]: unknown;
}

interface ConnectionStats {
  live: { isConnecting: boolean; lastUsed: string };
  historical: { isConnecting: boolean; lastUsed: string };
  cacheSize: number;
  activeConnections: number;
}

interface HistoricalDataResponse {
  data: DatabricksData[];
  date: string;
  totalRecords: number;
  timestamp: string;
}

interface StoreModeRow {
  platform: string;
  event_date: string;
  event_type: string;
  store_type?: string;
  user_id?: string;
  store_id?: string;
  count: number;
  // Add these fields for state mapping if available
  state?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

type ConnectionStatus = 'connected' | 'connecting' | 'historical';

interface UseDatabricksStreamReturn {
  data: DatabricksData[];
  setData: (data: DatabricksData[]) => void;
  error: string | null;
  isConnected: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdate: Date | null;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  connectionStats: ConnectionStats | null;
  refreshData: () => void;
  refreshEventStream: () => void;
  preWarmConnection: () => Promise<void>;
  clearCache: () => void;
  connectSocket: () => void;
  disconnectSocket: () => void;
  fetchHistoricalData: (date: string) => Promise<void>;
  isTodaySelected: boolean;
  eventStreamData: DatabricksData[];
  isEventStreamLoading: boolean;
  timeSinceLastUpdate: number;
  eventStreamLastUpdate: Date | null;
  currentTab: "dashboard" | "event-stream" | "historical" | "purchase-analysis" | "customer-journey" | "generate-dashboard" | "store-mode";
  setCurrentTab: (tab: "dashboard" | "event-stream" | "historical" | "purchase-analysis" | "customer-journey" | "generate-dashboard" | "store-mode") => void;
  connectionStatus: ConnectionStatus;
}

interface HistoricalData {
  event_date: string;
  sotType: string;
  platform?: string;
  cnt: number;
}

interface UseHistoricalDataReturn {
  data: HistoricalData[];
  isLoading: boolean;
  error: string | null;
  fetchData: (startDate: string, endDate: string) => Promise<void>;
  progress?: {
    current: number;
    total: number;
    currentChunk: string;
  };
}

interface ChartProps {
  title: string;
  description?: string;
  data: Record<string, any>[];
  type:
    | "line"
    | "area"
    | "bar"
    | "pie"
    | "stackedArea"
    | "composed"
    | "customPie"
    | "funnelPie"
    | "paddingAnglePie"
    | "conversionFunnel";
  dataKeys?: string[];
  isLoading?: boolean;
  hideTitle?: boolean;
}

interface DashboardProps {
  data: Record<string, unknown>[];
  error: string | null;
  isConnected: boolean;
  isLoading: boolean;
  lastUpdate: Date | null;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  connectionStats?: {
    live: { isConnecting: boolean; lastUsed: string };
    historical: { isConnecting: boolean; lastUsed: string };
    cacheSize: number;
    activeConnections: number;
  } | null;
}

interface EventStreamProps {
  events: any[];
  isConnected: boolean;
  isLoading: boolean;
  onRefresh: () => void;
}

interface HistoricalDataTableProps {
  activeTab: number;
}

interface SummaryStats {
  totalEvents: number;
  uniqueEventTypes: number;
  uniquePlatforms: number;
  dateRange: string;
  averageEventsPerDay: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: ReactNode;
  icon: ElementType;
  trend?: "up" | "down" | "neutral";
  isLoading?: boolean;
}

interface MetricChartCardProps {
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  isLoading?: boolean;
}

interface MetricDataGridCardProps {
  title: string;
  description?: string;
  data: Record<string, unknown>[];
  isLoading?: boolean;
  maxRows?: number;
}

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatBotModalProps {
  open: boolean;
  onClose: () => void;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  stats?: any;
  response?: string;
  matches?: any[];
  totalFound?: number;
  method?: string;
}

interface StatsData {
  totalRecords: number;
  byEventType: { [key: string]: number };
  uniqueDates: number;
  uniqueEmails: number;
  uniqueBrands: number;
  avgPrice: number;
  topSearchTerms?: Array<{ term: string; count: number }>;
  topPageViewCategories?: Array<{ category: string; count: number }>;
}

interface PersonalizationData {
child_sid: string;
  content_type: string;
  platform?: string;
  purchase_count: number;
  image_data?: string;
  product_name?: string;
  unit_price?: number;
  total_price?: number;
  media?: string;
  date?: string;
}

interface PersonalizationSummaryStats {
   totalPurchases: number;
  totalRevenue: number;
  uniqueContentTypes: number;
  uniquePlatforms: number;
  dateRange: string;
  averagePurchasesPerComponent: number;
  averageRevenuePerComponent: number;
}

interface PersonalizationDataTableProps {
  activeTab?: number;
}

interface CartItem {
  product_id: string;
  product_name: string;
  product_image: string;
  price: number;
  quantity: number;
  category?: string;
  sku_id?: string;
  brand_name?: string;
  product_category?: string
}

interface AbandonedCartItem {
  id: string;
  customer_id: string;
  customer_email: string;
  session_id: string;
  cart_items: CartItem[];
  total_amount: number;
  currency: string;
  abandoned_at: string;
  created_at?: string;
  last_activity?: string;
  recovery_attempts: number;
  recovered: boolean;
  platform: 'desktop web' | 'mobile web' | 'tablet web' | 'iphone app' | 'android app';
  browser: string;
  location: string;
  session_start?: string,
  session_end?: string
}

interface AbandonedCartMetrics {
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

// interface HeatMapData {
//   id: string;
//   session_id: string;
//   customer_id: string;
//   page_url: string;
//   page_title: string;
//   clicks: ClickData[];
//   scroll_depth: number;
//   mouse_movements: MouseMovement[];
//   time_on_page: number;
//   timestamp: string;
//   device_type: 'desktop web' | 'mobile web' | 'tablet web' | 'iphone app' | 'android app';
// }

interface ClickData {
  x: number;
  y: number;
  element: string;
  timestamp: string;
  intensity: number;
}

interface MouseMovement {
  x: number;
  y: number;
  timestamp: string;
}

// interface HeatMapAggregate {
//   page_url: string;
//   total_clicks: number;
//   click_heatmap: ClickHeatPoint[];
//   average_scroll_depth: number;
//   popular_elements: PopularElement[];
//   engagement_score: number;
// }

interface ClickHeatPoint {
  x: number;
  y: number;
  intensity: number;
  count: number;
}

// interface PopularElement {
//   element: string;
//   click_count: number;
//   average_position: { x: number; y: number };
// }

interface AbandonedCartMetricsCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  color: string;
}

interface CustomerJourneyStep {
  step: string;
  timestamp: string;
  duration?: number;
  page_url?: string;
  event_type?: string;
  platform?: string;
}

// interface JourneyMetrics {
//   total_journeys: number;
//   completed_journeys: number;
//   abandoned_journeys: number;
//   avg_journey_time: number;
//   avg_steps_per_journey: number;
//   common_drop_off_points: { step: string; count: number; percentage: number }[];
//   platform_breakdown: { platform: string; count: number; percentage: number }[];
// }

interface StoreModeData {
  event_date: string;
  event_type: string;
  store_type?: string;
  user_id?: string;
  store_id?: string;
  count: number;
}

interface StoreModeSummaryStats {
  totalEvents: number;
  uniqueEventTypes: number;
  uniqueStoreTypes: number;
  totalUsers: number;
  dateRange: string;
  averageEventsPerDay: number;
}

interface StoreModeDataTableProps {
  activeTab?: number;
}


// types/heatmap.ts

// Basic Heatmap Types
export interface HeatMapData {
  session_id: string;
  device_type: string;
  page_url: string;
  scroll_depth: number;
  time_on_page: number;
  clicks: ClickPoint[];
}

export interface ClickPoint {
  x: number;
  y: number;
  element?: string;
  timestamp?: string;
}

export interface HeatMapAggregate {
  click_heatmap: HeatmapPoint[];
  popular_elements: PopularElement[];
  average_metrics: {
    scroll_depth: number;
    time_on_page: number;
    clicks_per_session: number;
  };
}

// Heatmap Grid Types
export interface HeatmapPoint {
  x: number;
  y: number;
  intensity: number;
  count: number;
  size?: number;
}

export interface HeatmapGrid {
  global: HeatmapPoint[];
  by_page?: {
    [pageUrl: string]: HeatmapPoint[];
  };
}

export interface DetailedHeatmapPoint extends HeatmapPoint {
  elements?: string[];
  pages?: string[];
  element_count?: number;
}

export interface HeatMapData {
  sessionId: string;
  userId: string;
  startTime: string;
  endTime: string;
  pageViews: number;
  // clicks?: number;
  scrollDepth: number;
  interactions: Interaction[];
  conversion: boolean;
  revenue: number;
}

export interface Interaction {
  element: string;
  count: number;
  timestamp: string;
}

export interface HeatMapAggregate {
  totalSessions: number;
  totalUsers: number;
  averageSessionDuration: number;
  conversionRate: number;
  totalRevenue: number;
  mostActiveElements: MostActiveElement[];
  peakActivityTimes: PeakActivityTime[];
}

export interface MostActiveElement {
  element: string;
  count: number;
}

export interface PeakActivityTime {
  hour: number;
  activity: number;
}

export interface PurchaseJourneyData {
  journeyStages: JourneyStage[];
  commonPaths: CommonPath[];
  dropoffAnalysis: DropoffAnalysis[];
}

export interface JourneyStage {
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

export interface DropoffAnalysis {
  stage: string;
  reasons: DropoffReason[];
}

export interface DropoffReason {
  reason: string;
  percentage: number;
}

export interface JourneyFunnelData {
  funnels: Funnel[];
  timeToConvert: TimeToConvert;
  touchpoints: Touchpoints;
}

export interface Funnel {
  name: string;
  stages: FunnelStage[];
  conversionRate: number;
}

export interface FunnelStage {
  name: string;
  value: number;
}

export interface TimeToConvert {
  average: number;
  distribution: TimeDistribution[];
}

export interface TimeDistribution {
  timeRange: string;
  percentage: number;
}

export interface Touchpoints {
  averageTouchpoints: number;
  distribution: TouchpointDistribution[];
}

export interface TouchpointDistribution {
  touchpoints: number | string;
  percentage: number;
}

// Enhanced Journey Analysis Types
export interface PurchaseJourneyData {
  successful_journey: JourneyData;
  abandoned_journey: JourneyData;
  element_analysis: ElementAnalysis[];
  insights: JourneyInsight[];
  page_analysis: PageAnalysis[];
}

export interface JourneyData {
  clicks: JourneyClick[];
  heatmap: JourneyHeatmap;
  total_clicks: number;
  total_sessions: number;
  unique_elements?: number;
}

export interface JourneyHeatmap {
  global: DetailedHeatmapPoint[];
  by_page: {
    [pageUrl: string]: DetailedHeatmapPoint[];
  };
}

export interface JourneyClick {
  x: number;
  y: number;
  element: string;
  page_url: string;
  device_type: string;
  count: number;
  sessions: number;
  intensity?: number;
}

export interface ElementAnalysis {
  element: string;
  successful_clicks: number;
  abandoned_clicks: number;
  successful_sessions: number;
  abandoned_sessions: number;
  total_clicks: number;
  total_sessions: number;
  conversion_rate: number;
  click_conversion_rate: number;
}

export interface PageAnalysis {
  page_url: string;
  successful_clicks: number;
  abandoned_clicks: number;
  total_clicks: number;
  conversion_rate?: number;
}

export interface JourneyInsight {
  type: 'overall_conversion' | 'high_performing_elements' | 'problem_elements' | 'device_performance';
  title: string;
  description: string;
  value?: string;
  elements?: ElementAnalysis[];
  devices?: DevicePerformance[];
}

export interface DevicePerformance {
  device: string;
  successful_clicks: number;
  abandoned_clicks: number;
  total_clicks: number;
  conversion_rate: number;
}

// Funnel Analysis Types
export interface JourneyFunnelData {
  funnel_stages: {
    [stage: string]: FunnelClick[];
  };
  stage_heatmaps: {
    [stage: string]: FunnelHeatmap;
  };
  stage_summary: {
    [stage: string]: StageSummary;
  };
  conversion_flow: ConversionFlow[];
}

export interface FunnelClick {
  x: number;
  y: number;
  element: string;
  page_url: string;
  device_type: string;
  click_count: number;
  session_count: number;
}

export interface FunnelHeatmap {
  global: DetailedHeatmapPoint[];
  by_page?: {
    [pageUrl: string]: DetailedHeatmapPoint[];
  };
}

export interface StageSummary {
  total_clicks: number;
  unique_sessions: number;
  unique_elements: Set<string>;
  unique_elements_count: number;
  avg_clicks_per_session: number;
}

export interface ConversionFlow {
  from_stage: string;
  to_stage: string;
  conversion_rate: number;
  drop_off_rate: number;
  current_sessions: number;
  next_sessions: number;
}

export interface PopularElement {
  element: string;
  click_count: number;
}

// Component Prop Types
export interface HeatMapVisualizationProps {
  data: HeatMapData[];
  aggregateData: HeatMapAggregate | null;
  isLoading: boolean;
}

export interface PurchaseJourneyHeatMapProps {
  journeyData: PurchaseJourneyData | null;
  isLoading: boolean;
  onAnalysisTypeChange?: (type: string) => void;
}

export interface JourneyFunnelHeatMapProps {
  funnelData: JourneyFunnelData | null;
  isLoading: boolean;
}

// Hook Return Types
export interface UseHeatMapReturn {
  // Basic heatmap data
  heatMapData: HeatMapData[];
  aggregateData: HeatMapAggregate | null;
  
  // Enhanced analysis data
  purchaseJourneyData: PurchaseJourneyData | null;
  journeyFunnelData: JourneyFunnelData | null;
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Methods
  fetchHeatMapData: (
    startDate: string, 
    endDate: string, 
    pageUrl?: string,
    analysisType?: 'basic' | 'purchase-journey' | 'journey-funnel'
  ) => Promise<void>;
  
  fetchPurchaseJourneyData: (startDate: string, endDate: string, pageUrl?: string) => Promise<void>;
  fetchJourneyFunnelData: (startDate: string, endDate: string) => Promise<void>;
}

// API Response Types
export interface HeatMapApiResponse {
  success: boolean;
  data: HeatMapData[] | PurchaseJourneyData | JourneyFunnelData;
  startDate: string;
  endDate: string;
  pageUrl?: string;
  analysisType?: string;
  timestamp: string;
  source: string;
  sessionCount?: number;
}

export interface HeatMapAggregateResponse {
  sessions: HeatMapData[];
  aggregate: HeatMapAggregate;
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

export interface EventAnalysisData {
  event_date: string;
  event_type: string;
  platform: string;
  count: number;
}

export interface EventAnalysisSummary {
  totalEvents: number;
  uniqueDates: number;
  dateRange: string;
  averageEventsPerDay: number;
}

export interface AvailableEventsResponse {
  events: string[];
  platforms: string[];
}

interface DashboardStatusMetrics {
  totalEvents: number;
  cmsImpressions: number;
  cmsClicks: number;
}


export type {
  DatabricksData,
  ConnectionStats,
  HistoricalDataResponse,
  UseDatabricksStreamReturn,
  HistoricalData,
  UseHistoricalDataReturn,
  ChartProps,
  DashboardProps,
  EventStreamProps,
  HistoricalDataTableProps,
  SummaryStats,
  MetricCardProps,
  MetricChartCardProps,
  MetricDataGridCardProps,
  ChatMessage,
  ChatBotModalProps,
  ApiResponse,
  StatsData,
  PersonalizationData,
  PersonalizationSummaryStats,
  PersonalizationDataTableProps,
  CustomerJourneyStep,
  AbandonedCartItem,
  AbandonedCartMetrics,
  // HeatMapData,
  // HeatMapAggregate,
  // PopularElement,
  ClickHeatPoint,
  ClickData,
  MouseMovement,
  AbandonedCartMetricsCardProps,
  StoreModeData,
  StoreModeSummaryStats,
  StoreModeDataTableProps,
  StoreModeRow,
  DashboardStatusMetrics
};
