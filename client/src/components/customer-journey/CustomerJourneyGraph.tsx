/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useMemo, useState } from "react";
import {
  Card,
  Typography,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Grid,
} from "@mui/material";
import type {
  CustomerJourney,
  JourneyMetrics,
  JourneyStep,
} from "../../types/abandonedCart";

interface EnhancedCustomerJourneyGraphProps {
  journeys?: CustomerJourney[];
  metrics?: JourneyMetrics | null;
}

export const CustomerJourneyGraph: React.FC<
  EnhancedCustomerJourneyGraphProps
> = ({ journeys = [], metrics }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedLikelihood, setSelectedLikelihood] = useState<string>("all");
  const [behaviorFilter, setBehaviorFilter] = useState<string>("all");
  const [engagementFilter, setEngagementFilter] = useState<string>("all");

  const commonSteps = [
    "landing_page",
    "product_view",
    "add_to_cart",
    "cart_view",
    "checkout_start",
    "shipping_info",
    "payment_info",
    "abandoned",
  ];

  const stepNames: Record<string, string> = {
    landing_page: "Landing Page",
    product_view: "Product View",
    add_to_cart: "Add to Cart",
    cart_view: "Cart View",
    checkout_start: "Checkout Start",
    shipping_info: "Shipping Info",
    payment_info: "Payment Info",
    abandoned: "Abandoned",
  };

  // Apply filters
  const filteredJourneys = useMemo(() => {
    let filtered = journeys;

    if (selectedPlatform !== "all") {
      filtered = filtered.filter((j) => j.platform === selectedPlatform);
    }
    if (selectedLikelihood !== "all") {
      filtered = filtered.filter(
        (j) => j.conversion_likelihood === selectedLikelihood
      );
    }
    if (behaviorFilter !== "all") {
      filtered = filtered.filter(
        (j) => j.behavioral_pattern === behaviorFilter
      );
    }
    if (engagementFilter !== "all") {
      const threshold =
        engagementFilter === "high"
          ? 0.7
          : engagementFilter === "medium"
          ? 0.4
          : 0;
      filtered = filtered.filter((j) => (j.engagement_score ?? 0) >= threshold);
    }

    return filtered;
  }, [
    journeys,
    selectedPlatform,
    selectedLikelihood,
    behaviorFilter,
    engagementFilter,
  ]);

  // Step + abandoned data
  const stepData = useMemo(() => {
    const totalJourneys = filteredJourneys.length;

    if (totalJourneys === 0) {
      return commonSteps.map((step) => ({
        step,
        count: 0,
        percentage: 0,
        avgDuration: 0,
      }));
    }

    const stepsWithoutAbandoned = commonSteps
      .filter((step) => step !== "abandoned")
      .map((step) => {
        const journeysWithStep = filteredJourneys.filter((j) =>
          j.steps.some((s: JourneyStep) => s.step === step)
        );

        const count = journeysWithStep.length;
        const percentage = (count / totalJourneys) * 100;

        const avgDuration =
          journeysWithStep.length > 0
            ? journeysWithStep.reduce((sum, journey) => {
                const stepData = journey.steps.find(
                  (s: JourneyStep) => s.step === step
                );
                return sum + (stepData?.duration || 0);
              }, 0) / journeysWithStep.length
            : 0;

        return { step, count, percentage, avgDuration };
      });

    const abandonedCount = filteredJourneys.filter((j) => j.abandoned).length;
    const abandonedPercentage = (abandonedCount / totalJourneys) * 100;

    stepsWithoutAbandoned.push({
      step: "abandoned",
      count: abandonedCount,
      percentage: abandonedPercentage,
      avgDuration: 0,
    });

    return stepsWithoutAbandoned;
  }, [filteredJourneys]);

  // Drop-off between steps
  const dropOffData = useMemo(() => {
    const dropOffs = [];

    for (let i = 0; i < stepData.length - 1; i++) {
      const current = stepData[i];
      const next = stepData[i + 1];
      const dropOffRate =
        current.count > 0
          ? ((current.count - next.count) / current.count) * 100
          : 0;

      dropOffs.push({
        fromStep: current.step,
        toStep: next.step,
        dropOffRate: Math.max(0, dropOffRate),
        fromCount: current.count,
        toCount: next.count,
      });
    }

    return dropOffs;
  }, [stepData]);

  // 🎨 Utility colors
  const getLikelihoodColor = (likelihood: string) => {
    switch (likelihood) {
      case "high":
        return "#10B981";
      case "medium":
        return "#F59E0B";
      case "low":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getBehaviorColor = (pattern: string) => {
    switch (pattern) {
      case "impulse":
        return "#10B981";
      case "researcher":
        return "#3B82F6";
      case "hesitant":
        return "#F59E0B";
      case "browser":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  // Unique values
  const uniquePlatforms = Array.from(new Set(journeys.map((j) => j.platform)));
  const uniqueLikelihoods = Array.from(
    new Set(journeys.map((j) => j.conversion_likelihood))
  ).filter(Boolean);
  const uniqueBehaviors = Array.from(
    new Set(journeys.map((j: any) => j.behavioral_pattern))
  ).filter(Boolean);

  // Journey Insights
  const renderJourneyInsights = () => {
    if (!filteredJourneys.length) return null;

    const highValueAbandoned = filteredJourneys.filter(
      (j) => j.abandoned && j.conversion_likelihood === "high"
    ).length;

    const avgEngagement =
      filteredJourneys.reduce((sum, j) => sum + (j.engagement_score || 0), 0) /
      filteredJourneys.length;

    const recoveryPotential = filteredJourneys.filter(
      (j) => j.abandoned
    ).length;

    return (
      <Card sx={{ backgroundColor: "hsl(var(--card))", p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ color: "white" }}>
          Journey Insights
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: "center", p: 2 }}>
              <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
                High-Value Abandoned
              </Typography>
              <Typography
                variant="h6"
                sx={{ color: highValueAbandoned > 0 ? "#EF4444" : "white" }}
              >
                {highValueAbandoned}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: "center", p: 2 }}>
              <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
                Avg Engagement
              </Typography>
              <Typography variant="h6" sx={{ color: "white" }}>
                {(avgEngagement * 100).toFixed(0)}%
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: "center", p: 2 }}>
              <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
                Recovery Potential
              </Typography>
              <Typography variant="h6" sx={{ color: "#10B981" }}>
                {recoveryPotential}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: "center", p: 2 }}>
              <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
                Completion Rate
              </Typography>
              <Typography variant="h6" sx={{ color: "white" }}>
                {metrics?.journey_completion_rate?.toFixed(1) || "0"}%
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Card>
    );
  };

  // Behavioral Pattern Distribution
  const renderBehavioralAnalysis = () => {
    const behaviorCounts = filteredJourneys.reduce((acc, journey) => {
      const pattern = (journey as any).behavioral_pattern || "unknown";
      acc[pattern] = (acc[pattern] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <Card sx={{ backgroundColor: "hsl(var(--card))", p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ color: "white" }}>
          Behavioral Patterns
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {Object.entries(behaviorCounts).map(([pattern, count]) => (
            <Chip
              key={pattern}
              label={`${pattern}: ${count}`}
              sx={{
                backgroundColor: getBehaviorColor(pattern) + "20",
                color: getBehaviorColor(pattern),
                border: `1px solid ${getBehaviorColor(pattern)}`,
              }}
            />
          ))}
        </Box>
      </Card>
    );
  };

  // Render
  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 3, width: "100%" }}
    >
      {/* --- Journey Flow & Drop-off --- */}
      <Card
        sx={{
          backgroundColor: "hsl(var(--card))",
          border: "1px solid rgb(75 85 99)",
          p: 3,
          width: "100%",
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ color: "white", mb: 2 }}>
          Customer Journey Flow
        </Typography>

        {/* Filters */}
        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel sx={{ color: "#9CA3AF" }}>Platform</InputLabel>
            <Select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              sx={{ color: "white" }}
            >
              <MenuItem value="all">All</MenuItem>
              {uniquePlatforms.map((platform) => (
                <MenuItem key={platform} value={platform}>
                  {platform}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ color: "#9CA3AF" }}>Likelihood</InputLabel>
            <Select
              value={selectedLikelihood}
              onChange={(e) => setSelectedLikelihood(e.target.value)}
              sx={{ color: "white" }}
            >
              <MenuItem value="all">All</MenuItem>
              {uniqueLikelihoods.map((likelihood: any) => (
                <MenuItem key={likelihood} value={likelihood}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: getLikelihoodColor(likelihood),
                      }}
                    />
                    {likelihood.charAt(0).toUpperCase() + likelihood.slice(1)}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ color: "#9CA3AF" }}>Behavior</InputLabel>
            <Select
              value={behaviorFilter}
              onChange={(e) => setBehaviorFilter(e.target.value)}
              sx={{ color: "white" }}
            >
              <MenuItem value="all">All</MenuItem>
              {uniqueBehaviors.map((behavior: any) => (
                <MenuItem key={behavior} value={behavior}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: getBehaviorColor(behavior),
                      }}
                    />
                    {behavior.charAt(0).toUpperCase() + behavior.slice(1)}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ color: "#9CA3AF" }}>Engagement</InputLabel>
            <Select
              value={engagementFilter}
              onChange={(e) => setEngagementFilter(e.target.value)}
              sx={{ color: "white" }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="high">High (&gt;70%)</MenuItem>
              <MenuItem value="medium">Medium (40-70%)</MenuItem>
              <MenuItem value="low">Low (&lt;40%)</MenuItem>
            </Select>
          </FormControl>

          <Chip
            label={`${filteredJourneys.length} journeys`}
            size="small"
            sx={{ backgroundColor: "#4B5563", color: "white" }}
          />
        </Box>

        {/* --- Customer Journey Flow Visualization --- */}
        {filteredJourneys.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body1" sx={{ color: "#9CA3AF" }}>
              No journey data available.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              overflowX: "auto",
              gap: 4,
              py: 3,
              px: 1,
            }}
          >
            {stepData.map((stepInfo, idx) => {
              const { step, count, percentage, avgDuration } = stepInfo;
              const isAbandoned = step === "abandoned";

              return (
                <React.Fragment key={step}>
                  {/* Step Node */}
                  <Tooltip
                    title={
                      <Box sx={{ p: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {stepNames[step]}
                        </Typography>
                        <Typography variant="caption">
                          {count} users ({percentage.toFixed(1)}%)
                        </Typography>
                        {avgDuration > 0 && !isAbandoned && (
                          <Typography variant="caption" display="block">
                            Avg time: {Math.round(avgDuration)}s
                          </Typography>
                        )}
                      </Box>
                    }
                    arrow
                    placement="top"
                  >
                    <Box
                      sx={{
                        backgroundColor: isAbandoned ? "#EF4444" : "#3B82F6",
                        color: "white",
                        borderRadius: "8px",
                        p: 2,
                        textAlign: "center",
                        minWidth: 130,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        "&:hover": { opacity: 0.9, transform: "scale(1.03)" },
                      }}
                    >
                      <Typography variant="body2" fontWeight="medium" noWrap>
                        {stepNames[step]}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        {count} ({percentage.toFixed(1)}%)
                      </Typography>
                      {avgDuration > 0 && !isAbandoned && (
                        <Typography
                          variant="caption"
                          sx={{ opacity: 0.8, display: "block", mt: 0.5 }}
                        >
                          Avg: {Math.round(avgDuration)}s
                        </Typography>
                      )}
                    </Box>
                  </Tooltip>

                  {/* --- Arrows between steps (fixed alignment) --- */}
                  {idx < stepData.length - 1 && (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        position: "relative",
                        minWidth: 80,
                      }}
                    >
                      {dropOffData[idx] && (
                        <Typography
                          variant="caption"
                          sx={{
                            position: "absolute",
                            top: -22,
                            left: "50%",
                            transform: "translateX(-50%)",
                            color: "#D1D5DB",
                            fontSize: "0.75rem",
                            whiteSpace: "nowrap",
                            backgroundColor: "rgba(31,41,55,0.6)",
                            px: 0.6,
                            py: 0.1,
                            borderRadius: "4px",
                          }}
                        >
                          {dropOffData[idx].dropOffRate.toFixed(0)}% drop
                        </Typography>
                      )}

                      <svg
                        width="70"
                        height="20"
                        style={{
                          overflow: "visible",
                          margin: "0 6px",
                          flexShrink: 0,
                        }}
                      >
                        <line
                          x1="0"
                          y1="10"
                          x2="60"
                          y2="10"
                          stroke="#9CA3AF"
                          strokeWidth="2"
                        />
                        <polygon points="60,5 70,10 60,15" fill="#9CA3AF" />
                      </svg>
                    </Box>
                  )}
                </React.Fragment>
              );
            })}
          </Box>
        )}

        {/* Drop-off */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ color: "white" }}>
            Drop-off Analysis
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {dropOffData.map((drop, index) => (
              <Box
                key={`${drop.fromStep}-${drop.toStep}-${index}`}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  py: 1,
                  width: "100%",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: "white", minWidth: 250 }}
                >
                  {stepNames[drop.fromStep]} → {stepNames[drop.toStep]}
                </Typography>
                <Box
                  sx={{
                    flexGrow: 1,
                    backgroundColor: "#4B5563",
                    borderRadius: "4px",
                    height: 8,
                  }}
                >
                  <Box
                    sx={{
                      width: `${Math.max(0, 100 - drop.dropOffRate)}%`,
                      backgroundColor:
                        drop.dropOffRate > 50
                          ? "#EF4444"
                          : drop.dropOffRate > 25
                          ? "#F59E0B"
                          : "#10B981",
                      height: "100%",
                      borderRadius: "4px",
                    }}
                  />
                </Box>
                <Typography
                  variant="body2"
                  sx={{ color: "white", minWidth: 60, textAlign: "right" }}
                >
                  {drop.dropOffRate.toFixed(1)}%
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Card>

      {/* --- Journey Insights & Behavior --- */}
      {renderJourneyInsights()}
      {renderBehavioralAnalysis()}
    </Box>
  );
};
