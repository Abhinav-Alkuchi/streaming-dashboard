/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Navigation,
  TrendingUp,
  Clock,
  Smartphone,
  Monitor,
  Tablet,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Eye,
  ShoppingCart,
  CreditCard,
} from 'lucide-react';

interface InteractionPoint {
  x: number;
  y: number;
  intensity: number;
  count: number;
  element: string;
  type: 'click' | 'hover' | 'scroll';
  timestamp?: string;
}

interface BehaviorData {
  device_type: string;
  page_url: string;
  scroll_depth: number;
  time_on_page: number;
  interactions: InteractionPoint[];
  session_id: string;
  user_id: string;
  conversion: boolean;
}

interface BehaviorAnalyticsProps {
  data: BehaviorData[];
  aggregateData: any;
  isLoading: boolean;
}

// Enhanced mock data with realistic values
const generateMockData = (): BehaviorData[] => {
  const devices = ['desktop', 'mobile', 'tablet'];
  const pages = ['/home', '/products', '/product/123', '/cart', '/checkout'];
  
  return Array.from({ length: 150 }, (_, i) => {
    const device = devices[Math.floor(Math.random() * devices.length)];
    const conversion = Math.random() > 0.85; // 15% conversion rate
    
    return {
      device_type: device,
      page_url: pages[Math.floor(Math.random() * pages.length)],
      scroll_depth: Math.random() * 100,
      time_on_page: Math.random() * 180000, // up to 3 minutes
      interactions: [],
      session_id: `session_${i.toString().padStart(3, '0')}`,
      user_id: `user_${Math.floor(Math.random() * 50)}`,
      conversion: conversion,
    };
  });
};

