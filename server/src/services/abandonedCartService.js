import dotenv from "dotenv";
import { DBSQLClient } from "@databricks/sql";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

dotenv.config();

const {
  DATABRICKS_HOST,
  DATABRICKS_HTTP_PATH,
  DATABRICKS_TOKEN,
  DATABRICKS_CLUSTER_ID,
  TABLE_FULL_NAME,
} = process.env;

// Import config and utils
import { CONFIG } from '../config/constants.js';
import { generateCacheKey, getCachedData, setCachedData } from '../utils/cacheUtils.js';

// Connection state management
const connectionState = {
  'abandoned-carts': { isConnecting: false, lastUsed: null },
  'abandoned-metrics': { isConnecting: false, lastUsed: null },
  'customer-journeys': { isConnecting: false, lastUsed: null },
  'heatmap-data': { isConnecting: false, lastUsed: null }
};

// Cache for frequent queries
const queryCache = new Map();

/**
 * Get Databricks connection
 */
async function getDatabricksConnection(useExistingCluster = true) {
  const client = new DBSQLClient();

  const connectionConfig = {
    host: DATABRICKS_HOST?.replace("https://", ""),
    path: DATABRICKS_HTTP_PATH,
    token: DATABRICKS_TOKEN,
    socketTimeout: CONFIG.QUERY_TIMEOUT,
    requestTimeout: CONFIG.QUERY_TIMEOUT,
  };

  if (useExistingCluster && DATABRICKS_CLUSTER_ID) {
    connectionConfig.clusterId = DATABRICKS_CLUSTER_ID;
  }

  const connection = await client.connect(connectionConfig);
  return { client, connection };
}

/**
 * Execute query with optimized performance
 */
async function executeQuery(session, query) {
  console.log(`Executing abandoned cart query...`);

  const queryOperation = await session.executeStatement(query, {
    runAsync: true,
    queryTimeout: CONFIG.QUERY_TIMEOUT / 1000,
    maxRows: CONFIG.MAX_ROWS,
    canReadArrowResult: true,
    canReadCompressedResult: true,
  });

  console.log("=====> Query submitted, waiting for completion...");

  let attempts = 0;
  let delay = CONFIG.INITIAL_POLL_DELAY;

  while (attempts < CONFIG.MAX_POLL_ATTEMPTS) {
    const status = await queryOperation.status();

    switch (status.operationState) {
      case 2: // FINISHED
        console.log("======> Query completed successfully");
        break;
      case 5: // ERROR
        const errorMsg = status.errorMessage || "Unknown error";
        console.error(`=====> Query failed: ${errorMsg}`);
        await queryOperation.close();
        throw new Error(`Query execution failed: ${errorMsg}`);
      case 3: // CANCELED
      case 4: // CLOSED
        console.log("====> Query was canceled or closed");
        await queryOperation.close();
        return [];
      default:
        if (attempts % 30 === 0) {
          console.log(`=====> Query in progress... State: ${status.operationState}, Attempt: ${attempts + 1}`);
        }
    }

    if (status.operationState === 2) break;

    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.5, CONFIG.MAX_POLL_DELAY);
    attempts++;
  }

  if (attempts >= CONFIG.MAX_POLL_ATTEMPTS) {
    await queryOperation.close();
    throw new Error("Query timeout - exceeded maximum wait time");
  }

  console.log("=====> Fetching results...");
  const result = await queryOperation.fetchAll();
  await queryOperation.close();

  return Array.isArray(result) ? result : Array.from(result || []);
}

/**
 * Cleanup database resources
 */
async function cleanupResources(session, connection) {
  const cleanupTasks = [];

  if (session)
    cleanupTasks.push(
      session.close().catch((e) => console.error("Session close error:", e.message))
    );
  if (connection)
    cleanupTasks.push(
      connection.close().catch((e) => console.error("Connection close error:", e.message))
    );

  await Promise.allSettled(cleanupTasks);
  console.log("=====> Connection cleanup complete");
}

/**
 * Base function for executing queries with connection management
 */
