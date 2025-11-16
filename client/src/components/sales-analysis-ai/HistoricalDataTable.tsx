import { useState, useEffect, useMemo } from 'react';
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
  Tooltip,
} from '@mui/material';
import { Calendar, Download, RefreshCw, Filter, BarChart3, Database, Monitor, Smartphone } from 'lucide-react';
import moment from 'moment';
import { useHistoricalData } from '../../hooks/useHistoricalData';
import { MetricCard } from '../util-components/MetricCard';
import { ChatBotIcon } from '../chat-bot/ChatBotIcon';
import type { HistoricalDataTableProps, SummaryStats } from '../../types';


export const HistoricalDataTable: React.FC<HistoricalDataTableProps> = () => {
  const [startDate, setStartDate] = useState<string>(
    moment().subtract(1, 'days').format('YYYY-MM-DD')
  );
  const [endDate, setEndDate] = useState<string>(moment().format('YYYY-MM-DD'));
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasDataBeenFetched, setHasDataBeenFetched] = useState(false);
  const [isDateRangeChanged, setIsDateRangeChanged] = useState(false);
  
  // Destructure progress from the hook
  const { data, isLoading, error, fetchData, progress } = useHistoricalData();

  // Validate dates whenever they change
  useEffect(() => {
    validateDates(startDate, endDate);
  }, [startDate, endDate]);

  const validateDates = (start: string, end: string): boolean => {
    if (!start || !end) {
      setValidationError('Both start date and end date are required');
      return false;
    }

    const startMoment = moment(start);
    const endMoment = moment(end);
    const today = moment().format('YYYY-MM-DD');

    if (!startMoment.isValid() || !endMoment.isValid()) {
      setValidationError('Invalid date format');
      return false;
    }

    if (startMoment.isAfter(endMoment)) {
      setValidationError('Start date cannot be after end date');
      return false;
    }

    if (endMoment.isAfter(today)) {
      setValidationError('End date cannot be in the future');
      return false;
    }

    // Check if date range is too large (more than 90 days)
    const daysDiff = endMoment.diff(startMoment, 'days');
    if (daysDiff > 90) {
      setValidationError('Date range cannot exceed 90 days');
      return false;
    }

    if (daysDiff < 0) {
      setValidationError('Invalid date range');
      return false;
    }

    setValidationError(null);
    return true;
  };

  // Calculate summary statistics
  const summaryStats: SummaryStats = useMemo(() => {
    if (data.length === 0) {
      return {
        totalEvents: 0,
        uniqueEventTypes: 0,
        uniquePlatforms: 0,
        dateRange: `${startDate} to ${endDate}`,
        averageEventsPerDay: 0,
      };
    }

    const totalEvents = data.reduce((sum, row) => sum + row.cnt, 0);
    const uniqueEventTypes = new Set(data.map(row => row.sotType)).size;
    const uniquePlatforms = new Set(data.map(row => row.platform || 'unknown')).size;
    
    const start = moment(startDate);
    const end = moment(endDate);
    const daysDiff = Math.max(end.diff(start, 'days') + 1, 1);
    
    const averageEventsPerDay = totalEvents / daysDiff;

    return {
      totalEvents,
      uniqueEventTypes,
      uniquePlatforms,
      dateRange: `${startDate} to ${endDate}`,
      averageEventsPerDay,
    };
  }, [data, startDate, endDate]);

  // Filtered data based on event type and platform
  const filteredData = useMemo(() => {
    let filtered = data;
    
    if (filterEventType !== 'all') {
      filtered = filtered.filter(row => row.sotType === filterEventType);
    }
    
    if (filterPlatform !== 'all') {
      filtered = filtered.filter(row => (row.platform || 'unknown') === filterPlatform);
    }
    
    return filtered;
  }, [data, filterEventType, filterPlatform]);

  // Get unique event types for filter
  const eventTypes = useMemo(() => {
    const types = Array.from(new Set(data.map(row => row.sotType)));
    return types.sort();
  }, [data]);

  // Get unique platforms for filter
  const platforms = useMemo(() => {
    const platformSet = new Set(data.map(row => row.platform || 'unknown'));
    return Array.from(platformSet).sort();
  }, [data]);

  const handleFetchData = () => {
    if (validateDates(startDate, endDate)) {
      console.log('🔄 Manual data fetch triggered');
      setHasDataBeenFetched(true);
      setIsDateRangeChanged(false);
      fetchData(startDate, endDate);
      setLastFetchTime(new Date());
    }
  };

  const handleDateChange = (newStartDate?: string, newEndDate?: string) => {
    if (newStartDate) setStartDate(newStartDate);
    if (newEndDate) setEndDate(newEndDate);
    
    // Mark that date range has changed and disable filters
    setIsDateRangeChanged(true);
    setHasDataBeenFetched(false);
  };

  const handleExport = () => {
    if (filteredData.length === 0) return;

    const csvContent = "data:text/csv;charset=utf-8," 
      + "Event Date,Event Type,Platform,Count\n"
      + filteredData.map(row => 
          `"${row.event_date}","${row.sotType}","${row.platform || 'unknown'}",${row.cnt}`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `historical-data-${startDate}-to-${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatEventType = (eventType: string) => {
    return eventType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .toLowerCase();
  };

  const formatPlatform = (platform: string) => {
    if (!platform || platform === 'unknown') return 'Unknown';
    return platform
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getEventTypeColor = (eventType: string) => {
    const colors: { [key: string]: string } = {
      'page view': '#2EDAFF',
      'purchase': '#10B981',
      'add to basket': '#F59E0B',
      'remove from basket': '#EF4444',
      'add to loves': '#EC4899',
      'un love': '#8B5CF6',
      'cms viewable impression': '#06B6D4',
      'cms component item click': '#84CC16',
    };
    
    return colors[eventType.toLowerCase()] || '#6B7280';
  };

  const getPlatformColor = (platform: string) => {
    const colors: { [key: string]: string } = {
      'desktop web': '#2EDAFF',
      'mobile web': '#10B981',
      'tablet web': '#F59E0B',
      'iphone app': '#F5D327',
      'android app': '#34D399',
      'unknown': '#6B7280',
    };
    
    return colors[platform.toLowerCase()] || '#6B7280';
  };

  const getPlatformIcon = (platform: string) => {
    const platformLower = platform.toLowerCase();
    if (platformLower.includes('mobile') || platformLower.includes('iphone') || platformLower.includes('android')) {
      return <Smartphone size={14} />;
    }
    return <Monitor size={14} />;
  };

  // Determine if fetch button should be disabled
  const isFetchDisabled = isLoading || !!validationError;
  // Determine if export button should be disabled
  const isExportDisabled = isLoading || filteredData.length === 0;
  // Determine if filters should be disabled
  const areFiltersDisabled = isLoading || isDateRangeChanged || !hasDataBeenFetched || data.length === 0;

  return (
    <div className="space-y-6">
      <ChatBotIcon position="bottom-right" />
      {/* Summary Stats Cards using MetricCard */}
      {!isLoading && data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            title="Platforms"
            value={summaryStats.uniquePlatforms}
            icon={Monitor}
          />
          <MetricCard
            title="Date Range"
            value={`${moment(startDate).format('MMM D')} - ${moment(endDate).format('MMM D')}`}
            icon={Calendar}
          />
        </div>
      )}

      {/* Controls Section */}
      <Card 
        sx={{ 
          backgroundColor: 'hsl(var(--card))',
          borderWidth: '1px',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-gray-400" />
                  <label className="text-gray-300 text-sm font-medium">Start Date:</label>
                </div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleDateChange(e.target.value, undefined)}
                  max={endDate}
                  className="bg-gray-700 text-muted-foreground px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-gray-400" />
                  <label className="text-gray-300 text-sm font-medium">End Date:</label>
                </div>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleDateChange(undefined, e.target.value)}
                  max={moment().format('YYYY-MM-DD')}
                  min={startDate}
                  className="bg-gray-700 text-muted-foreground px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              
              {/* Event Type Filter */}
              {eventTypes.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter size={16} className="text-gray-400" />
                    <label className="text-gray-300 text-sm font-medium">Event Type:</label>
                  </div>
                  <select
                    value={filterEventType}
                    onChange={(e) => setFilterEventType(e.target.value)}
                    disabled={areFiltersDisabled}
                    className="bg-gray-700 text-muted-foreground px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="all">All Event Types</option>
                    {eventTypes.map(type => (
                      <option key={type} value={type}>
                        {formatEventType(type)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Platform Filter */}
              {platforms.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Monitor size={16} className="text-gray-400" />
                    <label className="text-gray-300 text-sm font-medium">Platform:</label>
                  </div>
                  <select
                    value={filterPlatform}
                    onChange={(e) => setFilterPlatform(e.target.value)}
                    disabled={areFiltersDisabled}
                    className="bg-gray-700 text-muted-foreground px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="all">All Platforms</option>
                    {platforms.map(platform => (
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
                <Tooltip title={`Last fetched at ${lastFetchTime.toLocaleTimeString()}`}>
                  <Typography variant="body2" sx={{ color: '#9CA3AF', cursor: 'help' }}>
                    Updated: {moment(lastFetchTime).fromNow()}
                  </Typography>
                </Tooltip>
              )}
              
              {/* Export CSV Button */}
              <Button
                variant="contained"
                size="small"
                onClick={handleExport}
                disabled={isExportDisabled}
                startIcon={<Download size={16} />}
                sx={{
                  minWidth: '120px',
                  backgroundColor: isExportDisabled ? 'rgb(75 85 99)' : 'rgb(22 163 74)',
                  '&:hover': {
                    backgroundColor: isExportDisabled ? 'rgb(75 85 99)' : 'rgb(21 128 61)'
                  },
                  '&.Mui-disabled': {
                    backgroundColor: 'rgb(55 65 81)',
                    color: 'rgb(156 163 175)'
                  }
                }}
              >
                Export CSV
              </Button>
            </div>
          </div>

          {/* Validation Error Display */}
          {validationError && (
            <Box sx={{ mt: 2 }}>
              <Alert 
                severity="warning"
                sx={{
                  backgroundColor: 'rgb(120 53 15 / 0.5)',
                  border: '1px solid rgb(234 88 12)',
                  borderRadius: '8px',
                }}
              >
                <Typography variant="body2" sx={{ color: 'rgb(254 215 170)' }}>
                  {validationError}
                </Typography>
              </Alert>
            </Box>
          )}

          {/* Progress Indicator */}
          {/* {progress && (
            <Box sx={{ mt: 2 }}>
              <Alert 
                severity="info"
                sx={{
                  backgroundColor: 'rgb(30 58 138 / 0.5)',
                  border: '1px solid rgb(59 130 246)',
                  borderRadius: '8px',
                }}
              >
                <Box sx={{ width: '100%' }}>
                  <Typography variant="body2" sx={{ color: 'rgb(191 219 254)', mb: 1 }}>
                    Fetching chunk {progress.current} of {progress.total}: {progress.currentChunk}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(progress.current / progress.total) * 100}
                    sx={{ 
                      backgroundColor: 'rgb(30 58 138)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#2EDAFF'
                      }
                    }}
                  />
                  <Typography variant="caption" sx={{ color: 'rgb(191 219 254)', display: 'block', mt: 1 }}>
                    {Math.round((progress.current / progress.total) * 100)}% complete
                  </Typography>
                </Box>
              </Alert>
            </Box>
          )} */}

          {/* Active Filters Display */}
          {(filterEventType !== 'all' || filterPlatform !== 'all') && (
            <Box sx={{ mt: 2 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                  Active filters:
                </Typography>
                {filterEventType !== 'all' && (
                  <Chip
                    label={`Event: ${formatEventType(filterEventType)}`}
                    size="small"
                    onDelete={() => setFilterEventType('all')}
                    disabled={areFiltersDisabled}
                    sx={{
                      backgroundColor: getEventTypeColor(filterEventType) + '20',
                      color: getEventTypeColor(filterEventType),
                      border: `1px solid ${getEventTypeColor(filterEventType)}40`,
                      '&.Mui-disabled': {
                        opacity: 0.6
                      }
                    }}
                  />
                )}
                {filterPlatform !== 'all' && (
                  <Chip
                    label={`Platform: ${formatPlatform(filterPlatform)}`}
                    size="small"
                    onDelete={() => setFilterPlatform('all')}
                    disabled={areFiltersDisabled}
                    sx={{
                      backgroundColor: getPlatformColor(filterPlatform) + '20',
                      color: getPlatformColor(filterPlatform),
                      border: `1px solid ${getPlatformColor(filterPlatform)}40`,
                      '&.Mui-disabled': {
                        opacity: 0.6
                      }
                    }}
                  />
                )}
                {(filterEventType !== 'all' || filterPlatform !== 'all') && (
                  <Button
                    size="small"
                    onClick={() => {
                      setFilterEventType('all');
                      setFilterPlatform('all');
                    }}
                    disabled={areFiltersDisabled}
                    sx={{ 
                      color: '#60A5FA', 
                      '&:hover': { color: '#93C5FD' },
                      '&.Mui-disabled': {
                        color: 'rgb(156 163 175)'
                      }
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

      {/* Loading State */}
      {isLoading && (
        <Card 
          sx={{ 
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid rgb(55 65 81)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
              Loading Historical Data
            </Typography>
            
            {/* Enhanced Progress Indicator */}
            {progress ? (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ color: 'rgb(156 163 175)', mb: 1 }}>
                  Fetching {progress.current} of {progress.total} chunks...
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgb(107 114 128)', display: 'block', mb: 2 }}>
                  Current: {progress.currentChunk}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(progress.current / progress.total) * 100}
                  sx={{ 
                    backgroundColor: 'rgb(55 65 81)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#2EDAFF'
                    }
                  }}
                />
                <Typography variant="caption" sx={{ color: 'rgb(107 114 128)', display: 'block', mt: 1 }}>
                  {Math.round((progress.current / progress.total) * 100)}% complete
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: 'rgb(156 163 175)', mb: 2 }}>
                Preparing to fetch data for {startDate} to {endDate}...
              </Typography>
            )}
            
            <Typography variant="caption" sx={{ color: 'rgb(107 114 128)', display: 'block', mt: 1 }}>
              Large date ranges are fetched in smaller chunks to avoid timeouts
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && !isLoading && (
        <Alert 
          severity="error"
          sx={{
            backgroundColor: 'rgb(127 29 29 / 0.5)',
            border: '1px solid rgb(239 68 68)',
            borderRadius: '8px',
            backdropFilter: 'blur(8px)'
          }}
          action={
            <Button 
              size="small" 
              onClick={handleFetchData} 
              disabled={isLoading}
              sx={{ color: 'white' }}
            >
              Try Again
            </Button>
          }
        >
          <Typography variant="body1" fontWeight="bold" sx={{ color: 'white' }}>
            Error Loading Data
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgb(254 202 202)' }}>
            {error}
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgb(254 202 202)', display: 'block', mt: 1 }}>
            Tip: Try selecting a smaller date range
          </Typography>
        </Alert>
      )}

      {/* Initial State - No data fetched yet */}
      {!isLoading && !error && !hasDataBeenFetched && (
        <Card 
          sx={{ 
            backgroundColor: 'hsl(var(--card))',
            borderWidth: '1px',
            backdropFilter: 'blur(8px)'
          }}
        >
          <CardContent sx={{ p: 6, textAlign: 'center' }}>
            <Database className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
              Ready to Fetch Historical Data
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgb(156 163 175)', mb: 4 }}>
              Select your date range (up to 90 days) and click "Fetch Data" to load historical analytics
            </Typography>
            <Button
              variant="contained"
              onClick={handleFetchData}
              disabled={isFetchDisabled}
              startIcon={<RefreshCw size={18} />}
              sx={{
                backgroundColor: validationError ? 'rgb(75 85 99)' : 'rgb(59 130 246)',
                '&:hover': {
                  backgroundColor: validationError ? 'rgb(75 85 99)' : 'rgb(37 99 235)'
                }
              }}
            >
              {validationError ? 'Fix Dates First' : 'Fetch Data'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {!isLoading && !error && hasDataBeenFetched && data.length > 0 && (
        <Card 
          sx={{ 
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid rgb(55 65 81)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <TableContainer sx={{ maxHeight: '600px', borderRadius: '8px' }}>
              <Table stickyHeader sx={{ minWidth: 650 }} aria-label="historical data table">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'hsl(var(--card))' }}>
                    <TableCell sx={{ 
                      color: '#F3F4F6', 
                      fontWeight: 'bold', 
                      fontSize: '14px', 
                      width: '150px',
                      backgroundColor: 'hsl(var(--card)) !important'
                    }}>
                      Event Date
                    </TableCell>
                    <TableCell sx={{ 
                      color: '#F3F4F6', 
                      fontWeight: 'bold', 
                      fontSize: '14px',
                      backgroundColor: 'hsl(var(--card)) !important'
                    }}>
                      Event Type
                    </TableCell>
                    <TableCell sx={{ 
                      color: '#F3F4F6', 
                      fontWeight: 'bold', 
                      fontSize: '14px',
                      backgroundColor: 'hsl(var(--card)) !important'
                    }}>
                      Platform
                    </TableCell>
                    <TableCell sx={{ 
                      color: '#F3F4F6', 
                      fontWeight: 'bold', 
                      fontSize: '14px', 
                      width: '120px', 
                      textAlign: 'right',
                      backgroundColor: 'hsl(var(--card)) !important'
                    }}>
                      Count
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData.length > 0 ? (
                    filteredData
                      .sort((a, b) => moment(b.event_date).valueOf() - moment(a.event_date).valueOf())
                      .map((row, index) => (
                      <TableRow
                        key={`${row.event_date}-${row.sotType}-${row.platform}-${index}`}
                        sx={{ 
                          '&:last-child td, &:last-child th': { border: 0 },
                          '&:hover': { backgroundColor: '#374151' },
                          transition: 'background-color 0.2s',
                          backgroundColor: 'hsl(var(--card))',
                        }}
                      >
                        <TableCell sx={{ color: '#F3F4F6', fontSize: '14px' }}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {moment(row.event_date).format('MMM D, YYYY')}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {moment(row.event_date).format('dddd')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell sx={{ color: '#F3F4F6', fontSize: '14px' }}>
                          <Chip
                            label={formatEventType(row.sotType)}
                            size="small"
                            sx={{
                              backgroundColor: getEventTypeColor(row.sotType) + '20',
                              color: getEventTypeColor(row.sotType),
                              border: `1px solid ${getEventTypeColor(row.sotType)}40`,
                              fontWeight: 500,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#F3F4F6', fontSize: '14px' }}>
                          <div className="flex items-center gap-2">
                            {getPlatformIcon(row.platform || 'unknown')}
                            <Chip
                              label={formatPlatform(row.platform || 'unknown')}
                              size="small"
                              sx={{
                                backgroundColor: getPlatformColor(row.platform || 'unknown') + '20',
                                color: getPlatformColor(row.platform || 'unknown'),
                                border: `1px solid ${getPlatformColor(row.platform || 'unknown')}40`,
                                fontWeight: 500,
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell sx={{ color: '#F3F4F6', fontSize: '14px', fontWeight: 'bold', textAlign: 'right' }}>
                          <span className="bg-gray-700 px-2 py-1 rounded-lg">
                            {row.cnt.toLocaleString()}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow sx={{ backgroundColor: 'hsl(var(--card))' }}>
                      <TableCell colSpan={4} sx={{ color: '#9CA3AF', textAlign: 'center', py: 6 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" gutterBottom sx={{ color: '#9CA3AF' }}>
                            No data matching filters
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#6B7280' }}>
                            Try adjusting your event type or platform filters
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Summary Footer */}
            {filteredData.length > 0 && (
              <Box sx={{ p: 3, backgroundColor: 'hsl(var(--card))', borderTop: '1px solid #374151' }}>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                    Showing {filteredData.length} records • 
                    {filterEventType !== 'all' && ` Event: ${formatEventType(filterEventType)} •`}
                    {filterPlatform !== 'all' && ` Platform: ${formatPlatform(filterPlatform)} •`}
                    Total events: {filteredData.reduce((sum, row) => sum + row.cnt, 0).toLocaleString()}
                  </Typography>
                  
                  {(filterEventType !== 'all' || filterPlatform !== 'all') && (
                    <Button
                      size="small"
                      onClick={() => {
                        setFilterEventType('all');
                        setFilterPlatform('all');
                      }}
                      sx={{ color: '#60A5FA', '&:hover': { color: '#93C5FD' } }}
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