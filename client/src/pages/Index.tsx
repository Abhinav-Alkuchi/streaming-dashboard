/* eslint-disable react-hooks/exhaustive-deps */
import { MetricCard } from "../components/util-components/MetricCard";
import { useDatabricksStream } from "../hooks/useDatabricksStream";
import {
  ShoppingCart,
  Heart,
  Eye,
  CreditCard,
  TrendingUp,
  Calendar,
  BarChart3,
  Plus,
  Minus,
  Radio,
  BadgeDollarSign,
  Users,
  Store,
  Menu,
  ChartNoAxesCombined
} from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import Dashboard from "../components/streaming-dashboard/Dashboard";
import {
  Tabs,
  Tab,
  Box,
  Chip,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { HistoricalDataTable } from "../components/sales-analysis-ai/HistoricalDataTable";
import { PersonalizationDataTable } from "../components/click-analysis/PersonalizationDataTable";
import { EnlargableChart } from "../components/util-components/EnlargableChart";
import { EventStream } from "../components/sephora-live/EventStream";
import { AbandonedCartDashboard } from "../components/customer-journey/AbandonedCartDashboard";
import { StoreModeDashboard } from "../components/omni-analysis/StoreModeDashboard";
import { getEnabledTabs, getTabByIndex } from "../constants";
import { EventAnalysisPage } from '../components/event-analysis/EventAnalysisPage';
import { StatsOverview } from '../components/util-components/StatsOverview';

// Icon mapping for dynamic rendering
const iconMap = {
  BarChart3,
  BadgeDollarSign,
  ChartNoAxesCombined,
  Radio,
  Users,
  Store,
};

const Index = () => {
  const {
    data: streamData,
    setData,
    error,
    isConnected,
    lastUpdate,
    selectedDate,
    setSelectedDate,
    connectionStats,
    isTodaySelected,
    eventStreamData,
    isEventStreamLoading,
    refreshEventStream,
    timeSinceLastUpdate,
    currentTab,
    setCurrentTab,
    connectionStatus,
  } = useDatabricksStream();

  const [activeTab, setActiveTab] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasInitialData, setHasInitialData] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  // Get only enabled tabs for rendering
  const enabledTabs = useMemo(() => getEnabledTabs(), []);

  // Map UI tab position to actual tab index
  const getActualTabIndex = (uiPosition: number): number => {
    return enabledTabs[uiPosition]?.index ?? 0;
  };

  // Map actual tab index to UI position
  const getUIPosition = (actualIndex: number): number => {
    return enabledTabs.findIndex(tab => tab.index === actualIndex);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setIsInitialLoad(true);
    setHasInitialData(false);
    setData([]);
  };

  const handleTabChange = useCallback(
    (_event: React.SyntheticEvent, newUIPosition: number) => {
      const newActualIndex = getActualTabIndex(newUIPosition);
      const newTab = getTabByIndex(newActualIndex);
      
      if (!newTab) return;

      console.log(`Tab changing from ${activeTab} to ${newActualIndex} (UI position: ${newUIPosition})`);

      setIsInitialLoad(true);
      setHasInitialData(false);

      setCurrentTab(newTab.id);
      setActiveTab(newActualIndex);

      if (newTab.id === "event-stream") {
        const today = new Date().toISOString().split("T")[0];
        if (selectedDate !== today) {
          setSelectedDate(today);
        }
      }

      if (newTab.id === "dashboard") {
        console.log("Switching to Operations Dashboard - preparing for data load");
        setData([]);
      }

      if (newTab.id === "purchase-analysis") {
        console.log("Purchase Analysis tab - socket should be disconnected");
      }

      if (!isDesktop) {
        setMobileDrawerOpen(false);
      }
    },
    [getActualTabIndex, activeTab, setCurrentTab, isDesktop, selectedDate, setSelectedDate, setData]
  );

  const handleMobileTabSelect = (newUIPosition: number) => {
    handleTabChange({} as React.SyntheticEvent, newUIPosition);
  };

  const toggleMobileDrawer = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  useEffect(() => {
    if (streamData && streamData.length > 0 && !hasInitialData) {
      setHasInitialData(true);
      setIsInitialLoad(false);
      console.log("Initial data loaded successfully");
    }
  }, [streamData, hasInitialData]);

  useEffect(() => {
    console.log(`Active tab is now: ${activeTab} (${currentTab})`);
    console.log(`Connection status: ${isConnected ? "Connected" : "Disconnected"}`);
    console.log(`Date: ${selectedDate}, Today: ${isTodaySelected}`);
    console.log(`Connection Status: ${connectionStatus}`);
  }, [activeTab, currentTab, isConnected, selectedDate, isTodaySelected, connectionStatus]);

  // Process metrics - with safe fallbacks
  const metrics = useMemo(() => {
    const defaultMetrics = {
      pageViews: 0,
      purchases: 0,
      addToBasket: 0,
      removeFromBasket: 0,
      loves: 0,
      unLoves: 0,
      cmsImpressions: 0,
      cmsClicks: 0,
      totalEvents: 0,
      basketConversion: 0,
      loveConversion: 0,
      purchaseRate: 0,
      netBasket: 0,
      netLoves: 0,
      revenue: 0,
    };

    if (!streamData || streamData.length === 0) {
      return defaultMetrics;
    }

    try {
      const dataArray = Array.isArray(streamData) ? streamData : [streamData];
      const flatData = dataArray
        .flatMap((item) => {
          if (item && typeof item === "object") {
            return item.data && Array.isArray(item.data) ? item.data : [item];
          }
          return [];
        })
        .filter(Boolean);

      const lookup: Record<string, number> = {};
      let revenue = 0;

      flatData.forEach((item) => {
        if (item && typeof item === "object") {
          const eventType = String(
            item.sotType || item.type || "unknown"
          ).toLowerCase();
          const count = Number(item.count || item.value || item.cnt || 0);
          lookup[eventType] = (lookup[eventType] || 0) + count;

          if (eventType === "purchase") {
            revenue += Number(item.revenue) || 0;
          }
        }
      });

      const pageViews = lookup["page view"] || 0;
      const purchases = lookup["purchase"] || 0;
      const addToBasket = lookup["add to basket"] || 0;
      const removeFromBasket = lookup["remove from basket"] || 0;
      const addToLoves = lookup["add to loves"] || 0;
      const unLove = lookup["un love"] || 0;
      const cmsImpressions = lookup["cms viewable impression"] || 0;
      const cmsClicks = lookup["cms component item click"] || 0;

      const totalEvents = Object.values(lookup).reduce(
        (sum, count) => sum + count,
        0
      );

      const basketConversion =
        pageViews > 0
          ? Math.max(0, ((addToBasket - removeFromBasket) / pageViews) * 100)
          : 0;

      const loveConversion =
        pageViews > 0
          ? Math.max(0, ((addToLoves - unLove) / pageViews) * 100)
          : 0;

      const purchaseRate = pageViews > 0 ? (purchases / pageViews) * 100 : 0;

      return {
        pageViews,
        purchases,
        addToBasket,
        removeFromBasket,
        loves: addToLoves,
        unLoves: unLove,
        cmsImpressions,
        cmsClicks,
        totalEvents,
        basketConversion,
        loveConversion,
        purchaseRate,
        netBasket: Math.max(0, addToBasket - removeFromBasket),
        netLoves: Math.max(0, addToLoves - unLove),
        revenue,
      };
    } catch (error) {
      console.error("Error processing metrics:", error);
      return defaultMetrics;
    }
  }, [streamData]);

  // Event Distribution for Pie Chart
  const eventDistributionData = useMemo(() => {
    if (!streamData || streamData.length === 0) return [];

    try {
      const dataArray = Array.isArray(streamData) ? streamData : [streamData];
      const flatData = dataArray
        .flatMap((item) =>
          item?.data && Array.isArray(item.data) ? item.data : [item]
        )
        .filter(Boolean);

      const distribution: Record<string, number> = {};
      flatData.forEach((item) => {
        if (item && typeof item === "object") {
          const eventType = String(
            item.sotType || item.type || "unknown"
          ).toLowerCase();
          const count = Number(item.count || item.value || item.cnt || 0);
          distribution[eventType] = (distribution[eventType] || 0) + count;
        }
      });

      return Object.entries(distribution)
        .map(([name, value]) => ({
          name: name.replace(/_/g, " ").toLowerCase(),
          value: value || 0,
        }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value);
    } catch (error) {
      console.error("Error processing event distribution:", error);
      return [];
    }
  }, [streamData]);

  // Conversion Funnel Data
  const conversionFunnelData = useMemo(() => {
    const data = [
      {
        name: "Page Views",
        value: metrics.pageViews || 0,
        fill: "hsl(var(--chart-1))",
      },
      {
        name: "Add to Basket",
        value: metrics.addToBasket || 0,
        fill: "#10B981",
      },
      {
        name: "Purchases",
        value: metrics.purchases || 0,
        fill: "#EF4444",
      },
    ].filter((item) => item.value > 0);

    return data.length > 0 ? data : [];
  }, [metrics]);

  // CMS Performance Data
  const cmsPerformanceData = useMemo(() => {
    if ((metrics.cmsImpressions || 0) === 0 && (metrics.cmsClicks || 0) === 0)
      return [];

    const ctr =
      (metrics.cmsImpressions || 0) > 0
        ? ((metrics.cmsClicks || 0) / (metrics.cmsImpressions || 1)) * 100
        : 0;

    return [
      {
        name: "Impressions",
        value: metrics.cmsImpressions || 0,
        type: "impressions",
      },
      { name: "Clicks", value: metrics.cmsClicks || 0, type: "clicks" },
      { name: "CTR", value: ctr, type: "rate" },
    ].filter((item) => item.value > 0);
  }, [metrics]);

  // Engagement Metrics
  const engagementData = useMemo(() => {
    const data = [
      {
        name: "Basket Adds",
        value: metrics.addToBasket || 0,
        type: "positive",
      },
      {
        name: "Basket Removes",
        value: metrics.removeFromBasket || 0,
        type: "negative",
      },
      { name: "Net Basket", value: metrics.netBasket || 0, type: "net" },
      { name: "Love Adds", value: metrics.loves || 0, type: "positive" },
      { name: "Love Removes", value: metrics.unLoves || 0, type: "negative" },
      { name: "Net Loves", value: metrics.netLoves || 0, type: "net" },
    ].filter((item) => Math.abs(item.value) > 0);

    return data.length > 0 ? data : [];
  }, [metrics]);

  // Performance Metrics
  const performanceData = useMemo(() => {
    const data = [
      {
        name: "Basket Conversion",
        value: metrics.basketConversion || 0,
        type: "conversion",
      },
      {
        name: "Love Conversion",
        value: metrics.loveConversion || 0,
        type: "conversion",
      },
      {
        name: "Purchase Rate",
        value: metrics.purchaseRate || 0,
        type: "conversion",
      },
    ].filter((item) => item.value > 0);

    return data.length > 0 ? data : [];
  }, [metrics]);

  // Formatters
  const formatValue = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return "0";
    return value.toLocaleString();
  };

  const formatPercentage = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return "0%";
    return `${value.toFixed(1)}%`;
  };

  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return "$0";
    return `${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const ConnectionStatus = () => (
    <div className="flex">
      <Chip
        icon={
          <div
            className={`w-2 h-2 rounded-full font-bold ${
              connectionStatus === "connected"
                ? "bg-green-500 animate-pulse"
                : connectionStatus === "connecting"
                ? "bg-yellow-500 animate-pulse"
                : "bg-gray-500"
            }`}
          />
        }
        label={
          connectionStatus === "connected"
            ? activeTab === 3
              ? "Live Events (5s)"
              : activeTab === 0
              ? `Live Data (${60 - timeSinceLastUpdate}s)`
              : ""
            : connectionStatus === "connecting"
            ? "Connecting..."
            : "Historical Data"
        }
        color={
          connectionStatus === "connected"
            ? "success"
            : connectionStatus === "connecting"
            ? "warning"
            : "default"
        }
        size="small"
        variant="outlined"
        sx={{
          backgroundColor:
            connectionStatus === "connected"
              ? "rgba(16, 185, 129, 0.1)"
              : connectionStatus === "connecting"
              ? "rgba(234, 179, 8, 0.1)"
              : undefined,
          fontWeight: "bold",
          borderColor:
            connectionStatus === "connected"
              ? "hsl(var(--chart-1))"
              : connectionStatus === "connecting"
              ? "rgb(234, 179, 8)"
              : undefined,
          color:
            connectionStatus === "connected"
              ? "hsl(var(--chart-1))"
              : connectionStatus === "connecting"
              ? "rgb(234, 179, 8)"
              : undefined,
          p: "0.25rem 0.5rem",
        }}
      />
    </div>
  );

  const AutoRefreshStatus = () => {
    const getStatusMessage = () => {
      if (activeTab === 1) {
        return "Historical analysis - manual refresh only";
      }
      if (activeTab === 3) {
        return "Live event stream (auto-updates every 5s)";
      }
      if (!isTodaySelected) {
        return "Historical data - manual refresh only";
      }
      if (connectionStatus === "connecting") {
        return "Connecting to live data...";
      }
      if (isInitialLoad) {
        return "Loading initial data...";
      }
      return `Next update in ${60 - timeSinceLastUpdate}s`;
    };

    return (
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              connectionStatus === "connected"
                ? "bg-green-500 animate-pulse"
                : connectionStatus === "connecting"
                ? "bg-yellow-500 animate-pulse"
                : "bg-gray-500"
            }`}
          />
          <span className="text-muted-foreground">{getStatusMessage()}</span>
        </div>
      </div>
    );
  };

  const ControlPanel = () => (
    <div className="p-4 rounded-lg controlPanel border border-gray-700">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-col items-left gap-4">
          <ConnectionStatus />
          <AutoRefreshStatus />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              disabled={activeTab === 3}
              max={new Date().toISOString().split("T")[0]}
              className={`bg-gray-700 text-muted-foreground px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                activeTab === 3
                  ? "cursor-not-allowed text-gray-500 bg-gray-800"
                  : "border-gray-600"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const MainMetrics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="Page Views"
        value={isInitialLoad ? "..." : formatValue(metrics.pageViews)}
        change={formatPercentage(metrics.basketConversion)}
        trend="up"
        icon={Eye}
        isLoading={isInitialLoad}
      />
      <MetricCard
        title="Purchases"
        value={isInitialLoad ? "..." : formatValue(metrics.purchases)}
        change={
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-green-400">
              <span className="text-xs font-semibold">
                $ {formatCurrency(metrics.revenue || 0)}
              </span>
            </div>
          </div>
        }
        trend="up"
        icon={CreditCard}
        isLoading={isInitialLoad}
      />
      <MetricCard
        title="Basket Activity"
        value={isInitialLoad ? "..." : formatValue(metrics.netBasket)}
        change={
          <div className="flex flex-row gap-4">
            <div className="flex items-center gap-1 text-green-400">
              <Plus size={12} />
              <span className="text-xs">
                {formatValue(metrics.addToBasket)} adds
              </span>
            </div>
            <div className="flex items-center gap-1 text-red-400">
              <Minus size={12} />
              <span className="text-xs">
                {formatValue(metrics.removeFromBasket)} removes
              </span>
            </div>
          </div>
        }
        trend={metrics.netBasket >= 0 ? "up" : "down"}
        icon={ShoppingCart}
        isLoading={isInitialLoad}
      />
      <MetricCard
        title="Loves"
        value={isInitialLoad ? "..." : formatValue(metrics.netLoves)}
        change={
          <div className="flex flex-row gap-4">
            <div className="flex items-center gap-1 text-green-400">
              <Plus size={12} />
              <span className="text-xs">{formatValue(metrics.loves)} adds</span>
            </div>
            <div className="flex items-center gap-1 text-red-400">
              <Minus size={12} />
              <span className="text-xs">
                {formatValue(metrics.unLoves)} removes
              </span>
            </div>
          </div>
        }
        trend={metrics.netLoves >= 0 ? "up" : "down"}
        icon={Heart}
        isLoading={isInitialLoad}
      />
    </div>
  );

  // const StatsOverview = () => (
  //   <Card
  //     sx={{ backgroundColor: 'var(--control-panel-bg)' }}
  //     className="bg-gray-800 border border-gray-700 mb-6"
  //   >
  //     <CardContent className="p-4">
  //       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
  //         <div>
  //           <Typography variant="h6" className="text-blue-400 font-bold">
  //             {formatValue(metrics.totalEvents)}
  //           </Typography>
  //           <Typography variant="body2" className="text-gray-400">
  //             Total Events
  //           </Typography>
  //         </div>
  //         <div>
  //           <Typography variant="h6" className="text-green-400 font-bold">
  //             {formatValue(metrics.cmsImpressions)}
  //           </Typography>
  //           <Typography variant="body2" className="text-gray-400">
  //             CMS Impressions
  //           </Typography>
  //         </div>
  //         <div>
  //           <Typography variant="h6" className="text-purple-400 font-bold">
  //             {formatValue(metrics.cmsClicks)}
  //           </Typography>
  //           <Typography variant="body2" className="text-gray-400">
  //             CMS Clicks
  //           </Typography>
  //         </div>
  //         <div>
  //           <Typography variant="h6" className="text-amber-400 font-bold">
  //             {metrics.cmsImpressions > 0
  //               ? `${(
  //                   (metrics.cmsClicks / metrics.cmsImpressions) *
  //                   100
  //                 ).toFixed(1)}%`
  //               : "0%"}
  //           </Typography>
  //           <Typography variant="body2" className="text-gray-400">
  //             CTR
  //           </Typography>
  //         </div>
  //       </div>
  //     </CardContent>
  //   </Card>
  // );

  const ChartsSection = () => {
    if (isInitialLoad) {
      return (
        <div className="hsl(var(--card)) p-8 rounded-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Loading charts for {selectedDate}...
          </p>
        </div>
      );
    }

    if (!streamData || streamData.length === 0 || metrics.totalEvents === 0) {
      return (
        <div className="bg-gray-800 p-8 rounded-lg text-center">
          <p className="text-muted-foreground">
            No data available for {selectedDate}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Try selecting a different date or check the Databricks connection
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <StatsOverview metrics={metrics} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EnlargableChart
            chartId="event-distribution"
            title="Event Distribution"
            description="Breakdown of all user events with interactive pie chart"
            type="customPie"
            data={eventDistributionData}
            isLoading={false}
          />
          <EnlargableChart
            chartId="conversion-funnel"
            title="Conversion Funnel"
            description="User journey with conversion rates between stages"
            type="conversionFunnel"
            data={conversionFunnelData}
            isLoading={false}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cmsPerformanceData.length > 0 && (
            <EnlargableChart
              chartId="cms-performance"
              title="CMS Performance"
              description="Impressions, clicks, and click-through rate"
              type="stackedArea"
              data={cmsPerformanceData}
              dataKeys={["value"]}
              isLoading={false}
            />
          )}
          <EnlargableChart
            chartId="engagement-metrics"
            title="Engagement Metrics"
            description="Basket and love interactions over time"
            type="line"
            data={engagementData}
            dataKeys={["value"]}
            isLoading={false}
          />
        </div>

        {performanceData.length > 0 && (
          <div className="grid grid-cols-1 gap-6">
            <EnlargableChart
              chartId="conversion-rates"
              title="Conversion Rates (%)"
              description="Key performance indicators trend"
              type="area"
              data={performanceData}
              dataKeys={["value"]}
              isLoading={false}
            />
          </div>
        )}
      </div>
    );
  };

  const LiveDashboardView = () => (
    <div className="space-y-6">
      <ControlPanel />
      <MainMetrics />
      <ChartsSection />
      <Dashboard
        data={streamData}
        error={error}
        isConnected={isConnected}
        isLoading={isInitialLoad}
        lastUpdate={lastUpdate}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        connectionStats={connectionStats}
      />
    </div>
  );

  const HistoricalDataView = () => (
    <div className="space-y-6">
      <HistoricalDataTable activeTab={activeTab} />
    </div>
  );

  const PersonalizationDataView = () => (
    <div className="space-y-6">
      <PersonalizationDataTable activeTab={activeTab} />
    </div>
  );

  const EventStreamView = () => (
    <div className="space-y-6">
      <ControlPanel />
      <EventStream
        events={eventStreamData || []}
        isConnected={isConnected && isTodaySelected}
        isLoading={isEventStreamLoading}
        onRefresh={refreshEventStream}
      />
    </div>
  );

  // Mobile Drawer Component
  const MobileDrawer = () => (
    <Drawer
      anchor="right"
      open={mobileDrawerOpen}
      onClose={toggleMobileDrawer}
      sx={{
        "& .MuiDrawer-paper": {
          backgroundColor: "rgb(31, 41, 55)",
          color: "white",
          width: 280,
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, color: "white", textAlign: "center" }}>
          Navigation Menu
        </Typography>
        <List>
          {enabledTabs.map((tab, uiPosition) => {
            const IconComponent = iconMap[tab.icon as keyof typeof iconMap];
            const isSelected = activeTab === tab.index;
            return (
              <ListItem key={tab.id} disablePadding>
                <ListItemButton
                  selected={isSelected}
                  onClick={() => handleMobileTabSelect(uiPosition)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    "&.Mui-selected": {
                      backgroundColor: "hsl(var(--chart-1))",
                      "&:hover": {
                        backgroundColor: "hsl(var(--chart-1))",
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
                    {IconComponent && <IconComponent size={18} />}
                  </ListItemIcon>
                  <ListItemText primary={tab.label} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Drawer>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-primary">
                <TrendingUp className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Sephora - NeuroCart - Intelligence Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                 AI-Powered Real-Time Streaming Insights, Customer Journey Analytics, and Ad-Hoc Campaign Integration
                </p>
              </div>
            </div>
            
            {/* Menu Button for Mobile and Tablet */}
            {!isDesktop && (
              <div className="flex items-center gap-4">
                <IconButton
                  onClick={toggleMobileDrawer}
                  sx={{
                    color: "#9CA3AF",
                    border: "1px solid #4B5563",
                    borderRadius: 1,
                  }}
                >
                  <Menu size={20} />
                </IconButton>
              </div>
            )}

            {/* Connection Stats for Desktop */}
            {isDesktop && connectionStats && (
              <div className="text-right text-sm text-muted-foreground">
                <div>
                  Live: {connectionStats.live?.isConnecting ? "🔄" : "✅"}
                </div>
                <div>
                  Historical:{" "}
                  {connectionStats.historical?.isConnecting ? "🔄" : "✅"}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 mt-2">
        {error && activeTab === 0 && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mb-6">
            <strong>Connection Error:</strong> {error}
          </div>
        )}

        <Box sx={{ width: "100%" }}>
          {/* Desktop Tabs - Only show on large screens */}
          {isDesktop && (
            <Tabs
              value={getUIPosition(activeTab)}
              onChange={handleTabChange}
              sx={{
                "& .MuiTab-root": {
                  color: "#9CA3AF",
                  fontWeight: 500,
                  textTransform: "none",
                  fontSize: "1rem",
                  minHeight: "48px",
                  "&.Mui-selected": {
                    color: "hsl(var(--chart-1))",
                    fontWeight: 600,
                  },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "hsl(var(--chart-1))",
                  height: "3px",
                },
                mb: 4,
              }}
            >
              {enabledTabs.map((tab) => {
                const IconComponent = iconMap[tab.icon as keyof typeof iconMap];
                return (
                  <Tab
                    key={tab.id}
                    {...(IconComponent && { icon: <IconComponent size={18} />, iconPosition: "start" })}
                    label={tab.label}
                  />
                );
              })}
            </Tabs>
          )}

          {/* Mobile Drawer for Tablet and Mobile */}
          <MobileDrawer />

          <Box>
            {activeTab === 0 && <LiveDashboardView />}
            {activeTab === 1 && <HistoricalDataView />}
            {activeTab === 2 && <PersonalizationDataView />}
            {activeTab === 3 && <EventStreamView />}
            {activeTab === 4 && <AbandonedCartDashboard />}
            {activeTab === 5 && <StoreModeDashboard />}
            {activeTab === 6 && <EventAnalysisPage/>}
          </Box>
        </Box>
      </main>
    </div>
  );
};

export default Index;