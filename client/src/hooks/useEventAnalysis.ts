/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import type { EventAnalysisData, AvailableEventsResponse } from "../types";

// Mock data import
import stagEvents from "../mock/stagEvents.json"

export const useEventAnalysis = () => {
  const [data, setData] = useState<EventAnalysisData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableEvents, setAvailableEvents] = useState<string[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
  const [progress, setProgress] = useState<
    { current: number; total: number; currentChunk: string } | undefined
  >();

  // Fetch available events and platforms
  const fetchAvailableOptions = useCallback(async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
      
      const response = await fetch(
        `${baseUrl}/api/available-events-platforms`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result: AvailableEventsResponse = await response.json();
        setAvailableEvents(result.events || []);
        setAvailablePlatforms(result.platforms || []);
      } else {
        // Fallback to mock data or default values
        console.log("Using mock available events and platforms");
        const mockEvents = Array.from(new Set(stagEvents?.data.map((item: any) => 
          item.sotType || item.event_type || "unknown"
        ))).filter(Boolean);
        
        const mockPlatforms = Array.from(new Set(stagEvents?.data.map((item: any) => 
          item.platform || "unknown"
        ))).filter(Boolean);
        
        setAvailableEvents(mockEvents);
        setAvailablePlatforms(mockPlatforms);
      }
    } catch (error) {
      console.error("Failed to fetch available options:", error);
      // Set default options
      setAvailableEvents(['page_view', 'purchase', 'add_to_basket', 'remove_from_basket']);
      setAvailablePlatforms(['desktop_web', 'mobile_web', 'tablet_web', 'iphone_app', 'android_app']);
    }
  }, []);

  const splitDateRange = (
    startDate: string,
    endDate: string,
    chunkSize: number = 7
  ) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const chunks = [];

    const currentStart = new Date(start);

    while (currentStart <= end) {
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + chunkSize - 1);

      if (currentEnd > end) {
        currentEnd.setTime(end.getTime());
      }

      chunks.push({
        start: currentStart.toISOString().split("T")[0],
        end: currentEnd.toISOString().split("T")[0],
      });

      currentStart.setDate(currentStart.getDate() + chunkSize);
    }

    return chunks;
  };

  const fetchDataChunk = async (
    startDate: string,
    endDate: string,
    selectedEvents: string[],
    selectedPlatforms: string[],
    signal: AbortSignal
  ): Promise<EventAnalysisData[]> => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

    const eventTypesParam = selectedEvents.map(event => `eventType=${encodeURIComponent(event)}`).join('&');
    const platformsParam = selectedPlatforms.map(platform => `platform=${encodeURIComponent(platform)}`).join('&');
    
    const response = await fetch(
      `${baseUrl}/api/event-analysis-data?startDate=${startDate}&endDate=${endDate}&${eventTypesParam}&${platformsParam}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP error: ${response.status}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();
    let responseData = result.data || result || [];

    if (!Array.isArray(responseData)) {
      console.warn("Expected array data but received:", responseData);
      responseData = [];
    }

    // Transform data for event analysis
    const validatedData = responseData
      .map((item: any) => {
        try {
          const eventDate = item.event_date || item.date || item.eventDate || "";
          const eventType = item.sotType || item.type || item.event_type || item.eventType || "unknown";
          const platform = item.platform ? String(item.platform) : "unknown";
          const count = Number(item.cnt || item.count || item.value || item.total || 0);

          return {
            event_date: String(eventDate),
            event_type: String(eventType),
            platform: platform,
            count: count,
          };
        } catch (error) {
          console.warn(`Invalid data item:${error}`, item);
          return null;
        }
      })
      .filter(
        (item: EventAnalysisData | null): item is EventAnalysisData =>
          item !== null &&
          item.event_date !== "" &&
          item.event_type !== "" &&
          !isNaN(item.count)
      );

    return validatedData;
  };

 const fetchMockData = async (
  startDate: string, 
  endDate: string, 
  selectedEvents: string[], 
  selectedPlatforms: string[]
): Promise<EventAnalysisData[]> => {
  console.log("Using mock event analysis data from JSON file");
  
  const start = new Date(startDate);
  const end = new Date(endDate);

  const eventTypesList = selectedEvents.map(event => `'${event.replace(/_/g, ' ')}'`).join(", ");
  const platformsList = selectedPlatforms.map(platform => `'${platform.replace(/_/g, ' ')}'`).join(", ");
  
  const filteredData = stagEvents?.data.filter((item: any) => {
    const itemDateStr = item.event_date || item.date || item.eventDate || "";
    const itemDate = new Date(itemDateStr);
    
    // Extract just the date part for comparison (YYYY-MM-DD)
    const itemDateOnly = itemDate.toISOString().split('T')[0];
    const startDateOnly = start.toISOString().split('T')[0];
    const endDateOnly = end.toISOString().split('T')[0];
    
    const eventType = item.sotType || item.event_type || "unknown";
    const platform = item.platform || "unknown";
    
    const isInDateRange = itemDateOnly >= startDateOnly && itemDateOnly <= endDateOnly;
    const isSelectedEvent = eventTypesList.includes('all') || eventTypesList.includes(eventType);
    const isSelectedPlatform = platformsList.includes('all') || platformsList.includes(platform);
    
    return isInDateRange && isSelectedEvent && isSelectedPlatform;
  });

  const validatedData = filteredData
    .map((item: any) => {
      try {
        const eventDate = item.event_date || item.date || item.eventDate || "";
        const eventType = item.sotType || item.type || item.event_type || item.eventType || "unknown";
        const platform = item.platform ? String(item.platform) : "unknown";
        const count = Number(item.cnt || item.count || item.value || item.total || 0);

        return {
          event_date: String(eventDate),
          event_type: String(eventType),
          platform: platform,
          count: count,
        };
      } catch (error) {
        console.warn(`Invalid data item:${error}`, item);
        return null;
      }
    })
    .filter(
      (item: EventAnalysisData | null): item is EventAnalysisData =>
        item !== null &&
        item.event_date !== "" &&
        item.event_type !== "" &&
        !isNaN(item.count)
    );

  return validatedData;
};

  const fetchData = useCallback(async (
    startDate: string, 
    endDate: string, 
    selectedEvents: string[], 
    selectedPlatforms: string[]
  ) => {
    if (!startDate || !endDate) {
      setError("Start date and end date are required");
      return;
    }

    if (selectedEvents.length === 0) {
      setError("At least one event type must be selected");
      return;
    }

    if (selectedPlatforms.length === 0) {
      setError("At least one platform must be selected");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      setError("Start date cannot be after end date");
      return;
    }

    setIsLoading(true);
    setError(null);
    setData([]);

    try {
      const useMockData = import.meta.env.VITE_APP_USE_MOCK_DATA === "true";

      if (useMockData) {
        console.log("Using mock data for event analysis");
        const mockData = await fetchMockData(startDate, endDate, selectedEvents, selectedPlatforms);
        
        if (mockData.length === 0) {
          console.warn("No mock data found for the selected criteria");
          setError("No data available for the selected criteria");
        }

        setData(mockData);
        setProgress(undefined);
      } else {
        const chunks = splitDateRange(startDate, endDate, 7);
        console.log(`Fetching event analysis data in ${chunks.length} chunks:`, chunks);

        const controller = new AbortController();
        const allData: EventAnalysisData[] = [];

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];

          setProgress({
            current: i + 1,
            total: chunks.length,
            currentChunk: `${chunk.start} to ${chunk.end}`,
          });

          console.log(`Fetching chunk ${i + 1}/${chunks.length}: ${chunk.start} to ${chunk.end}`);

          try {
            const chunkData = await fetchDataChunk(
              chunk.start,
              chunk.end,
              selectedEvents,
              selectedPlatforms,
              controller.signal
            );
            allData.push(...chunkData);
            console.log(`Chunk ${i + 1} completed: ${chunkData.length} records`);

            if (i < chunks.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          } catch (chunkError: any) {
            console.error(`Chunk ${i + 1} failed:`, chunkError);

            if (chunkError.name === "AbortError") {
              throw new Error(`Request timeout while fetching data for ${chunk.start} to ${chunk.end}`);
            } else {
              throw new Error(`Failed to fetch data for ${chunk.start} to ${chunk.end}: ${chunkError.message}`);
            }
          }
        }

        console.log(`All chunks completed. Total records: ${allData.length}`);

        // Remove duplicates
        const uniqueData = allData.reduce((acc: EventAnalysisData[], current) => {
          const isDuplicate = acc.find(
            (item) =>
              item.event_date === current.event_date &&
              item.event_type === current.event_type &&
              item.platform === current.platform
          );
          if (!isDuplicate) {
            acc.push(current);
          }
          return acc;
        }, []);

        console.log(`After deduplication: ${uniqueData.length} records`);

        if (uniqueData.length === 0) {
          console.warn("No valid data found for the selected criteria");
          setError("No data available for the selected criteria");
        }

        setData(uniqueData);
        setProgress(undefined);
      }
    } catch (err: any) {
      console.error("Event analysis data fetch error:", err);

      let errorMessage = "Failed to fetch event analysis data";
      if (err.name === "AbortError") {
        errorMessage = "Request timeout - please try a smaller date range";
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err instanceof TypeError) {
        errorMessage = "Network error - please check your connection";
      }

      setError(errorMessage);
      setData([]);
      setProgress(undefined);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    data,
    isLoading,
    error,
    fetchData,
    progress,
    availableEvents,
    availablePlatforms,
    fetchAvailableOptions,
  };
};