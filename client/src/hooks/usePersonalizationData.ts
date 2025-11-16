/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import type { PersonalizationData } from "../types";
import {filterBannersByDate} from "../mock/purchase";

export const usePersonalizationData = () => {
  const [data, setData] = useState<PersonalizationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<
    { current: number; total: number; currentChunk: string } | undefined
  >();

  const disableLiveCall = true;

  const fetchData = useCallback(async (date: string) => {
    if (!date) {
      setError("Date is required");
      return;
    }

    setIsLoading(true);
    setError(null);
    setData([]);

    try {
      if(!disableLiveCall) {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
        
        console.log(`Fetching personalization data for date: ${date}`);
  
        const response = await fetch(
          `${baseUrl}/api/personalization-data?date=${date}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
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
  
        console.log('responseData===', responseData);
  
        if (!Array.isArray(responseData)) {
          console.warn("Expected array data but received:", responseData);
          responseData = [];
        }
  
        console.log('responseData===', responseData);
  
        const validatedData = responseData
          .map((item: any) => {
            try {
              const parentSid = item.child_sid || item.parentSid || "";
              const contentType = item.content_type || item.contentType || "unknown";
              const platform = item.platform ? String(item.platform) : "unknown";
              const purchaseCount = Number(item.purchase_count || item.purchaseCount || item.count || 0);
              const image_data = item.image_data;
              const unit_price = Number(item.unit_price || 0);
              const total_price = Number(item.total_price || purchaseCount * unit_price);

              return {
                child_sid: String(parentSid),
                content_type: String(contentType),
                platform,
                purchase_count: purchaseCount,
                image_data,
                unit_price,
                total_price
              };
            } catch (error) {
              console.warn(`Invalid data item:`, item, error);
              return null;
            }
          })
          .filter(
            (item: PersonalizationData | null): item is PersonalizationData =>
              item !== null &&
              item.child_sid !== "" &&
              item.content_type !== "" &&
              !isNaN(item.purchase_count)
          );
  
        console.log(`Personalization data fetched: ${validatedData.length} records`);
        setData(validatedData);

      } else {
        const validatedData = filterBannersByDate(date).map((item: any) => ({
          ...item,
          image_data: item.image_data === null ? undefined : item.image_data
        }));
        console.log(`Personalization data fetched else condition: ${validatedData.length} records`);
        setData(validatedData);
      }
      
    } catch (err: any) {
      console.error("Personalization data fetch error:", err);

      let errorMessage = "Failed to fetch personalization data";
      if (err.message) {
        errorMessage = err.message;
      } else if (err instanceof TypeError) {
        errorMessage = "Network error - please check your connection";
      }

      setError(errorMessage);
      setData([]);
    } finally {
      setIsLoading(false);
      setProgress(undefined);
    }
  }, [disableLiveCall]);

  return {
    data,
    isLoading,
    error,
    fetchData,
    progress,
  };
};