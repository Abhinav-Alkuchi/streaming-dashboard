import { Card, CardContent, Typography } from "@mui/material";
import type { DashboardStatusMetrics } from "../../types";
import { useAnimatedNumber } from "../../hooks/useAnimateNumber";
export const StatsOverview = ({
  metrics,
}: {
  metrics: DashboardStatusMetrics;
}) => {
  const totalEvents = useAnimatedNumber(metrics.totalEvents);
  const impressions = useAnimatedNumber(metrics.cmsImpressions);
  const clicks = useAnimatedNumber(metrics.cmsClicks);

  const ctrValue =
    metrics.cmsImpressions > 0
      ? (metrics.cmsClicks / metrics.cmsImpressions) * 100
      : 0;

  const ctr = useAnimatedNumber(ctrValue);

  return (
    <Card
      sx={{ backgroundColor: "var(--control-panel-bg)" }}
      className="bg-gray-800 border border-gray-700 mb-6"
    >
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {/* Total Events */}
          <div>
            <Typography variant="h6" className="text-blue-400 font-bold">
              {Math.round(totalEvents).toLocaleString()}
            </Typography>
            <Typography variant="body2" className="text-gray-400">
              Total Events
            </Typography>
          </div>

          {/* CMS Impressions */}
          <div>
            <Typography variant="h6" className="text-green-400 font-bold">
              {Math.round(impressions).toLocaleString()}
            </Typography>
            <Typography variant="body2" className="text-gray-400">
              CMS Impressions
            </Typography>
          </div>

          {/* CMS Clicks */}
          <div>
            <Typography variant="h6" className="text-purple-400 font-bold">
              {Math.round(clicks).toLocaleString()}
            </Typography>
            <Typography variant="body2" className="text-gray-400">
              CMS Clicks
            </Typography>
          </div>

          {/* CTR */}
          <div>
            <Typography variant="h6" className="text-amber-400 font-bold">
              {ctr.toFixed(1)}%
            </Typography>
            <Typography variant="body2" className="text-gray-400">
              CTR
            </Typography>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
