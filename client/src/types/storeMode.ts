export interface StoreModeRow {
  event_date: string;
  event_type: string;
  store_type: string;
  state: string;
  country: string;
  store_id: string;
  platform: string;
  count: number;
  user_id: string;
  unique_users?: number;
}

export interface StoreModeSummaryStats {
  totalEvents: number;
  uniqueEventTypes: number;
  uniqueStoreTypes: number;
  uniqueStates: number;
  uniqueStores: number;
  uniquePlatforms: number;
  dateRange: string;
  averageEventsPerDay: number;
  totalUsers: number;
}

export interface StoreModeDataTableProps {
  data?: StoreModeRow[];
  isLoading?: boolean;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
}

// Chart data types for all scenarios
export interface EventTypeSlice {
  event_type: string;
  original_type: string;
  count: number;
  percentage: number;
}

export interface StoreTypeSlice {
  store_type: string;
  original_type: string;
  count: number;
  percentage: number;
}

export interface StateSlice {
  state: string;
  count: number;
  percentage: number;
  unique_stores: number;
}

export interface CountrySlice {
  country: string;
  count: number;
  percentage: number;
  unique_stores: number;
}

export interface StoreIdSlice {
  store_id: string;
  count: number;
  percentage: number;
  store_type: string;
}

export interface PlatformSlice {
  platform: string;
  count: number;
  percentage: number;
  unique_users: number;
}