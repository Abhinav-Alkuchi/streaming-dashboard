/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, Typography } from "@mui/material";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Sector,
} from "recharts";
import { useState } from "react";
import type { ChartProps } from "../../types";
import { COLORS } from "../../constants";



// Custom active shape for pie chart
const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      {/* <text x={cx} y={cy} dy={8} textAnchor="middle" fill="#fff" fontSize={16} fontWeight="bold">
        {payload.name}
      </text> */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#fff" fontSize={12}>
        {value.toLocaleString()}
      </text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#9CA3AF" fontSize={12}>
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};

// Custom bar shape for better aesthetics
const CustomBarShape = (props: any) => {
  const { fill, x, y, width, height } = props;
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        rx={6} // Rounded corners
        ry={6}
      />
      {/* Add subtle gradient effect */}
      <rect
        x={x}
        y={y}
        width={width}
        height={Math.max(height * 0.3, 4)}
        fill="url(#barGradient)"
        fillOpacity={0.3}
        rx={6}
        ry={6}
      />
    </g>
  );
};

// Custom tooltip for all charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-600 text-gray-100 rounded-lg p-3 shadow-xl">
        <p className="text-white font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-bold text-white">{entry.value?.toLocaleString()}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Tooltip for pie charts
const PieChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl">
        <p className="text-white font-semibold">{payload[0].name}</p>
        <p className="text-gray-300 text-sm">
          Count: <span className="font-bold text-white">{payload[0].value?.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

// Tooltip for conversion funnel
const FunnelTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl min-w-[200px]">
        <p className="text-white font-semibold border-b border-gray-600 pb-2 mb-2">
          {data.name}
        </p>
        <div className="space-y-1">
          <p className="text-sm text-gray-300">
            Users: <span className="font-bold text-white">{data.value?.toLocaleString()}</span>
          </p>
          {/* {data.conversionRate !== undefined && data.conversionRate !== 100 && (
            <p className="text-sm text-green-400">
              → Next Stage: <span className="font-bold">{data.conversionRate.toFixed(1)}%</span>
            </p>
          )}
          {data.dropOff > 0 && (
            <p className="text-sm text-red-400">
              ↓ Drop-off: <span className="font-bold">{data.dropOff.toLocaleString()}</span>
            </p>
          )} */}
        </div>
      </div>
    );
  }
  return null;
};

