import { useState } from "react";
import { MetricCard } from "./MetricCard";
import { BarChart3, Expand, Minimize2 } from "lucide-react";
import { 
  Card, 
  CardContent, 
  Typography, 
  IconButton, 
  Modal, 
  Box 
} from "@mui/material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { MetricChartCardProps } from "../../types";



export const MetricChartCard = ({ 
  title, 
  description, 
  data, 
  isLoading = false 
}: MetricChartCardProps) => {
  const [isEnlarged, setIsEnlarged] = useState(false);

  const handleEnlarge = () => setIsEnlarged(true);
  const handleMinimize = () => setIsEnlarged(false);

  if (isLoading) {
    return (
      <MetricCard
        title={title}
        value="Loading..."
        icon={BarChart3}
        isLoading={true}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <MetricCard
        title={title}
        value="No data"
        change="0 records"
        icon={BarChart3}
        trend="neutral"
      />
    );
  }

  const chartData = data;
  const numericColumns = Object.keys(chartData[0]).filter(
    key => typeof chartData[0][key] === 'number'
  );
  const stringColumn = Object.keys(chartData[0]).find(
    key => typeof chartData[0][key] === 'string'
  ) || Object.keys(chartData[0])[0];

  const renderChart = (isModalView = false) => (
    <ResponsiveContainer width="100%" height={isModalView ? 500 : 300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey={stringColumn}
          stroke="#9CA3AF"
          fontSize={12}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          stroke="#9CA3AF"
          fontSize={12}
          tickFormatter={(value) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
            return value.toString();
          }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))',
            borderWidth: '1px',
            borderRadius: '8px',
            color: '#F9FAFB',
          }}
          formatter={(value: number) => [value.toLocaleString(), 'Value']}
        />
        <Legend />
        {numericColumns.map((column, index) => (
          <Bar 
            key={column}
            dataKey={column}
            fill={['hsl(var(--chart-1))', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]}
            radius={[4, 4, 0, 0]}
            name={column}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <>
      {/* Compact Card View */}
      <Card sx={{ 
        p: 2, 
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        borderWidth: "1px", 
        backgroundColor: "hsl(var(--card))",
        height: '100%',
      }}>
        <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-green-400" />
              <Typography variant="h6" color="#FFFFFF" component="h3">
                {title}
              </Typography>
            </div>
            <IconButton
              onClick={handleEnlarge}
              sx={{
                color: '#9CA3AF',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': { color: 'hsl(var(--chart-1))', backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                width: 32,
                height: 32,
              }}
              size="small"
            >
              <Expand size={16} />
            </IconButton>
          </div>
          
          {description && (
            <Typography variant="body2" color="#9CA3AF" className="mb-3 text-xs">
              {description}
            </Typography>
          )}
          
          {renderChart(false)}
        </CardContent>
      </Card>

      {/* Enlarged Modal View */}
      <Modal open={isEnlarged} onClose={handleMinimize}>
        <Box sx={{
          width: '95vw',
          height: '95vh',
          maxWidth: '1400px',
          maxHeight: '900px',
          backgroundColor: 'hsl(var(--card))',
          borderWidth: '1px',
          borderRadius: '12px',
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Modal Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-700 bg-gray-800">
            <div>
              <Typography variant="h5" color="#FFFFFF" fontWeight="bold">
                {title}
              </Typography>
              {description && (
                <Typography variant="body1" color="hsl(var(--muted-foreground))" className="mt-1">
                  {description}
                </Typography>
              )}
            </div>
            <IconButton
              onClick={handleMinimize}
              sx={{
                color: '#9CA3AF',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': { color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                width: 48,
                height: 48,
              }}
            >
              <Minimize2 size={24} />
            </IconButton>
          </div>

          {/* Modal Content */}
          <div className="flex-1 p-6">
            {renderChart(true)}
          </div>
        </Box>
      </Modal>
    </>
  );
};