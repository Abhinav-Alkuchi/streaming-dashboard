// HeatMapVisualization.tsx
import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Tabs,
  Tab,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  MousePointer,
  Navigation,
  TrendingUp,
  Clock,
  Smartphone,
  Monitor,
  Tablet,
  Users,
} from 'lucide-react';

interface HeatMapPoint {
  x: number;
  y: number;
  intensity: number;
  count: number;
  element?: string;
  timestamp?: string;
}

interface HeatMapData {
  device_type: string;
  page_url: string;
  scroll_depth: number;
  time_on_page: number;
  clicks: HeatMapPoint[];
  session_id: string;
  user_id: string;
}

interface HeatMapAggregate {
  click_heatmap: HeatMapPoint[];
  popular_elements: { element: string; click_count: number }[];
  total_sessions: number;
  total_users: number;
  average_session_duration: number;
  conversion_rate: number;
  total_revenue: number;
}

interface HeatMapVisualizationProps {
  data: HeatMapData[];
  aggregateData: HeatMapAggregate | null;
  isLoading: boolean;
}

export const HeatMapVisualization: React.FC<HeatMapVisualizationProps> = ({
  data,
  aggregateData,
  isLoading
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [intensityThreshold, setIntensityThreshold] = useState(10);
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [selectedPage, setSelectedPage] = useState<string>('all');
  const [heatmapType, setHeatmapType] = useState<'clicks' | 'scroll' | 'engagement'>('clicks');

  // Generate mock heatmap data if not provided
  const generatedHeatmapData = useMemo((): HeatMapPoint[] => {
    if (aggregateData?.click_heatmap && aggregateData.click_heatmap.length > 0) {
      return aggregateData.click_heatmap;
    }

    // Generate sample heatmap points for demonstration
    const points: HeatMapPoint[] = [];
    const elements = ['add-to-cart-btn', 'product-image', 'buy-now-btn', 'size-selector', 'color-selector'];
    
    for (let i = 0; i < 50; i++) {
      points.push({
        x: Math.random() * 80 + 10, // 10-90% range
        y: Math.random() * 80 + 10,
        intensity: Math.random() * 100,
        count: Math.floor(Math.random() * 50) + 1,
        element: elements[Math.floor(Math.random() * elements.length)],
      });
    }
    
    return points;
  }, [aggregateData]);

  // Filter data based on selections
  const filteredData = useMemo(() => {
    let filtered = data;
    
    if (selectedDevice !== 'all') {
      filtered = filtered.filter(item => item.device_type === selectedDevice);
    }
    
    if (selectedPage !== 'all') {
      filtered = filtered.filter(item => item.page_url === selectedPage);
    }
    
    return filtered;
  }, [data, selectedDevice, selectedPage]);

  // Get unique pages for filter
  const uniquePages = useMemo(() => {
    const pages = Array.from(new Set(data.map(item => item.page_url)));
    return pages.slice(0, 5);
  }, [data]);

  // Generate filtered heat map points
  const heatMapPoints = useMemo(() => {
    return generatedHeatmapData
      .filter(point => point.intensity >= intensityThreshold)
      .map(point => ({
        ...point,
        size: Math.max(20, Math.min(80, point.intensity / 2))
      }));
  }, [generatedHeatmapData, intensityThreshold]);

  // Calculate engagement metrics
  const engagementMetrics = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        avgScrollDepth: 65,
        avgTimeOnPage: 45000,
        totalClicks: generatedHeatmapData.reduce((sum, point) => sum + point.count, 0),
        avgClicksPerSession: 8.5,
        totalSessions: filteredData.length || 156,
      };
    }

    const avgScrollDepth = filteredData.reduce((sum, item) => sum + item.scroll_depth, 0) / filteredData.length;
    const avgTimeOnPage = filteredData.reduce((sum, item) => sum + item.time_on_page, 0) / filteredData.length;
    const totalClicks = generatedHeatmapData.reduce((sum, point) => sum + point.count, 0);
    const avgClicksPerSession = totalClicks / (filteredData.length || 1);

    return {
      avgScrollDepth,
      avgTimeOnPage,
      totalClicks,
      avgClicksPerSession,
      totalSessions: filteredData.length,
    };
  }, [filteredData, generatedHeatmapData]);

  // Scroll depth distribution
  const scrollDistribution = useMemo(() => {
    return [0, 25, 50, 75, 100].map(depth => ({
      depth,
      percentage: Math.max(0, engagementMetrics.avgScrollDepth - depth * 0.8)
    }));
  }, [engagementMetrics.avgScrollDepth]);

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return <Smartphone size={16} />;
      case 'tablet': return <Tablet size={16} />;
      default: return <Monitor size={16} />;
    }
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity < 25) return 'rgba(34, 197, 94, 0.6)';
    if (intensity < 50) return 'rgba(234, 179, 8, 0.7)';
    if (intensity < 75) return 'rgba(249, 115, 22, 0.8)';
    return 'rgba(239, 68, 68, 0.9)';
  };

  const renderWebsiteMockup = () => (
    <>
      {/* Header */}
      <Box sx={{ 
        height: '60px', 
        backgroundColor: 'hsl(var(--card))', 
        borderBottom: '1px solid rgb(75 85 99)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3
      }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box sx={{ width: '80px', height: '20px', backgroundColor: 'rgb(156 163 175)', borderRadius: '4px' }} />
          <Box sx={{ width: '60px', height: '20px', backgroundColor: 'rgb(156 163 175)', borderRadius: '4px' }} />
          <Box sx={{ width: '70px', height: '20px', backgroundColor: 'rgb(156 163 175)', borderRadius: '4px' }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ width: '80px', height: '30px', backgroundColor: 'rgb(59 130 246)', borderRadius: '6px' }} />
          <Box sx={{ width: '100px', height: '30px', backgroundColor: 'rgb(156 163 175)', borderRadius: '6px' }} />
        </Box>
      </Box>
      
      {/* Hero Section */}
      <Box sx={{ 
        height: '300px', 
        backgroundColor: 'rgb(55 65 81 / 0.6)', 
        borderBottom: '1px solid rgb(75 85 99)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2
      }}>
        <Box sx={{ width: '60%', height: '40px', backgroundColor: 'rgb(156 163 175)', borderRadius: '8px' }} />
        <Box sx={{ width: '40%', height: '60px', backgroundColor: 'rgb(59 130 246)', borderRadius: '12px' }} />
        <Box sx={{ width: '30%', height: '20px', backgroundColor: 'rgb(156 163 175)', borderRadius: '4px' }} />
      </Box>
      
      {/* Product Grid */}
      <Box sx={{ 
        height: '240px', 
        backgroundColor: 'rgb(55 65 81 / 0.4)',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 2,
        p: 2
      }}>
        {[1, 2, 3].map(item => (
          <Box key={item} sx={{ 
            backgroundColor: 'hsl(var(--card))',
            borderRadius: '8px',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}>
            <Box sx={{ 
              width: '100%', 
              height: '100px', 
              backgroundColor: 'rgb(75 85 99)', 
              borderRadius: '4px' 
            }} />
            <Box sx={{ 
              width: '80%', 
              height: '16px', 
              backgroundColor: 'rgb(156 163 175)', 
              borderRadius: '2px' 
            }} />
            <Box sx={{ 
              width: '60%', 
              height: '16px', 
              backgroundColor: 'rgb(156 163 175)', 
              borderRadius: '2px' 
            }} />
            <Box sx={{ 
              width: '70%', 
              height: '30px', 
              backgroundColor: 'rgb(34 197 94)', 
              borderRadius: '6px',
              mt: 1
            }} />
          </Box>
        ))}
      </Box>
    </>
  );

  if (isLoading) {
    return (
      <Card sx={{ backgroundColor: 'hsl(var(--card))', border: '1px solid rgb(55 65 81)' }}>
        <CardContent sx={{ p: 3, textAlign: 'center' }}>
          <Typography sx={{ color: 'rgb(156 163 175)' }}>Loading heatmap data...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ backgroundColor: 'hsl(var(--card))', border: '1px solid rgb(55 65 81)' }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <Typography variant="h5" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
              Customer Behavior Heat Map
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgb(156 163 175)' }}>
              Visualize user interactions and engagement patterns
            </Typography>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel sx={{ color: '#9CA3AF' }}>Device</InputLabel>
              <Select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                label="Device"
                sx={{ 
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4B5563' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6B7280' }
                }}
              >
                <MenuItem value="all">All Devices</MenuItem>
                <MenuItem value="desktop">Desktop</MenuItem>
                <MenuItem value="mobile">Mobile</MenuItem>
                <MenuItem value="tablet">Tablet</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel sx={{ color: '#9CA3AF' }}>Page</InputLabel>
              <Select
                value={selectedPage}
                onChange={(e) => setSelectedPage(e.target.value)}
                label="Page"
                sx={{ 
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4B5563' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6B7280' }
                }}
              >
                <MenuItem value="all">All Pages</MenuItem>
                {uniquePages.map(page => (
                  <MenuItem key={page} value={page}>
                    {page.split('/').pop() || page}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>

        {/* Key Metrics */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'hsl(var(--card))', p: 2 }}>
              <div className="flex items-center gap-3">
                <Box sx={{ backgroundColor: '#3B82F620', p: 1, borderRadius: '8px' }}>
                  <Users size={20} color="#3B82F6" />
                </Box>
                <div>
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    {engagementMetrics.totalSessions}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgb(156 163 175)' }}>
                    Total Sessions
                  </Typography>
                </div>
              </div>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'hsl(var(--card))', p: 2 }}>
              <div className="flex items-center gap-3">
                <Box sx={{ backgroundColor: '#10B98120', p: 1, borderRadius: '8px' }}>
                  <MousePointer size={20} color="#10B981" />
                </Box>
                <div>
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    {engagementMetrics.totalClicks}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgb(156 163 175)' }}>
                    Total Clicks
                  </Typography>
                </div>
              </div>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'hsl(var(--card))', p: 2 }}>
              <div className="flex items-center gap-3">
                <Box sx={{ backgroundColor: '#F59E0B20', p: 1, borderRadius: '8px' }}>
                  <Navigation size={20} color="#F59E0B" />
                </Box>
                <div>
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    {engagementMetrics.avgScrollDepth}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgb(156 163 175)' }}>
                    Avg Scroll Depth
                  </Typography>
                </div>
              </div>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'hsl(var(--card))', p: 2 }}>
              <div className="flex items-center gap-3">
                <Box sx={{ backgroundColor: '#EC489920', p: 1, borderRadius: '8px' }}>
                  <Clock size={20} color="#EC4899" />
                </Box>
                <div>
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    {Math.round(engagementMetrics.avgTimeOnPage / 1000)}s
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgb(156 163 175)' }}>
                    Avg Time on Page
                  </Typography>
                </div>
              </div>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            borderBottom: '1px solid rgb(55 65 81)',
            mb: 3,
            '& .MuiTab-root': {
              color: '#9CA3AF',
              textTransform: 'none',
              fontWeight: 500,
              '&.Mui-selected': { color: '#60A5FA' },
            },
            '& .MuiTabs-indicator': { backgroundColor: '#60A5FA' },
          }}
        >
          <Tab icon={<MousePointer size={18} />} iconPosition="start" label="Click Heat Map" />
          <Tab icon={<Navigation size={18} />} iconPosition="start" label="Scroll Depth" />
          <Tab icon={<TrendingUp size={18} />} iconPosition="start" label="Engagement Analysis" />
        </Tabs>

        {/* Click Heat Map Tab */}
        {activeTab === 0 && (
          <Box>
            {/* Controls */}
            <Box sx={{ mb: 3, display: 'flex', gap: 3, alignItems: 'center' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" gutterBottom sx={{ color: 'white' }}>
                  Click Intensity Threshold: {intensityThreshold}%
                </Typography>
                <Slider
                  value={intensityThreshold}
                  onChange={(_, value) => setIntensityThreshold(value as number)}
                  min={0}
                  max={100}
                  sx={{
                    color: '#60A5FA',
                    '& .MuiSlider-track': { backgroundColor: '#60A5FA' },
                    '& .MuiSlider-thumb': { backgroundColor: '#60A5FA' },
                  }}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Low Intensity</span>
                  <span>High Intensity</span>
                </div>
              </Box>
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ color: '#9CA3AF' }}>Type</InputLabel>
                <Select
                  value={heatmapType}
                  onChange={(e) => setHeatmapType(e.target.value as any)}
                  label="Type"
                  sx={{ color: 'white' }}
                >
                  <MenuItem value="clicks">Clicks</MenuItem>
                  <MenuItem value="scroll">Scroll</MenuItem>
                  <MenuItem value="engagement">Engagement</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Heat Map Container */}
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: '600px',
                backgroundColor: 'rgb(17 24 39)',
                border: '2px solid rgb(55 65 81)',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundImage: `
                  linear-gradient(45deg, rgb(31 41 55) 25%, transparent 25%),
                  linear-gradient(-45deg, rgb(31 41 55) 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, rgb(31 41 55) 75%),
                  linear-gradient(-45deg, transparent 75%, rgb(31 41 55) 75%)
                `,
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              }}
            >
              {/* Website Mockup */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: '10%',
                  right: '10%',
                  bottom: 0,
                  backgroundColor: 'rgb(31 41 55 / 0.3)',
                  border: '1px solid rgb(55 65 81)',
                }}
              >
                {renderWebsiteMockup()}

                {/* Heat Points */}
                {heatMapPoints.map((point, index) => (
                  <Tooltip
                    key={index}
                    title={
                      <div>
                        <div><strong>{point.count} clicks</strong></div>
                        <div>Intensity: {point.intensity}%</div>
                        {point.element && <div>Element: {point.element}</div>}
                      </div>
                    }
                    arrow
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        left: `${point.x}%`,
                        top: `${point.y}%`,
                        width: `${point.size}px`,
                        height: `${point.size}px`,
                        backgroundColor: getIntensityColor(point.intensity),
                        borderRadius: '50%',
                        transform: 'translate(-50%, -50%)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          transform: 'translate(-50%, -50%) scale(1.2)',
                          zIndex: 10,
                        },
                        boxShadow: `0 0 20px ${getIntensityColor(point.intensity)}`,
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Box>

            {/* Heat Map Legend */}
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, mt: 2 }}>
              <Typography variant="body2" sx={{ color: 'rgb(156 163 175)' }}>
                Intensity Legend:
              </Typography>
              {[0, 25, 50, 75].map((value) => (
                <Box key={value} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: getIntensityColor(value + 12.5),
                      borderRadius: '50%',
                    }}
                  />
                  <Typography variant="caption" sx={{ color: 'rgb(156 163 175)' }}>
                    {value}-{value + 25}%
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Scroll Depth Tab */}
        {activeTab === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
              Scroll Depth Analysis
            </Typography>
            
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: '500px',
                backgroundColor: 'rgb(17 24 39)',
                border: '2px solid rgb(55 65 81)',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              {/* Scroll depth markers */}
              {[0, 25, 50, 75, 100].map(depth => (
                <Box
                  key={depth}
                  sx={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: `${depth}%`,
                    borderTop: depth === 100 ? '2px solid #EF4444' : '1px dashed rgba(255, 255, 255, 0.3)',
                    height: '1px',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      right: '10px',
                      top: '-8px',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontWeight: depth === 100 ? 'bold' : 'normal',
                    }}
                  >
                    {depth}%
                  </Typography>
                </Box>
              ))}

              {/* Scroll depth visualization */}
              <Box
                sx={{
                  position: 'absolute',
                  left: '20%',
                  right: '20%',
                  bottom: 0,
                  height: `${engagementMetrics.avgScrollDepth}%`,
                  background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.8) 100%)',
                  borderTopLeftRadius: '8px',
                  borderTopRightRadius: '8px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  pt: 2,
                }}
              >
                <Chip 
                  label={`Average: ${engagementMetrics.avgScrollDepth}%`}
                  sx={{ backgroundColor: '#3B82F6', color: 'white', fontWeight: 'bold' }}
                />
              </Box>

              {/* User distribution bars */}
              <Box sx={{ position: 'absolute', left: '10%', right: '10%', bottom: 0, height: '100%', display: 'flex', alignItems: 'end', gap: 1 }}>
                {scrollDistribution.map((item, index) => (
                  <Tooltip key={index} title={`${item.depth}% - ${item.percentage.toFixed(1)}% of users`}>
                    <Box
                      sx={{
                        flex: 1,
                        height: `${item.percentage}%`,
                        backgroundColor: `rgba(34, 197, 94, ${0.3 + index * 0.15})`,
                        borderTopLeftRadius: '4px',
                        borderTopRightRadius: '4px',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          backgroundColor: `rgba(34, 197, 94, ${0.6 + index * 0.15})`,
                        },
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Box>

            {/* Scroll depth insights */}
            <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgb(55 65 81 / 0.5)', borderRadius: '8px' }}>
              <Typography variant="body2" sx={{ color: 'white' }}>
                💡 <strong>Insight:</strong> {
                  engagementMetrics.avgScrollDepth > 75 
                    ? 'Excellent engagement! Users are scrolling through most of your content.' 
                    : engagementMetrics.avgScrollDepth > 50
                    ? 'Good engagement. Consider optimizing above-fold content to capture attention faster.'
                    : 'Low engagement. Review your page layout and content structure to improve user retention.'
                }
              </Typography>
            </Box>
          </Box>
        )}

        {/* Engagement Analysis Tab */}
        {activeTab === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
              Engagement Patterns by Device
            </Typography>
            
            <Grid container spacing={3}>
              {['desktop', 'mobile', 'tablet'].map(device => {
                const deviceData = data.filter(item => item.device_type === device);
                const deviceMetrics = deviceData.length > 0 ? {
                  avgClicks: deviceData.reduce((sum, item) => sum + item.clicks.length, 0) / deviceData.length,
                  avgScroll: deviceData.reduce((sum, item) => sum + item.scroll_depth, 0) / deviceData.length,
                  avgTime: deviceData.reduce((sum, item) => sum + item.time_on_page, 0) / deviceData.length,
                  sessions: deviceData.length,
                } : {
                  avgClicks: 7.2,
                  avgScroll: 68,
                  avgTime: 42000,
                  sessions: Math.floor(Math.random() * 50) + 20,
                };

                return (
                  <Grid item xs={12} md={4} key={device}>
                    <Card sx={{ backgroundColor: 'hsl(var(--card))', p: 3, height: '100%' }}>
                      <div className="flex items-center gap-3 mb-3">
                        {getDeviceIcon(device)}
                        <Typography variant="h6" sx={{ color: 'white', textTransform: 'capitalize' }}>
                          {device}
                        </Typography>
                        <Chip 
                          label={`${deviceMetrics.sessions} sessions`} 
                          size="small" 
                          sx={{ backgroundColor: '#4B5563', color: 'white' }}
                        />
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <Typography variant="body2" sx={{ color: 'rgb(156 163 175)' }}>Avg Clicks:</Typography>
                            <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
                              {deviceMetrics.avgClicks.toFixed(1)}
                            </Typography>
                          </div>
                          <Box sx={{ width: '100%', height: '8px', backgroundColor: 'rgb(55 65 81)', borderRadius: '4px', overflow: 'hidden' }}>
                            <Box 
                              sx={{ 
                                width: `${Math.min(100, deviceMetrics.avgClicks * 10)}%`, 
                                height: '100%', 
                                backgroundColor: '#3B82F6',
                                borderRadius: '4px',
                              }} 
                            />
                          </Box>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <Typography variant="body2" sx={{ color: 'rgb(156 163 175)' }}>Avg Scroll:</Typography>
                            <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
                              {deviceMetrics.avgScroll.toFixed(1)}%
                            </Typography>
                          </div>
                          <Box sx={{ width: '100%', height: '8px', backgroundColor: 'rgb(55 65 81)', borderRadius: '4px', overflow: 'hidden' }}>
                            <Box 
                              sx={{ 
                                width: `${deviceMetrics.avgScroll}%`, 
                                height: '100%', 
                                backgroundColor: '#10B981',
                                borderRadius: '4px',
                              }} 
                            />
                          </Box>
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <Typography variant="body2" sx={{ color: 'rgb(156 163 175)' }}>Avg Time:</Typography>
                            <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
                              {Math.round(deviceMetrics.avgTime / 1000)}s
                            </Typography>
                          </div>
                          <Box sx={{ width: '100%', height: '8px', backgroundColor: 'rgb(55 65 81)', borderRadius: '4px', overflow: 'hidden' }}>
                            <Box 
                              sx={{ 
                                width: `${Math.min(100, deviceMetrics.avgTime / 1000 / 6)}%`, 
                                height: '100%', 
                                backgroundColor: '#F59E0B',
                                borderRadius: '4px',
                              }} 
                            />
                          </Box>
                        </div>
                      </div>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {/* Popular Elements */}
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
                Most Clicked Elements
              </Typography>
              <Grid container spacing={2}>
                {generatedHeatmapData
                  .reduce((acc: {element: string, count: number}[], point) => {
                    if (point.element) {
                      const existing = acc.find(item => item.element === point.element);
                      if (existing) {
                        existing.count += point.count;
                      } else {
                        acc.push({ element: point.element, count: point.count });
                      }
                    }
                    return acc;
                  }, [])
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 6)
                  .map((element, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card sx={{ backgroundColor: 'hsl(var(--card))', p: 2 }}>
                        <div className="flex justify-between items-center">
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: 'white', 
                              fontFamily: 'monospace',
                              fontSize: '12px'
                            }}
                            title={element.element}
                          >
                            {element.element.length > 20 ? 
                              element.element.substring(0, 20) + '...' : element.element}
                          </Typography>
                          <Chip
                            label={`${element.count} clicks`}
                            size="small"
                            sx={{ backgroundColor: '#3B82F6', color: 'white' }}
                          />
                        </div>
                      </Card>
                    </Grid>
                  ))}
              </Grid>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};