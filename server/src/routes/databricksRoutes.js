import { Router } from 'express';
import { 
  fetchHistoricalData, 
  fetchPreviousDateData, 
  preWarmConnection, 
  clearCache, 
  getConnectionStats,
  fetchLiveEventStream,
  fetchPersonalizationData,
  fetchEventAnalysisData
} from '../services/databricksService.js';
import { DateUtils } from '../utils/dateUtils.js';
import { EventDeduplicator } from '../utils/eventDeduplicator.js';


const router = Router();

router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    stats: getConnectionStats(),
  });
});

router.post("/api/pre-warm", async (req, res) => {
  try {
    const success = await preWarmConnection();
    res.json({ success, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.delete("/api/cache", async (req, res) => {
  try {
    clearCache();
    res.json({
      success: true,
      message: "Cache cleared",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/api/historical-data", async (req, res) => {
  const { date, startDate, endDate } = req.query;

  let targetStartDate, targetEndDate;

  if (date) {
    targetStartDate = date;
    targetEndDate = date;
  } else if (startDate && endDate) {
    targetStartDate = startDate;
    targetEndDate = endDate;
  } else {
    return res.status(400).json({
      success: false,
      error: "Either date parameter or both startDate and endDate parameters are required",
    });
  }

  if (!DateUtils.isValidDate(targetStartDate) || !DateUtils.isValidDate(targetEndDate)) {
    return res.status(400).json({
      success: false,
      error: "Invalid date format. Use YYYY-MM-DD",
    });
  }

  try {
    const data = await fetchHistoricalData(targetStartDate, targetEndDate);

    res.json({
      success: true,
      data: data,
      date: date || null,
      startDate: targetStartDate,
      endDate: targetEndDate,
      timestamp: new Date().toISOString(),
      recordCount: data?.length || 0,
      source: "rest-api",
    });
  } catch (error) {
    console.error("Historical data API error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch historical data",
      date: date || null,
      startDate: targetStartDate,
      endDate: targetEndDate,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/api/personalization-data", async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({
      success: false,
      error: "date parameter is required",
    });
  }

  if (!DateUtils.isValidDate(date)) {
    return res.status(400).json({
      success: false,
      error: "Invalid date format. Use YYYY-MM-DD",
    });
  }

  console.log(`\n REST API: Personalization data request for date: ${date}`);

  try {
    const data = await fetchPersonalizationData(date);

    res.json({
      success: true,
      data: data,
      date: date,
      timestamp: new Date().toISOString(),
      recordCount: data?.length || 0,
      source: "rest-api",
    });
  } catch (error) {
    console.error("Personalization data API error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch personalization data",
      date: date,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/api/previous-date-data", async (req, res) => {
  const { date } = req.query;

  if (!DateUtils.isValidDate(date)) {
    return res.status(400).json({
      success: false,
      error: "Invalid date format. Use YYYY-MM-DD",
    });
  }

  try {
    const data = await fetchPreviousDateData(date);

    res.json({
      success: true,
      data: data,
      date: date || null,
      timestamp: new Date().toISOString(),
      recordCount: data?.length || 0,
      source: "rest-api",
    });
  } catch (error) {
    console.error("Historical data API error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch historical data",
      date: date || null,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/api/event-stream/optimized", async (req, res) => {
  const { date, limit = 50 } = req.query;

  if (!date) {
    return res.status(400).json({
      success: false,
      error: "date parameter is required",
    });
  }

  try {
    const date = new Date();
    const formattedDate = date.toISOString().split("T")[0];
    const data = await fetchLiveEventStream(formattedDate, parseInt(limit));

    const { newEvents } = EventDeduplicator.filterNewEvents(data, req.appState?.lastEventIds || new Set());

    res.json({
      success: true,
      data: newEvents,
      date: formattedDate,
      timestamp: new Date().toISOString(),
      recordCount: newEvents.length,
      source: "optimized-event-stream",
      updateType: "incremental",
    });
  } catch (error) {
    console.error("Optimized event stream fetch error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch event stream",
      date: date,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get("/api/available-events-platforms", async (req, res) => {
  try {
    // You can implement this to fetch from your database
    // For now, returning static list or from config
    const availableEvents = [
      'page_view', 'purchase', 'add_to_basket', 'remove_from_basket', 
      'add_to_loves', 'un_love', 'cms_viewable_impression', 'cms_component_item_click'
    ];
    
    const availablePlatforms = [
      'desktop_web', 'mobile_web', 'tablet_web', 'iphone_app', 'android_app'
    ];

    res.json({
      success: true,
      events: availableEvents,
      platforms: availablePlatforms,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Available options API error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch available options",
      timestamp: new Date().toISOString(),
    });
  }
});

// Add event analysis data endpoint
router.get("/api/event-analysis-data", async (req, res) => {
  const { startDate, endDate, eventType, platform } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: "Both startDate and endDate parameters are required",
    });
  }

  if (!DateUtils.isValidDate(startDate) || !DateUtils.isValidDate(endDate)) {
    return res.status(400).json({
      success: false,
      error: "Invalid date format. Use YYYY-MM-DD",
    });
  }

  try {
    // Convert query parameters to arrays
    const eventTypes = Array.isArray(eventType) ? eventType : [eventType].filter(Boolean);
    const platforms = Array.isArray(platform) ? platform : [platform].filter(Boolean);

    const data = await fetchEventAnalysisData(startDate, endDate, eventTypes, platforms);

    res.json({
      success: true,
      data: data,
      startDate: startDate,
      endDate: endDate,
      eventTypes: eventTypes,
      platforms: platforms,
      timestamp: new Date().toISOString(),
      recordCount: data?.length || 0,
    });
  } catch (error) {
    console.error("Event analysis data API error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch event analysis data",
      startDate: startDate,
      endDate: endDate,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;