export const AnalyticsChart = ({
  title,
  description,
  data,
  type,
  dataKeys = ["value"],
  isLoading = false,
  hideTitle = true,
}: ChartProps) => {
  const [activePieIndex, setActivePieIndex] = useState(0);
  const chartHeight = hideTitle ? 500 : 350;

  const onPieEnter = (_: any, index: number) => {
    console.log(`previous activePieIndex: ${activePieIndex}, new index: ${index}`);
    setActivePieIndex(index);
  };

  if (isLoading) {
    return (
      <Card sx={{ 
        p: 3, 
        boxShadow: 2, 
        backgroundColor: "hsl(var(--card))",
        height: '100%',
      }}>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <Typography variant="body2" color="gray.400">
            Loading chart...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card sx={{ 
        p: 3, 
        boxShadow: 2, 
        backgroundColor: "hsl(var(--card))",
        height: '100%',
      }}>
        <CardContent className="text-center py-8">
          <Typography variant="body2" color="gray.400">
            No data available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const renderChart = () => {
    // Increased margins for better spacing
    const chartProps = {
      data,
      margin: { top: 20, right: 30, left: 30, bottom: 20 }
    };

    const fontSize = 12;
    const strokeWidth = 2;

    switch (type) {
      case "conversionFunnel":
        { const enhancedData = data.map((item, index, array) => {
          const nextItem = array[index + 1];
          const conversionRate = nextItem ? ((nextItem.value / item.value) * 100) : 100;
          return {
            ...item,
            conversionRate: conversionRate,
            dropOff: nextItem ? item.value - nextItem.value : 0
          };
        });

        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={enhancedData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
            >
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4}/>
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} horizontal={false} />
              <XAxis 
                type="number" 
                stroke="#9CA3AF"
                fontSize={fontSize}
                tick={{ fill: '#9CA3AF' }}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value.toString();
                }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="#9CA3AF"
                fontSize={fontSize}
                tick={{ fill: '#9CA3AF' }}
                width={80}
              />
              <Tooltip content={<FunnelTooltip />} />
              <Legend 
                wrapperStyle={{ 
                  fontSize: fontSize,
                  paddingTop: '10px',
                  color: 'hsl(var(--chart-1))',
                  fill: 'hsl(var(--chart-1))'
                }}
              />
              <Bar 
                dataKey="value" 
                name="Users"
                radius={[0, 4, 4, 0]}
                barSize={30}
                shape={<CustomBarShape />}
              >
                {enhancedData.map((_item, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ); }

      case "line":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF" 
                fontSize={fontSize}
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis 
                stroke="#9CA3AF" 
                fontSize={fontSize}
                tick={{ fill: '#9CA3AF' }}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value.toString();
                }}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: fontSize }}
              />
              {dataKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={strokeWidth}
                  dot={{ fill: COLORS[index % COLORS.length], r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case "bar":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart {...chartProps}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4}/>
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF" 
                fontSize={fontSize}
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis 
                stroke="#9CA3AF" 
                fontSize={fontSize}
                tick={{ fill: '#9CA3AF' }}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value.toString();
                }}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: fontSize }}
              />
              {dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={data[0]?.fill || COLORS[index % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case "stackedArea":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart {...chartProps}>
              <defs>
                {dataKeys.map((key, index) => (
                  <linearGradient key={key} id={`color${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.1}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF" 
                fontSize={fontSize} 
                tick={{ fill: '#9CA3AF' }} 
              />
              <YAxis 
                stroke="#9CA3AF" 
                fontSize={fontSize} 
                tick={{ fill: '#9CA3AF' }}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value.toString();
                }}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: fontSize }}
              />
              {dataKeys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="1"
                  stroke={COLORS[index % COLORS.length]}
                  fill={`url(#color${key})`}
                  strokeWidth={strokeWidth}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart {...chartProps}>
              <defs>
                {dataKeys.map((key, index) => (
                  <linearGradient key={key} id={`color${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.1}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF" 
                fontSize={fontSize} 
                tick={{ fill: '#9CA3AF' }} 
              />
              <YAxis 
                stroke="#9CA3AF" 
                fontSize={fontSize} 
                tick={{ fill: '#9CA3AF' }}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value.toString();
                }}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: fontSize }}
              />
              {dataKeys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  fill={`url(#color${key})`}
                  strokeWidth={strokeWidth}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "customPie":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                // activeIndex={activePieIndex}
                activeShape={renderActiveShape}
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={hideTitle ? 60 : 50}
                outerRadius={hideTitle ? 100 : 80}
                dataKey="value"
                onMouseEnter={onPieEnter}
              >
                {data.map((_item: Record<string, any>, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
              </Pie>
              <Tooltip content={<PieChartTooltip />} />
              <Legend 
                wrapperStyle={{ 
                  fontSize: fontSize,
                  paddingTop: '15px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case "composed":
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF" 
                fontSize={fontSize}
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis 
                stroke="#9CA3AF" 
                fontSize={fontSize}
                tick={{ fill: '#9CA3AF' }}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: fontSize }}
              />
              <Bar 
                dataKey="value" 
                fill="hsl(var(--chart-1))" 
                radius={[4, 4, 0, 0]} 
                barSize={30}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--chart-3))" 
                strokeWidth={strokeWidth} 
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <Typography variant="body2" color="gray.400">
              Chart type not supported
            </Typography>
          </div>
        );
    }
  };

  if (hideTitle) {
    return (
      <div style={{ width: '100%', height: '100%' }}>
        {renderChart()}
      </div>
    );
  }

  return (
    <Card sx={{ 
      p: 3, 
      boxShadow: 2,
      backgroundColor: "hsl(var(--card))",
      height: '100%',
    }}>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        {!hideTitle && (
          <div className="mb-4">
            <Typography variant="h6" color="#FFFFFF" component="h3" gutterBottom>
              {title}
            </Typography>
            {description && (
              <Typography variant="body2" color="hsl(var(--muted-foreground))">
                {description}
              </Typography>
            )}
          </div>
        )}
        {renderChart()}
      </CardContent>
    </Card>
  );
};