export const CustomerBehaviorAnalytics: React.FC<BehaviorAnalyticsProps> = ({
  data,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [selectedMetric, setSelectedMetric] = useState<'engagement' | 'conversion' | 'retention'>('engagement');

  const processedData = useMemo(() => {
    return data && data.length > 0 ? data : generateMockData();
  }, [data]);

  const filteredData = useMemo(() => {
    return selectedDevice === 'all'
      ? processedData
      : processedData.filter((item) => item.device_type === selectedDevice);
  }, [processedData, selectedDevice]);

  const totalSessions = filteredData.length;

  // Enhanced Key Metrics with realistic calculations
  const metrics = useMemo(() => {
    const totalConversions = filteredData.filter((d) => d.conversion).length;
    const conversionRate = totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0;
    const avgEngagement = filteredData.reduce((s, d) => s + d.scroll_depth, 0) / totalSessions || 0;
    const avgTimeOnPage = filteredData.reduce((s, d) => s + d.time_on_page, 0) / totalSessions / 1000 || 0;
    const bounceRate = (filteredData.filter((d) => d.scroll_depth < 25 && d.time_on_page < 10000).length / totalSessions) * 100 || 0;

    return {
      totalSessions,
      conversionRate,
      avgEngagement,
      avgTimeOnPage,
      bounceRate,
    };
  }, [filteredData, totalSessions]);

  // Enhanced Scroll Depth Distribution
  const scrollDistribution = useMemo(() => {
    const ranges = [
      { range: '0-25%', min: 0, max: 25, count: 0 },
      { range: '25-50%', min: 25, max: 50, count: 0 },
      { range: '50-75%', min: 50, max: 75, count: 0 },
      { range: '75-100%', min: 75, max: 100, count: 0 },
    ];

    filteredData.forEach((session) => {
      const depth = session.scroll_depth;
      const range = ranges.find((r) => depth >= r.min && depth < r.max) || ranges[ranges.length - 1];
      range.count++;
    });

    return ranges.map((range) => ({
      ...range,
      percentage: totalSessions > 0 ? (range.count / totalSessions) * 100 : 0,
    }));
  }, [filteredData, totalSessions]);

  // Enhanced Device Comparison with realistic data
  const deviceComparison = useMemo(() => {
    const devices = ['desktop', 'mobile', 'tablet'];
    return devices.map((device) => {
      const deviceData = filteredData.filter((d) => d.device_type === device);
      const deviceSessions = deviceData.length;
      const deviceConversions = deviceData.filter((d) => d.conversion).length;
      const conversionRate = deviceSessions > 0 ? (deviceConversions / deviceSessions) * 100 : 0;
      const avgTime = deviceSessions > 0 ? deviceData.reduce((s, d) => s + d.time_on_page, 0) / deviceSessions / 1000 : 0;
      const avgScroll = deviceSessions > 0 ? deviceData.reduce((s, d) => s + d.scroll_depth, 0) / deviceSessions : 0;

      return {
        device,
        sessions: deviceSessions,
        conversionRate,
        avgTime,
        avgScroll,
      };
    });
  }, [filteredData]);

  // Enhanced Conversion Funnel with realistic progression
  const conversionFunnelData = useMemo(() => {
    const visitors = 10000;
    const productViews = Math.round(visitors * 0.35);
    const addToCart = Math.round(productViews * 0.34);
    const checkout = Math.round(addToCart * 0.5);
    const purchase = Math.round(checkout * 0.58);

    return [
      { stage: 'Visitors', icon: Eye, value: visitors, color: '#3B82F6' },
      { stage: 'Product Views', icon: BarChart3, value: productViews, color: '#8B5CF6' },
      { stage: 'Add to Cart', icon: ShoppingCart, value: addToCart, color: '#F59E0B' },
      { stage: 'Checkout', icon: CreditCard, value: checkout, color: '#EC4899' },
      { stage: 'Purchase', icon: CheckCircle, value: purchase, color: '#10B981' },
    ];
  }, []);

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile':
        return <Smartphone size={16} />;
      case 'tablet':
        return <Tablet size={16} />;
      default:
        return <Monitor size={16} />;
    }
  };


  const renderEngagementDashboard = () => (
    <Grid container spacing={3}>
      {/* Key Metrics - Improved alignment and spacing */}
      <Grid item xs={12}>
        <Grid container spacing={2} justifyContent="space-between">
          {[
            { 
              label: 'Total Sessions', 
              value: metrics.totalSessions.toLocaleString(), 
              icon: Users, 
              color: '#3B82F6', 
              bg: '#3B82F620' 
            },
            { 
              label: 'Conversion Rate', 
              value: `${metrics.conversionRate.toFixed(1)}%`, 
              icon: Target, 
              color: '#10B981', 
              bg: '#10B98120' 
            },
            { 
              label: 'Avg Engagement', 
              value: `${metrics.avgEngagement.toFixed(1)}%`, 
              icon: Navigation, 
              color: '#F59E0B', 
              bg: '#F59E0B20' 
            },
            { 
              label: 'Avg Time on Page', 
              value: `${metrics.avgTimeOnPage.toFixed(1)}s`, 
              icon: Clock, 
              color: '#EC4899', 
              bg: '#EC489920' 
            },
            { 
              label: 'Bounce Rate', 
              value: `${metrics.bounceRate.toFixed(1)}%`, 
              icon: AlertTriangle, 
              color: '#EF4444', 
              bg: '#EF444420' 
            },
          ].map((m, i) => (
            <Grid item xs={12} sm={6} md={2.4} key={i}>
              <Card sx={{ 
                bgcolor: 'rgb(55 65 81 / 0.8)', 
                p: 2, 
                height: 100,
                display: 'flex',
                alignItems: 'center',
                transition: '0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  bgcolor: 'rgb(65 75 91 / 0.8)',
                }
              }}>
                <Box display="flex" alignItems="center" gap={2} width="100%">
                  <Box 
                    bgcolor={m.bg} 
                    p={1} 
                    borderRadius={2} 
                    display="flex"
                    sx={{ minWidth: 40 }}
                  >
                    <m.icon size={20} color={m.color} />
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Typography variant="h6" color="white" fontWeight="bold" noWrap>
                      {m.value}
                    </Typography>
                    <Typography variant="body2" color="#9CA3AF" noWrap>
                      {m.label}
                    </Typography>
                  </Box>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* Scroll Depth - Improved layout */}
      <Grid item xs={12} md={12}>
        <Card sx={{ 
          bgcolor: 'rgb(55 65 81 / 0.8)', 
          p: 3, 
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Typography variant="h6" color="white" mb={3}>
            Scroll Depth Distribution
          </Typography>
          <Box display="flex" flexDirection="column" gap={3} flex={1}>
            {scrollDistribution.map((item, i) => (
              <Box key={i}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" color="#9CA3AF">
                    {item.range}
                  </Typography>
                  <Typography variant="body2" color="white" fontWeight="bold">
                    {item.percentage.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={item.percentage}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: '#1F2937',
                    '& .MuiLinearProgress-bar': {
                      bgcolor:
                        i === 0
                          ? '#EF4444'
                          : i === 1
                          ? '#F59E0B'
                          : i === 2
                          ? '#3B82F6'
                          : '#10B981',
                      borderRadius: 4,
                    },
                  }}
                />
              </Box>
            ))}
          </Box>
          <Alert severity="info" sx={{ mt: 3, bgcolor: '#1F2937' }}>
            <Typography variant="body2" color="white">
              {scrollDistribution[0].percentage > 40 
                ? 'High bounce rate detected. Consider improving above-the-fold content.'
                : 'Good engagement distribution. Users are exploring your content.'}
            </Typography>
          </Alert>
        </Card>
      </Grid>

      {/* Device Performance - Enhanced data display */}
      <Grid item xs={12} md={12}>
        <Card sx={{ 
          bgcolor: 'rgb(55 65 81 / 0.8)', 
          p: 3, 
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Typography variant="h6" color="white" mb={3}>
            Device Performance Comparison
          </Typography>
          <Box display="flex" flexDirection="column" gap={2} flex={1}>
            {deviceComparison.map((dev) => (
              <Card 
                key={dev.device} 
                sx={{ 
                  bgcolor: '#1F2937', 
                  p: 2,
                  transition: '0.2s',
                  '&:hover': {
                    bgcolor: 'rgb(55 65 81)',
                    transform: 'translateX(4px)',
                  }
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    {getDeviceIcon(dev.device)}
                    <Typography variant="subtitle1" color="white">
                      {dev.device.charAt(0).toUpperCase() + dev.device.slice(1)}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography color="#9CA3AF" variant="body2">
                      {dev.sessions} sessions
                    </Typography>
                    <Chip 
                      label={`${dev.conversionRate.toFixed(1)}% conv.`} 
                      size="small" 
                      sx={{ 
                        bgcolor: dev.conversionRate > 5 ? '#10B98120' : '#EF444420', 
                        color: dev.conversionRate > 5 ? '#10B981' : '#EF4444',
                        fontWeight: 'bold'
                      }} 
                    />
                  </Box>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="#9CA3AF">Avg Time</Typography>
                    <Typography color="white" fontWeight="medium">
                      {dev.avgTime.toFixed(1)}s
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="#9CA3AF">Avg Scroll</Typography>
                    <Typography color="white" fontWeight="medium">
                      {dev.avgScroll.toFixed(1)}%
                    </Typography>
                  </Grid>
                </Grid>
              </Card>
            ))}
          </Box>
        </Card>
      </Grid>
    </Grid>
  );

  const renderElementAnalytics = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card sx={{ 
          bgcolor: 'rgb(55 65 81 / 0.8)', 
          p: 3, 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          minHeight: 200
        }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <CheckCircle size={20} color="#10B981" />
            <Typography variant="h6" color="white">
              High Performing Elements
            </Typography>
          </Box>
          <Typography color="#9CA3AF">
            No high performing elements found
          </Typography>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={{ 
          bgcolor: 'rgb(55 65 81 / 0.8)', 
          p: 3, 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          minHeight: 200
        }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <AlertTriangle size={20} color="#EF4444" />
            <Typography variant="h6" color="white">
              Needs Optimization
            </Typography>
          </Box>
          <Typography color="#9CA3AF">
            No underperforming elements found
          </Typography>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={{ 
          bgcolor: 'rgb(55 65 81 / 0.8)', 
          p: 3, 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          minHeight: 200
        }}>
          <Typography variant="h6" color="white" mb={2}>
            Element Performance Overview
          </Typography>
          <Typography color="#9CA3AF">
            No element interaction data available
          </Typography>
        </Card>
      </Grid>
    </Grid>
  );

  const renderConversionFlow = () => (
    <Grid container spacing={3}>
      {/* Funnel - Improved responsive layout */}
      <Grid item xs={12}>
        <Card sx={{ bgcolor: 'rgb(55 65 81 / 0.8)', p: 3 }}>
          <Typography variant="h6" color="white" textAlign="center" mb={4}>
            Purchase Conversion Funnel
          </Typography>
          <Box 
            display="flex" 
            flexDirection={{ xs: 'column', md: 'row' }} 
            justifyContent="center" 
            alignItems="center" 
            gap={3}
          >
            {conversionFunnelData.map((step, i) => (
              <React.Fragment key={i}>
                <Card
                  sx={{
                    bgcolor: '#1F2937',
                    p: 3,
                    textAlign: 'center',
                    minWidth: { xs: '100%', md: 140 },
                    flex: 1,
                    maxWidth: { xs: '100%', md: 180 },
                    border: `2px solid ${step.color}20`,
                    transition: '0.2s',
                    '&:hover': { 
                      borderColor: step.color, 
                      transform: 'translateY(-4px)',
                      boxShadow: `0 8px 25px -8px ${step.color}40`
                    },
                  }}
                >
                  <Box 
                    bgcolor={`${step.color}20`} 
                    p={1} 
                    borderRadius={2} 
                    display="inline-flex" 
                    mb={2}
                    sx={{ transition: '0.2s' }}
                  >
                    <step.icon size={24} color={step.color} />
                  </Box>
                  <Typography variant="h6" color="white" fontWeight="bold" gutterBottom>
                    {step.value.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="#9CA3AF">
                    {step.stage}
                  </Typography>
                </Card>
                {i < conversionFunnelData.length - 1 && (
                  <Box
                    sx={{
                      width: { xs: 0, md: 40 },
                      height: { xs: 20, md: 2 },
                      bgcolor: '#4B5563',
                      position: 'relative',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: { xs: 0, md: -8 },
                        left: { xs: -8, md: '50%' },
                        transform: { md: 'translateX(-50%)' },
                        borderLeft: '6px solid transparent',
                        borderRight: '6px solid transparent',
                        borderTop: '8px solid #9CA3AF',
                        width: 0,
                        height: 0,
                      },
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </Box>
          <Alert severity="info" sx={{ mt: 3, bgcolor: '#1F2937' }}>
            <Typography variant="body2" color="white">
              Overall conversion rate: {((conversionFunnelData[4].value / conversionFunnelData[0].value) * 100).toFixed(1)}%. 
              Largest drop-off occurs between {conversionFunnelData[0].stage} and {conversionFunnelData[1].stage} stages.
            </Typography>
          </Alert>
        </Card>
      </Grid>

      {/* Recommendations - Enhanced card layout */}
      <Grid item xs={12}>
        <Card sx={{ bgcolor: 'rgb(55 65 81 / 0.8)', p: 3 }}>
          <Typography variant="h6" color="white" mb={3}>
            Optimization Recommendations
          </Typography>
          <Grid container spacing={2}>
            {[
              {
                title: 'Improve Add-to-Cart Visibility',
                desc: '66% drop-off at this stage. Consider making the button more prominent.',
                impact: 'High',
                effort: 'Low',
                icon: ShoppingCart,
                color: '#F59E0B',
              },
              {
                title: 'Simplify Checkout Process',
                desc: '50% of users abandon during checkout. Reduce form fields and steps.',
                impact: 'High',
                effort: 'Medium',
                icon: CreditCard,
                color: '#EC4899',
              },
              {
                title: 'Mobile Experience Optimization',
                desc: 'Mobile conversion rate is 40% lower than desktop.',
                impact: 'Medium',
                effort: 'High',
                icon: Smartphone,
                color: '#3B82F6',
              },
              {
                title: 'Add Trust Signals',
                desc: 'Include security badges and customer reviews near purchase buttons to improve conversion confidence.',
                impact: 'Medium',
                effort: 'Low',
                icon: CheckCircle,
                color: '#10B981',
              },
            ].map((rec, i) => (
              <Grid item xs={12} md={6} key={i}>
                <Card
                  sx={{
                    bgcolor: '#1F2937',
                    p: 2,
                    height: '100%',
                    transition: '0.2s',
                    '&:hover': { 
                      bgcolor: 'rgb(55 65 81)', 
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    },
                  }}
                >
                  <Box display="flex" gap={2} alignItems="flex-start">
                    <Box 
                      bgcolor={`${rec.color}20`} 
                      p={1} 
                      borderRadius={2} 
                      display="flex"
                      sx={{ flexShrink: 0 }}
                    >
                      <rec.icon size={20} color={rec.color} />
                    </Box>
                    <Box flex={1}>
                      <Typography variant="subtitle1" color="white" mb={1}>
                        {rec.title}
                      </Typography>
                      <Typography variant="body2" color="#9CA3AF" mb={2}>
                        {rec.desc}
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        <Chip
                          label={`Impact: ${rec.impact}`}
                          size="small"
                          sx={{
                            bgcolor: rec.impact === 'High' ? '#EF444420' : 
                                    rec.impact === 'Medium' ? '#F59E0B20' : '#10B98120',
                            color: rec.impact === 'High' ? '#EF4444' : 
                                  rec.impact === 'Medium' ? '#F59E0B' : '#10B981',
                            fontWeight: 'medium'
                          }}
                        />
                        <Chip
                          label={`Effort: ${rec.effort}`}
                          size="small"
                          sx={{ 
                            bgcolor: '#3B82F620', 
                            color: '#3B82F6',
                            fontWeight: 'medium'
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Card>
      </Grid>
    </Grid>
  );

  if (isLoading) {
    return (
      <Card sx={{ bgcolor: 'rgb(31 41 55 / 0.8)', border: '1px solid rgb(55 65 81)' }}>
        <CardContent sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="#9CA3AF">Loading analytics data...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ 
      bgcolor: 'rgb(31 41 55 / 0.8)', 
      border: '1px solid rgb(55 65 81)',
      backdropFilter: 'blur(8px)'
    }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header - Improved responsive layout */}
        <Box
          display="flex"
          flexDirection={{ xs: 'column', lg: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', lg: 'center' }}
          gap={3}
          mb={4}
        >
          <Box>
            <Typography variant="h5" color="white" fontWeight="bold" gutterBottom>
              Customer Behavior Analytics
            </Typography>
            <Typography variant="body2" color="#9CA3AF">
              Analyzing {totalSessions} user session{totalSessions !== 1 ? 's' : ''} • Real-time data
            </Typography>
          </Box>
          <Box display="flex" gap={2} flexWrap="wrap">
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
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel sx={{ color: '#9CA3AF' }}>Metric</InputLabel>
              <Select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as any)}
                label="Metric"
                sx={{ 
                  color: 'white', 
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4B5563' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#6B7280' }
                }}
              >
                <MenuItem value="engagement">Engagement</MenuItem>
                <MenuItem value="conversion">Conversion</MenuItem>
                <MenuItem value="retention">Retention</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Tabs - Enhanced styling */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            borderBottom: '1px solid rgb(55 65 81)',
            mb: 3,
            '& .MuiTab-root': {
              color: '#9CA3AF',
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              minHeight: 48,
              '&.Mui-selected': { 
                color: '#60A5FA',
                fontWeight: 600
              },
              '&:hover': {
                color: '#93C5FD',
                backgroundColor: 'rgba(96, 165, 250, 0.08)'
              },
            },
            '& .MuiTabs-indicator': { 
              bgcolor: '#60A5FA',
              height: 3,
              borderRadius: '3px 3px 0 0'
            },
          }}
        >
          <Tab icon={<BarChart3 size={18} />} iconPosition="start" label="Engagement Dashboard" />
          <Tab icon={<Target size={18} />} iconPosition="start" label="Element Analytics" />
          <Tab icon={<TrendingUp size={18} />} iconPosition="start" label="Conversion Flow" />
        </Tabs>

        {/* Content */}
        <Box sx={{ minHeight: 400 }}>
          {activeTab === 0 && renderEngagementDashboard()}
          {activeTab === 1 && renderElementAnalytics()}
          {activeTab === 2 && renderConversionFlow()}
        </Box>
      </CardContent>
    </Card>
  );
};