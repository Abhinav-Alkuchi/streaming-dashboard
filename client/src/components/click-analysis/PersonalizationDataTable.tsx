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
  Tooltip,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import {
  Calendar,
  Download,
  RefreshCw,
  Filter,
  Database,
  Monitor,
  Smartphone,
  Users,
  Grid,
  Table as TableIcon,
  DollarSign,
  Maximize2,
  X,
} from "lucide-react";
import moment from "moment";
import { usePersonalizationData } from "../../hooks/usePersonalizationData";
import { MetricCard } from "../util-components/MetricCard";
import { ChatBotIcon } from "../chat-bot/ChatBotIcon";
import type {
  PersonalizationDataTableProps,
  PersonalizationSummaryStats,
} from "../../types";

export const PersonalizationDataTable: React.FC<
  PersonalizationDataTableProps
> = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    moment().format("YYYY-MM-DD")
  );
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [filterContentType, setFilterContentType] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasDataBeenFetched, setHasDataBeenFetched] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, error, fetchData } = usePersonalizationData();

  const dummyImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzA4QTA0QiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZmZmZiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
  useEffect(() => {
    validateDate(selectedDate);
  }, [selectedDate]);

  const validateDate = (date: string): boolean => {
    if (!date) {
      setValidationError("Date is required");
      return false;
    }

    const dateMoment = moment(date);
    const today = moment().format("YYYY-MM-DD");

    if (!dateMoment.isValid()) {
      setValidationError("Invalid date format");
      return false;
    }

    if (dateMoment.isAfter(today)) {
      setValidationError("Date cannot be in the future");
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedProduct(null);
  };

  const summaryStats: PersonalizationSummaryStats = useMemo(() => {
    if (data.length === 0) {
      return {
        totalPurchases: 0,
        totalRevenue: 0,
        uniqueContentTypes: 0,
        uniquePlatforms: 0,
        dateRange: selectedDate,
        averagePurchasesPerComponent: 0,
        averageRevenuePerComponent: 0,
      };
    }

    const totalPurchases = data.reduce(
      (sum, row) => sum + row.purchase_count,
      0
    );
    const totalRevenue = data.reduce(
      (sum, row) => sum + (row.total_price || 0),
      0
    );
    const uniqueContentTypes = new Set(data.map((row) => row.content_type))
      .size;
    const uniquePlatforms = new Set(
      data.map((row) => row.platform || "unknown")
    ).size;
    const averagePurchasesPerComponent = totalPurchases / data.length;
    const averageRevenuePerComponent = totalRevenue / data.length;

    return {
      totalPurchases,
      totalRevenue,
      uniqueContentTypes,
      uniquePlatforms,
      dateRange: selectedDate,
      averagePurchasesPerComponent,
      averageRevenuePerComponent,
    };
  }, [data, selectedDate]);

  const filteredData = useMemo(() => {
    let filtered = data;

    if (filterContentType !== "all") {
      filtered = filtered.filter(
        (row) => row.content_type === filterContentType
      );
    }

    if (filterPlatform !== "all") {
      filtered = filtered.filter(
        (row) => (row.platform || "unknown") === filterPlatform
      );
    }

    return filtered;
  }, [data, filterContentType, filterPlatform]);

  const contentTypes = useMemo(() => {
    const types = Array.from(new Set(data.map((row) => row.content_type)));
    return types.sort();
  }, [data]);

  const platforms = useMemo(() => {
    const platformSet = new Set(data.map((row) => row.platform || "unknown"));
    return Array.from(platformSet).sort();
  }, [data]);

  const handleFetchData = () => {
    if (validateDate(selectedDate)) {
      console.log("🔄 Manual personalization data fetch triggered");
      setHasDataBeenFetched(true);
      fetchData(selectedDate);
      setLastFetchTime(new Date());
    }
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setHasDataBeenFetched(false);
  };

  const handleExport = () => {
    if (filteredData.length === 0) return;

    const csvContent =
      "data:text/csv;charset=utf-8," +
      "CMS Entry ID,Content Type,Platform,Purchase Count,Unit Price,Total Revenue\n" +
      filteredData
        .map(
          (row) =>
            `"${row.child_sid}","${row.content_type}","${
              row.platform || "unknown"
            }",${row.purchase_count},${row.unit_price || 0},${row.total_price || 0}`
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `personalization-data-${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatContentType = (contentType: string) => {
    return contentType
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .toLowerCase();
  };

  const formatPlatform = (platform: string) => {
    if (!platform || platform === "unknown") return "Unknown";
    return platform.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getContentTypeColor = (contentType: string) => {
    const colors: { [key: string]: string } = {
      bannerlist: "#2EDAFF",
      banner: "#10B981",
      product_grid: "#F59E0B",
      recommendation: "#EF4444",
      hero: "#EC4899",
      promotion: "#8B5CF6",
    };

    return colors[contentType.toLowerCase()] || "#6B7280";
  };

  const getPlatformColor = (platform: string) => {
    const colors: { [key: string]: string } = {
      "desktop web": "#2EDAFF",
      "mobile": "#10B981",
      "tablet web": "#F59E0B",
      "iphone app": "#F5D327",
      "android app": "#34D399",
      unknown: "#6B7280",
    };

    return colors[platform.toLowerCase()] || "#6B7280";
  };

  const getPlatformIcon = (platform: string) => {
    const platformLower = platform.toLowerCase();
    if (
      platformLower.includes("mobile") ||
      platformLower.includes("iphone app") ||
      platformLower.includes("android app")
    ) {
      return <Smartphone color="#FFFFFF" size={14} />;
    }
    return <Monitor size={14} />;
  };

  const isFetchDisabled = isLoading || !!validationError;
  const isExportDisabled = isLoading || filteredData.length === 0;
  const areFiltersDisabled =
    isLoading || !hasDataBeenFetched || data.length === 0;

  // Product Detail Modal Component
  const ProductDetailModal = () => (
    <Dialog
      open={modalOpen}
      onClose={handleCloseModal}
      maxWidth="lg"
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          backgroundColor: 'rgb(31 41 55 / 0.95)',
          border: '1px solid rgb(75 85 99)',
          backdropFilter: 'blur(8px)',
          borderRadius: '12px',
          maxWidth: '900px',
        }
      }}
    >
      <DialogTitle sx={{ 
        p: 2, 
        borderBottom: '1px solid rgb(55 65 81)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>
          Product Details
        </Typography>
        <IconButton onClick={handleCloseModal} sx={{ color: 'rgb(156 163 175)' }}>
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {selectedProduct && (
          <div className="flex flex-col lg:flex-row">
            {/* Left Side - Banner Image */}
            <div className="lg:w-1/2 p-4">
              <div className="relative">
                <img
                  src={
                    selectedProduct.image_data
                      ? `https://www.sephora.com${
                          selectedProduct.image_data.startsWith("/") ? "" : "/"
                        }${selectedProduct.image_data}`
                      : dummyImage
                  }
                  alt={selectedProduct.child_sid}
                  className="w-full h-48 lg:h-64 object-cover rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== dummyImage) {
                      target.src = dummyImage;
                    }
                  }}
                />
                <div className="absolute top-2 right-2">
                  <Chip
                    label={formatContentType(selectedProduct.content_type)}
                    size="small"
                    sx={{
                      backgroundColor: getContentTypeColor(selectedProduct.content_type) + "20",
                      color: getContentTypeColor(selectedProduct.content_type),
                      border: `1px solid ${getContentTypeColor(selectedProduct.content_type)}40`,
                      fontWeight: 600,
                      fontSize: '10px',
                      height: '20px',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Right Side - Product Details */}
            <div className="lg:w-1/2 p-4 bg-gray-800/50">
              <div className="space-y-4">
                {/* Product Title - Wrapped */}
                <div>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: 'white', 
                      fontWeight: 'bold', 
                      fontSize: '16px',
                      wordBreak: 'break-word',
                      lineHeight: '1.4'
                    }}
                  >
                    {selectedProduct.child_sid}
                  </Typography>
                </div>

                {/* Platform Info */}
                <div className="flex items-center gap-2">
                  {getPlatformIcon(selectedProduct.platform || "unknown")}
                  <Chip
                    label={formatPlatform(selectedProduct.platform || "unknown")}
                    size="small"
                    sx={{
                      backgroundColor: getPlatformColor(selectedProduct.platform || "unknown") + "20",
                      color: getPlatformColor(selectedProduct.platform || "unknown"),
                      border: `1px solid ${getPlatformColor(selectedProduct.platform || "unknown")}40`,
                      fontWeight: 500,
                      fontSize: '11px',
                    }}
                  />
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Total Revenue - Blue Background */}
                  <div className="bg-blue-600 rounded-lg p-3 text-center">
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', fontSize: '20px', mb: 0.5 }}>
                      ${selectedProduct.total_price ? (selectedProduct.total_price / 1000).toFixed(0) + 'K' : '0'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '11px' }}>
                      Total Revenue
                    </Typography>
                  </div>

                  {/* Quantity Sold - Gray Background */}
                  <div className="bg-gray-700 rounded-lg p-3 text-center">
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold', fontSize: '20px', mb: 0.5 }}>
                      {selectedProduct.purchase_count.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgb(156 163 175)', fontSize: '11px' }}>
                      Quantity Sold
                    </Typography>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="space-y-3">
                  {selectedProduct.unit_price && selectedProduct.unit_price > 0 && (
                    <div className="space-y-1">
                      <Typography variant="caption" sx={{ color: 'rgb(156 163 175)', fontSize: '12px' }}>
                        Unit Price
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                        ${selectedProduct.unit_price.toFixed(2)}
                      </Typography>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Typography variant="caption" sx={{ color: 'rgb(156 163 175)', fontSize: '12px' }}>
                      Content Type
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                      {formatContentType(selectedProduct.content_type)}
                    </Typography>
                  </div>

                  <div className="space-y-1">
                    <Typography variant="caption" sx={{ color: 'rgb(156 163 175)', fontSize: '12px' }}>
                      Platform
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                      {formatPlatform(selectedProduct.platform || "unknown")}
                    </Typography>
                  </div>

                  <div className="space-y-1">
                    <Typography variant="caption" sx={{ color: 'rgb(156 163 175)', fontSize: '12px' }}>
                      Date
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white', fontSize: '14px' }}>
                      {selectedProduct.date}
                    </Typography>
                  </div>
                </div>

                {/* Performance Summary */}
                <div className="bg-gray-700/30 rounded-lg p-3">
                  <Typography variant="body2" sx={{ color: 'white', fontWeight: 'medium', fontSize: '12px', mb: 1 }}>
                    Performance Summary
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgb(156 163 175)', fontSize: '11px', lineHeight: '1.4' }}>
                    Generated ${selectedProduct.total_price ? selectedProduct.total_price.toLocaleString() : '0'} in revenue from {selectedProduct.purchase_count.toLocaleString()} purchases
                    {selectedProduct.unit_price && selectedProduct.unit_price > 0 ? ` at $${selectedProduct.unit_price.toFixed(2)} per unit` : ''}.
                  </Typography>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  // Product Grid view
  const ProductGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-6">
      {filteredData
        .sort((a, b) => b.purchase_count - a.purchase_count)
        .map((row, index) => (
          <Card
            key={`${row.child_sid}-${row.content_type}-${row.platform}-${index}`}
            sx={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid rgb(75 85 99)",
              backdropFilter: "blur(8px)",
              transition: "all 0.2s ease-in-out",
              overflow: "hidden",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0 12px 30px -8px rgba(0, 0, 0, 0.4)",
                borderColor: "rgb(59 130 246)",
              },
            }}
          >
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              {/* Product Image with Enlarge Button */}
              <div className="relative group">
                <img
                  src={
                    row.image_data
                      ? `https://www.sephora.com${
                          row.image_data.startsWith("/") ? "" : "/"
                        }${row.image_data}`
                      : dummyImage
                  }
                  alt={row.child_sid}
                  className="w-full h-56 object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== dummyImage) {
                      target.src = dummyImage;
                    }
                  }}
                />
                <div className="absolute top-3 right-3">
                  <Chip
                    label={formatContentType(row.content_type)}
                    size="small"
                    sx={{
                      backgroundColor:
                        getContentTypeColor(row.content_type) + "20",
                      color: getContentTypeColor(row.content_type),
                      border: `1px solid ${getContentTypeColor(
                        row.content_type
                      )}40`,
                      fontWeight: 600,
                      fontSize: "10px",
                      height: "22px",
                      backdropFilter: "blur(8px)",
                    }}
                  />
                </div>
                {/* Enlarge Button */}
                <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <IconButton
                    onClick={() => handleProductClick(row)}
                    sx={{
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(0,0,0,0.9)',
                      },
                    }}
                    size="small"
                  >
                    <Maximize2 size={16} />
                  </IconButton>
                </div>
              </div>

              {/* Revenue Banner - Pink/Magenta */}
              <Box
                sx={{
                  backgroundColor: "#D1387D",
                  py: 2,
                  textAlign: "center",
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "22px",
                  }}
                >
                  ${row.total_price ? row.total_price.toLocaleString() : '0'}
                </Typography>
              </Box>

              {/* Quantity Banner - Yellow/Gold */}
              <Box
                sx={{
                  backgroundColor: "#F5C242",
                  py: 1.5,
                  textAlign: "center",
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    color: "#000",
                    fontWeight: "bold",
                    fontSize: "15px",
                  }}
                >
                  Total quantity bought: {row.purchase_count.toLocaleString()}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
    </div>
  );

  // Table View 
  const TableView = () => (
    <TableContainer sx={{ maxHeight: "600px", borderRadius: "8px" }}>
      <Table
        stickyHeader
        sx={{ minWidth: 650 }}
        aria-label="personalization data table"
      >
        <TableHead>
          <TableRow sx={{ backgroundColor: "hsl(var(--card))" }}>
            <TableCell sx={{ color: "#F3F4F6", fontWeight: "bold", fontSize: "14px", backgroundColor: "hsl(var(--card)) !important" }}>
              CMS Entry ID
            </TableCell>
            <TableCell sx={{ color: "#F3F4F6", fontWeight: "bold", fontSize: "14px", backgroundColor: "hsl(var(--card)) !important" }}>
              Content Type
            </TableCell>
            <TableCell sx={{ color: "#F3F4F6", fontWeight: "bold", fontSize: "14px", backgroundColor: "hsl(var(--card)) !important" }}>
              Platform
            </TableCell>
            <TableCell sx={{ color: "#F3F4F6", fontWeight: "bold", fontSize: "14px", width: "120px", textAlign: "right", backgroundColor: "hsl(var(--card)) !important" }}>
              Purchase Count
            </TableCell>
            <TableCell sx={{ color: "#F3F4F6", fontWeight: "bold", fontSize: "14px", width: "120px", textAlign: "right", backgroundColor: "hsl(var(--card)) !important" }}>
              Unit Price
            </TableCell>
            <TableCell sx={{ color: "#F3F4F6", fontWeight: "bold", fontSize: "14px", width: "140px", textAlign: "right", backgroundColor: "hsl(var(--card)) !important" }}>
              Total Revenue
            </TableCell>
            <TableCell sx={{ color: "#F3F4F6", fontWeight: "bold", fontSize: "14px", width: "100px", textAlign: "center", backgroundColor: "hsl(var(--card)) !important" }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredData.length > 0 ? (
            filteredData
              .sort((a, b) => b.purchase_count - a.purchase_count)
              .map((row, index) => (
                <TableRow
                  key={`${row.child_sid}-${row.content_type}-${row.platform}-${index}`}
                  sx={{
                    "&:last-child td, &:last-child th": { border: 0 },
                    "&:hover": { backgroundColor: "#374151" },
                    transition: "background-color 0.2s",
                    backgroundColor: "hsl(var(--card))",
                  }}
                >
                  <TableCell sx={{ color: "#F3F4F6", fontSize: "14px", fontFamily: "monospace" }}>
                    {row.child_sid}
                  </TableCell>
                  <TableCell sx={{ color: "#F3F4F6", fontSize: "14px" }}>
                    <Chip
                      label={formatContentType(row.content_type)}
                      size="small"
                      sx={{
                        backgroundColor: getContentTypeColor(row.content_type) + "20",
                        color: getContentTypeColor(row.content_type),
                        border: `1px solid ${getContentTypeColor(row.content_type)}40`,
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: "#F3F4F6", fontSize: "14px" }}>
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(row.platform || "unknown")}
                      <Chip
                        label={formatPlatform(row.platform || "unknown")}
                        size="small"
                        sx={{
                          backgroundColor: getPlatformColor(row.platform || "unknown") + "20",
                          color: getPlatformColor(row.platform || "unknown"),
                          border: `1px solid ${getPlatformColor(row.platform || "unknown")}40`,
                          fontWeight: 500,
                        }}
                      />
                    </div>
                  </TableCell>
                  <TableCell sx={{ color: "#F3F4F6", fontSize: "14px", fontWeight: "bold", textAlign: "right" }}>
                    <span className="bg-gray-700 px-2 py-1 rounded-lg">
                      {row.purchase_count.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell sx={{ color: "#F3F4F6", fontSize: "14px", fontWeight: "bold", textAlign: "right" }}>
                    <span className="bg-green-700 px-2 py-1 rounded-lg">
                      ${row.unit_price?.toFixed(2) || "0.00"}
                    </span>
                  </TableCell>
                  <TableCell sx={{ color: "#F3F4F6", fontSize: "14px", fontWeight: "bold", textAlign: "right" }}>
                    <span className="bg-blue-700 px-2 py-1 rounded-lg">
                      ${(row.total_price || 0).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    <IconButton
                      onClick={() => handleProductClick(row)}
                      sx={{
                        color: '#60A5FA',
                        '&:hover': {
                          backgroundColor: 'rgba(96, 165, 250, 0.1)',
                        },
                      }}
                      size="small"
                    >
                      <Maximize2 size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
          ) : (
            <TableRow sx={{ backgroundColor: "hsl(var(--card))" }}>
              <TableCell
                colSpan={7}
                sx={{ color: "#9CA3AF", textAlign: "center", py: 6 }}
              >
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ color: "#9CA3AF" }}
                  >
                    No data matching filters
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#6B7280" }}>
                    Try adjusting your content type or platform filters
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <div className="space-y-6">
      <ChatBotIcon position="bottom-right" />
      <ProductDetailModal />

      {!isLoading && data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Purchases"
            value={summaryStats.totalPurchases.toLocaleString()}
            icon={Users}
          />
          <MetricCard
            title="Total Revenue"
            value={`$${(summaryStats.totalRevenue / 1000).toFixed(0)}K`}
            icon={DollarSign}
          />
          <MetricCard
            title="Content Types"
            value={summaryStats.uniqueContentTypes}
            icon={Database}
          />
          <MetricCard
            title="Platforms"
            value={summaryStats.uniquePlatforms}
            icon={Monitor}
          />
        </div>
      )}

      <Card
        sx={{
          backgroundColor: "hsl(var(--card))",
          borderWidth: "1px",
          backdropFilter: "blur(8px)",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-gray-400" />
                  <label className="text-gray-300 text-sm font-medium">
                    Date:
                  </label>
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  max={moment().format("YYYY-MM-DD")}
                  className="bg-gray-700 text-muted-foreground px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {contentTypes.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter size={16} className="text-gray-400" />
                    <label className="text-gray-300 text-sm font-medium">
                      Content Type:
                    </label>
                  </div>
                  <select
                    value={filterContentType}
                    onChange={(e) => setFilterContentType(e.target.value)}
                    disabled={areFiltersDisabled}
                    className="bg-gray-700 text-muted-foreground px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="all">All Content Types</option>
                    {contentTypes.map((type) => (
                      <option key={type} value={type}>
                        {formatContentType(type)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {platforms.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Monitor size={16} className="text-gray-400" />
                    <label className="text-gray-300 text-sm font-medium">
                      Platform:
                    </label>
                  </div>
                  <select
                    value={filterPlatform}
                    onChange={(e) => setFilterPlatform(e.target.value)}
                    disabled={areFiltersDisabled}
                    className="bg-gray-700 text-muted-foreground px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="all">All Platforms</option>
                    {platforms.map((platform) => (
                      <option key={platform} value={platform}>
                        {formatPlatform(platform)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {lastFetchTime && (
                <Tooltip
                  title={`Last fetched at ${lastFetchTime.toLocaleTimeString()}`}
                >
                  <Typography
                    variant="body2"
                    sx={{ color: "#9CA3AF", cursor: "help" }}
                  >
                    Updated: {moment(lastFetchTime).fromNow()}
                  </Typography>
                </Tooltip>
              )}

              {activeTab === 1 && <Button
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
              </Button>}
            </div>
          </div>

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

          {(filterContentType !== "all" || filterPlatform !== "all") && (
            <Box sx={{ mt: 2 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
                  Active filters:
                </Typography>
                {filterContentType !== "all" && (
                  <Chip
                    label={`Content: ${formatContentType(filterContentType)}`}
                    size="small"
                    onDelete={() => setFilterContentType("all")}
                    disabled={areFiltersDisabled}
                    sx={{
                      backgroundColor: getContentTypeColor(filterContentType) + "20",
                      color: getContentTypeColor(filterContentType),
                      border: `1px solid ${getContentTypeColor(filterContentType)}40`,
                      "&.Mui-disabled": {
                        opacity: 0.6,
                      },
                    }}
                  />
                )}
                {filterPlatform !== "all" && (
                  <Chip
                    label={`Platform: ${formatPlatform(filterPlatform)}`}
                    size="small"
                    onDelete={() => setFilterPlatform("all")}
                    disabled={areFiltersDisabled}
                    sx={{
                      backgroundColor: getPlatformColor(filterPlatform) + "20",
                      color: getPlatformColor(filterPlatform),
                      border: `1px solid ${getPlatformColor(filterPlatform)}40`,
                      "&.Mui-disabled": {
                        opacity: 0.6,
                      },
                    }}
                  />
                )}
                {(filterContentType !== "all" || filterPlatform !== "all") && (
                  <Button
                    size="small"
                    onClick={() => {
                      setFilterContentType("all");
                      setFilterPlatform("all");
                    }}
                    disabled={areFiltersDisabled}
                    sx={{
                      color: "#60A5FA",
                      "&:hover": { color: "#93C5FD" },
                      "&.Mui-disabled": {
                        color: "rgb(156 163 175)",
                      },
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
              Loading Personalization Data
            </Typography>
            <Typography variant="body2" sx={{ color: "rgb(156 163 175)" }}>
              Fetching CMS component performance data for {selectedDate}...
            </Typography>
          </CardContent>
        </Card>
      )}

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
        </Alert>
      )}

      {!isLoading && !error && !hasDataBeenFetched && (
        <Card
          sx={{
            backgroundColor: "hsl(var(--card))",
            borderWidth: "1px",
            backdropFilter: "blur(8px)",
          }}
        >
          <CardContent sx={{ p: 6, textAlign: "center" }}>
            <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <Typography variant="h6" sx={{ color: "white", mb: 2 }}>
              Click Analysis
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "rgb(156 163 175)", mb: 4 }}
            >
              Analyze how Banners contradicting to purchases. Select a date and
              click "Fetch Data" to see performance metrics for that date.
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
              {validationError ? "Fix Date First" : "Fetch Data"}
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && hasDataBeenFetched && data.length > 0 && (
        <Card
          sx={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid rgb(55 65 81)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                sx={{
                  "& .MuiTab-root": {
                    color: "#9CA3AF",
                    textTransform: "none",
                    fontWeight: 500,
                    "&.Mui-selected": {
                      color: "#60A5FA",
                    },
                  },
                  "& .MuiTabs-indicator": {
                    backgroundColor: "#60A5FA",
                  },
                }}
              >
                <Tab
                  icon={<Grid size={18} />}
                  iconPosition="start"
                  label="Product View"
                />
                <Tab
                  icon={<TableIcon size={18} />}
                  iconPosition="start"
                  label="Table View"
                />
              </Tabs>
            </Box>

            {activeTab === 0 ? <ProductGridView /> : <TableView />}

            {filteredData.length > 0 && (
              <Box
                sx={{
                  p: 3,
                  backgroundColor: "hsl(var(--card))",
                  borderTop: "1px solid #374151",
                }}
              >
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
                    Showing {filteredData.length} records •
                    {filterContentType !== "all" &&
                      ` Content: ${formatContentType(filterContentType)} •`}
                    {filterPlatform !== "all" &&
                      ` Platform: ${formatPlatform(filterPlatform)} •`}
                    Total purchases:{" "}
                    {filteredData
                      .reduce((sum, row) => sum + row.purchase_count, 0)
                      .toLocaleString()}
                    {" • "}
                    Total revenue: $
                    {filteredData
                      .reduce((sum, row) => sum + (row.total_price || 0), 0)
                      .toLocaleString()}
                  </Typography>

                  {(filterContentType !== "all" ||
                    filterPlatform !== "all") && (
                    <Button
                      size="small"
                      onClick={() => {
                        setFilterContentType("all");
                        setFilterPlatform("all");
                      }}
                      sx={{ color: "#60A5FA", "&:hover": { color: "#93C5FD" } }}
                    >
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};