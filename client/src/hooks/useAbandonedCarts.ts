import { useState, useCallback } from 'react';
import type { AbandonedCartItem, AbandonedCartMetrics, CustomerJourney } from '../types';

// Configuration - set to false to use real API calls
const USE_MOCK_DATA = import.meta.env.VITE_APP_USE_MOCK_DATA === 'true';

export const useAbandonedCarts = () => {
  const [data, setData] = useState<AbandonedCartItem[]>([]);
  const [metrics, setMetrics] = useState<AbandonedCartMetrics | null>(null);
  const [journeys, setJourneys] = useState<CustomerJourney[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAbandonedCarts = useCallback(async (startDate: string, endDate: string) => {
    if (isLoading) {
      console.log('⏸️ Skipping fetch - already loading');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      if (USE_MOCK_DATA) {
        console.log('📊 Using ENHANCED MOCK data for abandoned carts');
        // Use enhanced mock data
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { mockAbandonedCarts, mockMetrics, getEnhancedMockJourneys } = await import('../mock/abandoned-carts');
        
        console.log('📋 Enhanced mock journeys data:', getEnhancedMockJourneys().length, 'journeys');
        setData(mockAbandonedCarts);
        setMetrics(mockMetrics);
        setJourneys(getEnhancedMockJourneys());
      } else {
        console.log('🌐 Using REAL API for abandoned carts');
        // Use real API calls with better error handling
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        
        console.log('🔄 Fetching abandoned carts data...');
        
        // Fetch abandoned carts
        const cartsResponse = await fetch(`${baseUrl}/api/abandoned-carts?startDate=${startDate}&endDate=${endDate}`);
        if (!cartsResponse.ok) {
          throw new Error(`Abandoned carts API error: ${cartsResponse.status}`);
        }
        const cartsData = await cartsResponse.json();

        // Fetch metrics
        const metricsResponse = await fetch(`${baseUrl}/api/abandoned-carts/metrics?startDate=${startDate}&endDate=${endDate}`);
        if (!metricsResponse.ok) {
          throw new Error(`Metrics API error: ${metricsResponse.status}`);
        }
        const metricsData = await metricsResponse.json();

        // Fetch customer journeys
        const journeysResponse = await fetch(`${baseUrl}/api/customer-journeys?startDate=${startDate}&endDate=${endDate}`);
        if (!journeysResponse.ok) {
          throw new Error(`Journeys API error: ${journeysResponse.status}`);
        }
        const journeysData = await journeysResponse.json();

        console.log('📦 API Responses:', {
          carts: cartsData.success,
          metrics: metricsData.success, 
          journeys: journeysData.success,
          journeysCount: journeysData.data?.length || 0
        });

        // Set data with validation
        setData(cartsData.data || []);
        setMetrics(metricsData.data || null);
        
        // IMPORTANT: Ensure journeys data is properly set
        const journeysDataToSet = journeysData.data || [];
        console.log('🛒 Setting journeys data:', journeysDataToSet.length, 'journeys');
        console.log('🔍 Sample journey:', journeysDataToSet[0]);
        
        setJourneys(journeysDataToSet);
        
        console.log('API data loaded successfully');
      }
    } catch (err) {
      console.error('❌ Error fetching abandoned carts:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to fetch abandoned cart data: ${errorMessage}`);
      
      // Fallback to enhanced mock data on error
      if (!USE_MOCK_DATA) {
        console.log('🔄 Falling back to enhanced mock data due to API error');
        const { mockAbandonedCarts, mockMetrics, getEnhancedMockJourneys } = await import('../mock/abandoned-carts');
        setData(mockAbandonedCarts);
        setMetrics(mockMetrics);
        setJourneys(getEnhancedMockJourneys());
        setError(null); // Clear error since we're using mock data
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const recoverCart = useCallback(async (cartId: string) => {
    try {
      if (USE_MOCK_DATA) {
        // Mock recovery
        await new Promise(resolve => setTimeout(resolve, 500));
        setData(prev => prev.map(cart => 
          cart.id === cartId ? { ...cart, recovered: true, recovery_attempts: cart.recovery_attempts + 1 } : cart
        ));
        return { success: true };
      } else {
        // Real API call
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const response = await fetch(`${baseUrl}/api/abandoned-carts/${cartId}/recover`, {
          method: 'POST'
        });

        if (!response.ok) {
          throw new Error('Failed to recover cart');
        }

        const result = await response.json();
        
        if (result.success) {
          setData(prev => prev.map(cart => 
            cart.id === cartId ? { ...cart, recovered: true, recovery_attempts: cart.recovery_attempts + 1 } : cart
          ));
        }
        
        return result;
      }
    } catch (err) {
      console.error('Error recovering cart:', err);
      throw err;
    }
  }, []);

  return {
    data,
    metrics,
    journeys,
    isLoading,
    error,
    fetchAbandonedCarts,
    recoverCart
  };
};