/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import type { HistoricalData, UseHistoricalDataReturn } from "../types";

// Mock data import
import historicalData from "../mock/historical.json";

export const useHistoricalData = (): UseHistoricalDataReturn => {
  const [data, setData] = useState<HistoricalData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<
    { current: number; total: number; currentChunk: string } | undefined
  >();

  // Split date range into chunks (7 days per chunk)
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
    signal: AbortSignal
  ): Promise<HistoricalData[]> => {
    const baseUrl =
      import.meta.env.VITE_API_BASE_URL;

    const response = await fetch(
      `${baseUrl}/api/historical-data?startDate=${startDate}&endDate=${endDate}`,
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

    // Transform and validate the data
    const validatedData = responseData
      .map((item: any) => {
        try {
          const eventDate =
            item.event_date || item.date || item.eventDate || "";
          const eventType =
            item.sotType ||
            item.type ||
            item.event_type ||
            item.eventType ||
            "unknown";
          const platform = item.platform ? String(item.platform) : undefined;
          const count = Number(
            item.cnt || item.count || item.value || item.total || 0
          );

          return {
            event_date: String(eventDate),
            sotType: String(eventType),
            platform,
            cnt: count,
          };
        } catch (error) {
          console.warn(`Invalid data item:${error}`, item);
          return null;
        }
      })
      .filter(
        (item : HistoricalData | null) =>
          item !== null &&
          item.event_date !== "" &&
          item.sotType !== "" &&
          !isNaN(item.cnt)
      );

    return validatedData;
  };

  const fetchMockData = async (startDate: string, endDate: string): Promise<HistoricalData[]> => {
    console.log("Using mock historical data from JSON file");
    
    // Filter mock data based on date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const filteredData = historicalData?.data.filter((item: any) => {
      const itemDate = new Date(
        item.event_date || item.date || item.eventDate || ""
      );
      return itemDate >= start && itemDate <= end;
    });

    // Transform and validate the data (same logic as fetchDataChunk)
    const validatedData = filteredData
      .map((item: any) => {
        try {
          const eventDate =
            item.event_date || item.date || item.eventDate || "";
          const eventType =
            item.sotType ||
            item.type ||
            item.event_type ||
            item.eventType ||
            "unknown";
          const platform = item.platform ? String(item.platform) : undefined;
          const count = Number(
            item.cnt || item.count || item.value || item.total || 0
          );

          return {
            event_date: String(eventDate),
            sotType: String(eventType),
            platform,
            cnt: count,
          };
        } catch (error) {
          console.warn(`Invalid data item:${error}`, item);
          return null;
        }
      })
      .filter(
        (item: HistoricalData | null): item is HistoricalData =>
          item !== null &&
          item.event_date !== "" &&
          item.sotType !== "" &&
          !isNaN(item.cnt)
      );

    return validatedData;
  };

  const fetchData = useCallback(async (startDate: string, endDate: string) => {
    if (!startDate || !endDate) {
      setError("Start date and end date are required");
      return;
    }

    // Validate date range
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
      // Check if we should use mock data
      const useMockData = import.meta.env.VITE_APP_USE_MOCK_DATA === "true";

      if (useMockData) {
        console.log("Using mock data for historical data");
        const mockData = await fetchMockData(startDate, endDate);
        
        if (mockData.length === 0) {
          console.warn(
            "No mock historical data found for the selected date range"
          );
          setError("No data available for the selected date range");
        }

        setData(mockData);
        setProgress(undefined);
      } else {
        // Original API fetching logic
        const chunks = splitDateRange(startDate, endDate, 7); // 7 days per chunk
        console.log(
          `Fetching historical data in ${chunks.length} chunks:`,
          chunks
        );

        const controller = new AbortController();
        const allData: HistoricalData[] = [];

        // Process chunks sequentially to avoid overwhelming the server
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];

          // Update progress
          setProgress({
            current: i + 1,
            total: chunks.length,
            currentChunk: `${chunk.start} to ${chunk.end}`,
          });

          console.log(
            `Fetching chunk ${i + 1}/${chunks.length}: ${chunk.start} to ${
              chunk.end
            }`
          );

          try {
            const chunkData = await fetchDataChunk(
              chunk.start,
              chunk.end,
              controller.signal
            );
            allData.push(...chunkData);
            console.log(
              `Chunk ${i + 1} completed: ${chunkData.length} records`
            );

            // Small delay between chunks to be nice to the server
            if (i < chunks.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          } catch (chunkError: any) {
            console.error(`Chunk ${i + 1} failed:`, chunkError);

            // If any chunk fails, stop the entire process
            if (chunkError.name === "AbortError") {
              throw new Error(
                `Request timeout while fetching data for ${chunk.start} to ${chunk.end}`
              );
            } else {
              throw new Error(
                `Failed to fetch data for ${chunk.start} to ${chunk.end}: ${chunkError.message}`
              );
            }
          }
        }

        console.log(`All chunks completed. Total records: ${allData.length}`);

        // Remove duplicates (in case of overlapping chunks)
        const uniqueData = allData.reduce((acc: HistoricalData[], current) => {
          const isDuplicate = acc.find(
            (item) =>
              item.event_date === current.event_date &&
              item.sotType === current.sotType &&
              item.platform === current.platform
          );
          if (!isDuplicate) {
            acc.push(current);
          }
          return acc;
        }, []);

        console.log(`After deduplication: ${uniqueData.length} records`);

        if (uniqueData.length === 0) {
          console.warn(
            "No valid historical data found for the selected date range"
          );
          setError("No data available for the selected date range");
        }

        setData(uniqueData);
        setProgress(undefined);
      }
    } catch (err: any) {
      console.error("Historical data fetch error:", err);

      let errorMessage = "Failed to fetch historical data";
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
  };
};