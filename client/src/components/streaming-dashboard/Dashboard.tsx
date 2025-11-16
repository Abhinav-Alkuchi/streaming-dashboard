/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { MetricDataGridCard } from "../util-components/MetricDataGridCard";
import { MetricChartCard } from "../util-components/MetricChartCard";
import { Chip, Box, Typography } from "@mui/material";
import { Activity, Database, Server } from "lucide-react";
import type { DashboardProps } from "../../types";

export default function Dashboard({
  data,
  error,
  isLoading,
  selectedDate,
  connectionStats,
}: DashboardProps) {
  const chartData = Array.isArray(data)
    ? data
    : (data as any)?.data && Array.isArray((data as any).data)
    ? (data as any).data
    : [];

  const filteredChartData = chartData.map((item: any) => {
    const { revenue, ...rest } = item as any;
    return rest;
  });

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      {connectionStats && (
        <Box className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <Chip
            icon={<Activity size={14} />}
            label={`Live: ${
              connectionStats.live?.isConnecting ? "Connecting" : "Ready"
            }`}
            color={connectionStats.live?.isConnecting ? "warning" : "success"}
            size="small"
            variant="outlined"
          />
          <Chip
            icon={<Database size={14} />}
            label={`Cache: ${connectionStats.cacheSize || 0} queries`}
            color="info"
            size="small"
            variant="outlined"
          />
          <Chip
            icon={<Server size={14} />}
            label={`Clients: ${connectionStats.activeConnections || 0}`}
            color="secondary"
            size="small"
            variant="outlined"
          />
        </Box>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg">
          <Typography variant="h6" fontWeight="bold">
            Data Load Error
          </Typography>
          <Typography variant="body2">{error}</Typography>
        </div>
      )}

      {/* Data Grid Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricDataGridCard
          title="Raw Data Summary"
          description={`Data for ${selectedDate}`}
          data={filteredChartData}
          isLoading={isLoading}
          maxRows={10}
        />

        <MetricChartCard
          title="Data Visualization"
          description="Interactive chart view"
          data={filteredChartData}
          isLoading={isLoading}
        />
      </div>

      {/* Additional Info */}
      {!isLoading && filteredChartData.length > 0 && (
        <div className="text-center">
          <Typography variant="body2" color="gray.400">
            Showing data for {selectedDate} • {filteredChartData.length} total
            records
          </Typography>
        </div>
      )}
    </div>
  );
}
