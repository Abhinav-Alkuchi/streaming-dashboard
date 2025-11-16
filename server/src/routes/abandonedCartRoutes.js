import { Router } from 'express';
import { 
  fetchAbandonedCarts, 
  fetchAbandonedCartMetrics, 
  fetchCustomerJourneys, 
  fetchHeatMapData, 
  recoverCart 
} from '../services/abandonedCartService.js';

import { 
  generatePurchaseJourneyHeatMap, 
  getJourneyFunnelHeatMap 
} from '../services/enhancedHeatMapService.js';

const router = Router();

router.get("/api/abandoned-carts", async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: "Both startDate and endDate parameters are required",
    });
  }

  console.log(`\n REST API: Abandoned carts request for range: ${startDate} to ${endDate}`);

  try {
    const data = await fetchAbandonedCarts(startDate, endDate);

    res.json({
      success: true,
      data: data,
      startDate,
      endDate,
      timestamp: new Date().toISOString(),
      recordCount: data?.length || 0,
      source: "rest-api",
    });
  } catch (error) {
    console.error("Abandoned carts API error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch abandoned carts",
      startDate,
      endDate,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/api/abandoned-carts/metrics", async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: "Both startDate and endDate parameters are required",
    });
  }

  console.log(`\n REST API: Abandoned cart metrics request for range: ${startDate} to ${endDate}`);

  try {
    const metrics = await fetchAbandonedCartMetrics(startDate, endDate);

    res.json({
      success: true,
      data: metrics,
      startDate,
      endDate,
      timestamp: new Date().toISOString(),
      source: "rest-api",
    });
  } catch (error) {
    console.error("Abandoned cart metrics API error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch abandoned cart metrics",
      startDate,
      endDate,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/api/customer-journeys", async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: "Both startDate and endDate parameters are required",
    });
  }

  console.log(`\n REST API: Customer journeys request for range: ${startDate} to ${endDate}`);

  try {
    const data = await fetchCustomerJourneys(startDate, endDate);

    res.json({
      success: true,
      data: data,
      startDate,
      endDate,
      timestamp: new Date().toISOString(),
      recordCount: data?.length || 0,
      source: "rest-api",
    });
  } catch (error) {
    console.error("Customer journeys API error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch customer journeys",
      startDate,
      endDate,
      timestamp: new Date().toISOString(),
    });
  }
});

router.post("/api/abandoned-carts/:cartId/recover", async (req, res) => {
  const { cartId } = req.params;

  console.log(`\n REST API: Cart recovery request for: ${cartId}`);

  try {
    const result = await recoverCart(cartId);

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cart recovery API error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to recover cart",
      cartId,
      timestamp: new Date().toISOString(),
    });
  }
});

// Add these routes to your existing abandonedCartRoutes.js

router.get("/api/heatmap/purchase-journey", async (req, res) => {
  const { startDate, endDate, pageUrl, deviceType } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: "Both startDate and endDate parameters are required",
    });
  }

  console.log(`\n REST API: Purchase journey heatmap request for range: ${startDate} to ${endDate}`);

  try {
    const data = await generatePurchaseJourneyHeatMap(startDate, endDate, pageUrl);

    res.json({
      success: true,
      data: data,
      startDate,
      endDate,
      pageUrl: pageUrl || 'all',
      deviceType: deviceType || 'all',
      timestamp: new Date().toISOString(),
      source: "rest-api",
    });
  } catch (error) {
    console.error("Purchase journey heatmap API error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch purchase journey heatmap data",
      startDate,
      endDate,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/api/heatmap/journey-funnel", async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: "Both startDate and endDate parameters are required",
    });
  }

  console.log(`\n REST API: Journey funnel heatmap request for range: ${startDate} to ${endDate}`);

  try {
    const data = await getJourneyFunnelHeatMap(startDate, endDate);

    res.json({
      success: true,
      data: data,
      startDate,
      endDate,
      timestamp: new Date().toISOString(),
      source: "rest-api",
    });
  } catch (error) {
    console.error("Journey funnel heatmap API error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch journey funnel heatmap data",
      startDate,
      endDate,
      timestamp: new Date().toISOString(),
    });
  }
});

// Update the existing heatmap route to use the enhanced logic
router.get("/api/heatmap", async (req, res) => {
  const { startDate, endDate, pageUrl, analysisType = 'basic' } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: "Both startDate and endDate parameters are required",
    });
  }

  console.log(`\n REST API: Enhanced heatmap data request for range: ${startDate} to ${endDate}, type: ${analysisType}`);

  try {
    let data;
    
    // Route to different analysis types
    switch (analysisType) {
      case 'purchase-journey':
        data = await generatePurchaseJourneyHeatMap(startDate, endDate, pageUrl);
        break;
      case 'journey-funnel':
        data = await getJourneyFunnelHeatMap(startDate, endDate);
        break;
      case 'basic':
      default:
        data = await fetchHeatMapData(startDate, endDate, pageUrl);
        break;
    }

    res.json({
      success: true,
      data: data,
      startDate,
      endDate,
      pageUrl: pageUrl || 'all',
      analysisType,
      timestamp: new Date().toISOString(),
      sessionCount: data?.sessions?.length || data?.successful_journey?.total_clicks || 0,
      source: "rest-api",
    });
  } catch (error) {
    console.error("Enhanced heatmap data API error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch enhanced heatmap data",
      startDate,
      endDate,
      pageUrl,
      analysisType,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;