import { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Modal,
  Box,
} from "@mui/material";
import { Expand, Minimize2 } from "lucide-react";
import { AnalyticsChart } from "./AnalyticsChart";
import type { ChartProps } from "../../types";

interface EnlargableChartProps extends ChartProps {
  chartId: string;
}

export const EnlargableChart = ({ ...chartProps }: EnlargableChartProps) => {
  const [isEnlarged, setIsEnlarged] = useState(false);

  const handleEnlarge = () => {
    setIsEnlarged(true);
  };

  const handleMinimize = () => {
    setIsEnlarged(false);
  };

  return (
    <>
      {/* Original Chart Card - More Compact */}
      <Card
        sx={{
          p: 2,
          boxShadow:
            "0 2px 4px -1px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.06)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "8px",
          backgroundColor: "hsl(var(--card))",
          height: "100%",
          position: "relative",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            border: "1px solid hsl(var(--chart-1) / 0.3)",
          },
        }}
      >
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          {/* Header with Title and Expand Button */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <Typography
                variant="h6"
                color="#FFFFFF"
                component="h3"
                gutterBottom
                sx={{ fontSize: "1.1rem" }}
              >
                {chartProps.title}
              </Typography>
              {chartProps.description && (
                <Typography
                  variant="body2"
                  color="hsl(var(--muted-foreground))"
                  sx={{ fontSize: "0.8rem" }}
                >
                  {chartProps.description}
                </Typography>
              )}
            </div>
            <IconButton
              onClick={handleEnlarge}
              sx={{
                color: "#9CA3AF",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                "&:hover": {
                  color: "#3B82F6",
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                },
                ml: 1,
                flexShrink: 0,
                width: 32,
                height: 32,
              }}
              size="small"
            >
              <Expand size={16} />
            </IconButton>
          </div>

          {/* Chart Content */}
          <AnalyticsChart {...chartProps} />
        </CardContent>
      </Card>

      {/* Modal for Enlarged Chart */}
      <Modal
        open={isEnlarged}
        onClose={handleMinimize}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}
      >
        <Box
          sx={{
            width: "90vw",
            height: "85vh",
            maxWidth: "1200px",
            maxHeight: "800px",
            backgroundColor: "hsl(var(--card))",
            border: "1px solid #374151",
            borderRadius: "12px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Modal Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800">
            <div>
              <Typography variant="h6" color="#ffffff" fontWeight="bold">
                {chartProps.title}
              </Typography>
              {chartProps.description && (
                <Typography
                  variant="body2"
                  color="hsl(var(--muted-foreground))"
                  className="mt-1"
                >
                  {chartProps.description}
                </Typography>
              )}
            </div>
            <IconButton
              onClick={handleMinimize}
              sx={{
                color: "#9CA3AF",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                "&:hover": {
                  color: "#EF4444",
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                },
                width: 40,
                height: 40,
              }}
            >
              <Minimize2 size={20} />
            </IconButton>
          </div>

          {/* Enlarged Chart Content */}
          <div className="flex-1 p-4" style={{ height: "calc(100% - 80px)" }}>
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AnalyticsChart
                {...chartProps}
                hideTitle={true}
                isLoading={false}
              />
            </Box>
          </div>

          {/* Modal Footer */}
          <div className="p-3 border-t border-gray-700 bg-gray-800 text-center">
            <Typography variant="caption" color="#9CA3AF">
              Click the minimize icon or press ESC to close
            </Typography>
          </div>
        </Box>
      </Modal>
    </>
  );
};
