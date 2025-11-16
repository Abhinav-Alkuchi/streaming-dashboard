/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  type SocketEventHandlers,
  type TabType,
} from "./SocketTypes";
import { getSocketManager } from "./SocketManager";
import type {
  DatabricksData,
  ConnectionStats,
  HistoricalDataResponse,
  UseDatabricksStreamReturn,
} from "../types";
 
// Constants
const TIMER_INTERVAL = 1000;
const MAX_EVENT_STREAM_SIZE = 100;
const DATA_REQUEST_DELAY = 100;

let lastMainDataUpdate = 0;

const STATIC_TABS = new Set([
  "historical",
  "purchase-analysis",
  "customer-journey",
  "store-mode",
  "generate-dashboard"
]);

export const useDatabricksStream = (): UseDatabricksStreamReturn => {

  // State management
  const [data, setData] = useState<DatabricksData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEventStreamLoading, setIsEventStreamLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [eventStreamLastUpdate, setEventStreamLastUpdate] =
    useState<Date | null>(null);
  const [connectionStats, setConnectionStats] =
    useState<ConnectionStats | null>(null);
  const [eventStreamData, setEventStreamData] = useState<DatabricksData[]>([]);
  const [timeSinceLastUpdate, setTimeSinceLastUpdate] = useState(0);
  const [currentTab, setCurrentTabState] = useState<TabType>("dashboard");

  // Refs for stable values
  const hasInitialDataRef = useRef(false);
  const updateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingDataRequestRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketManagerRef = useRef(getSocketManager());

  // Base URL
  const baseUrl = useMemo(
    () => import.meta.env.VITE_API_BASE_URL,
    []
  );

  // Computed values
  const isTodaySelected = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return selectedDate === today;
  }, [selectedDate]);

  const isLiveTab = useMemo(() => {
    return currentTab === "dashboard" || currentTab === "event-stream";
  }, [currentTab]);

  const connectionStatus = useMemo(() => {
    if (!isConnected && isLiveTab && isTodaySelected) {
      return "connecting";
    }
    if (isConnected && isTodaySelected) {
      return "connected";
    }
    return "historical";
  }, [isConnected, isLiveTab, isTodaySelected]);

  // Fetch historical data via API
  const fetchHistoricalData = useCallback(
    async (date: string) => {
      try {
        console.log(`Fetching historical data for: ${date}`);
        setIsLoading(true);
        setError(null);

        const response = await fetch(
          `${baseUrl}/api/previous-date-data?date=${date}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: HistoricalDataResponse = await response.json();
        console.log(
          `Received ${result.data.length} historical records for ${date}`
        );

        setData(result.data);
        setEventStreamData([]);
        setLastUpdate(new Date());
        setError(null);
        hasInitialDataRef.current = true;
      } catch (error) {
        console.error("Historical data fetch error:", error);
        setError(`Failed to fetch historical data: ${error}`);
        setData([]);
        setEventStreamData([]);
      } finally {
        setIsLoading(false);
      }
    },
    [baseUrl]
  );

  // Process data helper
  const normalizeData = useCallback((newData: any): DatabricksData[] => {
    if (Array.isArray(newData)) {
      return newData;
    }
    if (newData && typeof newData === "object") {
      if (Array.isArray(newData.data)) {
        return newData.data;
      }
      if (newData.data && typeof newData.data === "object") {
        return [newData.data];
      }
      return [newData];
    }
    return [];
  }, []);

  // Process main dashboard data
  const processMainData = useCallback(
    (newData: any) => {
      console.log("Processing MAIN DATA update");

      const processedData = normalizeData(newData);
      console.log(`Processed ${processedData.length} main records`);

      if (processedData.length === 0) {
        console.log("⚠️ No data received from server");
        setData([]);
        setIsLoading(false);
        setIsRefreshing(false);
        setError("No data available from server");
        return;
      }

      setData(processedData);
      lastMainDataUpdate = Date.now();
      setTimeSinceLastUpdate(0);

      if (!hasInitialDataRef.current) {
        setIsLoading(false);
        hasInitialDataRef.current = true;
      }

      setIsRefreshing(false);
      setLastUpdate(new Date());
      setError(null);
    },
    [normalizeData]
  );

  // Process event stream data
  const processEventStreamData = useCallback(
    (newData: any) => {
      console.log("Processing EVENT STREAM data");

      const processedData = normalizeData(newData);
      console.log(`Processed ${processedData.length} real-time events`);

      if (processedData.length > 0) {
        setEventStreamData((prev) => {
          const enhancedData = processedData.map((event) => ({
            ...event,
            _isNew: true,
            _receivedAt: new Date().toISOString(),
            _updateType: "incremental",
          }));

          // Deduplicate and limit size
          const combined = [...enhancedData, ...prev];
          const uniqueEvents = combined.reduce(
            (acc: DatabricksData[], current) => {
              const eventId =
                (current as any).id ||
                `${(current as any).type}-${(current as any).timestamp}-${(current as any).user}`;
              if (
                !acc.find(
                  (item) =>
                    ((item as any).id ||
                      `${(item as any).type}-${(item as any).timestamp}-${(item as any).user}`) ===
                    eventId
                )
              ) {
                acc.push(current);
              }
              return acc;
            },
            []
          );

          console.log(`Total unique events in stream: ${uniqueEvents.length}`);
          return uniqueEvents.slice(0, MAX_EVENT_STREAM_SIZE);
        });

        setEventStreamLastUpdate(new Date());
      }

      setIsEventStreamLoading(false);
    },
    [normalizeData]
  );

  // Request data for current tab with debouncing
  const requestTabData = useCallback(
    (tab: TabType, immediate = false) => {
      const socketManager = socketManagerRef.current;

      if (!socketManager.isConnected()) {
        console.log("⚠️ Cannot request data - socket not connected");
        return;
      }

      // Clear any pending requests
      if (pendingDataRequestRef.current) {
        clearTimeout(pendingDataRequestRef.current);
      }

      const executeRequest = () => {
        socketManager.requestTabData(tab);
      };

      if (immediate) {
        executeRequest();
      } else {
        pendingDataRequestRef.current = setTimeout(
          executeRequest,
          DATA_REQUEST_DELAY
        );
      }
    },
    []
  );

  // Socket event handlers
  const socketHandlers = useMemo<SocketEventHandlers>(
    () => ({
      onConnect: () => {
        console.log("Socket connected - updating state");
        setIsConnected(true);
        setError(null);

        // Request data for current tab after connection
        if (currentTab === "dashboard" || currentTab === "event-stream") {
          console.log(`Requesting initial data for ${currentTab} tab`);
          if (currentTab === "dashboard") setIsLoading(true);
          if (currentTab === "event-stream") setIsEventStreamLoading(true);
          requestTabData(currentTab);
        }
      },
      onDisconnect: (reason: string) => {
        console.log(`Socket disconnected - updating state: ${reason}`);
        setIsConnected(false);
      },
      onConnectError: (error: Error) => {
        console.error("Connection error - updating state");
        setIsConnected(false);
        setError(`Connection error: ${error.message}`);
      },
      onDatabricksData: (newData: any) => {
        processMainData(newData);
      },
      onEventStreamData: (newData: any) => {
        processEventStreamData(newData);
      },
      onError: (errorData: { message: string }) => {
        setError(errorData.message);
        setIsLoading(false);
        setIsRefreshing(false);
        setIsEventStreamLoading(false);
      },
      onDateChanged: (data: { date: string }) => {
        setSelectedDate(data.date);
        hasInitialDataRef.current = false;
        setIsLoading(true);
        setEventStreamData([]);
      },
      onServerStats: (stats: ConnectionStats) => {
        setConnectionStats(stats);
      },
    }),
    [currentTab, processMainData, processEventStreamData, requestTabData]
  );

  // Initialize socket manager
  useEffect(() => {
    const socketManager = socketManagerRef.current;
    socketManager.initialize(socketHandlers);
    socketManager.setCurrentTab(currentTab);

    return () => {
      // Cleanup on unmount
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
      }
      if (pendingDataRequestRef.current) {
        clearTimeout(pendingDataRequestRef.current);
      }
    };
  }, [currentTab, socketHandlers]);

  // Update handlers when they change
  useEffect(() => {
    socketManagerRef.current.updateHandlers(socketHandlers);
  }, [socketHandlers]);

  // Update current tab in socket manager
  useEffect(() => {
    socketManagerRef.current.setCurrentTab(currentTab);
  }, [currentTab]);

  // Refresh functions
  const refreshEventStream = useCallback(() => {
    const socketManager = socketManagerRef.current;
    if (socketManager.isConnected()) {
      console.log("Event stream refresh triggered");
      setIsEventStreamLoading(true);
      socketManager.refreshEventStream();
    } else {
      console.error("Cannot refresh event stream - not connected");
      setError("Not connected to server. Please check your connection.");
    }
  }, []);

  const refreshData = useCallback(() => {
    const socketManager = socketManagerRef.current;
    if (isTodaySelected && socketManager.isConnected()) {
      console.log("Main data refresh triggered");
      setIsRefreshing(true);
      socketManager.refreshDashboard();
    } else if (!isTodaySelected) {
      console.log("Refreshing historical data");
      setIsLoading(true);
      fetchHistoricalData(selectedDate);
    } else {
      console.error("Cannot refresh - not connected");
      setError("Not connected to server. Please check your connection.");
    }
  }, [isTodaySelected, selectedDate, fetchHistoricalData]);

  // Timer for tracking time since last update
  useEffect(() => {
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
    }

    if (isConnected && isTodaySelected && hasInitialDataRef.current) {
      console.log("Starting update timer");
      updateTimerRef.current = setInterval(() => {
        const now = Date.now();
        const timeSinceLast = Math.floor((now - lastMainDataUpdate) / 1000);
        setTimeSinceLastUpdate(timeSinceLast);
      }, TIMER_INTERVAL);
    }

    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
      }
    };
  }, [isConnected, isTodaySelected]);

  // Connect/disconnect helpers
  const connectSocket = useCallback(() => {
    console.log("🔌 Connecting socket for live view");
    socketManagerRef.current.connect();
  }, []);

  const disconnectSocket = useCallback(() => {
    console.log("🔌 Disconnecting socket");
    socketManagerRef.current.disconnect();
    setIsConnected(false);
  }, []);

  // Clear data for tab transitions
  const clearTabData = useCallback((tab: TabType) => {
    if (tab !== "event-stream") {
      setEventStreamData([]);
      setIsEventStreamLoading(false);
    }
    if (tab !== "dashboard") {
      setData([]);
      setIsLoading(false);
    }
  }, []);

  // Tab switching logic
  const setCurrentTab = useCallback(
    (tab: TabType) => {
      console.log(`Switching to ${tab} tab`);
      setCurrentTabState(tab);
      hasInitialDataRef.current = false;

      // Clear irrelevant data
      clearTabData(tab);

      // Notify server via socket manager
      const socketManager = socketManagerRef.current;
      if (socketManager.isConnected()) {
        socketManager.changeTab(tab);
      }

      const isStaticTab = STATIC_TABS.has(tab);

      if (isStaticTab) {
        // Static tabs - disconnect socket and fetch data via REST
        console.log(`${tab} tab - using REST API`);
        disconnectSocket();
        if (tab === "historical") {
          setIsLoading(true);
          fetchHistoricalData(selectedDate);
        }
      } else {
        // Live tabs - ensure socket connection
        console.log(`📡 ${tab} tab - using WebSocket`);
        if (isTodaySelected) {
          // Set loading state
          if (tab === "dashboard") setIsLoading(true);
          if (tab === "event-stream") setIsEventStreamLoading(true);

          if (!socketManager.isConnected()) {
            connectSocket();
          } else {
            requestTabData(tab);
          }
        } else {
          // Historical date on live tab
          setIsLoading(true);
          fetchHistoricalData(selectedDate);
        }
      }
    },
    [clearTabData, disconnectSocket, fetchHistoricalData, selectedDate, isTodaySelected, connectSocket, requestTabData]
  );

  // Initial connection effect
  useEffect(() => {
    if (!hasInitialDataRef.current) {
      if (isLiveTab) {
        if (isTodaySelected) {
          console.log("🚀 Initial load - connecting socket");
          connectSocket();
        } else {
          console.log("Initial load - fetching historical data");
          fetchHistoricalData(selectedDate);
        }
      } else if (currentTab === "historical") {
        fetchHistoricalData(selectedDate);
      }
    }
  }, [
    currentTab,
    isTodaySelected,
    selectedDate,
    isLiveTab,
    connectSocket,
    fetchHistoricalData,
  ]);

  // Date change effect
  useEffect(() => {
    const socketManager = socketManagerRef.current;

    if (socketManager.isConnected() && isConnected) {
      console.log("Changing date via socket:", selectedDate);
      setIsLoading(true);
      setIsEventStreamLoading(true);
      socketManager.changeDate(selectedDate);
    } else if (!isTodaySelected && isLiveTab) {
      console.log("Fetching historical data for date change");
      setIsLoading(true);
      fetchHistoricalData(selectedDate);
    } else if (isTodaySelected && isLiveTab && !isConnected) {
      console.log("Date changed to today - reconnecting");
      connectSocket();
    }
  }, [
    selectedDate,
    isConnected,
    isTodaySelected,
    isLiveTab,
    fetchHistoricalData,
    connectSocket,
  ]);

  // Utility functions
  const handleSetSelectedDate = useCallback((date: string) => {
    console.log("Setting selected date:", date);
    setSelectedDate(date);
  }, []);

  const preWarmConnection = useCallback(async () => {
    try {
      console.log("🔥 Pre-warming connection...");
      const response = await fetch(`${baseUrl}/api/pre-warm`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Pre-warm failed");
      console.log("Connection pre-warmed");
    } catch (error) {
      console.error("Pre-warm error:", error);
      setError(`Pre-warm failed: ${error}`);
      throw error;
    }
  }, [baseUrl]);

  const clearCache = useCallback(async () => {
    try {
      console.log("🧹 Clearing cache...");
      const response = await fetch(`${baseUrl}/api/cache`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Cache clear failed");
      console.log("Cache cleared");
      refreshData();
    } catch (error) {
      console.error("Cache clear error:", error);
      setError(`Cache clear failed: ${error}`);
      throw error;
    }
  }, [baseUrl, refreshData]);

  return {
    data,
    setData,
    error,
    isConnected,
    isLoading,
    isRefreshing,
    lastUpdate,
    selectedDate,
    setSelectedDate: handleSetSelectedDate,
    connectionStats,
    refreshData,
    refreshEventStream,
    preWarmConnection,
    clearCache,
    connectSocket,
    disconnectSocket,
    fetchHistoricalData,
    isTodaySelected,
    eventStreamData,
    isEventStreamLoading,
    timeSinceLastUpdate,
    eventStreamLastUpdate,
    currentTab,
    setCurrentTab,
    connectionStatus,
  };
};