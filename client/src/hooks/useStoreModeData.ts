/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import type { StoreModeRow } from "../types";

// Progress type to match what's used in the component
type ProgressState = {
  current: number;
  total: number;
  currentChunk?: string;
} | null;

export const useStoreModeData = () => {
  const [data, setData] = useState<StoreModeRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressState>(null);

  const fetchData = useCallback(
    async (startDate: string, endDate: string) => {
      const useMockData = import.meta.env.VITE_APP_USE_MOCK_DATA === "true";

      setIsLoading(true);
      setError(null);
      setProgress(null);

      try {
        if (useMockData) {
          // Use inline mock data generation instead of separate hook
          const { generateMockData } = await import("../hooks/useMockStoreModeData");
          
          // Simulate progress
          for (let i = 1; i <= 5; i++) {
            await new Promise(resolve => setTimeout(resolve, 400));
            setProgress({ 
              current: i, 
              total: 5, 
              currentChunk: `Processing data chunk ${i} of 5` 
            });
          }

          const mockData = generateMockData(startDate, endDate);
          setData(mockData);
          setProgress(null);
          
          console.log('Mock data loaded:', {
            totalEvents: mockData.reduce((sum, row) => sum + row.count, 0),
            totalRows: mockData.length,
            dateRange: `${startDate} to ${endDate}`
          });
          
          return;
        }

        // Real API call
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
        const response = await fetch(
          `${baseUrl}/api/store-mode-data?startDate=${encodeURIComponent(
            startDate
          )}&endDate=${encodeURIComponent(endDate)}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch store mode data: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.error || "Failed to fetch store mode data");
        }
      } catch (err: any) {
        console.error("Error fetching store mode data:", err);
        setError(err.message || "An error occurred while fetching data");
      } finally {
        setIsLoading(false);
        setProgress(null);
      }
    },
    []
  );

  return {
    data,
    isLoading,
    error,
    fetchData,
    progress,
  };
};