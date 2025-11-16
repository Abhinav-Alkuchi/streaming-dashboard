import dotenv from "dotenv";
import { DBSQLClient } from "@databricks/sql";
import { createRequire } from 'module';
import axios from "axios";
const require = createRequire(import.meta.url);

dotenv.config();

const PERSONALIZATION_JSON_DATA = require("../../data/p13nData.json");

const {
  DATABRICKS_HOST,
  DATABRICKS_HTTP_PATH,
  DATABRICKS_TOKEN,
  DATABRICKS_CLUSTER_ID,
  TABLE_FULL_NAME,
  ACCESS_TOKEN,
  CONTENT_API
} = process.env;

// Import config
import { CONFIG } from '../config/constants.js';
// Import utils
import { generateCacheKey, getCachedData, setCachedData } from '../utils/cacheUtils.js';

// Connection state management
const connectionState = {
  'live': { isConnecting: false, lastUsed: null },
  'historical': { isConnecting: false, lastUsed: null },
  'eventStream': { isConnecting: false, lastUsed: null },
  'purchase-analysis': { isConnecting: false, lastUsed: null }
};

// Cache for frequent queries
const queryCache = new Map();

const USE_LIVE_QUERY = false;

/**
 * Get optimized Databricks connection with cluster configuration
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

  // Add cluster configuration if available
  if (useExistingCluster && DATABRICKS_CLUSTER_ID) {
    connectionConfig.clusterId = DATABRICKS_CLUSTER_ID;
  }

  const connection = await client.connect(connectionConfig);
  return { client, connection };
}

/**
 * Execute query with optimized performance and better error handling
 */
async function executeQuery(session, query, isHistorical = false) {
  const queryType = isHistorical ? "historical" : "live";
  console.log(`Executing ${queryType} query...`);

  const queryOperation = await session.executeStatement(query, {
    runAsync: true,
    queryTimeout: CONFIG.QUERY_TIMEOUT / 1000, // Convert to seconds
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
        // Still running
        if (attempts % 30 === 0) {
          console.log(
            `=====> Query in progress... State: ${
              status.operationState
            }, Attempt: ${attempts + 1}`
          );
        }
    }

    if (status.operationState === 2) break;

    // Exponential backoff for polling
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.5, CONFIG.MAX_POLL_DELAY);
    attempts++;
  }

  if (attempts >= CONFIG.MAX_POLL_ATTEMPTS) {
    await queryOperation.close();
    throw new Error("Query timeout - exceeded maximum wait time");
  }

  // Fetch results efficiently
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
      session
        .close()
        .catch((e) => console.error("Session close error:", e.message))
    );
  if (connection)
    cleanupTasks.push(
      connection
        .close()
        .catch((e) => console.error("Connection close error:", e.message))
    );

  await Promise.allSettled(cleanupTasks);
  console.log("=====> Connection cleanup complete");
}

/**
 * Enhanced currency parser that handles various formats
 */
