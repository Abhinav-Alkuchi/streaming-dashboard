/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Typography,
  Box,
  Button,
  Alert,
  Chip,
  Card,
  CardContent,
  LinearProgress,
  Tooltip as MuiTooltip,
  Tabs,
  Tab,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Calendar,
  Download,
  RefreshCw,
  Filter,
  BarChart3,
  Database,
  Store,
  MapPin,
  Globe,
  Smartphone,
} from "lucide-react";
import StoreModeMap from "./StoreModeMap";
import moment from "moment";
// import { useStoreModeData } from "../hooks/useStoreModeData";
// import { useMockStoreModeData } from "../hooks/useMockStoreModeData";
import { useStoreModeData } from "../../hooks/useStoreModeData";
import { MetricCard } from "../util-components/MetricCard";
import { ChatBotIcon } from "../chat-bot/ChatBotIcon";
import type {
  StoreModeDataTableProps,
  StoreModeSummaryStats,
  StoreModeRow,
} from "../../types";

// ---------- Local chart data types ----------
type EventTypeSlice = {
  event_type: string; // formatted (for legend/labels)
  original_type: string; // original from data
  count: number;
  percentage: number; // 0..100
};

type StoreTypeSlice = {
  store_type: string; // formatted
  original_type: string; // original from data
  count: number;
  percentage: number; // 0..100
};

type StoreIdBar = {
  store_id: string;
  count: number;
};

