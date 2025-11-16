import { Card, CardContent, Typography, Box } from "@mui/material";
import type { MetricCardProps } from "../../types";
import { getTrendColor } from "../../utilities";

export const MetricCard = ({
  title,
  value,
  change,
  icon: Icon,
  trend,
  isLoading,
}: MetricCardProps) => {
  if (isLoading) {
    return (
      <Card
        sx={{
          p: 2,
          height: "120px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          borderWidth: "1px",
          backgroundColor: "hsl(var(--card))",
        }}
      >
        <CardContent sx={{ p: 0, textAlign: "center" }}>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <Typography variant="body2" color="white">
            Loading...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        p: "1.5rem",
        height: "120px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        boxShadow:
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        borderWidth: "1px",
        backgroundColor: "hsl(var(--card))",
        transition: "all 0.2s ease-in-out",
        borderRadius: "0.75rem",
        "&:hover": {
          boxShadow:
            "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          border: "1px solid hsl(var(--chart-1) / .4)",
        },
      }}
    >
      <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <Box
            sx={{ display: "flex", flexDirection: "column", gap: 0.5, flex: 1 }}
          >
            <Typography
              variant="body2"
              color="#9CA3AF"
              sx={{
                fontWeight: 500,
                fontSize: "0.875rem",
                lineHeight: 1.2,
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                fontSize: "1.875rem",
                backgroundImage: "var(--gradient-primary) !important",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                lineHeight: 1.2,
                color: "transparent",
              }}
            >
              {value}
            </Typography>
            {change && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: getTrendColor(trend),
                    fontSize: "0.75rem",
                    lineHeight: 1.2,
                  }}
                >
                  {/* {getTrendIcon()}  */}
                  {change}
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              p: 1,
              borderRadius: "8px",
              backgroundColor: "hsl(var(--primary) / .1)",
              border: "1px solid hsl(var(--primary) / .2)",
              color: "hsl(var(--primary))",
              borderWidth: "1px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon className="icon-chart-1" />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
