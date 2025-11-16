// useMockStoreModeData.ts
import type { StoreModeRow } from "../types";
import { mockStores } from "../mock/storeData";

// ONLY Sephora event types
const sephoraEventTypes = [
  "store_mode_local_notification_click",
  "store_local_notification_received", 
  "store_inner_geofence_crossed"
];

// Platforms
// const platforms = ["iphone app", "android app"];

const regionActivityLevels: Record<string, { level: 'high' | 'medium' | 'low', multiplier: number, country: string }> = {
  // US - High Activity
  "CA": { level: 'high', multiplier: 1.0, country: "USA" },
  "NY": { level: 'high', multiplier: 0.8, country: "USA" },
  "TX": { level: 'high', multiplier: 0.7, country: "USA" },
  "FL": { level: 'high', multiplier: 0.6, country: "USA" },
  
  // Medium Activity (10-20% of total events)
  "IL": { level: 'medium', multiplier: 0.4, country: "USA" },
  "WA": { level: 'medium', multiplier: 0.35, country: "USA" },
  "NV": { level: 'medium', multiplier: 0.3, country: "USA" },
  "AZ": { level: 'medium', multiplier: 0.3, country: "USA" },
  "GA": { level: 'medium', multiplier: 0.25, country: "USA" },
  "NC": { level: 'medium', multiplier: 0.25, country: "USA" },
  "VA": { level: 'medium', multiplier: 0.2, country: "USA" },
  "PA": { level: 'medium', multiplier: 0.2, country: "USA" },
  "OH": { level: 'medium', multiplier: 0.2, country: "USA" },
  "MI": { level: 'medium', multiplier: 0.2, country: "USA" },

  // Canada - High Activity
  "ON": { level: 'high', multiplier: 0.5, country: "CA" },
  "QC": { level: 'high', multiplier: 0.4, country: "CA" },
  "BC": { level: 'medium', multiplier: 0.3, country: "CA" },
  "AB": { level: 'medium', multiplier: 0.25, country: "CA" },
  
  // Add more Canadian provinces with lower activity
  "MB": { level: 'low', multiplier: 0.1, country: "CA" },
  "SK": { level: 'low', multiplier: 0.08, country: "CA" },
  "NS": { level: 'low', multiplier: 0.06, country: "CA" },
  "NB": { level: 'low', multiplier: 0.05, country: "CA" },
  
  // Low Activity (1-5% of total events) - remaining states
  "CO": { level: 'low', multiplier: 0.1, country: "USA" },
  "MA": { level: 'low', multiplier: 0.1, country: "USA" },
  "OR": { level: 'low', multiplier: 0.1, country: "USA" },
  "NJ": { level: 'low', multiplier: 0.1, country: "USA" },
  "MN": { level: 'low', multiplier: 0.08, country: "USA" },
  "MO": { level: 'low', multiplier: 0.08, country: "USA" },
  "IN": { level: 'low', multiplier: 0.08, country: "USA" },
  "TN": { level: 'low', multiplier: 0.08, country: "USA" },
  "WI": { level: 'low', multiplier: 0.08, country: "USA" },
  "MD": { level: 'low', multiplier: 0.08, country: "USA" },
  "CT": { level: 'low', multiplier: 0.06, country: "USA" },
  "SC": { level: 'low', multiplier: 0.06, country: "USA" },
  "AL": { level: 'low', multiplier: 0.06, country: "USA" },
  "LA": { level: 'low', multiplier: 0.06, country: "USA" },
  "KY": { level: 'low', multiplier: 0.06, country: "USA" },
  "OK": { level: 'low', multiplier: 0.06, country: "USA" },
  "IA": { level: 'low', multiplier: 0.04, country: "USA" },
  "UT": { level: 'low', multiplier: 0.04, country: "USA" },
  "KS": { level: 'low', multiplier: 0.04, country: "USA" },
  "AR": { level: 'low', multiplier: 0.04, country: "USA" },
  "MS": { level: 'low', multiplier: 0.04, country: "USA" },
  "NE": { level: 'low', multiplier: 0.04, country: "USA" },
  "NM": { level: 'low', multiplier: 0.04, country: "USA" },
  "WV": { level: 'low', multiplier: 0.02, country: "USA" },
  "HI": { level: 'low', multiplier: 0.02, country: "USA" },
  "NH": { level: 'low', multiplier: 0.02, country: "USA" },
  "ME": { level: 'low', multiplier: 0.02, country: "USA" },
  "RI": { level: 'low', multiplier: 0.02, country: "USA" },
  "MT": { level: 'low', multiplier: 0.02, country: "USA" },
  "DE": { level: 'low', multiplier: 0.02, country: "USA" },
  "SD": { level: 'low', multiplier: 0.01, country: "USA" },
  "ND": { level: 'low', multiplier: 0.01, country: "USA" },
  "AK": { level: 'low', multiplier: 0.01, country: "USA" },
  "VT": { level: 'low', multiplier: 0.01, country: "USA" },
  "WY": { level: 'low', multiplier: 0.01, country: "USA" },
  "ID": { level: 'low', multiplier: 0.01, country: "USA" },
};

// Generate random user IDs
const generateUserId = () => `user_${Math.random().toString(36).substr(2, 9)}`;

// Get event types for Sephora stores
const getEventTypesForStore = () => {
  return sephoraEventTypes;
};

// Get platform distribution (roughly 60% iOS, 40% Android)
const getRandomPlatform = () => {
  return Math.random() < 0.6 ? "ios" : "android";
};

// Get country based on state/province code
const getCountryFromRegion = (region: string): string => {
  return regionActivityLevels[region]?.country || "USA";
};

// Export the generate function so it can be used directly
export const generateMockData = (startDate: string, endDate: string): StoreModeRow[] => {
  const data: StoreModeRow[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Generate data for each day in the range
  for (let day = 0; day < daysDiff; day++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + day);
    const dateStr = currentDate.toISOString().split('T')[0];

    // Base events per day - will be multiplied by region multiplier
    const baseEventsPerDay = 200;

    // Generate events for each region based on activity level
    Object.keys(regionActivityLevels).forEach(region => {
      const activity = regionActivityLevels[region];
      const regionEvents = Math.floor(baseEventsPerDay * activity.multiplier);
      
      // Get stores in this region
      const regionStores = mockStores.filter(store => store.state === region);
      
      if (regionStores.length === 0) return;

      for (let i = 0; i < regionEvents; i++) {
        const store = regionStores[Math.floor(Math.random() * regionStores.length)];
        const eventTypes = getEventTypesForStore();
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const count = Math.floor(Math.random() * 3) + 1; // 1-3 events per row
        const platform = getRandomPlatform();
        const country = getCountryFromRegion(region);

        data.push({
          event_date: dateStr,
          event_type: eventType,
          store_type: store.store_type,
          user_id: generateUserId(),
          store_id: store.store_id,
          count: count,
          state: store.state,
          country: country,
          platform: platform
        });
      }
    });
  }

  return data;
};

export const useMockStoreModeData = () => {
  // This hook is now just a wrapper - not used in the main flow
  return {
    generateMockData
  };
};