// ---------- Tab panel ----------
function TabPanel(props: {
  children?: React.ReactNode;
  index: number;
  value: number;
}) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`store-mode-tabpanel-${index}`}
      aria-labelledby={`store-mode-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// ---------- Helpers ----------
const toTitle = (str: string) =>
  str
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

const formatEventType = (eventType: string) => toTitle(eventType);
const formatStoreType = (storeType: string) =>
  !storeType || storeType.toLowerCase() === "unknown"
    ? "Unknown"
    : toTitle(storeType);

// ---------- Color palette ----------
const CHART_COLORS = [
  "#2EDAFF",
  "#10B981",
  "#F59E0B",
  "#F5D327",
  "#34D399",
  "#12D8FF",
  "#8B5CF6",
  "#EC4899",
  "#84CC16",
  "#06B6D4",
];

const getEventTypeColor = (eventType: string) => {
  const key = (eventType || "").toLowerCase().split("_").join(" ");
  const colors: Record<string, string> = {
    "store mode local notification click": "#2EDAFF",
    "store local notification received": "#10B981",
    "store inner geofence crossed": "#F59E0B",
  };
  return colors[key] || "#12D8FF";
};

const getStoreTypeColor = (storeType: string) => {
  const key = (storeType || "unknown").toLowerCase().trim();

  const colorMap: Record<string, string> = {
    "sephora at kohl's": "#2EDAFF", // Bright cyan
    sephora: "#10B981", // Emerald green
    "sephora inside jcpenney": "#F59E0B", // Amber/orange
    "sephora standalone": "#8B5CF6", // Violet
    "sephora freestanding": "#EC4899", // Pink
    unknown: "#6B7280", // Gray
  };

  // If we have a defined color, use it
  if (colorMap[key]) {
    return colorMap[key];
  }

  // For any other store types, generate a consistent color from the string
  const storeTypes = Object.keys(colorMap);
  const index = storeTypes.indexOf(key);
  if (index !== -1) {
    return CHART_COLORS[index % CHART_COLORS.length];
  }

  // Fallback: hash the string to get a consistent color
  const hash = key.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  return CHART_COLORS[hash % CHART_COLORS.length];
};

export const StoreModeDashboard: React.FC<StoreModeDataTableProps> = () => {
  const [startDate, setStartDate] = useState<string>(
    moment().subtract(1, "days").format("YYYY-MM-DD")
  );
  const [endDate, setEndDate] = useState<string>(moment().format("YYYY-MM-DD"));
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [filterEventType, setFilterEventType] = useState<string>("all");
  const [filterStoreType, setFilterStoreType] = useState<string>("all");
  const [selectedCountry, setSelectedCountry] = useState<string>("USA");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasDataBeenFetched, setHasDataBeenFetched] = useState(false);
  const [isDateRangeChanged, setIsDateRangeChanged] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(20);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("");

  const { data, isLoading, error, fetchData, progress } = useStoreModeData();
  //   const { data, isLoading, error, fetchData, progress } =
  //     useMockStoreModeData();

  // Validate dates whenever they change
  useEffect(() => {
    validateDates(startDate, endDate);
  }, [startDate, endDate]);

  const validateDates = (start: string, end: string): boolean => {
    if (!start || !end) {
      setValidationError("Both start date and end date are required");
      return false;
    }

    const startMoment = moment(start);
    const endMoment = moment(end);
    const today = moment().format("YYYY-MM-DD");

    if (!startMoment.isValid() || !endMoment.isValid()) {
      setValidationError("Invalid date format");
      return false;
    }
    if (startMoment.isAfter(endMoment)) {
      setValidationError("Start date cannot be after end date");
      return false;
    }
    if (endMoment.isAfter(today)) {
      setValidationError("End date cannot be in the future");
      return false;
    }

    const daysDiff = endMoment.diff(startMoment, "days");
    if (daysDiff > 90) {
      setValidationError("Date range cannot exceed 90 days");
      return false;
    }
    if (daysDiff < 0) {
      setValidationError("Invalid date range");
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleStateClick = (state: string) => {
    setSelectedState(state);
  };

  // Summary stats
  const summaryStats: StoreModeSummaryStats = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalEvents: 0,
        uniqueEventTypes: 0,
        uniqueStoreTypes: 0,
        dateRange: `${startDate} to ${endDate}`,
        averageEventsPerDay: 0,
        totalUsers: 0,
      };
    }

    const totalEvents = data.reduce((sum, row) => sum + row.count, 0);
    const uniqueEventTypes = new Set(data.map((row) => row.event_type)).size;
    const uniqueStoreTypes = new Set(
      data.map((row) => row.store_type || "unknown")
    ).size;
    const totalUsers = new Set(data.map((row) => row.user_id).filter(Boolean))
      .size;

    const start = moment(startDate);
    const end = moment(endDate);
    const daysDiff = Math.max(end.diff(start, "days") + 1, 1);
    const averageEventsPerDay = totalEvents / daysDiff;

    return {
      totalEvents,
      uniqueEventTypes,
      uniqueStoreTypes,
      dateRange: `${startDate} to ${endDate}`,
      averageEventsPerDay,
      totalUsers,
    };
  }, [data, startDate, endDate]);

  // Filtered data
  const filteredData: StoreModeRow[] = useMemo(() => {
    let filtered = data;
    if (filterEventType !== "all") {
      filtered = filtered.filter((row) => row.event_type === filterEventType);
    }
    if (filterStoreType !== "all") {
      filtered = filtered.filter(
        (row) => (row.store_type || "unknown") === filterStoreType
      );
    }
    if (selectedCountry !== "all") {
      filtered = filtered.filter(
        (row) => (row.country || "USA") === selectedCountry
      );
    }
    if (selectedPlatform !== "all") {
      filtered = filtered.filter(
        (row) => (row.platform || "unknown") === selectedPlatform
      );
    }
    return filtered;
  }, [
    data,
    filterEventType,
    filterStoreType,
    selectedCountry,
    selectedPlatform,
  ]);

  // Pagination
  const paginatedData: StoreModeRow[] = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  // Unique lists
  const eventTypes: string[] = useMemo(() => {
    const types = Array.from(new Set(data.map((row) => row.event_type)));
    return types.sort();
  }, [data]);

  const storeTypes: string[] = useMemo(() => {
    const s = new Set((data || []).map((row) => row.store_type || "unknown"));
    return Array.from(s).sort();
  }, [data]);

  const storeIds: string[] = useMemo(() => {
    const s = new Set(
      data.map((row) => row.store_id).filter(Boolean) as string[]
    );
    return Array.from(s).sort();
  }, [data]);

  const platforms: string[] = useMemo(() => {
    const p = new Set(
      data.map((row) => row.platform || "unknown").filter(Boolean) as string[]
    );
    return Array.from(p).sort();
  }, [data]);

  // Chart 1: Event Type
  const eventTypeChartData: EventTypeSlice[] = useMemo(() => {
    const eventCounts: Record<string, number> = {};
    filteredData.forEach((row) => {
      eventCounts[row.event_type] =
        (eventCounts[row.event_type] || 0) + row.count;
    });
    const total = Object.values(eventCounts).reduce((sum, c) => sum + c, 0);
    return Object.entries(eventCounts).map(([event_type, count]) => ({
      event_type: formatEventType(event_type),
      count,
      original_type: event_type,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }, [filteredData]);

  // Chart 2: Store Type (DONUT with % inside)
  const storeTypeChartData: StoreTypeSlice[] = useMemo(() => {
    const storeCounts: Record<string, number> = {};
    filteredData.forEach((row) => {
      const storeType = row?.store_type || "unknown";
      storeCounts[storeType] = (storeCounts[storeType] || 0) + row.count;
    });
    const total = Object.values(storeCounts).reduce((sum, c) => sum + c, 0);
    return Object.entries(storeCounts).map(([store_type, count]) => ({
      store_type: formatStoreType(store_type),
      count,
      original_type: store_type,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }, [filteredData]);

  // Chart 3: Store ID bars
  const storeIdChartData: StoreIdBar[] = useMemo(() => {
    let dataToUse = filteredData;
    if (selectedStoreId !== "all") {
      dataToUse = dataToUse.filter((row) => row.store_id === selectedStoreId);
    }
    const counts: Record<string, number> = {};
    dataToUse.forEach((row) => {
      if (row.store_id)
        counts[row.store_id] = (counts[row.store_id] || 0) + row.count;
    });
    return Object.entries(counts)
      .map(([store_id, count]) => ({ store_id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredData, selectedStoreId]);

  // Actions
  const handleFetchData = () => {
    if (validateDates(startDate, endDate)) {
      setHasDataBeenFetched(true);
      setIsDateRangeChanged(false);
      setPage(1);
      fetchData(startDate, endDate);
      setLastFetchTime(new Date());
    }
  };

  const handleDateChange = (newStartDate?: string, newEndDate?: string) => {
    if (newStartDate) setStartDate(newStartDate);
    if (newEndDate) setEndDate(newEndDate);
    setIsDateRangeChanged(true);
    setHasDataBeenFetched(false);
  };

  const handleExport = () => {
    if (filteredData.length === 0) return;

    const csvHeader =
      "Event Date,Event Type,Store Type,User ID,Store ID,Count,Country,Platform";
    const csvRows = filteredData.map(
      (row) =>
        `"${row.event_date}","${row.event_type}","${
          row.store_type || "unknown"
        }","${row.user_id || "N/A"}","${row.store_id || "N/A"}",${row.count},"${
          row.country || "USA"
        }","${row.platform || "unknown"}"`
    );
    const csvContent =
      "data:text/csv;charset=utf-8," + [csvHeader, ...csvRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `store-mode-data-${startDate}-to-${endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isFetchDisabled = isLoading || !!validationError;
  const isExportDisabled = isLoading || filteredData.length === 0;
  const areFiltersDisabled =
    isLoading || isDateRangeChanged || !hasDataBeenFetched || data.length === 0;

  // ---- Donut chart label renderer (D4: % inside segments) ----
  const renderDonutLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    // Place label at middle of the ring thickness
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const RAD = Math.PI / 180;
    const x = cx + radius * Math.cos(-midAngle * RAD);
    const y = cy + radius * Math.sin(-midAngle * RAD);
    const pct = Math.round((percent || 0) * 100);
    if (pct < 3) return null; // avoid clutter for tiny slices
    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        fontSize={12}
        fontWeight={600}
      >
        {pct}%
      </text>
    );
  };

  return (
    <div className="space-y-6">
      <ChatBotIcon position="bottom-right" />

      {/* Summary */}
      {!isLoading && data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <MetricCard
            title="Total Events"
            value={summaryStats.totalEvents.toLocaleString()}
            icon={Database}
          />
          <MetricCard
            title="Event Types"
            value={summaryStats.uniqueEventTypes}
            icon={BarChart3}
          />
          <MetricCard
            title="Store Types"
            value={summaryStats.uniqueStoreTypes}
            icon={Store}
          />
          <MetricCard
            title="Unique Users"
            value={summaryStats.totalUsers.toLocaleString()}
            icon={MapPin}
          />
          <MetricCard
            title="Date Range"
            value={`${moment(startDate).format("MMM D")} - ${moment(
              endDate
            ).format("MMM D")}`}
            icon={Calendar}
          />
        </div>
      )}

      {/* Controls */}
      <Card
        sx={{
          backgroundColor: "hsl(var(--card))",
          borderWidth: "1px",
          backdropFilter: "blur(8px)",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          {/* Date Range Row */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
              {/* Start */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-gray-400" />
                  <label className="text-gray-300 text-sm font-medium">
                    Start Date:
                  </label>
                </div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleDateChange(e.target.value, undefined)}
                  max={endDate}
                  className="bg-gray-700 text-muted-foreground px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* End */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-gray-400" />
                  <label className="text-gray-300 text-sm font-medium">
                    End Date:
                  </label>
                </div>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleDateChange(undefined, e.target.value)}
                  max={moment().format("YYYY-MM-DD")}
                  min={startDate}
                  className="bg-gray-700 text-muted-foreground px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {lastFetchTime && (
                <MuiTooltip
                  title={`Last fetched at ${lastFetchTime.toLocaleTimeString()}`}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: "#9CA3AF", cursor: "help" }}
                  >
                    Updated: {moment(lastFetchTime).fromNow()}
                  </Typography>
                </MuiTooltip>
              )}

              {/* Fetch Button */}
              {/* <Button
                variant="contained"
                size="small"
                onClick={handleFetchData}
                disabled={isFetchDisabled}
                startIcon={<RefreshCw size={16} />}
                sx={{
                  minWidth: "120px",
                  backgroundColor: validationError
                    ? "rgb(75 85 99)"
                    : "rgb(59 130 246)",
                  "&:hover": {
                    backgroundColor: validationError
                      ? "rgb(75 85 99)"
                      : "rgb(37 99 235)",
                  },
                }}
              >
                {validationError ? "Fix Dates First" : "Fetch Data"}
              </Button> */}

              {/* Export */}
              <Button
                variant="contained"
                size="small"
                onClick={handleExport}
                disabled={isExportDisabled}
                startIcon={<Download size={16} />}
                sx={{
                  minWidth: "120px",
                  backgroundColor: isExportDisabled
                    ? "rgb(75 85 99)"
                    : "rgb(22 163 74)",
                  "&:hover": {
                    backgroundColor: isExportDisabled
                      ? "rgb(75 85 99)"
                      : "rgb(21 128 61)",
                  },
                  "&.Mui-disabled": {
                    backgroundColor: "rgb(55 65 81)",
                    color: "rgb(156 163 175)",
                  },
                }}
              >
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap border-t border-gray-700 pt-4">
            {/* Country Filter */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-gray-400" />
                <label className="text-gray-300 text-sm font-medium">
                  Country:
                </label>
              </div>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                disabled={areFiltersDisabled}
                className="bg-gray-700 text-muted-foreground px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="USA">United States</option>
                <option value="CA">Canada</option>
              </select>
            </div>

            {/* Platform Filter */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Smartphone size={16} className="text-gray-400" />
                <label className="text-gray-300 text-sm font-medium">
                  Platform:
                </label>
              </div>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                disabled={areFiltersDisabled}
                className="bg-gray-700 text-muted-foreground px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="all">All Platforms</option>
                {platforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Event Type Filter */}
            {eventTypes.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-400" />
                  <label className="text-gray-300 text-sm font-medium">
                    Event Type:
                  </label>
                </div>
                <select
                  value={filterEventType}
                  onChange={(e) => setFilterEventType(e.target.value)}
                  disabled={areFiltersDisabled}
                  className="bg-gray-700 text-muted-foreground px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="all">All Event Types</option>
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>
                      {formatEventType(type)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Store Type Filter */}
            {storeTypes.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Store size={16} className="text-gray-400" />
                  <label className="text-gray-300 text-sm font-medium">
                    Store Type:
                  </label>
                </div>
                <select
                  value={filterStoreType}
                  onChange={(e) => setFilterStoreType(e.target.value)}
                  disabled={areFiltersDisabled}
                  className="bg-gray-700 text-muted-foreground px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="all">All Store Types</option>
                  {storeTypes.map((storeType) => (
                    <option key={storeType} value={storeType}>
                      {formatStoreType(storeType)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Validation */}
          {validationError && (
            <Box sx={{ mt: 2 }}>
              <Alert
                severity="warning"
                sx={{
                  backgroundColor: "rgb(120 53 15 / 0.5)",
                  border: "1px solid rgb(234 88 12)",
                  borderRadius: "8px",
                }}
              >
                <Typography variant="body2" sx={{ color: "rgb(254 215 170)" }}>
                  {validationError}
                </Typography>
              </Alert>
            </Box>
          )}

          {/* Active Filters */}
          {(filterEventType !== "all" ||
            filterStoreType !== "all" ||
            selectedCountry !== "USA" ||
            selectedPlatform !== "all") && (
            <Box sx={{ mt: 2 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
                  Active filters:
                </Typography>
                {filterEventType !== "all" && (
                  <Chip
                    label={`Event: ${formatEventType(filterEventType)}`}
                    size="small"
                    onDelete={() => setFilterEventType("all")}
                    disabled={areFiltersDisabled}
                    sx={{
                      backgroundColor: `${getEventTypeColor(
                        filterEventType
                      )}20`,
                      color: getEventTypeColor(filterEventType),
                      border: `1px solid ${getEventTypeColor(
                        filterEventType
                      )}40`,
                      "&.Mui-disabled": { opacity: 0.6 },
                    }}
                  />
                )}
                {filterStoreType !== "all" && (
                  <Chip
                    label={`Store: ${formatStoreType(filterStoreType)}`}
                    size="small"
                    onDelete={() => setFilterStoreType("all")}
                    disabled={areFiltersDisabled}
                    sx={{
                      backgroundColor: `${getStoreTypeColor(
                        filterStoreType
                      )}20`,
                      color: getStoreTypeColor(filterStoreType),
                      border: `1px solid ${getStoreTypeColor(
                        filterStoreType
                      )}40`,
                      "&.Mui-disabled": { opacity: 0.6 },
                    }}
                  />
                )}
                {selectedCountry !== "USA" && (
                  <Chip
                    label={`Country: ${
                      selectedCountry === "CA" ? "Canada" : "United States"
                    }`}
                    size="small"
                    onDelete={() => setSelectedCountry("USA")}
                    disabled={areFiltersDisabled}
                    sx={{
                      backgroundColor: "#3B82F620",
                      color: "#3B82F6",
                      border: "1px solid #3B82F640",
                      "&.Mui-disabled": { opacity: 0.6 },
                    }}
                  />
                )}
                {selectedPlatform !== "all" && (
                  <Chip
                    label={`Platform: ${selectedPlatform}`}
                    size="small"
                    onDelete={() => setSelectedPlatform("all")}
                    disabled={areFiltersDisabled}
                    sx={{
                      backgroundColor: "#8B5CF620",
                      color: "#8B5CF6",
                      border: "1px solid #8B5CF640",
                      "&.Mui-disabled": { opacity: 0.6 },
                    }}
                  />
                )}
                {(filterEventType !== "all" ||
                  filterStoreType !== "all" ||
                  selectedCountry !== "USA" ||
                  selectedPlatform !== "all") && (
                  <Button
                    size="small"
                    onClick={() => {
                      setFilterEventType("all");
                      setFilterStoreType("all");
                      setSelectedCountry("USA");
                      setSelectedPlatform("all");
                    }}
                    disabled={areFiltersDisabled}
                    sx={{
                      color: "#60A5FA",
                      "&:hover": { color: "#93C5FD" },
                      "&.Mui-disabled": { color: "rgb(156 163 175)" },
                    }}
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <Card
          sx={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid rgb(55 65 81)",
            backdropFilter: "blur(8px)",
          }}
        >
          <CardContent sx={{ p: 4, textAlign: "center" }}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <Typography variant="h6" sx={{ color: "white", mb: 1 }}>
              Loading Store Mode Data
            </Typography>

            {progress ? (
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="body2"
                  sx={{ color: "rgb(156 163 175)", mb: 1 }}
                >
                  Fetching {progress.current} of {progress.total} chunks...
                </Typography>
                {progress.currentChunk && (
                  <Typography
                    variant="caption"
                    sx={{ color: "rgb(107 114 128)", display: "block", mb: 2 }}
                  >
                    Current: {progress.currentChunk}
                  </Typography>
                )}
                <LinearProgress
                  variant="determinate"
                  value={(progress.current / progress.total) * 100}
                  sx={{
                    backgroundColor: "rgb(55 65 81)",
                    "& .MuiLinearProgress-bar": { backgroundColor: "#2EDAFF" },
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{ color: "rgb(107 114 128)", display: "block", mt: 1 }}
                >
                  {Math.round((progress.current / progress.total) * 100)}%
                  complete
                </Typography>
              </Box>
            ) : (
              <Typography
                variant="body2"
                sx={{ color: "rgb(156 163 175)", mb: 2 }}
              >
                Preparing to fetch data for {startDate} to {endDate}...
              </Typography>
            )}

            <Typography
              variant="caption"
              sx={{ color: "rgb(107 114 128)", display: "block", mt: 1 }}
            >
              Large date ranges are fetched in smaller chunks to avoid timeouts
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && !isLoading && (
        <Alert
          severity="error"
          sx={{
            backgroundColor: "rgb(127 29 29 / 0.5)",
            border: "1px solid rgb(239 68 68)",
            borderRadius: "8px",
            backdropFilter: "blur(8px)",
          }}
          action={
            <Button
              size="small"
              onClick={handleFetchData}
              disabled={isLoading}
              sx={{ color: "white" }}
            >
              Try Again
            </Button>
          }
        >
          <Typography variant="body1" fontWeight="bold" sx={{ color: "white" }}>
            Error Loading Data
          </Typography>
          <Typography variant="body2" sx={{ color: "rgb(254 202 202)" }}>
            {error}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "rgb(254 202 202)", display: "block", mt: 1 }}
          >
            Tip: Try selecting a smaller date range
          </Typography>
        </Alert>
      )}

      {/* Initial no-fetch */}
      {!isLoading && !error && !hasDataBeenFetched && (
        <Card
          sx={{
            backgroundColor: "hsl(var(--card))",
            borderWidth: "1px",
            backdropFilter: "blur(8px)",
          }}
        >
          <CardContent sx={{ p: 6, textAlign: "center" }}>
            <Store className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <Typography variant="h6" sx={{ color: "white", mb: 2 }}>
              Ready to Fetch Omni Data
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "rgb(156 163 175)", mb: 4 }}
            >
              Select your date range (up to 90 days) and click "Fetch Data" to
              load store mode analytics
            </Typography>
            <Button
              variant="contained"
              onClick={handleFetchData}
              disabled={isFetchDisabled}
              startIcon={<RefreshCw size={18} />}
              sx={{
                backgroundColor: validationError
                  ? "rgb(75 85 99)"
                  : "rgb(59 130 246)",
                "&:hover": {
                  backgroundColor: validationError
                    ? "rgb(75 85 99)"
                    : "rgb(37 99 235)",
                },
              }}
            >
              {validationError ? "Fix Dates First" : "Fetch Data"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data Tabs */}
      {!isLoading && !error && hasDataBeenFetched && data.length > 0 && (
        <Card
          sx={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid rgb(55 65 81)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{
                borderBottom: "1px solid #374151",
                "& .MuiTab-root": {
                  color: "#9CA3AF",
                  textTransform: "none",
                  fontWeight: 500,
                  fontSize: "14px",
                  "&.Mui-selected": { color: "#3B82F6" },
                },
                "& .MuiTabs-indicator": { backgroundColor: "#3B82F6" },
              }}
            >
              <Tab label="Charts & Analytics" />
              <Tab label="Data Table" />
              <Tab label="Store View" />
            </Tabs>

            {/* Charts Tab */}
            <TabPanel value={activeTab} index={0}>
              <div className="space-y-6">
                {/* Side-by-side charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Event Type Pie */}
                  <Card
                    sx={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <CardContent>
                      <Typography
                        variant="h6"
                        sx={{ color: "white", mb: 3, textAlign: "center" }}
                      >
                        Event Type Distribution
                      </Typography>
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie
                            data={eventTypeChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderDonutLabel}
                            outerRadius={120}
                            dataKey="count"
                            nameKey="event_type"
                          >
                            {eventTypeChartData.map((entry, index) => (
                              <Cell
                                key={`ev-cell-${entry.original_type}-${index}`}
                                fill={
                                  getEventTypeColor(entry.original_type) ||
                                  CHART_COLORS[index % CHART_COLORS.length]
                                }
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value: any, name: any, p: any) => {
                              const slice = p?.payload as EventTypeSlice;
                              return [
                                `${value as number} (${slice.percentage.toFixed(
                                  1
                                )}%)`,
                                name as string,
                              ];
                            }}
                            contentStyle={{
                              backgroundColor: "#2EE8D3",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              borderRadius: "8px",
                              color: "#FFFFFF",
                              fontSize: "12px",
                            }}
                          />
                          <Legend
                            layout="vertical"
                            verticalAlign="top"
                            align="right"
                            wrapperStyle={{
                              paddingLeft: "10px",
                              fontSize: "11px",
                              maxWidth: "40%",
                            }}
                            formatter={(value) => (
                              <span
                                style={{ color: "#D1D5DB", fontSize: "11px" }}
                              >
                                {value}
                              </span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <Box sx={{ mt: 2, textAlign: "center" }}>
                        <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
                          Total Events:{" "}
                          {eventTypeChartData
                            .reduce((sum, item) => sum + item.count, 0)
                            .toLocaleString()}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>

                  {/* Store Type DONUT */}
                  <Card
                    sx={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <CardContent>
                      <Typography
                        variant="h6"
                        sx={{ color: "white", mb: 3, textAlign: "center" }}
                      >
                        Store Type Distribution
                      </Typography>
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie
                            data={storeTypeChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={120}
                            labelLine={false}
                            label={renderDonutLabel}
                            dataKey="count"
                            nameKey="store_type"
                          >
                            {storeTypeChartData.map((entry, index) => (
                              <Cell
                                key={`st-cell-${entry.original_type}-${index}`}
                                fill={getStoreTypeColor(entry.original_type)}
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            formatter={(value: any, name: any, p: any) => {
                              const slice = p?.payload as StoreTypeSlice;
                              return [
                                `${value as number} (${slice.percentage.toFixed(
                                  1
                                )}%)`,
                                name as string,
                              ];
                            }}
                            contentStyle={{
                              backgroundColor: "#2EE8D3",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              borderRadius: "8px",
                              color: "#FFFFFF",
                              fontSize: "12px",
                            }}
                          />
                          <Legend
                            layout="vertical"
                            verticalAlign="top"
                            align="right"
                            wrapperStyle={{
                              paddingLeft: "10px",
                              fontSize: "11px",
                              maxWidth: "40%",
                            }}
                            formatter={(value) => (
                              <span
                                style={{ color: "#D1D5DB", fontSize: "11px" }}
                              >
                                {value}
                              </span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <Box sx={{ mt: 2, textAlign: "center" }}>
                        <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
                          Total Events:{" "}
                          {storeTypeChartData
                            .reduce((sum, item) => sum + item.count, 0)
                            .toLocaleString()}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </div>

                {/* Store ID Bars */}
                <Card
                  sx={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <CardContent>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                      <Typography variant="h6" sx={{ color: "white" }}>
                        Store ID Performance
                      </Typography>
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel sx={{ color: "#9CA3AF" }}>
                          Filter by Store
                        </InputLabel>
                        <Select
                          value={selectedStoreId}
                          onChange={(e) => setSelectedStoreId(e.target.value)}
                          label="Filter by Store"
                          sx={{
                            color: "white",
                            backgroundColor: "rgb(55 65 81)",
                            "& .MuiOutlinedInput-notchedOutline": {
                              borderColor: "#4B5563",
                            },
                            "&:hover .MuiOutlinedInput-notchedOutline": {
                              borderColor: "#6B7280",
                            },
                          }}
                        >
                          <MenuItem value="all">All Stores</MenuItem>
                          {storeIds.map((storeId) => (
                            <MenuItem key={storeId} value={storeId}>
                              {storeId}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>

                    <ResponsiveContainer width="100%" height={400}>
                      <ReBarChart
                        data={storeIdChartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                        <XAxis
                          dataKey="store_id"
                          stroke="#9CA3AF"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          fontSize={12}
                          interval={0}
                        />
                        <YAxis stroke="#9CA3AF" />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "#2EE8D3",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "8px",
                            color: "#000000",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="count"
                          name="Event Count"
                          fill="#10B981"
                          radius={[4, 4, 0, 0]}
                        />
                      </ReBarChart>
                    </ResponsiveContainer>

                    <Box sx={{ mt: 2, textAlign: "center" }}>
                      <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
                        {selectedStoreId === "all"
                          ? `Showing top ${storeIdChartData.length} stores by event count`
                          : `Showing events for store: ${selectedStoreId}`}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </div>
            </TabPanel>

            {/* Data Table Tab */}
            <TabPanel value={activeTab} index={1}>
              <TableContainer sx={{ maxHeight: "600px", borderRadius: "8px" }}>
                <Table
                  stickyHeader
                  sx={{ minWidth: 650 }}
                  aria-label="store mode data table"
                >
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "hsl(var(--card))" }}>
                      <TableCell
                        sx={{
                          color: "#F3F4F6",
                          fontWeight: "bold",
                          fontSize: "14px",
                          width: "150px",
                          backgroundColor: "hsl(var(--card)) !important",
                        }}
                      >
                        Event Date
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "#F3F4F6",
                          fontWeight: "bold",
                          fontSize: "14px",
                          backgroundColor: "hsl(var(--card)) !important",
                        }}
                      >
                        Event Type
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "#F3F4F6",
                          fontWeight: "bold",
                          fontSize: "14px",
                          backgroundColor: "hsl(var(--card)) !important",
                        }}
                      >
                        Store Type
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "#F3F4F6",
                          fontWeight: "bold",
                          fontSize: "14px",
                          backgroundColor: "hsl(var(--card)) !important",
                        }}
                      >
                        User ID
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "#F3F4F6",
                          fontWeight: "bold",
                          fontSize: "14px",
                          backgroundColor: "hsl(var(--card)) !important",
                        }}
                      >
                        Store ID
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "#F3F4F6",
                          fontWeight: "bold",
                          fontSize: "14px",
                          backgroundColor: "hsl(var(--card)) !important",
                        }}
                      >
                        Country
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "#F3F4F6",
                          fontWeight: "bold",
                          fontSize: "14px",
                          backgroundColor: "hsl(var(--card)) !important",
                        }}
                      >
                        Platform
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "#F3F4F6",
                          fontWeight: "bold",
                          fontSize: "14px",
                          backgroundColor: "hsl(var(--card)) !important",
                        }}
                      >
                        Count
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedData.length > 0 ? (
                      paginatedData.map((row, index) => (
                        <TableRow
                          key={`${row.event_date}-${row.event_type}-${
                            row.store_id ?? "NA"
                          }-${index}`}
                          sx={{
                            "&:nth-of-type(odd)": {
                              backgroundColor: "rgb(55 65 81 / 0.3)",
                            },
                            "&:nth-of-type(even)": {
                              backgroundColor: "hsl(var(--card))",
                            },
                            "&:last-child td, &:last-child th": { border: 0 },
                            "&:hover": {
                              backgroundColor: "rgb(75 85 99 / 0.5)",
                            },
                          }}
                        >
                          <TableCell
                            sx={{ color: "#D1D5DB", fontSize: "14px" }}
                          >
                            {moment(row.event_date).format("MMM D, YYYY")}
                          </TableCell>
                          <TableCell
                            sx={{ color: "#D1D5DB", fontSize: "14px" }}
                          >
                            <Chip
                              label={formatEventType(row.event_type)}
                              size="small"
                              sx={{
                                backgroundColor: `${getEventTypeColor(
                                  row.event_type
                                )}20`,
                                color: getEventTypeColor(row.event_type),
                                border: `1px solid ${getEventTypeColor(
                                  row.event_type
                                )}40`,
                                fontSize: "12px",
                                height: "24px",
                              }}
                            />
                          </TableCell>
                          <TableCell
                            sx={{ color: "#D1D5DB", fontSize: "14px" }}
                          >
                            {row.store_type ? (
                              <Chip
                                label={formatStoreType(row.store_type)}
                                size="small"
                                sx={{
                                  backgroundColor: `${getStoreTypeColor(
                                    row.store_type
                                  )}20`,
                                  color: getStoreTypeColor(row.store_type),
                                  border: `1px solid ${getStoreTypeColor(
                                    row.store_type
                                  )}40`,
                                  fontSize: "12px",
                                  height: "24px",
                                }}
                              />
                            ) : (
                              <span
                                style={{
                                  color: "#9CA3AF",
                                  fontStyle: "italic",
                                }}
                              >
                                unknown
                              </span>
                            )}
                          </TableCell>
                          <TableCell
                            sx={{
                              color: "#D1D5DB",
                              fontSize: "14px",
                              fontFamily: "monospace",
                            }}
                          >
                            {row.user_id || "N/A"}
                          </TableCell>
                          <TableCell
                            sx={{
                              color: "#D1D5DB",
                              fontSize: "14px",
                              fontFamily: "monospace",
                            }}
                          >
                            {row.store_id || "N/A"}
                          </TableCell>
                          <TableCell
                            sx={{ color: "#D1D5DB", fontSize: "14px" }}
                          >
                            <Chip
                              label={row.country || "USA"}
                              size="small"
                              sx={{
                                backgroundColor:
                                  row.country === "CA"
                                    ? "#3B82F620"
                                    : "#10B98120",
                                color:
                                  row.country === "CA" ? "#3B82F6" : "#10B981",
                                border: `1px solid ${
                                  row.country === "CA"
                                    ? "#3B82F640"
                                    : "#10B98140"
                                }`,
                                fontSize: "12px",
                                height: "24px",
                              }}
                            />
                          </TableCell>
                          <TableCell
                            sx={{ color: "#D1D5DB", fontSize: "14px" }}
                          >
                            <Chip
                              label={row.platform || "unknown"}
                              size="small"
                              sx={{
                                backgroundColor: "#8B5CF620",
                                color: "#8B5CF6",
                                border: "1px solid #8B5CF640",
                                fontSize: "12px",
                                height: "24px",
                              }}
                            />
                          </TableCell>
                          <TableCell
                            sx={{
                              color: "#D1D5DB",
                              fontSize: "14px",
                              fontWeight: "bold",
                            }}
                          >
                            {row.count.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          sx={{ textAlign: "center", color: "#9CA3AF", py: 4 }}
                        >
                          No data matches the current filters
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {filteredData.length > 0 && (
                <Box
                  sx={{
                    p: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid #374151",
                  }}
                >
                  <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
                    Showing {(page - 1) * rowsPerPage + 1} to{" "}
                    {Math.min(page * rowsPerPage, filteredData.length)} of{" "}
                    {filteredData.length.toLocaleString()} entries
                  </Typography>
                  <Pagination
                    count={Math.ceil(filteredData.length / rowsPerPage)}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    color="primary"
                    sx={{
                      "& .MuiPaginationItem-root": {
                        color: "#9CA3AF",
                        borderColor: "#4B5563",
                        "&.Mui-selected": {
                          backgroundColor: "#3B82F6",
                          color: "white",
                          "&:hover": { backgroundColor: "#2563EB" },
                        },
                        "&:hover": { backgroundColor: "#4B5563" },
                      },
                    }}
                  />
                </Box>
              )}
            </TabPanel>

            {/* Store View Tab */}
            <TabPanel value={activeTab} index={2}>
              <div className="space-y-6">
                {/* Country Selection and Info */}
                {selectedState && (
                  <Card
                    sx={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <Typography variant="h6" sx={{ color: "white" }}>
                            {selectedState} - Sephora Store Analytics (
                            {selectedCountry})
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
                            Click on map to select different{" "}
                            {selectedCountry === "CA" ? "province" : "state"} •
                            Hover for store details
                          </Typography>
                        </div>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setSelectedState("")}
                          startIcon={<MapPin size={16} />}
                          sx={{
                            color: "#60A5FA",
                            borderColor: "#60A5FA",
                            "&:hover": {
                              backgroundColor: "rgba(96, 165, 250, 0.1)",
                              borderColor: "#93C5FD",
                            },
                          }}
                        >
                          Clear Selection
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Interactive Map */}
                <Card
                  sx={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Typography
                      variant="h6"
                      sx={{ color: "white", mb: 2, textAlign: "center" }}
                    >
                      Sephora Store Events by{" "}
                      {selectedCountry === "CA" ? "Province" : "State"} -{" "}
                      {selectedCountry}
                    </Typography>

                    <StoreModeMap
                      data={filteredData}
                      selectedState={selectedState}
                      selectedCountry={selectedCountry}
                      onStateClick={handleStateClick}
                    />

                    <Box sx={{ mt: 2, textAlign: "center" }}>
                      <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
                        Click on any{" "}
                        {selectedCountry === "CA" ? "province" : "state"} to
                        view detailed analytics • Hover for store information
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

                {/* State/Province Details (when a region is selected) */}
                {selectedState && (
                  <Card
                    sx={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ color: "white", mb: 3 }}>
                        Detailed Sephora Store Analytics for {selectedState} (
                        {selectedCountry})
                      </Typography>

                      {/* Region-specific statistics */}
                      {(() => {
                        // Filter data for the selected region and country
                        const regionData = filteredData.filter(
                          (row) =>
                            row.state &&
                            row.state.toUpperCase() ===
                              selectedState.toUpperCase() &&
                            (row.country || "USA") === selectedCountry
                        );

                        const totalEvents = regionData.reduce(
                          (sum, row) => sum + row.count,
                          0
                        );
                        const uniqueStores = new Set(
                          regionData.map((row) => row.store_id).filter(Boolean)
                        ).size;
                        const uniqueUsers = new Set(
                          regionData.map((row) => row.user_id).filter(Boolean)
                        ).size;

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <MetricCard
                              title="Total Events"
                              value={totalEvents.toLocaleString()}
                              icon={Database}
                            />
                            <MetricCard
                              title="Unique Stores"
                              value={uniqueStores.toLocaleString()}
                              icon={Store}
                            />
                            <MetricCard
                              title="Unique Users"
                              value={uniqueUsers.toLocaleString()}
                              icon={MapPin}
                            />
                          </div>
                        );
                      })()}

                      {/* Store details table */}
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell
                                sx={{ color: "#F3F4F6", fontWeight: "bold" }}
                              >
                                Store ID
                              </TableCell>
                              <TableCell
                                sx={{ color: "#F3F4F6", fontWeight: "bold" }}
                              >
                                Store Type
                              </TableCell>
                              <TableCell
                                sx={{ color: "#F3F4F6", fontWeight: "bold" }}
                              >
                                Platform
                              </TableCell>
                              <TableCell
                                sx={{ color: "#F3F4F6", fontWeight: "bold" }}
                              >
                                Total Events
                              </TableCell>
                              <TableCell
                                sx={{ color: "#F3F4F6", fontWeight: "bold" }}
                              >
                                Event Types
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(() => {
                              const regionStores = filteredData
                                .filter(
                                  (row) =>
                                    row.state &&
                                    row.state.toUpperCase() ===
                                      selectedState.toUpperCase() &&
                                    (row.country || "USA") === selectedCountry
                                )
                                .reduce(
                                  (acc, row) => {
                                    if (!row.store_id) return acc;

                                    const storeId = row.store_id;
                                    if (!acc[storeId]) {
                                      acc[storeId] = {
                                        store_id: storeId,
                                        store_type: row.store_type || "Unknown",
                                        platform: row.platform || "unknown",
                                        totalEvents: 0,
                                        eventTypes: new Set<string>(),
                                      };
                                    }

                                    acc[storeId].totalEvents += row.count;
                                    acc[storeId].eventTypes.add(row.event_type);

                                    return acc;
                                  },
                                  {} as Record<
                                    string,
                                    {
                                      store_id: string;
                                      store_type: string;
                                      platform: string;
                                      totalEvents: number;
                                      eventTypes: Set<string>;
                                    }
                                  >
                                );

                              const storeArray = Object.values(regionStores);

                              if (storeArray.length === 0) {
                                return (
                                  <TableRow>
                                    <TableCell
                                      colSpan={5}
                                      sx={{
                                        textAlign: "center",
                                        color: "#9CA3AF",
                                        py: 4,
                                      }}
                                    >
                                      No Sephora store details available for{" "}
                                      {selectedState} in {selectedCountry}
                                    </TableCell>
                                  </TableRow>
                                );
                              }

                              return storeArray.map((store) => (
                                <TableRow key={store.store_id}>
                                  <TableCell
                                    sx={{
                                      color: "#D1D5DB",
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    {store.store_id}
                                  </TableCell>
                                  <TableCell sx={{ color: "#D1D5DB" }}>
                                    <Chip
                                      label={formatStoreType(store.store_type)}
                                      size="small"
                                      sx={{
                                        backgroundColor: `${getStoreTypeColor(
                                          store.store_type
                                        )}20`,
                                        color: getStoreTypeColor(
                                          store.store_type
                                        ),
                                        border: `1px solid ${getStoreTypeColor(
                                          store.store_type
                                        )}40`,
                                        fontSize: "12px",
                                        height: "24px",
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell sx={{ color: "#D1D5DB" }}>
                                    <Chip
                                      label={store.platform}
                                      size="small"
                                      sx={{
                                        backgroundColor: "#8B5CF620",
                                        color: "#8B5CF6",
                                        border: "1px solid #8B5CF640",
                                        fontSize: "12px",
                                        height: "24px",
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      color: "#D1D5DB",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    {store.totalEvents.toLocaleString()}
                                  </TableCell>
                                  <TableCell sx={{ color: "#D1D5DB" }}>
                                    {Array.from(store.eventTypes)
                                      .map((type) => formatEventType(type))
                                      .join(", ")}
                                  </TableCell>
                                </TableRow>
                              ));
                            })()}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabPanel>
          </CardContent>
        </Card>
      )}

      {/* No Data */}
      {!isLoading && !error && hasDataBeenFetched && data.length === 0 && (
        <Card
          sx={{
            backgroundColor: "hsl(var(--card))",
            borderWidth: "1px",
            backdropFilter: "blur(8px)",
          }}
        >
          <CardContent sx={{ p: 6, textAlign: "center" }}>
            <Store className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <Typography variant="h6" sx={{ color: "white", mb: 2 }}>
              No Data Available
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "rgb(156 163 175)", mb: 4 }}
            >
              No store mode data found for the selected date range ({startDate}{" "}
              to {endDate})
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "rgb(107 114 128)", display: "block" }}
            >
              Try selecting a different date range or check if the data source
              is available
            </Typography>
          </CardContent>
        </Card>
      )}
    </div>
  );
};