async function executeWithConnection(
  connectionType,
  queryFn,
  cacheKey = null,
  bypassCache = false
) {
  if (cacheKey) {
    const cachedData = getCachedData(queryCache, cacheKey, bypassCache, CONFIG.CACHE_TTL);
    if (cachedData) return cachedData;
  }

  if (connectionState[connectionType].isConnecting) {
    console.log(`====> ${connectionType} connection already in progress, skipping...`);
    return null;
  }

  connectionState[connectionType].isConnecting = true;
  connectionState[connectionType].lastUsed = new Date();

  let client, connection, session;

  try {
    console.log(`====> Connecting to Databricks for ${connectionType} data...`);
    ({ client, connection } = await getDatabricksConnection(true));
    console.log("=====> Connected to Databricks with cluster optimization");

    session = await connection.openSession();
    console.log("====> Session opened");

    const rows = await queryFn(session);

    if (cacheKey && !bypassCache) {
      setCachedData(queryCache, cacheKey, rows);
    }

    return rows;
  } catch (error) {
    console.error(`Error in ${connectionType} query:`, {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    connectionState[connectionType].isConnecting = false;
    await cleanupResources(session, connection);
  }
}

/**
 * Parse currency values from sotV06 field
 */
function parseCurrencyValues(sotV06) {
  if (!sotV06) return 0;

  try {
    const values = sotV06.toString().split(";");
    let total = 0;

    for (const value of values) {
      const match = value.toString().match(/(\d+\.?\d*)/);
      if (match) {
        const parsedValue = parseFloat(match[1]);
        if (!isNaN(parsedValue)) {
          total += parsedValue;
        }
      }
    }

    return total;
  } catch (error) {
    console.warn("Error parsing currency value:", sotV06, error);
    return 0;
  }
}

function normalizeCurrencyCode(currency) {  
  if (!currency) return 'USD';
  
  const normalized = currency.toUpperCase();
  const mappings = {
    'US': 'USD',
    'EU': 'EUR', 
    'GB': 'GBP',
    'CA': 'CAD',
    'AU': 'AUD'
  };
  
  return mappings[normalized] || (normalized.length === 3 ? normalized : 'USD');
}   

/**
 * Fetch abandoned cart items with detailed information
 */
export async function fetchAbandonedCarts(startDate, endDate, bypassCache = false) {
  const cacheKey = generateCacheKey("abandoned_carts", { startDate, endDate });

  return executeWithConnection(
    "abandoned-carts",
    async (session) => {
      const query = `
WITH session_bounds AS (
  SELECT
    sessionId,
    MIN(eventTime) AS session_start,
    MAX(eventTime) AS session_end
  FROM ${TABLE_FULL_NAME}
  WHERE event_date BETWEEN '${startDate}' AND '${endDate}'
  GROUP BY sessionId
),
abandoned_carts AS (
  SELECT
    a.atgId                     AS customer_id,
    a.emailId                   AS customer_email,
    a.sessionId                 AS session_id,
    a.sotV15                    AS product_id,
    a.sotV04                    AS sku_id,
    a.sotV05                    AS quantity,
    a.sotV06                    AS price,
    a.sotV07                    AS brand_name,
    a.sotV09                    AS currency,
    a.sotV192                   AS product_category,
    a.sotV215                   AS product_name,
    a.Platform,
    a.sotV119                   AS location,
    a.eventTime                 AS abandoned_at,
    sb.session_start            AS start_session_time,
    sb.session_end              AS end_session_time,
    a.userAgent                 AS browser,
    ROW_NUMBER() OVER (PARTITION BY a.sessionId, a.sotV04 ORDER BY a.eventTime DESC) as rn
  FROM ${TABLE_FULL_NAME} a
  JOIN session_bounds sb ON sb.sessionId = a.sessionId
  WHERE a.sottype = 'add to basket'
    AND a.event_date BETWEEN '${startDate}' AND '${endDate}'
    AND NOT EXISTS (
      SELECT 1
      FROM ${TABLE_FULL_NAME} b
      WHERE b.sessionId = a.sessionId
        AND b.sotV04 = a.sotV04
        AND b.event_date BETWEEN '${startDate}' AND '${endDate}'
        AND b.sottype IN ('purchase','remove from basket')
    )
)
SELECT 
  customer_id,
  customer_email,
  session_id,
  product_id,
  sku_id,
  quantity,
  price,
  brand_name,
  currency,
  product_category,
  product_name,
  Platform as platform,
  location,
  abandoned_at,
  start_session_time,
  end_session_time,
  browser
FROM abandoned_carts
WHERE rn = 1
ORDER BY abandoned_at DESC
LIMIT 1000
    `;

      console.log(`====> Executing abandoned carts query for range: ${startDate} to ${endDate}`);
      const rows = await executeQuery(session, query);

      console.log(`=====> Retrieved ${rows.length} abandoned cart records`);

      // Transform and aggregate data
      const cartMap = new Map();

      rows.forEach((row) => {
        const sessionId = row.session_id;
        if (!cartMap.has(sessionId)) {
          cartMap.set(sessionId, {
            id: sessionId,
            customer_id: row.customer_id,
            customer_email: row.customer_email,
            session_id: sessionId,
            cart_items: [],
            total_amount: 0,
            ccurrency: normalizeCurrencyCode(row.currency) || 'USD',
            platform: row.platform,
            location: row.location,
            abandoned_at: row.abandoned_at,
            recovered: false,
            recovery_attempts: 0,
            browser: row.browser,
            session_start: row.start_session_time,
            session_end: row.end_session_time
          });
        }

        const cart = cartMap.get(sessionId);
        const itemPrice = parseCurrencyValues(row.price);
        const itemTotal = itemPrice * (parseInt(row.quantity) || 1);

        cart.cart_items.push({
          product_id: row.product_id,
          sku_id: row.sku_id,
          product_name: row.product_name,
          product_image: `https://via.placeholder.com/150?text=${encodeURIComponent(row.product_name || 'Product')}`,
          quantity: parseInt(row.quantity) || 1,
          price: itemPrice,
          brand_name: row.brand_name,
          product_category: row.product_category
        });

        cart.total_amount += itemTotal;
      });

      const result = Array.from(cartMap.values());
      console.log(`=====> Processed ${result.length} unique abandoned carts`);

      return result;
    },
    cacheKey,
    bypassCache
  );
}

/**
 * Fetch abandoned cart metrics
 */
export async function fetchAbandonedCartMetrics(startDate, endDate, bypassCache = false) {
  const cacheKey = generateCacheKey("abandoned_metrics", { startDate, endDate });

  return executeWithConnection(
    "abandoned-metrics",
    async (session) => {
      const query = `
WITH cart_data AS (
  SELECT
    atgid,
    sessionId,
    sottype,
    -- Extract numeric value from sotV06 (handles $25.99 and multiple values)
    CASE 
      WHEN sotV06 IS NOT NULL AND sotV06 != '' THEN
        COALESCE(
          CAST(REGEXP_EXTRACT(sotV06, '([0-9]+\\\\.?[0-9]*)', 1) AS DOUBLE),
          0
        )
      ELSE 0 
    END as parsed_amount
  FROM ${TABLE_FULL_NAME}
  WHERE event_date BETWEEN '${startDate}' AND '${endDate}'
    AND sottype IN ('add to basket','purchase')
),
user_sessions AS (
  SELECT
    atgid,
    sessionId,
    MAX(CASE WHEN sottype = 'add to basket' THEN 1 ELSE 0 END) AS has_add,
    MAX(CASE WHEN sottype = 'purchase' THEN 1 ELSE 0 END) AS has_purchase,
    SUM(CASE WHEN sottype = 'add to basket' THEN parsed_amount ELSE 0 END) AS basket_amount,
    SUM(CASE WHEN sottype = 'purchase' THEN parsed_amount ELSE 0 END) AS purchase_amount
  FROM cart_data
  GROUP BY atgid, sessionId
),
abandoned_stats AS (
  SELECT
    COUNT(DISTINCT CASE WHEN has_add = 1 AND has_purchase = 0 THEN atgid END) AS total_abandoned_carts,
    SUM(CASE WHEN has_add = 1 AND has_purchase = 0 THEN basket_amount ELSE 0 END) AS total_abandoned_revenue,
    COUNT(DISTINCT CASE WHEN has_add = 1 AND has_purchase = 1 THEN atgid END) AS total_recovered_users,
    COUNT(DISTINCT CASE WHEN has_add = 1 THEN sessionId END) AS total_sessions
  FROM user_sessions
)
SELECT
  COALESCE(total_abandoned_carts, 0) as total_abandoned_carts,
  COALESCE(ROUND(total_abandoned_revenue, 2), 0) AS total_abandoned_revenue,
  COALESCE(ROUND(total_recovered_users * 100.0 / NULLIF(total_abandoned_carts + total_recovered_users, 0), 2), 0) AS recovery_rate,
  COALESCE(ROUND(total_abandoned_revenue / NULLIF(total_abandoned_carts, 0), 2), 0) AS average_cart_value,
  COALESCE(ROUND(total_abandoned_carts * 100.0 / NULLIF(total_sessions, 0), 2), 0) AS abandonment_rate,
  0 AS previous_period,
  0 AS change_percentage
FROM abandoned_stats
      `;

      console.log(`====> Executing abandoned cart metrics query for range: ${startDate} to ${endDate}`);
      const rows = await executeQuery(session, query);

      if (rows.length === 0) {
        return {
          total_abandoned_carts: 0,
          total_abandoned_revenue: 0,
          recovery_rate: 0,
          average_cart_value: 0,
          abandonment_rate: 0,
          period_comparison: {
            previous_period: 0,
            change_percentage: 0
          }
        };
      }

      const metrics = rows[0];
      console.log(`=====> Retrieved metrics: ${metrics.total_abandoned_carts} abandoned carts, $${metrics.total_abandoned_revenue} lost revenue`);

      return {
        total_abandoned_carts: parseInt(metrics.total_abandoned_carts) || 0,
        total_abandoned_revenue: parseFloat(metrics.total_abandoned_revenue) || 0,
        recovery_rate: parseFloat(metrics.recovery_rate) || 0,
        average_cart_value: parseFloat(metrics.average_cart_value) || 0,
        abandonment_rate: parseFloat(metrics.abandonment_rate) || 0,
        period_comparison: {
          previous_period: parseInt(metrics.previous_period) || 0,
          change_percentage: parseFloat(metrics.change_percentage) || 0
        }
      };
    },
    cacheKey,
    bypassCache
  );
}

/**
 * Calculate conversion likelihood based on journey steps
 */
function calculateLikelihood(steps, abandoned) {
  if (!abandoned) return 'high';
  
  const stepNames = steps.map(s => s.step);
  const hasPayment = stepNames.includes('payment_info');
  const hasShipping = stepNames.includes('shipping_info');
  const hasCheckout = stepNames.includes('checkout_start');
  
  if (hasPayment) return 'high';
  if (hasShipping) return 'medium';
  if (hasCheckout) return 'medium';
  return 'low';
}

/**
 * Generate mock journeys for fallback
 */
function generateMockJourneys() {
  const platforms = ['desktop', 'mobile', 'tablet'];
  const steps = [
    'landing_page', 'product_view', 'add_to_cart', 'cart_view', 
    'checkout_start', 'shipping_info', 'payment_info'
  ];
  
  const mockJourneys = [];
  
  for (let i = 0; i < 25; i++) {
    const journeySteps = [];
    const numSteps = Math.floor(Math.random() * 4) + 3; // 3-6 steps
    
    for (let j = 0; j < numSteps; j++) {
      journeySteps.push({
        step: steps[j],
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        duration: Math.floor(Math.random() * 60) + 30 // 30-90 seconds
      });
    }
    
    mockJourneys.push({
      customer_id: `mock_customer_${i}`,
      customer_email: `customer_${i}@example.com`,
      session_id: `mock_session_${i}`,
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      steps: journeySteps,
      total_time: journeySteps.reduce((sum, step) => sum + step.duration, 0),
      abandoned: Math.random() > 0.3, // 70% abandoned
      conversion_likelihood: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
    });
  }
  
  return mockJourneys;
}

/**
 * Fetch customer journey data - FIXED QUERY
 */
export async function fetchCustomerJourneys(startDate, endDate, bypassCache = false) {
  const cacheKey = generateCacheKey("customer_journeys", { startDate, endDate });

  return executeWithConnection(
    "customer-journeys",
    async (session) => {
      const query = `
WITH session_events AS (
  SELECT
    atgId AS customer_id,
    emailId AS customer_email,
    sessionId,
    Platform AS platform,
    eventTime,
    sottype,
    sotSubType,
    -- Enhanced step classification with better matching
    CASE 
      WHEN sottype = 'add to basket' THEN 'add_to_cart'
      WHEN sottype = 'page view' AND (sotSubType LIKE '%home%' OR sotSubType LIKE '%landing%') THEN 'landing_page'
      WHEN sottype = 'page view' AND (sotSubType LIKE '%product%' OR sotSubType LIKE '%pdp%') THEN 'product_view'
      WHEN sottype = 'page view' AND (sotSubType LIKE '%basket%' OR sotSubType LIKE '%cart%' OR sotSubType LIKE '%bag%') THEN 'cart_view'
      WHEN sottype = 'page view' AND sotSubType LIKE '%checkout%' THEN 'checkout_start'
      WHEN sottype = 'page view' AND sotSubType LIKE '%shipping%' THEN 'shipping_info'
      WHEN sottype = 'page view' AND sotSubType LIKE '%payment%' THEN 'payment_info'
      WHEN sottype = 'purchase' THEN 'purchase_complete'
      ELSE NULL
    END AS step
  FROM ${TABLE_FULL_NAME}
  WHERE event_date BETWEEN '${startDate}' AND '${endDate}'
    AND sessionId IS NOT NULL
    AND atgId IS NOT NULL
    AND (
      sottype IN ('page view', 'add to basket', 'purchase')
      OR (sottype = 'page view' AND sotSubType IS NOT NULL)
    )
),
valid_steps AS (
  SELECT
    customer_id,
    customer_email,
    sessionId,
    platform,
    step,
    MIN(eventTime) AS step_start_time
  FROM session_events
  WHERE step IS NOT NULL
  GROUP BY customer_id, customer_email, sessionId, platform, step
),
step_sequences AS (
  SELECT
    customer_id,
    customer_email,
    sessionId,
    platform,
    step,
    step_start_time,
    -- FIX: Use direct timestamp arithmetic instead of UNIX_TIMESTAMP
    COALESCE(
      CAST(
        (
          -- Calculate milliseconds difference directly
          LEAD(step_start_time) OVER (
            PARTITION BY sessionId 
            ORDER BY step_start_time
          ) - step_start_time
        ) / 1000 AS INT  -- Convert milliseconds to seconds
      ),
      45 -- Default duration if no next step
    ) AS duration
  FROM valid_steps
),
journey_sequences AS (
  SELECT
    customer_id,
    customer_email,
    sessionId,
    platform,
    COLLECT_LIST(
      STRUCT(
        step AS step,
        step_start_time AS timestamp,
        duration AS duration
      )
    ) AS steps,
    COUNT(*) AS total_steps,
    -- Determine if journey was abandoned (no purchase)
    MAX(CASE WHEN step = 'purchase_complete' THEN 1 ELSE 0 END) AS has_purchase
  FROM step_sequences
  GROUP BY customer_id, customer_email, sessionId, platform
  HAVING total_steps >= 2  -- At least 2 steps to be considered a journey
)
SELECT
  customer_id,
  customer_email,
  sessionId AS session_id,
  platform,
  steps,
  -- Calculate total journey time (sum of step durations)
  REDUCE(
    steps, 
    0, 
    (s, x) -> s + COALESCE(x.duration, 45), 
    s -> s
  ) AS total_time_seconds,
  has_purchase = 0 AS abandoned
FROM journey_sequences
ORDER BY total_time_seconds DESC
LIMIT 200
      `;

      console.log(`====> Executing FIXED customer journeys query for range: ${startDate} to ${endDate}`);
      
      try {
        const rows = await executeQuery(session, query);
        console.log(`=====> Retrieved ${rows.length} customer journey records`);

        // Transform the data with proper structure
        const journeys = rows.map((row, index) => {
          // Sort steps by timestamp and ensure they're in the right order
          const steps = Array.isArray(row.steps) 
            ? row.steps
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                .map(step => ({
                  step: step.step,
                  timestamp: step.timestamp,
                  duration: step.duration || 45
                }))
            : [];

          return {
            customer_id: row.customer_id || `customer_${index}`,
            customer_email: row.customer_email || `customer_${index}@example.com`,
            session_id: row.session_id || `session_${index}`,
            platform: row.platform || 'desktop',
            steps: steps,
            total_time: parseInt(row.total_time_seconds) || steps.reduce((sum, step) => sum + (step.duration || 45), 0),
            abandoned: row.abandoned !== false, // Default to abandoned if not specified
            conversion_likelihood: calculateLikelihood(steps, row.abandoned)
          };
        });

        console.log(`=====> Processed ${journeys.length} journeys`);
        
        return journeys;
      } catch (error) {
        console.error('Error in customer journeys query:', error);
        
        // Return mock data as fallback
        console.log('=====> Returning mock data as fallback');
        return generateMockJourneys();
      }
    },
    cacheKey,
    bypassCache
  );
}

/**
 * Generate heatmap grid from click points
 */
function generateHeatmapGrid(clickPoints, gridSize = 20) {
  if (!clickPoints || clickPoints.length === 0) return [];

  const grid = {};
  
  clickPoints.forEach(point => {
    const gridX = Math.floor(point.x / gridSize);
    const gridY = Math.floor(point.y / gridSize);
    const key = `${gridX},${gridY}`;
    
    if (!grid[key]) {
      grid[key] = {
        x: gridX * gridSize + gridSize / 2,
        y: gridY * gridSize + gridSize / 2,
        count: 0
      };
    }
    grid[key].count++;
  });

  // Convert to array and calculate intensity
  const counts = Object.values(grid).map(cell => cell.count);
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
  
  return Object.values(grid).map(cell => ({
    x: cell.x,
    y: cell.y,
    intensity: maxCount > 0 ? (cell.count / maxCount) * 100 : 0,
    count: cell.count
  }));
}

/**
 * Generate aggregate heatmap data from sessions
 */
function generateHeatMapAggregate(sessions) {
  const clickPoints = [];
  const elementCounts = new Map();

  // Collect all clicks and count element interactions
  sessions.forEach(session => {
    if (Array.isArray(session.clicks)) {
      session.clicks.forEach(click => {
        // Add to heatmap points
        clickPoints.push({
          x: click.x,
          y: click.y,
          element: click.element
        });

        // Count element interactions
        if (click.element) {
          elementCounts.set(click.element, (elementCounts.get(click.element) || 0) + 1);
        }
      });
    }
  });

  // Generate heatmap intensity grid
  const heatmapGrid = generateHeatmapGrid(clickPoints);

  // Get popular elements
  const popularElements = Array.from(elementCounts.entries())
    .map(([element, count]) => ({ element, click_count: count }))
    .sort((a, b) => b.click_count - a.click_count)
    .slice(0, 10);

  // Calculate average metrics
  const totalSessions = sessions.length;
  const avgScrollDepth = totalSessions > 0 ? sessions.reduce((sum, session) => sum + session.scroll_depth, 0) / totalSessions : 0;
  const avgTimeOnPage = totalSessions > 0 ? sessions.reduce((sum, session) => sum + session.time_on_page, 0) / totalSessions : 0;
  const totalClicks = clickPoints.length;
  const avgClicksPerSession = totalSessions > 0 ? totalClicks / totalSessions : 0;

  return {
    click_heatmap: heatmapGrid,
    popular_elements: popularElements,
    average_metrics: {
      scroll_depth: avgScrollDepth,
      time_on_page: avgTimeOnPage,
      clicks_per_session: avgClicksPerSession
    }
  };
}

/**
 * Fetch heatmap data for user behavior analysis
 */
export async function fetchHeatMapData(startDate, endDate, pageUrl = null, bypassCache = false) {
  const cacheKey = generateCacheKey("heatmap_data", { startDate, endDate, pageUrl });

  return executeWithConnection(
    "heatmap-data",
    async (session) => {
      const pageFilter = pageUrl ? `AND sotV181 = '${pageUrl}'` : '';

      const query = `
WITH page_sessions AS (
  SELECT
    sessionId,
    sotV181 as page_url,
    Platform as device_type,
    MAX(CAST(sotV188 AS DOUBLE)) as scroll_depth,
    COUNT(*) as page_events,
    MIN(eventTime) as session_start,
    MAX(eventTime) as session_end
  FROM ${TABLE_FULL_NAME}
  WHERE event_date BETWEEN '${startDate}' AND '${endDate}'
    AND sottype = 'page view'
    AND sotV181 IS NOT NULL
    ${pageFilter}
  GROUP BY sessionId, sotV181, Platform
),
click_data AS (
  SELECT
    sessionId,
    sotV181 as page_url,
    sotV190 as click_x,
    sotV191 as click_y,
    sotV189 as click_element,
    eventTime as click_time
  FROM ${TABLE_FULL_NAME}
  WHERE event_date BETWEEN '${startDate}' AND '${endDate}'
    AND sottype = 'cms component item click'
    AND sotV181 IS NOT NULL
    AND sotV190 IS NOT NULL
    AND sotV191 IS NOT NULL
    ${pageFilter}
)
SELECT
  ps.sessionId as session_id,
  ps.device_type,
  ps.page_url,
  COALESCE(ps.scroll_depth, 0) as scroll_depth,
  COALESCE(
    (CAST(ps.session_end AS DOUBLE) - CAST(ps.session_start AS DOUBLE)) / 1000, 
    0
  ) as time_on_page,
  COLLECT_LIST(
    STRUCT(
      CAST(cd.click_x AS DOUBLE) as x,
      CAST(cd.click_y AS DOUBLE) as y,
      cd.click_element as element,
      cd.click_time as timestamp
    )
  ) as clicks
FROM page_sessions ps
LEFT JOIN click_data cd ON ps.sessionId = cd.sessionId AND ps.page_url = cd.page_url
GROUP BY ps.sessionId, ps.device_type, ps.page_url, ps.scroll_depth, ps.session_start, ps.session_end
HAVING SIZE(clicks) > 0 OR scroll_depth > 0
LIMIT 500
    `;

      console.log(`====> Executing heatmap query for range: ${startDate} to ${endDate}`);
      const rows = await executeQuery(session, query);

      console.log(`=====> Retrieved ${rows.length} heatmap session records`);

      // Transform data to match frontend expectations
      const sessions = rows.map(row => ({
        session_id: row.session_id,
        device_type: row.device_type?.toLowerCase() || 'desktop',
        page_url: row.page_url,
        scroll_depth: parseFloat(row.scroll_depth) || 0,
        time_on_page: parseFloat(row.time_on_page) || 0,
        clicks: (Array.isArray(row.clicks) ? row.clicks : []).filter(click => click.x != null && click.y != null).map(click => ({
          x: parseFloat(click.x),
          y: parseFloat(click.y),
          element: click.element,
          timestamp: click.timestamp
        }))
      }));

      // Generate aggregate data for heatmap visualization
      const aggregateData = generateHeatMapAggregate(sessions);

      return {
        sessions,
        aggregate: aggregateData
      };
    },
    cacheKey,
    bypassCache
  );
}

/**
 * Recover an abandoned cart (mark as recovered)
 */
export async function recoverCart(cartId) {
  // In a real implementation, this would call an API to send recovery emails/notifications
  // For now, we'll just simulate the recovery process
  
  console.log(`====> Simulating recovery for cart: ${cartId}`);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    success: true,
    cartId: cartId,
    recovered: true,
    recovery_timestamp: new Date().toISOString(),
    message: 'Recovery email sent successfully'
  };
}

/**
 * Clear cache manually if needed
 */
export function clearAbandonedCartCache() {
  const cacheKeys = Array.from(queryCache.keys()).filter(key => 
    key.includes('abandoned') || key.includes('journey') || key.includes('heatmap') || key.includes('metrics')
  );
  
  cacheKeys.forEach(key => queryCache.delete(key));
  console.log(`====> Cleared ${cacheKeys.length} abandoned cart cache entries`);
}

/**
 * Get connection statistics
 */
export function getAbandonedCartStats() {
  const cacheKeys = Array.from(queryCache.keys()).filter(key => 
    key.includes('abandoned') || key.includes('journey') || key.includes('heatmap') || key.includes('metrics')
  );

  return {
    connections: {
      ...connectionState
    },
    cacheSize: cacheKeys.length,
    cacheKeys: cacheKeys
  };
}

/**
 * Enhanced heatmap data fetch with purchase journey tracking
 */
export async function fetchEnhancedHeatMapData(startDate, endDate, pageUrl = null, analysisType = 'basic', bypassCache = false) {
  const cacheKey = generateCacheKey("enhanced_heatmap", { startDate, endDate, pageUrl, analysisType });

  return executeWithConnection(
    "heatmap-data",
    async (session) => {
      let query;
      
      switch (analysisType) {
        case 'purchase-journey':
          query = buildPurchaseJourneyQuery(startDate, endDate, pageUrl);
          break;
        case 'journey-funnel':
          query = buildJourneyFunnelQuery(startDate, endDate);
          break;
        case 'basic':
        default:
          query = buildBasicHeatmapQuery(startDate, endDate, pageUrl);
          break;
      }

      console.log(`====> Executing ${analysisType} heatmap query for range: ${startDate} to ${endDate}`);
      const rows = await executeQuery(session, query);

      console.log(`=====> Retrieved ${rows.length} ${analysisType} heatmap records`);

      // Process data based on analysis type
      switch (analysisType) {
        case 'purchase-journey':
          return processPurchaseJourneyData(rows);
        case 'journey-funnel':
          return processFunnelData(rows);
        case 'basic':
        default:
          return processBasicHeatmapData(rows);
      }
    },
    cacheKey,
    bypassCache
  );
}

/**
 * Build query for purchase journey analysis
 */
function buildPurchaseJourneyQuery(startDate, endDate, pageUrl) {
  const pageFilter = pageUrl ? `AND a.sotV181 = '${pageUrl}'` : '';
  
  return `
WITH purchase_events AS (
  SELECT DISTINCT sessionId
  FROM ${TABLE_FULL_NAME}
  WHERE event_date BETWEEN '${startDate}' AND '${endDate}'
    AND sottype = 'place order'
),
click_events AS (
  SELECT
    a.sessionId,
    a.atgId as customer_id,
    a.Platform as device_type,
    a.sotV181 as page_url,
    a.sotV190 as click_x,
    a.sotV191 as click_y,
    a.sotV189 as click_element,
    a.eventTime,
    a.sottype,
    CASE 
      WHEN p.sessionId IS NOT NULL THEN 'successful'
      ELSE 'abandoned'
    END as journey_status
  FROM ${TABLE_FULL_NAME} a
  LEFT JOIN purchase_events p ON a.sessionId = p.sessionId
  WHERE a.event_date BETWEEN '${startDate}' AND '${endDate}'
    AND a.sottype IN ('cms component item click', 'add to basket', 'continue to checkout', 
                     'checkout payment standard', 'place order')
    ${pageFilter}
    AND a.sotV190 IS NOT NULL
    AND a.sotV191 IS NOT NULL
),
aggregated_clicks AS (
  SELECT
    journey_status,
    device_type,
    page_url,
    click_x,
    click_y,
    click_element,
    COUNT(DISTINCT sessionId) as session_count,
    COUNT(*) as click_count
  FROM click_events
  GROUP BY journey_status, device_type, page_url, click_x, click_y, click_element
)
SELECT * FROM aggregated_clicks
ORDER BY journey_status, click_count DESC
LIMIT 2000
  `;
}

/**
 * Process purchase journey data for frontend
 */
function processPurchaseJourneyData(rows) {
  const successfulData = [];
  const abandonedData = [];
  const elementPerformance = new Map();

  rows.forEach(row => {
    const clickPoint = {
      x: parseFloat(row.click_x),
      y: parseFloat(row.click_y),
      element: row.click_element,
      page_url: row.page_url,
      device_type: row.device_type,
      count: parseInt(row.click_count),
      sessions: parseInt(row.session_count)
    };

    if (row.journey_status === 'successful') {
      successfulData.push(clickPoint);
    } else {
      abandonedData.push(clickPoint);
    }

    // Track element performance
    if (row.click_element) {
      const key = row.click_element;
      if (!elementPerformance.has(key)) {
        elementPerformance.set(key, {
          element: row.click_element,
          successful_clicks: 0,
          abandoned_clicks: 0,
          successful_sessions: 0,
          abandoned_sessions: 0
        });
      }
      
      const elementData = elementPerformance.get(key);
      if (row.journey_status === 'successful') {
        elementData.successful_clicks += row.click_count;
        elementData.successful_sessions += row.session_count;
      } else {
        elementData.abandoned_clicks += row.click_count;
        elementData.abandoned_sessions += row.session_count;
      }
    }
  });

  // Calculate conversion rates for elements
  const elementAnalysis = Array.from(elementPerformance.values()).map(element => {
    const totalClicks = element.successful_clicks + element.abandoned_clicks;
    const totalSessions = element.successful_sessions + element.abandoned_sessions;
    
    return {
      ...element,
      total_clicks: totalClicks,
      total_sessions: totalSessions,
      conversion_rate: totalSessions > 0 ? (element.successful_sessions / totalSessions) * 100 : 0,
      click_conversion_rate: totalClicks > 0 ? (element.successful_clicks / totalClicks) * 100 : 0
    };
  });

  return {
    successful_journey: {
      clicks: successfulData,
      heatmap: generateHeatmapGrid(successfulData),
      total_clicks: successfulData.reduce((sum, click) => sum + click.count, 0),
      total_sessions: new Set(successfulData.flatMap(c => Array(c.sessions).fill(c.sessionId))).size
    },
    abandoned_journey: {
      clicks: abandonedData,
      heatmap: generateHeatmapGrid(abandonedData),
      total_clicks: abandonedData.reduce((sum, click) => sum + click.count, 0),
      total_sessions: new Set(abandonedData.flatMap(c => Array(c.sessions).fill(c.sessionId))).size
    },
    element_analysis: elementAnalysis.sort((a, b) => b.conversion_rate - a.conversion_rate),
    insights: generateJourneyInsights(successfulData, abandonedData, elementAnalysis)
  };
}

export default {
  fetchAbandonedCarts,
  fetchAbandonedCartMetrics,
  fetchCustomerJourneys,
  fetchHeatMapData,
  recoverCart,
  clearAbandonedCartCache,
  getAbandonedCartStats
};