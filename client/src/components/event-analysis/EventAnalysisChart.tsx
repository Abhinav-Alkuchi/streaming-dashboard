import { Box, Typography, CardContent } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import moment from 'moment';

interface ChartData {
  date: string;
  count: number;
}

interface EventAnalysisChartProps {
  data: ChartData[];
  eventType: string;
  platform: string;
}

export const EventAnalysisChart: React.FC<EventAnalysisChartProps> = ({
  data,
  eventType,
  platform
}) => {
  if (data.length === 0) {
    return (
      <CardContent>
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" sx={{ color: '#9CA3AF' }}>
            No data available for chart
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280', mt: 1 }}>
            Try adjusting your filters or date range
          </Typography>
        </Box>
      </CardContent>
    );
  }

  // Format dates for better display
  const formattedData = data.map(item => ({
    ...item,
    formattedDate: moment(item.date).format('MMM D'),
    fullDate: moment(item.date).format('MMM D, YYYY')
  }));

  return (
    <CardContent>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
          Event Count by Date
        </Typography>
        <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
          {eventType !== 'all' && `Event: ${eventType} •`}
          {platform !== 'all' && ` Platform: ${platform} •`}
          Total events: {data.reduce((sum, item) => sum + item.count, 0).toLocaleString()}
        </Typography>
      </Box>

      <Box sx={{ width: '100%', height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={formattedData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="formattedDate" 
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              interval={0}
            />
            <YAxis 
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              label={{ 
                value: 'Event Count', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: '#9CA3AF', fontSize: 12 }
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgb(31 41 55)',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: 'white'
              }}
              formatter={(value: number) => [value.toLocaleString(), 'Events']}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullDate;
                }
                return label;
              }}
            />
            <Legend />
            <Bar 
              dataKey="count" 
              name="Event Count"
              fill="#2EDAFF"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </CardContent>
  );
};