// PurchaseJourneyHeatMap.tsx
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
} from '@mui/material';
import {
  MousePointer,
  TrendingUp,
  CheckCircle,
  XCircle,
  BarChart3,
} from 'lucide-react';

interface PurchaseJourneyHeatMapProps {
  journeyData: unknown;
  isLoading: boolean;
}

export const PurchaseJourneyHeatMap: React.FC<PurchaseJourneyHeatMapProps> = ({
  journeyData,
  isLoading
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedView, setSelectedView] = useState('comparison');
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedDevice, setSelectedDevice] = useState('all');

  const tabs = [
    { icon: BarChart3, label: "Journey Comparison" },
    { icon: TrendingUp, label: "Funnel Analysis" },
    { icon: MousePointer, label: "Element Performance" }
  ];

  // Filter data based on selections
  const filteredData = useMemo(() => {
    if (!journeyData) return null;

    let data = { ...journeyData };

    // Filter by device
    if (selectedDevice !== 'all') {
      // Apply device filtering logic
    }

    // Filter by funnel stage if applicable
    if (selectedStage !== 'all' && data.funnel_stages) {
      data = {
        ...data,
        funnel_stages: {
          [selectedStage]: data.funnel_stages[selectedStage]
        }
      };
    }

    return data;
  }, [journeyData, selectedDevice, selectedStage]);

  const renderJourneyComparison = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card sx={{ backgroundColor: 'hsl(var(--card))', p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <CheckCircle size={24} color="#10B981" />
            <Typography variant="h6" sx={{ color: 'white' }}>
              Successful Journeys
            </Typography>
            <Chip 
              label={`${filteredData?.successful_journey?.total_clicks || 0} clicks`}
              size="small"
              color="success"
            />
          </Box>
          
          {/* Successful journey heatmap visualization */}
          <Box sx={{ 
            position: 'relative', 
            height: '400px', 
            backgroundColor: 'rgb(17 24 39)',
            border: '1px solid rgb(55 65 81)',
            borderRadius: '8px'
          }}>
            {/* Heatmap points for successful journeys */}
            {filteredData?.successful_journey?.heatmap?.global.map((point, index) => (
              <Box
                key={index}
                sx={{
                  position: 'absolute',
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  width: `${Math.max(20, point.intensity / 2)}px`,
                  height: `${Math.max(20, point.intensity / 2)}px`,
                  backgroundColor: `rgba(34, 197, 94, ${point.intensity / 100})`,
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  boxShadow: `0 0 20px rgba(34, 197, 94, ${point.intensity / 200})`,
                }}
                title={`${point.count} clicks - ${point.elements?.join(', ')}`}
              />
            ))}
          </Box>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card sx={{ backgroundColor: 'hsl(var(--card))', p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <XCircle size={24} color="#EF4444" />
            <Typography variant="h6" sx={{ color: 'white' }}>
              Abandoned Journeys
            </Typography>
            <Chip 
              label={`${filteredData?.abandoned_journey?.total_clicks || 0} clicks`}
              size="small"
              color="error"
            />
          </Box>
          
          {/* Abandoned journey heatmap visualization */}
          <Box sx={{ 
            position: 'relative', 
            height: '400px', 
            backgroundColor: 'rgb(17 24 39)',
            border: '1px solid rgb(55 65 81)',
            borderRadius: '8px'
          }}>
            {/* Heatmap points for abandoned journeys */}
            {filteredData?.abandoned_journey?.heatmap?.global.map((point, index) => (
              <Box
                key={index}
                sx={{
                  position: 'absolute',
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  width: `${Math.max(20, point.intensity / 2)}px`,
                  height: `${Math.max(20, point.intensity / 2)}px`,
                  backgroundColor: `rgba(239, 68, 68, ${point.intensity / 100})`,
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  boxShadow: `0 0 20px rgba(239, 68, 68, ${point.intensity / 200})`,
                }}
                title={`${point.count} clicks - ${point.elements?.join(', ')}`}
              />
            ))}
          </Box>
        </Card>
      </Grid>

      {/* Insights Panel */}
      <Grid item xs={12}>
        <Card sx={{ backgroundColor: 'hsl(var(--card))', p: 3 }}>
          <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
            Journey Insights
          </Typography>
          
          <Grid container spacing={2}>
            {filteredData?.insights?.map((insight, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Alert 
                  severity={
                    insight.type === 'high_performing_elements' ? 'success' :
                    insight.type === 'problem_elements' ? 'warning' : 'info'
                  }
                  sx={{ backgroundColor: 'rgb(31 41 55)' }}
                >
                  <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
                    {insight.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgb(156 163 175)' }}>
                    {insight.description}
                  </Typography>
                  
                  {insight.elements && (
                    <Box sx={{ mt: 1 }}>
                      {insight.elements.slice(0, 3).map((element, idx) => (
                        <Chip
                          key={idx}
                          label={`${element.element}: ${element.conversion_rate.toFixed(1)}%`}
                          size="small"
                          sx={{ mr: 1, mb: 1 }}
                          color={insight.type === 'high_performing_elements' ? 'success' : 'warning'}
                        />
                      ))}
                    </Box>
                  )}
                </Alert>
              </Grid>
            ))}
          </Grid>
        </Card>
      </Grid>
    </Grid>
  );

  const renderFunnelAnalysis = () => (
    <Box>
      <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
        Purchase Funnel Heatmap
      </Typography>
      
      {/* Funnel stages */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {filteredData?.conversion_flow?.map((stage, index) => (
          <Grid item xs={12} key={index}>
            <Card sx={{ backgroundColor: 'hsl(var(--card))', p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip 
                    label={stage.from_stage.replace('_', ' ')}
                    color="primary"
                    size="small"
                  />
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    → {stage.to_stage.replace('_', ' ')}
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ color: 'rgb(156 163 175)' }}>
                    Conversion: {stage.conversion_rate.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgb(156 163 175)' }}>
                    Drop-off: {stage.drop_off_rate.toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Stage-specific heatmaps */}
      {filteredData?.stage_heatmaps && Object.entries(filteredData.stage_heatmaps).map(([stage, heatmap]) => (
        <Card key={stage} sx={{ backgroundColor: 'hsl(var(--card))', p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ color: 'white', mb: 2, textTransform: 'capitalize' }}>
            {stage.replace('_', ' ')} Stage
          </Typography>
          
          <Box sx={{ 
            position: 'relative', 
            height: '300px', 
            backgroundColor: 'rgb(17 24 39)',
            border: '1px solid rgb(55 65 81)',
            borderRadius: '8px'
          }}>
            {/* Render stage-specific heatmap */}
            {heatmap.global.map((point, index) => (
              <Box
                key={index}
                sx={{
                  position: 'absolute',
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  width: `${Math.max(15, point.intensity / 3)}px`,
                  height: `${Math.max(15, point.intensity / 3)}px`,
                  backgroundColor: `rgba(59, 130, 246, ${point.intensity / 100})`,
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
          </Box>
        </Card>
      ))}
    </Box>
  );

  const renderElementPerformance = () => (
    <Box>
      <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
        Element Conversion Performance
      </Typography>
      
      <Grid container spacing={2}>
        {filteredData?.element_analysis?.map((element, index) => (
          <Grid item xs={12} md={6} lg={4} key={index}>
            <Card sx={{ 
              backgroundColor: 'hsl(var(--card))', 
              p: 2,
              border: element.conversion_rate >= 70 ? '1px solid #10B981' :
                      element.conversion_rate <= 20 ? '1px solid #EF4444' :
                      '1px solid rgb(75 85 99)'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'white',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}
                  title={element.element}
                >
                  {element.element.length > 30 ? 
                    element.element.substring(0, 30) + '...' : element.element}
                </Typography>
                
                <Chip
                  label={`${element.conversion_rate.toFixed(1)}%`}
                  size="small"
                  color={
                    element.conversion_rate >= 70 ? 'success' :
                    element.conversion_rate <= 20 ? 'error' : 'warning'
                  }
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: 'rgb(156 163 175)' }}>
                  {element.successful_clicks} successful
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgb(156 163 175)' }}>
                  {element.abandoned_clicks} abandoned
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgb(156 163 175)' }}>
                  {element.total_clicks} total
                </Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  return (
    <Card sx={{ backgroundColor: 'hsl(var(--card))', border: '1px solid rgb(55 65 81)' }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
              Purchase Journey Heatmap
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgb(156 163 175)' }}>
              Track user clicks from discovery to purchase
            </Typography>
          </Box>
          
          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel sx={{ color: '#9CA3AF' }}>View</InputLabel>
              <Select
                value={selectedView}
                onChange={(e) => setSelectedView(e.target.value)}
                label="View"
                sx={{ color: 'white' }}
              >
                <MenuItem value="comparison">Journey Comparison</MenuItem>
                <MenuItem value="successful">Successful Only</MenuItem>
                <MenuItem value="abandoned">Abandoned Only</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel sx={{ color: '#9CA3AF' }}>Funnel Stage</InputLabel>
              <Select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                label="Funnel Stage"
                sx={{ color: 'white' }}
              >
                <MenuItem value="all">All Stages</MenuItem>
                <MenuItem value="discovery_click">Discovery</MenuItem>
                <MenuItem value="product_click">Product View</MenuItem>
                <MenuItem value="add_to_cart">Add to Cart</MenuItem>
                <MenuItem value="checkout_init">Checkout Start</MenuItem>
                <MenuItem value="payment_step">Payment</MenuItem>
                <MenuItem value="purchase">Purchase</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'rgb(55 65 81)', mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            textColor="inherit"
            sx={{ 
              '& .MuiTab-root': { color: 'rgb(156 163 175)' },
              '& .Mui-selected': { color: 'white' },
              '& .MuiTabs-indicator': { backgroundColor: 'rgb(59 130 246)' }
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={<tab.icon size={16} />}
                label={tab.label}
                sx={{ minHeight: '48px' }}
              />
            ))}
          </Tabs>
        </Box>

        {/* Content */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <Typography sx={{ color: 'rgb(156 163 175)' }}>Loading journey data...</Typography>
          </Box>
        ) : (
          <>
            {activeTab === 0 && renderJourneyComparison()}
            {activeTab === 1 && renderFunnelAnalysis()}
            {activeTab === 2 && renderElementPerformance()}
          </>
        )}
      </CardContent>
    </Card>
  );
};