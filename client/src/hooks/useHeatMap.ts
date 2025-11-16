import { useState, useCallback } from "react";
import type {
  HeatMapData,
  HeatMapAggregate,
  PurchaseJourneyData,
  JourneyFunnelData,
} from "../types";

// Mock imports (used only if USE_MOCK_DATA = true)
import { mockPurchaseJourneyData } from "../mock/purchase-journey-data";
import { mockJourneyFunnelData } from "../mock/journey-funnel-data";
import { mockHeatMapData } from "../mock/heatmap-data";

const USE_MOCK_DATA =
  import.meta.env.VITE_APP_USE_MOCK_DATA === "true";

type AnalysisType = "basic" | "purchase-journey" | "journey-funnel";

export const useHeatMap = () => {
  const [heatMapData, setHeatMapData] = useState<HeatMapData[]>([]);
  const [purchaseJourneyData, setPurchaseJourneyData] =
    useState<PurchaseJourneyData | null>(null);
  const [journeyFunnelData, setJourneyFunnelData] =
    useState<JourneyFunnelData | null>(null);
  const [aggregateData, setAggregateData] =
    useState<HeatMapAggregate | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchHeatMapData = useCallback(
    async (
      startDate: string,
      endDate: string,
      pageUrl?: string,
      analysisType: AnalysisType = "basic"
    ) => {
      if (isLoading) {
        console.log("⏳ Skipping heatmap fetch - already loading");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        if (USE_MOCK_DATA) {
          console.log("🔮 Using MOCK data for heatmap");
          await new Promise((r) => setTimeout(r, 800));

          switch (analysisType) {
            case "purchase-journey":
              setPurchaseJourneyData({
                ...mockPurchaseJourneyData,
                successful_journey: mockPurchaseJourneyData.successful_journey,
                abandoned_journey: mockPurchaseJourneyData.abandoned_journey,
                element_analysis: [],
                insights: [],
                page_analysis: [],
              });
              break;

            case "journey-funnel":
              setJourneyFunnelData(mockJourneyFunnelData);
              break;

            case "basic":
            default:
              setHeatMapData(mockHeatMapData.sessions);
              setAggregateData(mockHeatMapData.aggregate);
              break;
          }

          return;
        }
        console.log("Using REAL API for enhanced heatmap");

        const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

        const params = new URLSearchParams({
          startDate,
          endDate,
          analysisType,
        });

        if (pageUrl) {
          // Do NOT double-encode
          params.append("pageUrl", pageUrl);
        }

        const url = `${baseUrl}/api/heatmap?${params.toString()}`;
        console.log("Fetching enhanced heatmap from:", url);

        const response = await fetch(url, {
          signal: AbortSignal.timeout(12000), // 12-second timeout
        });

        if (!response.ok) {
          let errorDetail = "";

          try {
            const errJson = await response.json();
            errorDetail =
              errJson?.error || errJson?.message || JSON.stringify(errJson);
          } catch {
            errorDetail = await response.text();
          }

          console.error("API Error", {
            status: response.status,
            text: response.statusText,
            detail: errorDetail,
          });

          throw new Error(
            `API error ${response.status}: ${errorDetail.slice(0, 120)}`
          );
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "API returned an error response");
        }

        // Assign response data by analysis type
        switch (analysisType) {
          case "purchase-journey":
            setPurchaseJourneyData(data.data);
            break;

          case "journey-funnel":
            setJourneyFunnelData(data.data);
            break;

          case "basic":
          default:
            setHeatMapData(data.data?.sessions ?? []);
            setAggregateData(data.data?.aggregate ?? null);
            break;
        }

        console.log("Enhanced heatmap data loaded successfully");
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Unknown error occurred";

        setError(`Failed to fetch enhanced heat map data: ${msg}`);
        console.error("❌ Heatmap fetch error:", err);
        if (!USE_MOCK_DATA) {
          console.log("🔄 Falling back to mock data due to API error…");

          try {
            switch (analysisType) {
              case "purchase-journey": {
                const fallback = await import("../mock/purchase-journey-data");
                setPurchaseJourneyData(fallback.mockPurchaseJourneyData);
                break;
              }
              case "journey-funnel": {
                const fallback = await import("../mock/journey-funnel-data");
                setJourneyFunnelData(fallback.mockJourneyFunnelData);
                break;
              }
              case "basic":
              default: {
                const fallback = await import("../mock/heatmap-data");
                setHeatMapData(fallback.mockHeatMapData.sessions);
                setAggregateData(fallback.mockHeatMapData.aggregate);
                break;
              }
            }

            setError(`API unavailable. Using demo data: ${msg}`);
          } catch (fallbackErr) {
            console.error("❌ Failed to load fallback mock data:", fallbackErr);
            setError(`API error and no mock fallback available: ${msg}`);
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );
  const fetchPurchaseJourneyData = useCallback(
    async (startDate: string, endDate: string, pageUrl?: string) => {
      return fetchHeatMapData(startDate, endDate, pageUrl, "purchase-journey");
    },
    [fetchHeatMapData]
  );

  const fetchJourneyFunnelData = useCallback(
    async (startDate: string, endDate: string) => {
      return fetchHeatMapData(startDate, endDate, undefined, "journey-funnel");
    },
    [fetchHeatMapData]
  );
  return {
    heatMapData,
    aggregateData,

    purchaseJourneyData,
    journeyFunnelData,

    isLoading,
    error,

    fetchHeatMapData,
    fetchPurchaseJourneyData,
    fetchJourneyFunnelData,
  };
};
