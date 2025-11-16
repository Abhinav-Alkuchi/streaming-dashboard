/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Chip,
  LinearProgress,
  Tooltip,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  MenuItem,
  Checkbox,
  ListItemText,
} from '@mui/material';
import { Calendar, Download, RefreshCw, BarChart3, Database, Monitor, Table, Send, LayoutDashboard } from 'lucide-react';
import moment from 'moment';
import { useEventAnalysis } from '../../hooks/useEventAnalysis';
import { MetricCard } from '../util-components/MetricCard';
import { ChatBotIcon } from '../chat-bot/ChatBotIcon';
import { EventAnalysisChart } from "./EventAnalysisChart";
import { EventAnalysisTable } from './EventAnalysisTable';
import { EventRequestTab } from './EventRequestTab';
import type { EventAnalysisSummary } from '../../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`event-analysis-tabpanel-${index}`}
      aria-labelledby={`event-analysis-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const EventAnalysisPage: React.FC = () => {
  const [startDate, setStartDate] = useState<string>(
    moment().subtract(7, 'days').format('YYYY-MM-DD')
  );
  const [endDate, setEndDate] = useState<string>(moment().format('YYYY-MM-DD'));
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasDataBeenFetched, setHasDataBeenFetched] = useState(false);
  const [isDateRangeChanged, setIsDateRangeChanged] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState(0); // Main tabs: Event Request (0) and Dashboard (1)
  const [activeDashboardTab, setActiveDashboardTab] = useState(0); // Dashboard sub-tabs: Chart (0) and Table (1)
  
  const { 
    data, 
    isLoading, 
    error, 
    fetchData, 
    progress, 
    availableEvents, 
    availablePlatforms, 
    fetchAvailableOptions 
  } = useEventAnalysis();

  // Load available events and platforms on component mount
  useEffect(() => {
    fetchAvailableOptions();
  }, [fetchAvailableOptions]);

  // Validate dates and selections whenever they change
  useEffect(() => {
    validateInputs(startDate, endDate, selectedEvents, selectedPlatforms);
  }, [startDate, endDate, selectedEvents, selectedPlatforms]);

  const validateInputs = (
    start: string, 
    end: string, 
    events: string[], 
    platforms: string[]
  ): boolean => {
    // Date validation
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

    const daysDiff = endMoment.diff(startMoment, 'days');
    if (daysDiff > 90) {
      setValidationError('Date range cannot exceed 90 days');
      return false;
    }

    if (daysDiff < 0) {
      setValidationError('Invalid date range');
      return false;
    }

    // Event selection validation
    if (events.length === 0) {
      setValidationError('At least one event type must be selected');
      return false;
    }

    // Platform selection validation
    if (platforms.length === 0) {
      setValidationError('At least one platform must be selected');
      return false;
    }

    setValidationError(null);
    return true;
  };

  // Calculate summary statistics
  const summaryStats: EventAnalysisSummary = useMemo(() => {
    if (data.length === 0) {
      return {
        totalEvents: 0,
        uniqueDates: 0,
        dateRange: `${startDate} to ${endDate}`,
        averageEventsPerDay: 0,
      };
    }

    const totalEvents = data.reduce((sum, row) => sum + row.count, 0);
    const uniqueDates = new Set(data.map(row => row.event_date)).size;
    
    const start = moment(startDate);
    const end = moment(endDate);
    const daysDiff = Math.max(end.diff(start, 'days') + 1, 1);
    
    const averageEventsPerDay = totalEvents / daysDiff;

    return {
      totalEvents,
      uniqueDates,
      dateRange: `${startDate} to ${endDate}`,
      averageEventsPerDay,
    };
  }, [data, startDate, endDate]);

  // Filtered data based on event type and platform (for post-fetch filtering)
  const filteredData = useMemo(() => {
    let filtered = data;
    
    if (filterEventType !== 'all') {
      filtered = filtered.filter(row => row.event_type === filterEventType);
    }
    
    if (filterPlatform !== 'all') {
      filtered = filtered.filter(row => row.platform === filterPlatform);
    }
    
    return filtered;
  }, [data, filterEventType, filterPlatform]);

  // Aggregated data for chart (date and count)
  const chartData = useMemo(() => {
    const aggregated: { [key: string]: number } = {};
    
    filteredData.forEach(row => {
      if (!aggregated[row.event_date]) {
        aggregated[row.event_date] = 0;
      }
      aggregated[row.event_date] += row.count;
    });

    return Object.entries(aggregated)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf());
  }, [filteredData]);

  const handleFetchData = () => {
    if (validateInputs(startDate, endDate, selectedEvents, selectedPlatforms)) {
      console.log('🔄 Manual data fetch triggered');
      setHasDataBeenFetched(true);
      setIsDateRangeChanged(false);
      fetchData(startDate, endDate, selectedEvents, selectedPlatforms);
      setLastFetchTime(new Date());
    }
  };

  const handleDateChange = (newStartDate?: string, newEndDate?: string) => {
    if (newStartDate) setStartDate(newStartDate);
    if (newEndDate) setEndDate(newEndDate);
    
    setIsDateRangeChanged(true);
    setHasDataBeenFetched(false);
  };

  const handleEventChange = (event: any) => {
    const value = event.target.value;
    setSelectedEvents(typeof value === 'string' ? value.split(',') : value);
    setHasDataBeenFetched(false);
  };

  const handlePlatformChange = (event: any) => {
    const value = event.target.value;
    setSelectedPlatforms(typeof value === 'string' ? value.split(',') : value);
    setHasDataBeenFetched(false);
  };

  const handleExport = () => {
    if (filteredData.length === 0) return;

    const csvContent = "data:text/csv;charset=utf-8," 
      + "Event Date,Event Type,Platform,Count\n"
      + filteredData.map(row => 
          `"${row.event_date}","${row.event_type}","${row.platform}",${row.count}`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `event-analysis-${startDate}-to-${endDate}.csv`);
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

  // Determine if fetch button should be disabled
  const isFetchDisabled = isLoading || !!validationError || selectedEvents.length === 0 || selectedPlatforms.length === 0;
  const isExportDisabled = isLoading || filteredData.length === 0;
  const areFiltersDisabled = isLoading || isDateRangeChanged || !hasDataBeenFetched || data.length === 0;

  return (
    <div className="space-y-6">
      <ChatBotIcon position="bottom-right" />
      
      {/* Main Tabs for Event Request and Dashboard */}
      <Card 
        sx={{ 
          backgroundColor: 'hsl(var(--card))',
          border: '1px solid rgb(55 65 81)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Tabs
            value={activeMainTab}
            onChange={(_, newValue) => setActiveMainTab(newValue)}
            sx={{
              borderBottom: '1px solid #374151',
              '& .MuiTab-root': {
                color: '#9CA3AF',
                '&.Mui-selected': {
                  color: '#2EDAFF',
                },
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#2EDAFF',
              },
            }}
          >
            <Tab 
              icon={<Send size={18} />} 
              iconPosition="start"
              label="Event Request"
              sx={
                {
                    textTransform: 'capitalize'
                }
              }
            />
            <Tab 
              icon={<LayoutDashboard size={18} />} 
              iconPosition="start"
              label="Event Generate Dashboard"
              sx={{
                textTransform: 'capitalize'
              }}
            />
          </Tabs>

          {/* Event Request Tab */}
          <TabPanel value={activeMainTab} index={0}>
            <EventRequestTab />
          </TabPanel>

          {/* Event Generate Dashboard Tab */}
          <TabPanel value={activeMainTab} index={1}>
            {/* Summary Stats Cards */}
            {!isLoading && data.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <MetricCard
                  title="Total Events"
                  value={summaryStats.totalEvents.toLocaleString()}
                  icon={Database}
                />
                <MetricCard
                  title="Date Range"
                  value={`${moment(startDate).format('MMM D')} - ${moment(endDate).format('MMM D')}`}
                  icon={Calendar}
                />
                <MetricCard
                  title="Unique Dates"
                  value={summaryStats.uniqueDates}
                  icon={BarChart3}
                />
                <MetricCard
                  title="Avg Events/Day"
                  value={Math.round(summaryStats.averageEventsPerDay).toLocaleString()}
                  icon={Monitor}
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
                <div className="flex flex-col gap-6">
                  {/* Date Range Selection */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
                  </div>

                  {/* Event and Platform Selection */}
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Event Selection */}
                    <FormControl sx={{ minWidth: 200 }} size="small">
                      <InputLabel sx={{ color: '#9CA3AF' }}>Event Types</InputLabel>
                      <Select
                        multiple
                        value={selectedEvents}
                        onChange={handleEventChange}
                        input={<OutlinedInput label="Event Types" />}
                        renderValue={(selected) => selected.map(formatEventType).join(', ')}
                        sx={{
                          color: 'white',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#4B5563',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#6B7280',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#2EDAFF',
                          },
                        }}
                      >
                        {availableEvents.map((event) => (
                          <MenuItem key={event} value={event}>
                            <Checkbox checked={selectedEvents.indexOf(event) > -1} />
                            <ListItemText primary={formatEventType(event)} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Platform Selection */}
                    <FormControl sx={{ minWidth: 200 }} size="small">
                      <InputLabel sx={{ color: '#9CA3AF' }}>Platforms</InputLabel>
                      <Select
                        multiple
                        value={selectedPlatforms}
                        onChange={handlePlatformChange}
                        input={<OutlinedInput label="Platforms" />}
                        renderValue={(selected) => selected.map(formatPlatform).join(', ')}
                        sx={{
                          color: 'white',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#4B5563',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#6B7280',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#2EDAFF',
                          },
                        }}
                      >
                        {availablePlatforms.map((platform) => (
                          <MenuItem key={platform} value={platform}>
                            <Checkbox checked={selectedPlatforms.indexOf(platform) > -1} />
                            <ListItemText primary={formatPlatform(platform)} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <div className="flex items-center gap-3">
                      {lastFetchTime && (
                        <Tooltip title={`Last fetched at ${lastFetchTime.toLocaleTimeString()}`}>
                          <Typography variant="body2" sx={{ color: '#9CA3AF', cursor: 'help' }}>
                            Updated: {moment(lastFetchTime).fromNow()}
                          </Typography>
                        </Tooltip>
                      )}
                      
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
                        {validationError ? 'Fix Inputs First' : 'Fetch Data'}
                      </Button>

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

                  {/* Selected Options Display */}
                  {(selectedEvents.length > 0 || selectedPlatforms.length > 0) && (
                    <div className="flex flex-col gap-2">
                      <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                        Selected for fetch:
                      </Typography>
                      <div className="flex flex-wrap gap-2">
                        {selectedEvents.map(event => (
                          <Chip
                            key={event}
                            label={`Event: ${formatEventType(event)}`}
                            size="small"
                            onDelete={() => setSelectedEvents(selectedEvents.filter(e => e !== event))}
                            sx={{
                              backgroundColor: getEventTypeColor(event) + '20',
                              color: getEventTypeColor(event),
                              border: `1px solid ${getEventTypeColor(event)}40`,
                            }}
                          />
                        ))}
                        {selectedPlatforms.map(platform => (
                          <Chip
                            key={platform}
                            label={`Platform: ${formatPlatform(platform)}`}
                            size="small"
                            onDelete={() => setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform))}
                            sx={{
                              backgroundColor: getPlatformColor(platform) + '20',
                              color: getPlatformColor(platform),
                              border: `1px solid ${getPlatformColor(platform)}40`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
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
                {progress && (
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
                )}

                {/* Active Filters Display (for post-fetch filtering) */}
                {(filterEventType !== 'all' || filterPlatform !== 'all') && hasDataBeenFetched && (
                  <Box sx={{ mt: 2 }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                        Active display filters:
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
                          Clear Display Filters
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
                    Loading Event Analysis Data
                  </Typography>
                  
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
                    Ready to Analyze Event Data
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgb(156 163 175)', mb: 4 }}>
                    Select date range, event types, and platforms, then click "Fetch Data" to analyze event trends
                  </Typography>
                  <div className="flex flex-col gap-2 items-center">
                    <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                      {selectedEvents.length > 0 ? `${selectedEvents.length} event types selected` : 'No event types selected'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                      {selectedPlatforms.length > 0 ? `${selectedPlatforms.length} platforms selected` : 'No platforms selected'}
                    </Typography>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Data Visualization Tabs */}
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
                  <Tabs
                    value={activeDashboardTab}
                    onChange={(_, newValue) => setActiveDashboardTab(newValue)}
                    sx={{
                      borderBottom: '1px solid #374151',
                      '& .MuiTab-root': {
                        color: '#9CA3AF',
                        '&.Mui-selected': {
                          color: '#2EDAFF',
                        },
                      },
                      '& .MuiTabs-indicator': {
                        backgroundColor: '#2EDAFF',
                      },
                    }}
                  >
                    <Tab 
                      icon={<BarChart3 size={18} />} 
                      iconPosition="start"
                      label="Bar Chart" 
                    />
                    <Tab 
                      icon={<Table size={18} />} 
                      iconPosition="start"
                      label="Data Table" 
                    />
                  </Tabs>

                  <TabPanel value={activeDashboardTab} index={0}>
                    <EventAnalysisChart 
                      data={chartData}
                      eventType={filterEventType}
                      platform={filterPlatform}
                    />
                  </TabPanel>

                  <TabPanel value={activeDashboardTab} index={1}>
                    <EventAnalysisTable 
                      data={filteredData}
                      eventType={filterEventType}
                      platform={filterPlatform}
                      formatEventType={formatEventType}
                      formatPlatform={formatPlatform}
                      getEventTypeColor={getEventTypeColor}
                      getPlatformColor={getPlatformColor}
                    />
                  </TabPanel>
                </CardContent>
              </Card>
            )}
          </TabPanel>
        </CardContent>
      </Card>
    </div>
  );
};