function parseCurrencyValues(sotV06) {
  if (!sotV06) return 0;

  try {
    // Handle multiple values separated by semicolons
    const values = sotV06.toString().split(";");
    let total = 0;

    for (const value of values) {
      // Extract numbers and optional decimal point
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

/**
 * Base function for executing queries with connection management
 */
export async function executeWithConnection(
  connectionType,
  queryFn,
  cacheKey = null,
  bypassCache = false
) {
  // Check cache first if cacheKey is provided
  if (cacheKey) {
    const cachedData = getCachedData(queryCache, cacheKey, bypassCache, CONFIG.CACHE_TTL);
    if (cachedData) return cachedData;
  }

  // Check if connection is already in progress
  if (connectionState[connectionType].isConnecting) {
    console.log(
      `====> ${connectionType} connection already in progress, skipping...`
    );
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

    // Cache the results if cacheKey is provided
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

    // Cleanup resources
    await cleanupResources(session, connection);
  }
}

/**
 * Fetch live data for a specific date with SIMPLIFIED revenue calculation
 */
export async function fetchLatestDataWithDate(date, bypassCache = false) {
  const cacheKey = generateCacheKey("live_data", { date });

  return executeWithConnection(
    "live",
    async (session) => {
      // SIMPLIFIED QUERY - Get raw data and process in JavaScript
      const query = `
      SELECT 
        sotType, 
        COUNT(*) as count,
        sotV06
      FROM ${TABLE_FULL_NAME} 
      WHERE event_date = '${date}' 
        AND sotType IN (${CONFIG.EVENT_TYPES.map((type) => `'${type}'`).join(
          ", "
        )})
      GROUP BY sotType, sotV06
      ORDER BY count DESC
    `;

      console.log("====> Executing SIMPLIFIED live query for date:", date);
      const rows = await executeQuery(session, query, false);

      console.log(`=====> Retrieved ${rows.length} raw rows for date ${date}`);

      // Process and aggregate the data in JavaScript for accurate revenue calculation
      const aggregatedData = {};

      rows.forEach((row) => {
        const eventType = row.sotType;
        const count = parseInt(row.count) || 0;
        const sotV06 = row.sotV06;

        if (!aggregatedData[eventType]) {
          aggregatedData[eventType] = {
            count: 0,
            revenue: 0,
          };
        }

        aggregatedData[eventType].count += count;

        // Calculate revenue for purchase events
        if (eventType === "purchase" && sotV06) {
          const revenue = parseCurrencyValues(sotV06) * count;
          aggregatedData[eventType].revenue += revenue;
        }
      });

      // Convert back to array format matching the expected structure
      const result = Object.entries(aggregatedData).map(([sotType, data]) => ({
        sotType,
        count: data.count,
        revenue: parseFloat(data.revenue.toFixed(2)), // Ensure 2 decimal places
      }));

      console.log(
        "=====> Processed revenue data:",
        JSON.stringify(result, null, 2)
      );

      // Log revenue specifically for debugging
      const purchaseData = result.find((r) => r.sotType === "purchase");
      if (purchaseData) {
        console.log(
          `=====> PURCHASE REVENUE: $${purchaseData.revenue} from ${purchaseData.count} purchases`
        );
      }

      return result;
    },
    cacheKey,
    bypassCache
  );
}

/**
 * Alternative approach: Fetch raw data and process revenue in JavaScript
 */
export async function fetchLatestDataWithDateAlternative(
  date,
  bypassCache = false
) {
  const cacheKey = generateCacheKey("live_data_alt", { date });

  return executeWithConnection(
    "live",
    async (session) => {
      const query = `
      SELECT 
        sotType, 
        COUNT(*) as count,
        sotV06
      FROM ${TABLE_FULL_NAME} 
      WHERE event_date = '${date}' 
        AND sotType IN (${CONFIG.EVENT_TYPES.map((type) => `'${type}'`).join(
          ", "
        )})
      GROUP BY sotType, sotV06
      ORDER BY count DESC
    `;

      console.log("=====> Executing alternative live query for date:", date);
      const rows = await executeQuery(session, query, false);

      console.log(`======> Retrieved ${rows.length} raw rows for date ${date}`);

      // Process and aggregate the data in JavaScript
      const aggregatedData = {};

      rows.forEach((row) => {
        const eventType = row.sotType;
        const count = row.count || 0;
        const sotV06 = row.sotV06;

        if (!aggregatedData[eventType]) {
          aggregatedData[eventType] = {
            count: 0,
            revenue: 0,
          };
        }

        aggregatedData[eventType].count += count;

        // Calculate revenue for purchase events
        if (eventType === "purchase" && sotV06) {
          const revenue = parseCurrencyValues(sotV06) * count;
          aggregatedData[eventType].revenue += revenue;
        }
      });

      // Convert back to array format
      const result = Object.entries(aggregatedData).map(([sotType, data]) => ({
        sotType,
        count: data.count,
        revenue: data.revenue,
      }));

      console.log("=====> Processed data:", JSON.stringify(result, null, 2));

      return result;
    },
    cacheKey,
    bypassCache
  );
}

/**
 * Fetch data for a specific previous date with improved revenue calculation
 */
export async function fetchPreviousDateData(date) {
  const cacheKey = generateCacheKey("previous_date_data", { date });

  return executeWithConnection(
    "historical",
    async (session) => {
      // Use the same simplified approach for historical data
      const query = `
      SELECT 
        sotType, 
        COUNT(*) as count,
        sotV06
      FROM ${TABLE_FULL_NAME} 
      WHERE event_date = '${date}' 
        AND sotType IN (${CONFIG.EVENT_TYPES.map((type) => `'${type}'`).join(
          ", "
        )})
      GROUP BY sotType, sotV06
      ORDER BY count DESC
    `;

      console.log("===> Executing simplified previous date query for:", date);
      const rows = await executeQuery(session, query, true);

      console.log(
        `====> Retrieved ${rows.length} raw rows for previous date ${date}`
      );

      // Process in JavaScript (same logic as above)
      const aggregatedData = {};

      rows.forEach((row) => {
        const eventType = row.sotType;
        const count = parseInt(row.count) || 0;
        const sotV06 = row.sotV06;

        if (!aggregatedData[eventType]) {
          aggregatedData[eventType] = {
            count: 0,
            revenue: 0,
          };
        }

        aggregatedData[eventType].count += count;

        if (eventType === "purchase" && sotV06) {
          const revenue = parseCurrencyValues(sotV06) * count;
          aggregatedData[eventType].revenue += revenue;
        }
      });

      const result = Object.entries(aggregatedData).map(([sotType, data]) => ({
        sotType,
        count: data.count,
        revenue: parseFloat(data.revenue.toFixed(2)),
      }));

      const purchaseData = result.find((r) => r.sotType === "purchase");
      if (purchaseData) {
        console.log(
          `=====> PREVIOUS DAY REVENUE: $${purchaseData.revenue} from ${purchaseData.count} purchases`
        );
      }

      return result;
    },
    cacheKey,
    false
  );
}

function getDataFromJson(date) {
  const dateData = PERSONALIZATION_JSON_DATA[date];
  if (!dateData) {
    console.warn(`No JSON data found for date: ${date}`);
    return [];
  }

  const result = [];
  for (const [child_sid, info] of Object.entries(dateData)) {
    for (const [platform, purchase_count] of Object.entries(info.platforms)) {
      result.push({
        child_sid,
        content_type: info.content_type,
        platform,
        media: info.media,
        purchase_count
      });
    }
  }

  // Sort by purchase_count DESC (same as SQL)
  return result.sort((a, b) => b.purchase_count - a.purchase_count);
}

export async function fetchPersonalizationData(date) {
  const cacheKey = generateCacheKey("personalization_data", { date });
  console.log('fetchPersonalizationData', date);
  
  return executeWithConnection(
    "purchase-analysis",
    async (session) => {
      let rows = [];
      console.log(USE_LIVE_QUERY);

      if (USE_LIVE_QUERY) {
        // === LIVE DB QUERY ===
        const query = `
        SELECT
    c.sotV310                                   AS child_sid,
    c.sotV312                                   AS content_type,
    c.platform                                  AS platform,
    COALESCE(b.media, 'unknown')                AS media,
    ANY_VALUE(p.sotV323)                        AS sample_referrer_path,
    COUNT(*)                                    AS purchase_count
FROM ${TABLE_FULL_NAME} p
INNER JOIN ${TABLE_FULL_NAME} c
    ON p.atgId = c.atgId
    AND p.event_date = c.event_date
    AND c.sottype = 'cms component item click'
    AND c.sotV310 IS NOT NULL
    AND TRIM(c.sotV310) != ''
    AND c.sotV312 IN ('BannerList', 'Banner')
    -- Ensure the clicked banner appears in the referrer path
    AND p.sotV323 LIKE CONCAT('%', c.sotV310, '%')

LEFT JOIN p13n.cms_banner b
    ON c.sotV310 = b.sid

WHERE p.event_date = '${date}'
  AND p.sottype = 'internal referrer influenced purchase'
  AND p.sotV323 IS NOT NULL
  AND TRIM(p.sotV323) != ''

GROUP BY
    c.sotV310,
    c.sotV312,
    c.platform,
    b.media

ORDER BY
    purchase_count DESC
      `;

        console.log("Executing personalization query for date:", date);
        const queryResult = await executeQuery(session, query, true);
        rows = queryResult;
        console.log(`Retrieved ${rows.length} personalization records from DB for date ${date}`);
      } else {
        // === FALLBACK TO JSON ===
        console.log(`Using embedded JSON data for date: ${date}`);
        rows = getDataFromJson(date);

        // Simulate DB row structure
        rows = rows.map(row => ({
          child_sid: row.child_sid,
          content_type: row.content_type,
          platform: row.platform,
          purchase_count: row.purchase_count,
          media: row.media
        }));
      }

      // Fetch additional image data from Contentful for each media item
      const enrichedRows = await Promise.all(
        rows.map(async (row) => {
          if (row.media && row.media !== 'unknown') {
            try {
              const imageData = await fetchContentfulMediaData(row.media);
              return {
                ...row,
                image_data: imageData?.fields?.src
              };
            } catch (error) {
              console.warn(`Failed to fetch Contentful data for media ${row.media}:`, error.message);
              return {
                ...row,
                image_data: null
              };
            }
          } else {
            return {
              ...row,
              image_data: null
            };
          }
        })
      );

      // Normalize output
      return enrichedRows.map(row => ({
        child_sid: row.child_sid,
        content_type: row.content_type,
        platform: row.platform,
        purchase_count: parseInt(row.purchase_count) || 0,
        media: row.media,
        image_data: row.image_data
      }));
    },
    cacheKey,
    false // disable cache if you want fresh data each time
  );
}

// Helper function to fetch Contentful media data
async function fetchContentfulMediaData(mediaId) {
  const config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: `${CONTENT_API}/${mediaId}?access_token=${ACCESS_TOKEN}`,
    headers: {},
    timeout: 10000 // 10 second timeout
  };

  try {
    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error(`Error fetching Contentful data for media ${mediaId}:`, error.message);
    throw error; // Re-throw to handle in the main function
  }
}

/**
 * Fetch historical data for a date range with improved revenue calculation
 */
export async function fetchHistoricalData(startDate, endDate) {
  const cacheKey = generateCacheKey("historical_data", { startDate, endDate });

  return executeWithConnection(
    "historical",
    async (session) => {
      if (!startDate || !endDate) {
        throw new Error("Invalid date parameters");
      }

      // Simplified historical query
      const query = `
      SELECT 
        event_date, 
        sotType,
        platform,
        COUNT(*) as cnt,
        sotV06
      FROM ${TABLE_FULL_NAME} 
      WHERE event_date BETWEEN '${startDate}' AND '${endDate}' 
        AND sotType IN (${CONFIG.EVENT_TYPES.map((type) => `'${type}'`).join(
          ", "
        )})
        AND platform IN (${CONFIG.PLATFORMS.map(
          (platform) => `'${platform}'`
        ).join(", ")})
      GROUP BY event_date, sotType, platform, sotV06
      ORDER BY event_date DESC, cnt DESC
    `;

      console.log(
        "======> Executing simplified historical query for range:",
        startDate,
        "to",
        endDate
      );
      const rows = await executeQuery(session, query, true);

      console.log(
        `======> Retrieved ${rows.length} raw rows for date range ${startDate} to ${endDate}`
      );

      // Process in JavaScript
      const aggregatedData = {};

      rows.forEach((row) => {
        const key = `${row.event_date}_${row.sotType}_${row.platform}`;
        const count = parseInt(row.cnt) || 0;
        const sotV06 = row.sotV06;

        if (!aggregatedData[key]) {
          aggregatedData[key] = {
            event_date: row.event_date,
            sotType: row.sotType,
            platform: row.platform,
            cnt: 0,
            revenue: 0,
          };
        }

        aggregatedData[key].cnt += count;

        if (row.sotType === "purchase" && sotV06) {
          const revenue = parseCurrencyValues(sotV06) * count;
          aggregatedData[key].revenue += revenue;
        }
      });

      const result = Object.values(aggregatedData).map((item) => ({
        ...item,
        revenue: parseFloat(item.revenue.toFixed(2)),
      }));

      const purchaseRows = result.filter((r) => r.sotType === "purchase");
      console.log(
        `=====> HISTORICAL PURCHASE REVENUE: ${purchaseRows.length} purchase records with total revenue calculation`
      );

      return result;
    },
    cacheKey,
    false
  );
}

/**
 * Enhanced debug function to see what's in sotV06
 */
export async function debugRevenueCalculation(date) {
  const cacheKey = generateCacheKey("debug_revenue", { date });

  return executeWithConnection(
    "live",
    async (session) => {
      const query = `
      SELECT 
        sotType,
        sotV06,
        COUNT(*) as count
      FROM ${TABLE_FULL_NAME} 
      WHERE event_date = '${date}' 
        AND sotType = 'purchase'
        AND sotV06 IS NOT NULL
      GROUP BY sotType, sotV06
      ORDER BY count DESC
      LIMIT 20
    `;

      console.log(
        "======> Executing enhanced debug query for revenue calculation"
      );
      const rows = await executeQuery(session, query, false);

      // Add parsed values for debugging
      const debugRows = rows.map((row) => ({
        ...row,
        parsedRevenue: parseCurrencyValues(row.sotV06),
        calculatedRevenue:
          parseCurrencyValues(row.sotV06) * (parseInt(row.count) || 0),
      }));

      console.log(
        "=======> Enhanced debug revenue samples:",
        JSON.stringify(debugRows, null, 2)
      );

      // Calculate total potential revenue from samples
      const totalSampleRevenue = debugRows.reduce(
        (sum, row) => sum + row.calculatedRevenue,
        0
      );
      console.log(`=====> DEBUG TOTAL SAMPLE REVENUE: $${totalSampleRevenue}`);

      return debugRows;
    },
    cacheKey,
    true
  );
}

/**
 * Pre-warm the connection by starting the cluster
 */
export async function preWarmConnection() {
  try {
    console.log("=====> Pre-warming Databricks connection...");
    const { connection } = await getDatabricksConnection(true);
    const session = await connection.openSession();

    // Execute a simple query to ensure cluster is warm
    await session.executeStatement("SELECT 1", { runAsync: false });

    await session.close();
    await connection.close();

    console.log("=====> Connection pre-warmed successfully");
    return true;
  } catch (error) {
    console.warn(
      "======> Pre-warm failed (cluster might be starting):",
      error.message
    );
    return false;
  }
}

/**
 * Clear cache manually if needed
 */
export function clearCache() {
  const previousSize = queryCache.size;
  queryCache.clear();
  console.log(`=====> Cache cleared (removed ${previousSize} entries)`);
}

/**
 * Get connection statistics
 */
export function getConnectionStats() {
  return {
    live: { ...connectionState.live },
    historical: { ...connectionState.historical },
    cacheSize: queryCache.size,
    cacheKeys: Array.from(queryCache.keys()),
  };
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const now = Date.now();
  const entries = Array.from(queryCache.entries());

  return {
    totalEntries: entries.length,
    expiredEntries: entries.filter(
      ([_, data]) => now - data.timestamp > CONFIG.CACHE_TTL
    ).length,
    memoryUsage:
      Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
  };
}

/**
 * Health check for Databricks connection
 */
export async function healthCheck() {
  try {
    const { connection } = await getDatabricksConnection(true);
    const session = await connection.openSession();
    const result = await session.executeStatement("SELECT 1 as health", {
      runAsync: false,
    });
    await session.close();
    await connection.close();

    return {
      healthy: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Fetch live event stream data for EventStream component
 */
export async function fetchLiveEventStream(date, limit = 1000) {
  const cacheKey = generateCacheKey("event_stream", { date, limit });

  return executeWithConnection(
    "eventStream",
    async (session) => {
      const eventTypes = CONFIG.LIVESTREAMEVENT_EVENT_TYPES.map(
        (type) => `'${type}'`
      ).join(", ");
      const platforms = CONFIG.PLATFORMS.map(
        (platform) => `'${platform}'`
      ).join(", ");

      const query = `
SELECT 
  -- Event identification and metadata
  ROW_NUMBER() OVER (ORDER BY eventTime DESC) as event_id,
  sotType,
  sotSubType,
  sotCategory,
  sotSubCategory,
  
  -- Enhanced event details for different event types
  sotV01 as page_type_detail,
  sotV02 as page_world_new,
  sotV04 as sku_id,
  sotV05 as sku_quantity,
  sotV06 as sku_price,
  sotV07 as brand_name,
  sotV08 as category_id,
  sotV09 as currency,
  sotV10 as order_id,
  sotV13 as ccpa_consent_cookie,
  sotV15 as product_id,
  sotV25 as language_locale,
  sotV28 as promo_code,
  sotV48 as braze_user_id,  -- Email/User ID
  sotV49 as braze_campaign_name,
  sotV63 as shipping_method,
  sotV64 as payment_method,
  sotV109 as content_country,
  sotV119 as country,
  sotV163 as category_name,
  sotV181 as web_url,
  sotV187 as customer_zip_code,
  sotV193 as preferred_store_id,
  sotV194 as items_available_in_stores,
  sotV215 as product_name,  -- Product name
  sotV216 as sku_variant_type,
  sotV217 as sku_variant_value,
  sotV237 as locale,
  emailId as email,
  
  -- Platform and timing
  platform,
  event_date,
  eventTime as event_timestamp,
  
  -- User identification (fallback hierarchy)
  COALESCE(
    emailId, -- Email ID
    sotV48,  -- Braze User ID
    CAST(FLOOR(RAND() * 1000000) AS STRING) -- Fallback random user
  ) as user_id,
  
  -- Product display name (fallback hierarchy)
  COALESCE(
    sotV215, -- Product Name
    sotV07,  -- Brand Name
    sotV08,  -- category ID
    sotV163  -- Category Name
  ) as display_product,
  
  -- Fixed price formatting
  CASE 
    WHEN sotV06 IS NOT NULL AND COALESCE(sotV09, '') IN ('USD', 'US', 'usd', 'us') THEN 
      CONCAT('$', CAST(sotV06 AS DECIMAL(10,2)))
    WHEN sotV06 IS NOT NULL AND sotV09 IS NOT NULL THEN 
      CONCAT(sotV06, ' ', sotV09)
    WHEN sotV06 IS NOT NULL THEN 
      CONCAT('$', CAST(sotV06 AS DECIMAL(10,2)))
    ELSE NULL
  END as formatted_price

FROM ${TABLE_FULL_NAME} 
WHERE event_date = '${date}'
  AND sotType IN (${eventTypes})
  AND eventTime IS NOT NULL
  AND platform IN (${platforms})
ORDER BY eventTime DESC
LIMIT ${limit}
`;

      console.log("Executing live event stream query for date:", date);
      const rows = await executeQuery(session, query, false);

      console.log(`Retrieved ${rows.length} live events for date ${date}`);

      // Transform the data for the EventStream component
      const transformedEvents = rows.map((row) => ({
        id: row.event_id?.toString() || `event-${Date.now()}-${Math.random()}`,
        type: row.sotType || "unknown",
        timestamp: row.event_timestamp
          ? new Date(row.event_timestamp)
          : new Date(),
        user: row.user_id || `User${Math.floor(Math.random() * 1000)}`,
        product: row.display_product,
        price: row.formatted_price,
        metadata: {
          platform: row.platform,
          category: row.sotCategory,
          subCategory: row.sotSubCategory,
          brand: row.brand_name,
          sku: row.sku_id,
          quantity: row.sku_quantity,
          country: row.country,
          locale: row.locale,
          price: row.sku_price,
          ...(row.order_id && { orderId: row.order_id }),
          ...(row.promo_code && { promoCode: row.promo_code }),
          ...(row.shipping_method && { shippingMethod: row.shipping_method }),
          ...(row.payment_method && { paymentMethod: row.payment_method }),
        },
      }));

      console.log(
        `====> Transformed ${transformedEvents.length} events for EventStream`
      );

      return transformedEvents;
    },
    cacheKey,
    true
  );
}

/**
 * Fetch store mode data for a date range
 */
export async function fetchStoreModeData(startDate, endDate) {
  const cacheKey = generateCacheKey("store_mode_data", { startDate, endDate });

  return executeWithConnection(
    "historical",
    async (session) => {
      if (!startDate || !endDate) {
        throw new Error("Invalid date parameters");
      }

      const query = `
      SELECT 
        event_date,
        event_type,
        store_type,
        atg_id,
        store_id,
        COUNT(*) as count
      FROM hdp.one_tag_store_mode_aggr 
      WHERE event_date BETWEEN '${startDate}' AND '${endDate}' 
        AND event_type IS NOT NULL
      GROUP BY event_date, event_type, store_type, atg_id, store_id
      ORDER BY event_date DESC, count DESC
    `;

      console.log(
        "======> Executing store mode query for range:",
        startDate,
        "to",
        endDate
      );
      const rows = await executeQuery(session, query, true);

      console.log(
        `======> Retrieved ${rows.length} store mode records for date range ${startDate} to ${endDate}`
      );

      return rows.map(row => ({
        event_date: row.event_date,
        event_type: row.event_type,
        store_type: row.store_type,
        user_id: row.atg_id,
        store_id: row.store_id,
        count: parseInt(row.count) || 0,
      }));
    },
    cacheKey,
    false
  );
}

/**
 * Get distinct event types for store mode data
 */
export async function getStoreModeEventTypes(date) {
  const cacheKey = generateCacheKey("store_mode_event_types", { date });

  return executeWithConnection(
    "historical",
    async (session) => {
      const query = `
      SELECT DISTINCT event_type 
      FROM hdp.one_tag_store_mode_aggr 
      WHERE event_date = '${date}'
      ORDER BY event_type
    `;

      console.log("=====> Fetching store mode event types for date:", date);
      const rows = await executeQuery(session, query, true);

      const eventTypes = rows.map(row => row.event_type).filter(Boolean);
      console.log(`=====> Found ${eventTypes.length} distinct event types`);

      return eventTypes;
    },
    cacheKey,
    false
  );
}

/**
 * Fetch event analysis data with event and platform filtering
 */
export async function fetchEventAnalysisData(startDate, endDate, eventTypes, platforms) {
  const cacheKey = generateCacheKey("event_analysis_data", { startDate, endDate, eventTypes, platforms });

  return executeWithConnection(
    "historical",
    async (session) => {
      if (!startDate || !endDate) {
        throw new Error("Invalid date parameters");
      }

      // Build WHERE conditions
      const conditions = [
        `event_date BETWEEN '${startDate}' AND '${endDate}'`
      ];

      console.log(eventTypes);
      console.log(platforms);

     
      if (eventTypes.length > 0 && !eventTypes.includes('all')) {
        // Replace underscores with spaces for event types in the query
        const eventTypesList = eventTypes.map(event => `'${event.replace(/_/g, ' ')}'`).join(", ");
        conditions.push(`sotType IN (${eventTypesList})`);
      }

       if (platforms.length > 0 && !platforms.includes('all')) {
        // Replace underscores with spaces for platforms in the query
        const platformsList = platforms.map(platform => `'${platform.replace(/_/g, ' ')}'`).join(", ");
        conditions.push(`platform IN (${platformsList})`);
      }

      const whereClause = conditions.join(" AND ");

      const query = `
      SELECT 
        event_date, 
        sotType as event_type,
        platform,
        COUNT(*) as count
      FROM ${TABLE_FULL_NAME} 
      WHERE ${whereClause}
      GROUP BY event_date, sotType, platform
      ORDER BY event_date DESC, count DESC
    `;

      console.log("Executing event analysis query for range:", startDate, "to", endDate);
      const rows = await executeQuery(session, query, true);

      console.log(`Retrieved ${rows.length} event analysis records`);

      return rows.map(row => ({
        event_date: row.event_date,
        event_type: row.event_type,
        platform: row.platform || 'unknown',
        count: parseInt(row.count) || 0,
      }));
    },
    cacheKey,
    false
  );
}