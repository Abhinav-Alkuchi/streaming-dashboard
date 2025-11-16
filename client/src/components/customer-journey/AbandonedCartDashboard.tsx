/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Alert,
  Box,
  Chip,
  Snackbar,
  TablePagination,
  TextField,
  MenuItem,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import {
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  Smartphone,
  Monitor,
  Tablet,
  Send,
  BarChart3,
  User,
  Calendar,
  RefreshCw,
  Search,
  Target,
} from "lucide-react";

import { AbandonedCartMetricsCard } from "./AbandonedCartMetricsCard";
import { AbandonmentChart } from "./AbandonmentChart";
import { CustomerJourneyGraph } from "./CustomerJourneyGraph";
import { CustomerBehaviorAnalytics } from "./CustomerBehaviorAnalytics";
import { RecoveryStrategies } from "./RecoveryStrategies";

import { useAbandonedCarts } from "../../hooks/useAbandonedCarts";
import { useHeatMap } from "../../hooks/useHeatMap";
import { scrambleEmail } from "../../utilities";

export const AbandonedCartDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [recoveryMessage, setRecoveryMessage] = useState<{
    open: boolean;
    message: string;
    isError: boolean;
  }>({
    open: false,
    message: "",
    isError: false,
  });
  const [behaviorAnalysisType, setBehaviorAnalysisType] = useState<
    "engagement" | "conversion" | "retention"
  >("engagement");

  // Pagination and filtering states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("abandoned_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Use ref to track initial load and prevent loops
  const initialLoadRef = useRef(true);
  const lastDateRangeRef = useRef(dateRange);

  const {
    data,
    metrics,
    journeys: customerJourneys,
    isLoading,
    error,
    fetchAbandonedCarts,
    recoverCart,
  } = useAbandonedCarts();

  const {
    heatMapData,
    aggregateData,
    isLoading: heatmapLoading,
    error: heatmapError,
    fetchHeatMapData,
  } = useHeatMap();

  // Transform heatmap data to behavior analytics format - FIXED VERSION
  const behaviorAnalyticsData = useMemo(() => {
    if (!heatMapData || heatMapData.length === 0) {
      // Return mock behavior data if no heatmap data available
      return Array.from({ length: 50 }, (_, index) => ({
        device_type: ["desktop", "mobile", "tablet"][
          Math.floor(Math.random() * 3)
        ],
        page_url: "/products",
        scroll_depth: Math.floor(Math.random() * 100),
        time_on_page: Math.floor(Math.random() * 120000) + 30000, // 30-150 seconds
        interactions: Array.from(
          { length: Math.floor(Math.random() * 10) + 1 },
          () => ({
            x: Math.random() * 80 + 10,
            y: Math.random() * 80 + 10,
            intensity: Math.random() * 100,
            count: Math.floor(Math.random() * 5) + 1,
            element: [
              "add-to-cart-btn",
              "product-image",
              "buy-now-btn",
              "size-selector",
              "color-selector",
            ][Math.floor(Math.random() * 5)],
            type: "click" as const,
            timestamp: new Date(
              Date.now() - Math.random() * 86400000
            ).toISOString(),
          })
        ),
        session_id: `session-${index}`,
        user_id: `user-${index}`,
        conversion: Math.random() > 0.7, // 30% conversion rate
      }));
    }

    // Transform actual heatmap data to behavior analytics format
    return heatMapData.map((session, index) => {
      // FIX: Safely handle clicks data - ensure it's always an array
      let interactions: any[] = [];

      if (session.clicks) {
        if (Array.isArray(session.clicks)) {
          // If clicks is already an array, use it directly
          interactions = session.clicks.map((click: any) => ({
            x: click.x || Math.random() * 80 + 10,
            y: click.y || Math.random() * 80 + 10,
            intensity: click.intensity || Math.random() * 100,
            count: click.count || 1,
            element: click.element || "unknown-element",
            type: "click" as const,
            timestamp: click.timestamp || new Date().toISOString(),
          }));
        } else if (typeof session.clicks === "object") {
          // If clicks is an object, convert it to array format
          // This handles cases where clicks might be in object format {element1: count1, element2: count2}
          interactions = Object.entries(session.clicks).map(
            ([element, data]: [string, any]) => ({
              x: data.x || Math.random() * 80 + 10,
              y: data.y || Math.random() * 80 + 10,
              intensity: data.intensity || Math.random() * 100,
              count: data.count || 1,
              element: element,
              type: "click" as const,
              timestamp: data.timestamp || new Date().toISOString(),
            })
          );
        }
      }

      // If no interactions were created, provide some mock data
      if (interactions.length === 0) {
        interactions = Array.from(
          { length: Math.floor(Math.random() * 5) + 1 },
          () => ({
            x: Math.random() * 80 + 10,
            y: Math.random() * 80 + 10,
            intensity: Math.random() * 100,
            count: Math.floor(Math.random() * 3) + 1,
            element: ["add-to-cart-btn", "product-image", "buy-now-btn"][
              Math.floor(Math.random() * 3)
            ],
            type: "click" as const,
            timestamp: new Date(
              Date.now() - Math.random() * 86400000
            ).toISOString(),
          })
        );
      }

      return {
        device_type: session.device_type || "desktop",
        page_url: session.page_url || "/products",
        scroll_depth: session.scroll_depth || Math.floor(Math.random() * 100),
        time_on_page:
          session.time_on_page || Math.floor(Math.random() * 120000) + 30000,
        interactions: interactions,
        session_id: session.session_id || `session-${index}`,
        user_id: session?.userId || `user-${index}`,
        conversion: Math.random() > 0.7, // Mock conversion data
      };
    });
  }, [heatMapData]);

  // Debug journeys data
  useEffect(() => {
    console.log("🛒 Customer Journeys in Dashboard:", {
      count: customerJourneys?.length || 0,
      sample: customerJourneys?.[0],
      all: customerJourneys,
    });
  }, [customerJourneys]);

  // Stable callback for date change
  const handleDateChange = useCallback(
    (field: "startDate" | "endDate", value: string) => {
      setDateRange((prev) => {
        if (prev[field] === value) return prev;
        return { ...prev, [field]: value };
      });
    },
    []
  );

  // Stable callback for refresh - use ref to avoid dependency issues
  const handleRefreshAll = useCallback(() => {
    console.log("🔄 Manual refresh triggered");
    fetchAbandonedCarts(dateRange.startDate, dateRange.endDate);

    // Refresh behavior analytics data when on that tab
    if (activeTab === 3) {
      fetchHeatMapData(dateRange.startDate, dateRange.endDate);
    }
  }, [
    fetchAbandonedCarts,
    dateRange.startDate,
    dateRange.endDate,
    activeTab,
    fetchHeatMapData,
  ]);

  // Stable callback for tab change
  const handleTabChange = useCallback(
    (_: React.SyntheticEvent, newValue: number) => {
      console.log(`📑 Tab changed to: ${newValue}`);
      setActiveTab(newValue);

      // Fetch behavior analytics data when switching to that tab
      if (newValue === 3 && !heatmapLoading) {
        fetchHeatMapData(dateRange.startDate, dateRange.endDate);
      }
    },
    [heatmapLoading, fetchHeatMapData, dateRange.startDate, dateRange.endDate]
  );

  // Fetch abandoned carts data only when date range changes
  useEffect(() => {
    const currentDateRange = `${dateRange.startDate}-${dateRange.endDate}`;
    const lastDateRange = `${lastDateRangeRef.current.startDate}-${lastDateRangeRef.current.endDate}`;

    // Only fetch if date range actually changed or it's initial load
    if (initialLoadRef.current || currentDateRange !== lastDateRange) {
      console.log("📅 Date range changed, fetching abandoned carts...", {
        current: currentDateRange,
        last: lastDateRange,
        isInitial: initialLoadRef.current,
      });

      fetchAbandonedCarts(dateRange.startDate, dateRange.endDate);
      lastDateRangeRef.current = { ...dateRange };
      initialLoadRef.current = false;
    }
  }, [dateRange.startDate, dateRange.endDate, dateRange, fetchAbandonedCarts]);

  const handleRecoverCart = async (cartId: string) => {
    try {
      await recoverCart(cartId);
      setRecoveryMessage({
        open: true,
        message: "Cart recovery initiated successfully!",
        isError: false,
      });

      // Refresh data to update recovered status
      setTimeout(() => {
        fetchAbandonedCarts(dateRange.startDate, dateRange.endDate);
      }, 1000);
    } catch (err: any) {
      setRecoveryMessage({
        open: true,
        message: `Failed to recover cart. Please try again. ${err}`,
        isError: true,
      });
    }
  };

  const handleCloseSnackbar = () => {
    setRecoveryMessage((prev) => ({ ...prev, open: false }));
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "mobile web":
        return <Smartphone size={24} color="#FFFFFF" />;
      case "tablet web":
        return <Tablet size={24} color="#FFFFFF" />;
      case "iphone app":
        return <Smartphone size={24} color="#FFFFFF" />;
      case "android app":
        return <Smartphone size={24} color="#FFFFFF" />;
      default:
        return <Monitor size={24} color="#FFFFFF" />;
    }
  };

  // FIXED: Safe currency formatting function
  const formatCurrency = useCallback(
    (amount: number, currency: string = "USD") => {
      // Validate and normalize currency code
      let normalizedCurrency = currency?.toUpperCase() || "USD";

      // Handle common currency code issues
      if (normalizedCurrency === "US") normalizedCurrency = "USD";
      if (normalizedCurrency === "EU") normalizedCurrency = "EUR";
      if (normalizedCurrency === "GB") normalizedCurrency = "GBP";

      // List of valid currency codes to prevent errors
      const validCurrencies = [
        "USD",
        "EUR",
        "GBP",
        "CAD",
        "AUD",
        "JPY",
        "CNY",
        "INR",
        "BRL",
        "MXN",
      ];

      if (!validCurrencies.includes(normalizedCurrency)) {
        normalizedCurrency = "USD"; // Fallback to USD
      }

      try {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: normalizedCurrency,
        }).format(amount);
      } catch (error: any) {
        console.warn(
          `Invalid currency format: ${currency}, ${error} using USD fallback`
        );
        // Fallback formatting
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(amount);
      }
    },
    []
  );

  // Filtering and pagination logic
  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((cart) => {
      const matchesSearch =
        cart.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cart.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cart.cart_items.some(
          (item) =>
            item.sku_id ||
            item.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesPlatform =
        platformFilter === "all" || cart.platform === platformFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "recovered" && cart.recovered) ||
        (statusFilter === "abandoned" && !cart.recovered);

      return matchesSearch && matchesPlatform && matchesStatus;
    });

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "customer_email":
          aValue = a.customer_email;
          bValue = b.customer_email;
          break;
        case "total_amount":
          aValue = a.total_amount;
          bValue = b.total_amount;
          break;
        case "abandoned_at":
          aValue = new Date(a.abandoned_at);
          bValue = new Date(b.abandoned_at);
          break;
        default:
          aValue = (a as any)[sortBy];
          bValue = (b as any)[sortBy];
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [data, searchTerm, platformFilter, statusFilter, sortBy, sortOrder]);

  const paginatedData = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedData, page, rowsPerPage]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  // UPDATED: Changed tab label and icon from "Heat Map" to "Behavior Analytics"
  const tabs = [
    { icon: BarChart3, label: "Overview" },
    { icon: User, label: "Customer Journeys" },
    { icon: ShoppingCart, label: "Abandoned Carts" },
    { icon: Target, label: "Behavior Analytics" }, // CHANGED: From MousePointer/Heat Map to Target/Behavior Analytics
    { icon: Send, label: "Recovery Strategies" },
  ];

  const isUsingMockData = import.meta.env.VITE_APP_USE_MOCK_DATA === "true";

  const renderBehaviorAnalyticsContent = () => {
    if (heatmapLoading) {
      return (
        <Card
          sx={{
            backgroundColor: "hsl(var(--card))",
            p: 4,
            textAlign: "center",
            border: "1px solid rgb(75 85 99)",
          }}
        >
          <Box className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></Box>
          <Typography variant="h6" sx={{ color: "white", mb: 1 }}>
            Loading Behavior Analytics Data
          </Typography>
          <Typography variant="body2" sx={{ color: "rgb(156 163 175)" }}>
            {isUsingMockData ? "Loading mock data..." : "Fetching from API..."}
          </Typography>
        </Card>
      );
    }

    if (heatmapError) {
      return (
        <Alert
          severity="warning"
          sx={{
            backgroundColor: "rgb(120 53 15 / 0.5)",
            border: "1px solid rgb(245 158 11)",
            borderRadius: "8px",
            mb: 4,
          }}
        >
          <Typography variant="body1" fontWeight="bold" sx={{ color: "white" }}>
            Behavior Analytics API Connection Issue
          </Typography>
          <Typography variant="body2" sx={{ color: "rgb(254 215 170)" }}>
            {heatmapError}. Using fallback mock data.
          </Typography>
          <Button
            variant="outlined"
            onClick={() =>
              fetchHeatMapData(dateRange.startDate, dateRange.endDate)
            }
            sx={{ mt: 1, color: "white", borderColor: "white" }}
          >
            Retry API
          </Button>
        </Alert>
      );
    }

    return (
      <CustomerBehaviorAnalytics
        data={behaviorAnalyticsData}
        aggregateData={aggregateData}
        isLoading={heatmapLoading}
      />
    );
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex-1">
          <Typography
            variant="h6"
            gutterBottom
            className="text-white font-bold"
          >
            Cart Recovery Analysis
          </Typography>
          <Typography className="text-gray-400">
            Track and recover lost revenue from abandoned carts
          </Typography>
          <Box sx={{ mt: 1 }}>
            {/* <Chip 
              label={isUsingMockData ? "Using Mock Data" : "Using Live API"} 
              color={isUsingMockData ? "warning" : "success"} 
              size="small"
              variant="outlined"
            /> */}
            {error && (
              <Chip
                label="API Error - Using Fallback Data"
                color="error"
                size="small"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Calendar size={18} className="text-gray-400" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateChange("startDate", e.target.value)}
              className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateChange("endDate", e.target.value)}
              className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
            />
          </div>
          <Button
            variant="contained"
            startIcon={<RefreshCw size={16} />}
            onClick={handleRefreshAll}
            disabled={isLoading || heatmapLoading}
            sx={{
              backgroundColor: "#3B82F6",
              "&:hover": { backgroundColor: "#2563EB" },
              width: { xs: "100%", sm: "auto" },
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <AbandonedCartMetricsCard
            title="Abandoned Carts"
            value={metrics.total_abandoned_carts.toString()}
            change={metrics.period_comparison.change_percentage}
            icon={ShoppingCart}
            color="#EF4444"
          />
          <AbandonedCartMetricsCard
            title="Lost Revenue"
            value={formatCurrency(metrics.total_abandoned_revenue)}
            change={-metrics.period_comparison.change_percentage}
            icon={DollarSign}
            color="#F59E0B"
          />
          <AbandonedCartMetricsCard
            title="Recovery Rate"
            value={`${metrics.recovery_rate}%`}
            change={metrics.recovery_rate}
            icon={TrendingUp}
            color="#10B981"
          />
          <AbandonedCartMetricsCard
            title="Avg Cart Value"
            value={formatCurrency(metrics.average_cart_value)}
            change={5.2}
            icon={Users}
            color="#3B82F6"
          />
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card
          sx={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid rgb(55 65 81)",
            mb: 4,
          }}
        >
          <CardContent sx={{ p: 4, textAlign: "center" }}>
            <Box className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></Box>
            <Typography variant="h6" sx={{ color: "white", mb: 1 }}>
              Loading Abandoned Cart Data
            </Typography>
            <Typography variant="body2" sx={{ color: "rgb(156 163 175)" }}>
              {isUsingMockData
                ? "Loading mock data..."
                : "Fetching from API..."}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && !isLoading && (
        <Alert
          severity="warning"
          sx={{
            backgroundColor: "rgb(120 53 15 / 0.5)",
            border: "1px solid rgb(245 158 11)",
            borderRadius: "8px",
            mb: 4,
          }}
        >
          <Typography variant="body1" fontWeight="bold" sx={{ color: "white" }}>
            API Connection Issue
          </Typography>
          <Typography variant="body2" sx={{ color: "rgb(254 215 170)" }}>
            {error}. Using fallback mock data.
          </Typography>
          <Button
            variant="outlined"
            onClick={handleRefreshAll}
            sx={{ mt: 1, color: "white", borderColor: "white" }}
          >
            Retry API
          </Button>
        </Alert>
      )}

      {/* Main Content */}
      {!isLoading && (
        <Card
          sx={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid rgb(55 65 81)",
            width: "100%",
            overflow: "hidden",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              borderBottom: "1px solid rgb(55 65 81)",
              "& .MuiTab-root": {
                color: "#9CA3AF",
                textTransform: "none",
                fontWeight: 500,
                minWidth: "auto",
                px: 2,
                "&.Mui-selected": { color: "#60A5FA" },
              },
              "& .MuiTabs-indicator": { backgroundColor: "#60A5FA" },
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            {tabs.map((tab, index) => (
              <Tab
                key={tab.label || index}
                icon={<tab.icon size={18} />}
                iconPosition="start"
                label={tab.label}
              />
            ))}
          </Tabs>

          <CardContent sx={{ p: 3, width: "100%" }}>
            {/* Overview Tab */}
            {activeTab === 0 && (
              <div className="flex flex-col gap-6 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <AbandonmentChart data={data} />
                  </div>
                  <div className="lg:col-span-1">
                    <RecoveryStrategies />
                  </div>
                </div>

                {/* Platform Distribution */}
                <Card
                  sx={{
                    backgroundColor: "hsl(var(--card))",
                    p: 3,
                    width: "100%",
                  }}
                >
                  <Typography variant="h6" gutterBottom sx={{ color: "white" }}>
                    Platform Distribution
                  </Typography>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {[
                      "desktop web",
                      "mobile web",
                      "tablet web",
                      "iphone app",
                      "android app",
                    ].map((platform) => {
                      const count = data.filter(
                        (item) => item.platform === platform
                      ).length;
                      const percentage =
                        data.length > 0 ? (count / data.length) * 100 : 0;
                      return (
                        <div key={platform} className="text-center p-3">
                          <div className="flex justify-center mb-2">
                            {getPlatformIcon(platform)}
                          </div>
                          <Typography
                            variant="h6"
                            sx={{ color: "white", fontSize: "1rem" }}
                          >
                            {percentage.toFixed(1)}%
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "rgb(156 163 175)",
                              textTransform: "capitalize",
                              fontSize: "0.75rem",
                            }}
                          >
                            {platform}
                          </Typography>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            {/* Customer Journeys Tab - FIXED */}
            {activeTab === 1 && (
              <Box sx={{ width: "100%", overflow: "auto" }}>
                {customerJourneys && customerJourneys.length > 0 ? (
                  <CustomerJourneyGraph
                    journeys={customerJourneys}
                    metrics={null}
                  />
                ) : (
                  <Card
                    sx={{
                      backgroundColor: "hsl(var(--card))",
                      p: 4,
                      textAlign: "center",
                      border: "1px solid rgb(75 85 99)",
                    }}
                  >
                    <Typography variant="h6" sx={{ color: "white", mb: 2 }}>
                      No Customer Journey Data Available
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "rgb(156 163 175)", mb: 3 }}
                    >
                      {isLoading
                        ? "Loading journey data..."
                        : "No customer journey data found for the selected date range."}
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={handleRefreshAll}
                      disabled={isLoading}
                      sx={{
                        color: "#60A5FA",
                        borderColor: "#60A5FA",
                        "&:hover": {
                          backgroundColor: "rgba(96, 165, 250, 0.1)",
                          borderColor: "#60A5FA",
                        },
                      }}
                    >
                      {isLoading ? "Loading..." : "Refresh Data"}
                    </Button>
                  </Card>
                )}
              </Box>
            )}

            {/* Abandoned Carts Tab */}
            {activeTab === 2 && (
              <Box sx={{ width: "100%", overflow: "auto" }}>
                {/* Filters and Search */}
                <Card
                  sx={{
                    backgroundColor: "hsl(var(--card))",
                    p: 3,
                    mb: 2,
                    border: "1px solid rgb(75 85 99)",
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                    {/* Search */}
                    <TextField
                      size="small"
                      placeholder="Search carts..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(0);
                      }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search size={18} color="#9CA3AF" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          color: "white",
                          "& fieldset": { borderColor: "#4B5563" },
                          "&:hover fieldset": { borderColor: "#6B7280" },
                          "&.Mui-focused fieldset": { borderColor: "#60A5FA" },
                        },
                      }}
                    />

                    {/* Platform Filter */}
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel sx={{ color: "#9CA3AF" }}>
                        Platform
                      </InputLabel>
                      <Select
                        value={platformFilter}
                        onChange={(e) => {
                          setPlatformFilter(e.target.value);
                          setPage(0);
                        }}
                        label="Platform"
                        sx={{
                          color: "white",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#4B5563",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#6B7280",
                          },
                        }}
                      >
                        <MenuItem value="all">All Platforms</MenuItem>
                        <MenuItem value="desktop web">Desktop</MenuItem>
                        <MenuItem value="mobile web">Mobile Web</MenuItem>
                        <MenuItem value="tablet web">Tablet Web</MenuItem>
                        <MenuItem value="iphone app">iPhone App</MenuItem>
                        <MenuItem value="android app">Android App</MenuItem>
                      </Select>
                    </FormControl>

                    {/* Status Filter */}
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel sx={{ color: "#9CA3AF" }}>Status</InputLabel>
                      <Select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.target.value);
                          setPage(0);
                        }}
                        label="Status"
                        sx={{
                          color: "white",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#4B5563",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#6B7280",
                          },
                        }}
                      >
                        <MenuItem value="all">All Status</MenuItem>
                        <MenuItem value="abandoned">Abandoned</MenuItem>
                        <MenuItem value="recovered">Recovered</MenuItem>
                      </Select>
                    </FormControl>

                    {/* Sort By */}
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel sx={{ color: "#9CA3AF" }}>Sort By</InputLabel>
                      <Select
                        value={sortBy}
                        onChange={(e) => {
                          setSortBy(e.target.value);
                          setPage(0);
                        }}
                        label="Sort By"
                        sx={{
                          color: "white",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#4B5563",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#6B7280",
                          },
                        }}
                      >
                        <MenuItem value="abandoned_at">Abandoned Date</MenuItem>
                        <MenuItem value="total_amount">Total Amount</MenuItem>
                        <MenuItem value="customer_email">
                          Customer Email
                        </MenuItem>
                      </Select>
                    </FormControl>

                    {/* Sort Order */}
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel sx={{ color: "#9CA3AF" }}>Order</InputLabel>
                      <Select
                        value={sortOrder}
                        onChange={(e) => {
                          setSortOrder(e.target.value as "asc" | "desc");
                          setPage(0);
                        }}
                        label="Order"
                        sx={{
                          color: "white",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#4B5563",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#6B7280",
                          },
                        }}
                      >
                        <MenuItem value="desc">Newest First</MenuItem>
                        <MenuItem value="asc">Oldest First</MenuItem>
                      </Select>
                    </FormControl>
                  </div>

                  {/* Results Count */}
                  <Typography
                    variant="body2"
                    sx={{ color: "rgb(156 163 175)" }}
                  >
                    Showing {paginatedData.length} of{" "}
                    {filteredAndSortedData.length} carts
                    {searchTerm && ` for "${searchTerm}"`}
                  </Typography>
                </Card>

                {/* Table */}
                <TableContainer
                  component={Paper}
                  sx={{
                    backgroundColor: "hsl(var(--card))",
                    minWidth: 800,
                    mb: 2,
                  }}
                >
                  <Table sx={{ minWidth: 800 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell
                          sx={{
                            color: "white",
                            fontWeight: "bold",
                            minWidth: 200,
                            cursor: "pointer",
                          }}
                          onClick={() => handleSort("customer_email")}
                        >
                          Customer{" "}
                          {sortBy === "customer_email" &&
                            (sortOrder === "asc" ? "↑" : "↓")}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "white",
                            fontWeight: "bold",
                            minWidth: 150,
                          }}
                        >
                          SKU IDs
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "white",
                            fontWeight: "bold",
                            minWidth: 120,
                            cursor: "pointer",
                          }}
                          onClick={() => handleSort("total_amount")}
                        >
                          Amount{" "}
                          {sortBy === "total_amount" &&
                            (sortOrder === "asc" ? "↑" : "↓")}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "white",
                            fontWeight: "bold",
                            minWidth: 120,
                          }}
                        >
                          Platform
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "white",
                            fontWeight: "bold",
                            minWidth: 140,
                            cursor: "pointer",
                          }}
                          onClick={() => handleSort("abandoned_at")}
                        >
                          Abandoned{" "}
                          {sortBy === "abandoned_at" &&
                            (sortOrder === "asc" ? "↑" : "↓")}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "white",
                            fontWeight: "bold",
                            minWidth: 120,
                          }}
                        >
                          Status
                        </TableCell>
                        <TableCell
                          sx={{
                            color: "white",
                            fontWeight: "bold",
                            minWidth: 120,
                          }}
                        >
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedData.map((cart) => (
                        <TableRow key={cart.id} hover>
                          <TableCell sx={{ color: "white", minWidth: 200 }}>
                            <Box>
                              <Typography
                                variant="body2"
                                fontWeight="medium"
                                noWrap
                              >
                                {scrambleEmail(cart.customer_email)}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: "rgb(156 163 175)" }}
                                noWrap
                              >
                                {cart.location}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ color: "white", minWidth: 150 }}>
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 0.5,
                              }}
                            >
                              {cart.cart_items
                                .slice(0, 3)
                                .map((item, index) => (
                                  <Chip
                                    key={index}
                                    label={item.sku_id || "N/A"}
                                    size="small"
                                    sx={{
                                      backgroundColor: "rgb(75 85 99)",
                                      color: "white",
                                      fontSize: "10px",
                                      height: "20px",
                                      maxWidth: "120px",
                                    }}
                                    title={item.product_name}
                                  />
                                ))}
                              {cart.cart_items.length > 3 && (
                                <Chip
                                  label={`+${cart.cart_items.length - 3} more`}
                                  size="small"
                                  sx={{
                                    backgroundColor: "rgb(55 65 81)",
                                    color: "rgb(156 163 175)",
                                    fontSize: "10px",
                                    height: "20px",
                                  }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell
                            sx={{
                              color: "white",
                              fontWeight: "bold",
                              minWidth: 120,
                            }}
                          >
                            {formatCurrency(cart.total_amount, cart.currency)}
                          </TableCell>
                          <TableCell sx={{ color: "white", minWidth: 120 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              {getPlatformIcon(cart.platform)}
                              <Typography
                                variant="body2"
                                sx={{ textTransform: "capitalize" }}
                                noWrap
                              >
                                {cart.platform}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ color: "white", minWidth: 140 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Clock size={14} />
                              <Typography variant="body2" noWrap>
                                {new Date(
                                  cart.abandoned_at
                                ).toLocaleDateString()}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ minWidth: 120 }}>
                            <Chip
                              label={cart.recovered ? "Recovered" : "Abandoned"}
                              size="small"
                              color={cart.recovered ? "success" : "error"}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell sx={{ minWidth: 120 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Send size={14} />}
                              onClick={() => handleRecoverCart(cart.id)}
                              disabled={cart.recovered}
                              sx={{
                                color: cart.recovered ? "#6B7280" : "#10B981",
                                borderColor: cart.recovered
                                  ? "#6B7280"
                                  : "#10B981",
                                whiteSpace: "nowrap",
                                minWidth: 100,
                                "&:hover": {
                                  backgroundColor: cart.recovered
                                    ? "transparent"
                                    : "rgba(16, 185, 129, 0.1)",
                                  borderColor: cart.recovered
                                    ? "#6B7280"
                                    : "#10B981",
                                },
                              }}
                            >
                              {cart.recovered ? "Recovered" : "Recover"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={filteredAndSortedData.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  sx={{
                    color: "white",
                    "& .MuiTablePagination-selectIcon": { color: "white" },
                    "& .MuiTablePagination-actions button": { color: "white" },
                    "& .MuiTablePagination-select": { color: "white" },
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid rgb(75 85 99)",
                    borderTop: "none",
                  }}
                />
              </Box>
            )}

            {/* UPDATED: Behavior Analytics Tab (Replaces Heat Map Tab) */}
            {activeTab === 3 && (
              <Box sx={{ width: "100%" }}>
                {/* Behavior Analytics Type Selector */}
                <Card
                  sx={{
                    backgroundColor: "hsl(var(--card))",
                    p: 3,
                    mb: 2,
                    border: "1px solid rgb(75 85 99)",
                  }}
                >
                  <Typography variant="h6" gutterBottom sx={{ color: "white" }}>
                    Behavior Analytics Focus
                  </Typography>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Button
                      variant={
                        behaviorAnalysisType === "engagement"
                          ? "contained"
                          : "outlined"
                      }
                      onClick={() => setBehaviorAnalysisType("engagement")}
                      disabled={heatmapLoading}
                      sx={{
                        backgroundColor:
                          behaviorAnalysisType === "engagement"
                            ? "#3B82F6"
                            : "transparent",
                        color:
                          behaviorAnalysisType === "engagement"
                            ? "white"
                            : "#3B82F6",
                        borderColor: "#3B82F6",
                        "&:hover": {
                          backgroundColor:
                            behaviorAnalysisType === "engagement"
                              ? "#2563EB"
                              : "rgba(59, 130, 246, 0.1)",
                        },
                      }}
                    >
                      Engagement Analysis
                    </Button>

                    <Button
                      variant={
                        behaviorAnalysisType === "conversion"
                          ? "contained"
                          : "outlined"
                      }
                      onClick={() => setBehaviorAnalysisType("conversion")}
                      disabled={heatmapLoading}
                      sx={{
                        backgroundColor:
                          behaviorAnalysisType === "conversion"
                            ? "#10B981"
                            : "transparent",
                        color:
                          behaviorAnalysisType === "conversion"
                            ? "white"
                            : "#10B981",
                        borderColor: "#10B981",
                        "&:hover": {
                          backgroundColor:
                            behaviorAnalysisType === "conversion"
                              ? "#059669"
                              : "rgba(16, 185, 129, 0.1)",
                        },
                      }}
                    >
                      Conversion Flow
                    </Button>

                    <Button
                      variant={
                        behaviorAnalysisType === "retention"
                          ? "contained"
                          : "outlined"
                      }
                      onClick={() => setBehaviorAnalysisType("retention")}
                      disabled={heatmapLoading}
                      sx={{
                        backgroundColor:
                          behaviorAnalysisType === "retention"
                            ? "#F59E0B"
                            : "transparent",
                        color:
                          behaviorAnalysisType === "retention"
                            ? "white"
                            : "#F59E0B",
                        borderColor: "#F59E0B",
                        "&:hover": {
                          backgroundColor:
                            behaviorAnalysisType === "retention"
                              ? "#D97706"
                              : "rgba(245, 158, 11, 0.1)",
                        },
                      }}
                    >
                      Element Performance
                    </Button>
                  </div>

                  <Typography
                    variant="body2"
                    sx={{ color: "rgb(156 163 175)" }}
                  >
                    Date Range: {dateRange.startDate} to {dateRange.endDate}
                    {behaviorAnalysisType === "engagement" &&
                      " • Analyzing user engagement patterns and scroll behavior"}
                    {behaviorAnalysisType === "conversion" &&
                      " • Tracking conversion funnel performance"}
                    {behaviorAnalysisType === "retention" &&
                      " • Monitoring element interaction and performance"}
                  </Typography>
                </Card>

                {/* Behavior Analytics Content */}
                {renderBehaviorAnalyticsContent()}
              </Box>
            )}

            {/* Recovery Strategies Tab */}
            {activeTab === 4 && (
              <Box sx={{ width: "100%" }}>
                <RecoveryStrategies detailed />
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recovery Success/Error Snackbar */}
      <Snackbar
        open={recoveryMessage.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={recoveryMessage.isError ? "error" : "success"}
          sx={{ width: "100%" }}
        >
          {recoveryMessage.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default AbandonedCartDashboard;
