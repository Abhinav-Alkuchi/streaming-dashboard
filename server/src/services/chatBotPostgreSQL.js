import { Pool } from 'pg';
import dotenv from 'dotenv';

import { 
  eventProcessors, 
  normaliseEventType,
  extractBrand,
  generateStatsCache,
  generateChartsCache,
  scrambleEmail
} from '../utils/chatBotUtils.js';

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

// PostgreSQL connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// In-memory cache
export let statsCache = null;
export let chartsCache = null;

// Event Schema Registry for dynamic event handling
export const eventSchemaRegistry = {
  purchase: {
    requiredFields: ['price', 'brands', 'products'],
    optionalFields: ['discount', 'paymentMethod'],
    searchWeight: 1.2,
    embeddingTemplate: (record) => 
      `Purchase: ${record.brands?.join(', ')} products ${record.products?.join(', ')} for $${record.price}`,
    queryKeywords: ['buy', 'purchase', 'bought', 'order', 'ordered', 'product', 'price', 'expensive', 'cheap']
  },
  pageview: {
    requiredFields: ['url', 'category'],
    optionalFields: ['subCategory', 'duration'],
    searchWeight: 0.8,
    embeddingTemplate: (record) => 
      `Page view: ${record.category} ${record.subCategory || ''} at ${record.url}`,
    queryKeywords: ['view', 'page', 'visit', 'browse', 'looked at', 'seen']
  },
  search: {
    requiredFields: ['searchTerm'],
    optionalFields: ['resultsCount', 'filters'],
    searchWeight: 1.0,
    embeddingTemplate: (record) => 
      `Search query: ${record.searchTerm} with ${record.resultsCount || 0} results`,
    queryKeywords: ['search', 'searched', 'query', 'look for', 'find', 'looking for', 'seeking']
  }
};

// Enhanced extractTopKFromQuery function
export function extractTopKFromQuery(query) {
  const queryLower = query.toLowerCase();
  
  // Match patterns like "top 5", "top 10 products", "5 most", etc.
  const topKPatterns = [
    /top\s+(\d+)/,                           // "top 5"
    /(\d+)\s+most/,                          // "5 most"
    /(\d+)\s+top/,                           // "5 top"
    /first\s+(\d+)/,                         // "first 5"
    /show\s+me\s+(\d+)/,                     // "show me 5"
    /get\s+me\s+(\d+)/,                      // "get me 5"
    /find\s+(\d+)/,                          // "find 5"
    /(\d+)\s+(?:results?|records?|items?)/   // "5 results"
  ];
  
  for (const pattern of topKPatterns) {
    const match = queryLower.match(pattern);
    if (match && match[1]) {
      const k = parseInt(match[1]);
      if (!isNaN(k) && k > 0) {
        console.log(`Extracted top K: ${k} from query: "${query}"`);
        return k;
      }
    }
  }
  
  // Default fallback for "top" without number
  if (queryLower.includes('top') && !queryLower.match(/\d+/)) {
    console.log(`Query contains 'top' but no number found, using default`);
    return 5; // Default for "top" without specific number
  }
  
  return null;
}

// Query Preprocessor for intent detection and entity extraction
class QueryPreprocessor {
  constructor() {
    this.intentPatterns = {
      aggregation: /how many|count|total|number of|sum|aggregate/i,
      ranking: /top|best|worst|highest|lowest|most|least|popular/i,
      temporal: /today|yesterday|last week|this month|between|before|after|recent/i,
      comparison: /compare|versus|vs|difference between/i,
      specific: /show me|find|get|what|who|when|list|display/i
    };
    
    // Add catalog-specific patterns
    this.catalogPatterns = {
      topRated: /\b(top|best|highest|most)\s+(rated|popular|reviewed)\b/i,
      available: /\b(available|in stock|stock|buy now)\b/i,
      categoryFilter: /\b(category|under|in)\s+([a-zA-Z\s]+?)(?:\s|$)/i,
      priceRange: /\b(under|below|less than|above|over|more than)\s+\$?(\d+)/i,
      products: /\b(products?|items?|goods?)\b/i
    };
    
    this.synonyms = {
      'bought': ['purchased', 'acquired', 'ordered'],
      'expensive': ['costly', 'pricey', 'high-priced'],
      'cheap': ['inexpensive', 'affordable', 'budget'],
      'viewed': ['looked at', 'browsed', 'visited'],
      'searched': ['looked for', 'queried', 'sought', 'searched for'],
      'categories': ['types', 'groups', 'classes', 'kinds'],
      // Catalog synonyms
      'makeup': ['cosmetics', 'beauty', 'make-up'],
      'skincare': ['skin care', 'facial', 'beauty'],
      'fragrance': ['perfume', 'cologne', 'scent'],
      'haircare': ['hair care', 'hair products'],
      'available': ['in stock', 'ready to ship', 'available now']
    };

    // Event type detection patterns
    this.eventTypePatterns = {
      purchase: /\b(buy|purchas|bought|order|ordered|product|price|expensive|cheap)\b/i,
      search: /\b(search|searched|query|look for|finding|seeking|looked for)\b/i,
      pageview: /\b(view|page|visit|browse|look at|seen)\b/i
    };
  }
  
  detectIntent(query) {
    const intents = [];
    for (const [intent, pattern] of Object.entries(this.intentPatterns)) {
      if (pattern.test(query)) intents.push(intent);
    }
    return intents.length > 0 ? intents : ['semantic'];
  }

  // Add catalog intent detection
  detectCatalogIntent(query) {
    const intents = [];
    const queryLower = query.toLowerCase();
    
    if (this.catalogPatterns.topRated.test(queryLower)) {
      intents.push('top-rated');
    }
    if (this.catalogPatterns.available.test(queryLower)) {
      intents.push('availability');
    }
    if (queryLower.includes('category') || queryLower.includes('under')) {
      intents.push('category-filter');
    }
    if (this.catalogPatterns.products.test(queryLower)) {
      intents.push('product-catalog');
    }
    
    return intents;
  }

  detectEventTypeFromQuery(query) {
    const queryLower = query.toLowerCase();
    const eventTypes = [];
    
    for (const [eventType, pattern] of Object.entries(this.eventTypePatterns)) {
      if (pattern.test(queryLower)) {
        eventTypes.push(eventType);
      }
    }

    // If no specific event type detected, use semantic inference
    if (eventTypes.length === 0) {
      console.log('No event type detected from keywords, will use semantic inference');
    } else {
      console.log(`Detected event types from query: ${eventTypes.join(', ')}`);
    }
    
    return eventTypes;
  }
  
  expandQuery(query) {
    let expanded = query;
    for (const [word, synonyms] of Object.entries(this.synonyms)) {
      if (query.toLowerCase().includes(word)) {
        expanded += ' ' + synonyms.join(' ');
      }
    }
    return expanded;
  }
  
  extractDates(query) {
    const datePatterns = [
      /(\d{4}-\d{2}-\d{2})/g,
      /(today|yesterday)/gi,
      /(last week|this month|last month)/gi
    ];
    
    const dates = [];
    for (const pattern of datePatterns) {
      const matches = query.match(pattern);
      if (matches) dates.push(...matches);
    }
    return dates;
  }

  formatTheDate(dateStr) {
    return (dateStr) ? new Date(dateStr).toISOString().split('T')[0] : 'N/A';
  }
  
  extractEmails(query) {
    return query.match(/[\w.-]+@[\w.-]+\.[\w]+/g) || [];
  }
  
  extractPrices(query) {
    return query.match(/\$\d+(?:\.\d{2})?|\d+\s*(?:dollars|usd)/gi) || [];
  }
  
  extractBrands(query) {
    const brandMatch = extractBrand(query);
    return brandMatch ? [brandMatch] : [];
  }

  extractSearchTerms(query) {
    const searchPatterns = [
      /search(?:ed|ing)?\s+(?:for\s+)?["']([^"']+)["']/i,
      /search(?:ed|ing)?\s+(?:for\s+)?(\w+)/i,
      /query\s+["']([^"']+)["']/i,
      /look(?:ing)?\s+for\s+["']([^"']+)["']/i
    ];
    
    const terms = [];
    for (const pattern of searchPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        terms.push(match[1]);
      }
    }
    return terms;
  }

  // Extract category from query
 extractCategory(query) {
  const categoryPatterns = [
    /\b(category|under|in)\s+([a-zA-Z\s]+?)(?:\s|$)/i,
    /\b(makeup|cosmetics|skincare|fragrance|haircare)\b/i,
    /\b(products?\s+in\s+)([a-zA-Z\s]+)/i
  ];
  
  for (const pattern of categoryPatterns) {
    const match = query.match(pattern);
    if (match) {
      let rawCategory = match[2] || match[1];
      if (rawCategory) {
        rawCategory = rawCategory.trim().toLowerCase();
        
        // Map common category variations
        const categoryMap = {
          'makeup': 'makeup',
          'cosmetics': 'makeup',
          'beauty': 'makeup',
          'make-up': 'makeup',
          'skincare': 'skincare',
          'skin care': 'skincare',
          'facial': 'skincare',
          'fragrance': 'fragrance',
          'perfume': 'fragrance',
          'cologne': 'fragrance',
          'scent': 'fragrance',
          'haircare': 'haircare',
          'hair care': 'haircare',
          'hair products': 'haircare'
        };
        
        return categoryMap[rawCategory] || rawCategory;
      }
    }
  }
  return null;
}
  // Extract rating threshold
  extractRatingThreshold(query) {
    const ratingMatch = query.match(/\b(rated|rating)\s+(\d+(?:\.\d+)?)\+?/i);
    return ratingMatch ? parseFloat(ratingMatch[2]) : null;
  }

  // Extract price range
  extractPriceRange(query) {
    const priceMatch = query.match(/\b(under|below|less than|above|over|more than)\s+\$?(\d+)/i);
    if (priceMatch) {
      return {
        operator: priceMatch[1].toLowerCase(),
        value: parseFloat(priceMatch[2])
      };
    }
    return null;
  }

  // Enhanced entities extraction for catalog queries
  extractCatalogEntities(query) {
    return {
      category: this.extractCategory(query),
      ratingThreshold: this.extractRatingThreshold(query),
      priceRange: this.extractPriceRange(query),
      availability: this.catalogPatterns.available.test(query.toLowerCase()),
      topRated: this.catalogPatterns.topRated.test(query.toLowerCase())
    };
  }
  
  extractEventTypes(query) {
    // Use both keyword detection and semantic inference
    const keywordEventTypes = this.detectEventTypeFromQuery(query);
    return keywordEventTypes;
  }
  
  extractEntities(query) {
    return {
      dates: this.extractDates(query),
      emails: this.extractEmails(query),
      prices: this.extractPrices(query),
      brands: this.extractBrands(query),
      eventTypes: this.extractEventTypes(query),
      searchTerms: this.extractSearchTerms(query),
      catalog: this.extractCatalogEntities(query)
    };
  }
}

// Query Analytics for performance monitoring
class QueryAnalytics {
  async logQuery(query, results, latency, method) {
    try {
      await pool.query(`
        INSERT INTO query_logs (query, result_count, latency_ms, method, timestamp)
        VALUES ($1, $2, $3, $4, NOW())
      `, [query.substring(0, 500), results.length, latency, method]);
    } catch (err) {
      console.warn('Failed to log query analytics:', err.message);
    }
  }
  
  async getTopQueries(days = 7) {
    try {
      const result = await pool.query(`
        SELECT query, COUNT(*) as frequency, AVG(latency_ms) as avg_latency
        FROM query_logs
        WHERE timestamp > NOW() - INTERVAL '${days} days'
        GROUP BY query
        ORDER BY frequency DESC
        LIMIT 20
      `);
      return result.rows;
    } catch (err) {
      console.warn('Failed to get query analytics:', err.message);
      return [];
    }
  }
}

export const queryAnalytics = new QueryAnalytics();

// Initialize database connection and vector extension
export async function initDB() {
  try {
    await pool.query('SELECT 1');
    
    // Enable pgvector extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    
    // Create main table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS purchase_embeddings (
        id SERIAL PRIMARY KEY,
        vector VECTOR(768),
        metadata JSONB,
        event_date DATE,
        event_type VARCHAR(50),
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create query logs table for analytics
    await pool.query(`
      CREATE TABLE IF NOT EXISTS query_logs (
        id SERIAL PRIMARY KEY,
        query TEXT,
        result_count INTEGER,
        latency_ms INTEGER,
        method VARCHAR(50),
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Create optimized indexes
    await createOptimizedIndexes();
    
    console.log('PostgreSQL connected and initialized successfully');
  } catch (err) {
    console.error('Database connection error:', err);
    process.exit(1);
  }
}

async function createOptimizedIndexes() {
  const indexQueries = [
    // Vector similarity index
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_embeddings_vector 
     ON purchase_embeddings USING ivfflat (vector vector_cosine_ops)`,
    
    // Composite index for common filters
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_embeddings_composite 
     ON purchase_embeddings(event_type, event_date DESC)`,
    
    // Partial indexes for performance
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recent_purchases 
     ON purchase_embeddings(event_date DESC) 
     WHERE event_type = 'purchase'`,
    
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recent_searches 
     ON purchase_embeddings(event_date DESC) 
     WHERE event_type = 'search'`,
    
    // GIN indexes for JSONB queries
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metadata_brands 
     ON purchase_embeddings USING gin((metadata->'brands'))`,
    
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metadata_search 
     ON purchase_embeddings USING gin((metadata->'searchTerm'))`,
    
    // Expression index for price queries
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metadata_price 
     ON purchase_embeddings(((metadata->>'price')::numeric)) 
     WHERE metadata->>'price' IS NOT NULL`,
    
    // Catalog-specific indexes
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metadata_category 
     ON purchase_embeddings((metadata->>'category')) 
     WHERE metadata->>'category' IS NOT NULL`,
    
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metadata_rating 
     ON purchase_embeddings(((metadata->>'productRating')::numeric)) 
     WHERE metadata->>'productRating' IS NOT NULL`
  ];

  for (const query of indexQueries) {
    try {
      await pool.query(query);
      console.log(`Created index: ${query.split('IF NOT EXISTS')[1]?.split(' ON')[0]}`);
    } catch (err) {
      console.warn(`Index creation warning: ${err.message}`);
    }
  }
}

// Auto-discover event types from data
export function autoDiscoverEventTypes(records) {
  const discovered = {};
  
  records.forEach(record => {
    const type = normaliseEventType(record.sotType);
    if (!discovered[type]) {
      discovered[type] = {
        count: 0,
        sampleFields: new Set(),
        examples: []
      };
    }
    
    discovered[type].count++;
    Object.keys(record).forEach(k => discovered[type].sampleFields.add(k));
    
    if (discovered[type].examples.length < 3) {
      discovered[type].examples.push(record);
    }
  });
  
  return discovered;
}

// Helper function to format array as PostgreSQL vector string
function formatVector(array) {
  if (!Array.isArray(array)) {
    throw new Error('Input must be an array');
  }
  return `[${array.join(',')}]`;
}

export async function getEmbedding(text) {
  const OLLAMA_URL = process.env.OLLAMA_URL;
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL;

  try {
    console.log(
      "Generating embedding using Ollama...",
      text.substring(0, 50) + "..."
    );

    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Generated embedding with length:', data.embedding?.length || 0);
    return data.embedding;
  } catch (err) {
    console.error("Ollama Embedding error:", err);
    throw new Error(
      `Failed to generate embedding with ${OLLAMA_MODEL}. Is Ollama running?`
    );
  }
}

// Optimized batch processing with parallel embedding generation
export async function processAndUpsert(results) {
  const BATCH_SIZE = 100;
  const PARALLEL_REQUESTS = 5;
  
  const statsData = {
    totalRecords: 0,
    byEventType: {},
    uniqueDates: new Set(),
    uniqueEmails: new Set(),
    uniqueBrands: new Set(),
    priceList: [],
    searchTerms: {},
    pageViewCategories: {},
  };

  // DEBUG: Check what event types we have
  const uniqueEventTypes = [...new Set(results.map(r => r.event_type))];
  console.log('DEBUG: Unique event types in data:', uniqueEventTypes);

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Split into batches
    const batches = [];
    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      batches.push(results.slice(i, i + BATCH_SIZE));
    }

    let totalProcessed = 0;

    for (const batch of batches) {
      // Process chunks in parallel
      const chunks = [];
      for (let i = 0; i < batch.length; i += PARALLEL_REQUESTS) {
        chunks.push(batch.slice(i, i + PARALLEL_REQUESTS));
      }

      for (const chunk of chunks) {
        const embeddingPromises = chunk.map(async (record) => {
          // FIX: Use event_type instead of sotType
          const eventTypeFromData = record.event_type?.toLowerCase() || "unknown";
          const eventType = normaliseEventType(eventTypeFromData);

          console.log(`DEBUG: Processing record - Raw event_type: "${eventTypeFromData}", Normalized: "${eventType}"`);

          const processor = eventProcessors[eventType];
          if (!processor) {
            console.warn(`Unknown event type: ${eventType} for record:`, record);
            return null;
          }

          const { searchableText, metadata } = processor(record);
          
          try {
            const embedding = await getEmbedding(searchableText);
            
            if (!embedding || !Array.isArray(embedding)) {
              console.warn('Invalid embedding generated, skipping record');
              return null;
            }

            return {
              embedding,
              metadata,
              eventDate: record.event_date,
              eventType,
              email: metadata.email || '' // Add default email
            };
          } catch (embeddingError) {
            console.error('Embedding generation error:', embeddingError);
            return null;
          }
        });

        const processedChunk = await Promise.all(embeddingPromises);
        const validRecords = processedChunk.filter(r => r !== null);

        if (validRecords.length > 0) {
          // Bulk insert
          const values = validRecords.map((_, idx) => {
            const base = idx * 5;
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
          }).join(',');

          const params = validRecords.flatMap(r => [
            formatVector(r.embedding),
            r.metadata,
            r.eventDate,
            r.eventType,
            r.email
          ]);

          const query = `
            INSERT INTO purchase_embeddings 
            (vector, metadata, event_date, event_type, email)
            VALUES ${values}
          `;
          
          await client.query(query, params);
          totalProcessed += validRecords.length;

          // Update stats
          validRecords.forEach(r => {
            statsData.totalRecords++;
            statsData.byEventType[r.eventType] = (statsData.byEventType[r.eventType] || 0) + 1;
            statsData.uniqueDates.add(r.eventDate);
            if (r.email && r.email !== 'unknown@example.com') statsData.uniqueEmails.add(r.email);

            if (r.eventType === "purchase") {
              if (r.metadata.brands) {
                r.metadata.brands.forEach((b) => statsData.uniqueBrands.add(b));
              }
              if (r.metadata.price) {
                statsData.priceList.push(r.metadata.price);
              }
            } else if (r.eventType === "search" && r.metadata.searchTerm) {
              statsData.searchTerms[r.metadata.searchTerm] = (statsData.searchTerms[r.metadata.searchTerm] || 0) + 1;
            } else if (r.eventType === "pageview" && r.metadata.subCategory) {
              statsData.pageViewCategories[r.metadata.subCategory] = (statsData.pageViewCategories[r.metadata.subCategory] || 0) + 1;
            }
          });
        }

        console.log(`Processed ${totalProcessed} records...`);
      }
    }

    await client.query('COMMIT');
    console.log(`Successfully upserted ${totalProcessed} vectors to PostgreSQL`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error upserting to PostgreSQL:', err);
    throw err;
  } finally {
    client.release();
  }

  // Compute final stats
  statsCache = generateStatsCache(results, statsData);
  chartsCache = generateChartsCache(results, statsData);
}

// Catalog-specific search function
async function catalogSearch(query, entities, catalogIntents, topK) {
  const preprocessor = new QueryPreprocessor();
  const catalogEntities = preprocessor.extractCatalogEntities(query);
  
  console.log('Catalog search detected with intents:', catalogIntents);
  console.log('Catalog entities:', catalogEntities);

  const whereConditions = ["event_type = 'pageview'"];
  const params = [topK];
  let paramCount = 2;

  // Apply category filter - FIXED SYNTAX
  if (catalogEntities.category) {
    whereConditions.push(`(
      metadata->>'category' ILIKE $${paramCount} OR 
      metadata->'catalogData'->>'category' ILIKE $${paramCount} OR
      metadata->>'productCategory' ILIKE $${paramCount} OR
      metadata->>'subCategory' ILIKE $${paramCount}
    )`);
    params.push(`%${catalogEntities.category}%`);
    paramCount++;
  }

  // Apply availability filter
  if (catalogEntities.availability) {
    whereConditions.push(`(
      metadata->>'productAvailability' ILIKE '%in stock%' OR 
      metadata->'catalogData'->>'availability' ILIKE '%in stock%' OR
      metadata->>'productAvailability' ILIKE '%available%' OR
      metadata->'catalogData'->>'availability' ILIKE '%available%'
    )`);
  }

  // Apply rating threshold filter
  if (catalogEntities.ratingThreshold) {
    whereConditions.push(`(
      (metadata->>'productRating' ~ '^[0-9.]+$' AND (metadata->>'productRating')::numeric >= $${paramCount}) OR
      (metadata->'catalogData'->>'rating' ~ '^[0-9.]+$' AND (metadata->'catalogData'->>'rating')::numeric >= $${paramCount}) OR
      (metadata->>'product_rating' ~ '^[0-9.]+$' AND (metadata->>'product_rating')::numeric >= $${paramCount})
    )`);
    params.push(catalogEntities.ratingThreshold);
    paramCount++;
  }

  // Apply price range filter
  if (catalogEntities.priceRange) {
    const { operator, value } = catalogEntities.priceRange;
    const priceCondition = operator.includes('under') || operator.includes('below') || operator.includes('less than') 
      ? `<= $${paramCount}` 
      : `>= $${paramCount}`;
    
    whereConditions.push(`(
      (metadata->>'productPrice' ~ '^[0-9.]+$' AND (metadata->>'productPrice')::numeric ${priceCondition}) OR
      (metadata->'catalogData'->>'price' ~ '^[0-9.]+$' AND (metadata->'catalogData'->>'price')::numeric ${priceCondition}) OR
      (metadata->>'product_price' ~ '^[0-9.]+$' AND (metadata->>'product_price')::numeric ${priceCondition})
    )`);
    params.push(value);
    paramCount++;
  }

  // Build the base query
  let orderClause = "ORDER BY ";
  
  if (catalogIntents.includes('top-rated')) {
    // Order by rating (handle both numeric and string ratings)
    orderClause += `COALESCE(
      CASE WHEN metadata->>'productRating' ~ '^[0-9.]+$' THEN (metadata->>'productRating')::numeric ELSE NULL END,
      CASE WHEN metadata->'catalogData'->>'rating' ~ '^[0-9.]+$' THEN (metadata->'catalogData'->>'rating')::numeric ELSE NULL END,
      CASE WHEN metadata->>'product_rating' ~ '^[0-9.]+$' THEN (metadata->>'product_rating')::numeric ELSE NULL END,
      0
    ) DESC NULLS LAST, `;
  }
  
  // Secondary ordering by popularity (review count)
  orderClause += `COALESCE(
    CASE WHEN metadata->>'productReviews' ~ '^[0-9]+$' THEN (metadata->>'productReviews')::integer ELSE NULL END,
    CASE WHEN metadata->'catalogData'->>'reviews' ~ '^[0-9]+$' THEN (metadata->'catalogData'->>'reviews')::integer ELSE NULL END,
    CASE WHEN metadata->>'product_reviews' ~ '^[0-9]+$' THEN (metadata->>'product_reviews')::integer ELSE NULL END,
    0
  ) DESC NULLS LAST`;

  // Generate embedding for semantic relevance
  let queryEmbedding;
  try {
    queryEmbedding = await getEmbedding(query);
    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      throw new Error('Invalid query embedding generated');
    }
  } catch (err) {
    console.error('Error generating query embedding for catalog search:', err);
    // Fallback: use a simple search without embedding
    queryEmbedding = new Array(768).fill(0);
  }

  const catalogQuery = `
    SELECT *,
           vector <=> $1::vector as similarity
    FROM purchase_embeddings
    WHERE ${whereConditions.join(' AND ')}
    ${orderClause}
    LIMIT $${paramCount}
  `;

  console.log('Catalog search query:', catalogQuery);
  console.log('Catalog query parameters:', [query.substring(0, 50) + '...', ...params]);

  try {
    const result = await pool.query(catalogQuery, [formatVector(queryEmbedding), ...params]);
    console.log(`Found ${result.rows.length} catalog results`);

    // Re-rank with catalog-specific boosting
    const rerankedResults = reRankCatalogResults(result.rows, query, catalogIntents, topK);

    return {
      results: { 
        matches: rerankedResults.map(row => rowToCatalogMatch(row, rerankedResults)) 
      },
      method: "catalog-search",
      filters: whereConditions,
      requestedTopK: topK,
      catalogIntents: catalogIntents
    };
  } catch (error) {
    console.error('Catalog search error:', error);
    
    // Fallback: try a simpler query without complex filters
    return await fallbackCatalogSearch(query, catalogEntities, topK);
  }
}

// Fallback catalog search for when the main query fails
async function fallbackCatalogSearch(query, catalogEntities, topK) {
  console.log('Attempting fallback catalog search...');
  
  const whereConditions = ["event_type = 'pageview'"];
  const params = [topK];

  // Simple category filter
  if (catalogEntities.category) {
    whereConditions.push(`metadata->>'category' ILIKE $2`);
    params.push(`%${catalogEntities.category}%`);
  }

  const fallbackQuery = `
    SELECT *,
           vector <=> $1::vector as similarity
    FROM purchase_embeddings
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY similarity
    LIMIT $${params.length}
  `;

  try {
    const queryEmbedding = await getEmbedding(query);
    const result = await pool.query(fallbackQuery, [formatVector(queryEmbedding), ...params.slice(1)]);
    
    console.log(`Fallback search found ${result.rows.length} results`);
    
    const matches = result.rows.map(row => rowToCatalogMatch(row, result.rows));
    
    return {
      results: { matches },
      method: "catalog-fallback",
      filters: whereConditions,
      requestedTopK: topK,
      catalogIntents: ['fallback']
    };
  } catch (error) {
    console.error('Fallback catalog search also failed:', error);
    throw error;
  }
}

// Specialized re-ranking for catalog results
function reRankCatalogResults(rows, query, catalogIntents, topK) {
  const queryLower = query.toLowerCase();
  
  return rows
    .map(row => {
      let score = 1 - parseFloat(row.similarity || 0);
      const metadata = row.metadata || {};
      const catalogData = metadata.catalogData || {};
      
      // Boost for catalog-specific attributes
      if (catalogIntents.includes('top-rated')) {
        const rating = parseFloat(metadata.productRating || catalogData.rating || 0);
        score += (rating / 5) * 0.4; // Boost by rating (max 40%)
      }
      
      if (catalogIntents.includes('availability')) {
        const availability = metadata.productAvailability || catalogData.availability;
        if (availability && availability.toLowerCase().includes('in stock')) {
          score += 0.3; // Boost for in-stock items
        }
      }
      
      // Boost for exact category matches
      const queryCategory = new QueryPreprocessor().extractCategory(query);
      const itemCategory = metadata.category || catalogData.category;
      if (queryCategory && itemCategory && itemCategory.toLowerCase().includes(queryCategory)) {
        score += 0.2;
      }
      
      // Boost for high review counts
      const reviews = parseInt(metadata.productReviews || catalogData.reviews || 0);
      score += Math.min(0.2, reviews / 1000); // Boost based on review count
      
      // Boost for products with descriptions
      if (metadata.productDescription || catalogData.description) {
        score += 0.1;
      }
      
      return { ...row, rerankedScore: Math.min(1.0, score) };
    })
    .sort((a, b) => b.rerankedScore - a.rerankedScore)
    .slice(0, topK);
}

// Specialized match formatter for catalog results
function rowToCatalogMatch(row, allRows) {
  const baseMatch = rowToMatch(row, allRows);
  const metadata = row.metadata || {};
  const catalogData = metadata.catalogData || {};
  
  // Enhance metadata with catalog-specific information
  baseMatch.metadata = {
    ...baseMatch.metadata,
    // Catalog-specific fields
    productName: metadata.productName || catalogData.name,
    productCategory: metadata.category || catalogData.category,
    productPrice: metadata.productPrice || catalogData.price,
    productAvailability: metadata.productAvailability || catalogData.availability,
    productRating: metadata.productRating || catalogData.rating,
    productReviews: metadata.productReviews || catalogData.reviews,
    productBrand: metadata.productBrand || catalogData.brand,
    productId: metadata.productId || catalogData.id,
    productUrl: metadata.url || catalogData.url,
    productDescription: metadata.productDescription || catalogData.description,
    productSku: metadata.productSku || catalogData.sku,
    isCatalogResult: true
  };
  
  return baseMatch;
}

// Main query processing function with proper top K handling
export async function processQuery(query, defaultTopK = 10) {
  const startTime = Date.now();
  
  try {
    const preprocessor = new QueryPreprocessor();
    
    // Detect intent and extract entities
    const intents = preprocessor.detectIntent(query);
    const entities = preprocessor.extractEntities(query);
    
    // Extract requested top K from query
    const requestedTopK = extractTopKFromQuery(query);
    const finalTopK = requestedTopK || defaultTopK;
    
    console.log(`Query: "${query}" | Requested TopK: ${requestedTopK} | Final TopK: ${finalTopK}`);
    console.log(`Query intents: ${intents.join(', ')}, entities:`, entities);
    
    // Use hybrid search for better results
    const result = await hybridSearch(query, intents, entities, finalTopK);
    
    // Log query performance
    const latency = Date.now() - startTime;
    await queryAnalytics.logQuery(query, result.results.matches, latency, result.method);
    
    return result;
  } catch (err) {
    const latency = Date.now() - startTime;
    await queryAnalytics.logQuery(query, [], latency, 'error');
    throw err;
  }
}

// Hybrid search implementation
async function hybridSearch(query, intents, entities, topK) {
  const preprocessor = new QueryPreprocessor();
  const expandedQuery = preprocessor.expandQuery(query);
  
  // Check for catalog-specific intents
  const catalogIntents = preprocessor.detectCatalogIntent(query);
  const hasCatalogIntent = catalogIntents.length > 0;
  const hasProductKeywords = query.toLowerCase().includes('product') || 
                           query.toLowerCase().includes('item') ||
                           query.toLowerCase().includes('catalog') ||
                           query.toLowerCase().includes('makeup') ||
                           query.toLowerCase().includes('cosmetic') ||
                           query.toLowerCase().includes('skincare') ||
                           query.toLowerCase().includes('fragrance') ||
                           query.toLowerCase().includes('haircare') ||
                           query.toLowerCase().includes('beauty');

  console.log('=== HYBRID SEARCH DEBUG ===');
  console.log('Query:', query);
  console.log('Intents:', intents);
  console.log('Catalog Intents:', catalogIntents);
  console.log('Has Catalog Intent:', hasCatalogIntent);
  console.log('Has Product Keywords:', hasProductKeywords);
  console.log('Entities:', entities);
  console.log('TopK:', topK);
  console.log('===========================');

  // Handle catalog-specific queries
  if (hasCatalogIntent || hasProductKeywords) {
    console.log('🔍 Detected catalog query, using catalog search');
    
    // Ensure we're looking at pageview events for catalog queries
    if (!entities.eventTypes.includes('pageview')) {
      entities.eventTypes.push('pageview');
      console.log('Added pageview to event types for catalog search');
    }
    
    try {
      return await catalogSearch(query, entities, catalogIntents, topK);
    } catch (catalogError) {
      console.error('Catalog search failed, falling back to semantic search:', catalogError);
      // Fall through to semantic search
    }
  }

  let queryEmbedding;
  try {
    queryEmbedding = await getEmbedding(expandedQuery);
    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      throw new Error('Invalid query embedding generated');
    }
    console.log('Generated query embedding with length:', queryEmbedding.length);
  } catch (err) {
    console.error('Error generating query embedding:', err);
    throw new Error('Failed to process query: ' + err.message);
  }

  // Handle specific intents with specialized queries
  if (intents.includes('ranking') && !hasCatalogIntent) {
    console.log('🎯 Using ranking query for intent:', intents);
    return await rankingQuery(query, entities, topK);
  }
  
  if (intents.includes('aggregation')) {
    console.log('📊 Using aggregation query for intent:', intents);
    return await aggregationQuery(query, entities, topK);
  }

  // For search-related queries, force search event type
  const isSearchQuery = entities.eventTypes.includes('search') || 
                       query.toLowerCase().includes('search') ||
                       query.toLowerCase().includes('query') ||
                       query.toLowerCase().includes('look for');

  if (isSearchQuery) {
    console.log('🔎 Query is search-related, forcing search event type filter');
    if (!entities.eventTypes.includes('search')) {
      entities.eventTypes.push('search');
    }
  }

  // For purchase-related queries, force purchase event type
  const isPurchaseQuery = entities.eventTypes.includes('purchase') || 
                         query.toLowerCase().includes('purchase') ||
                         query.toLowerCase().includes('buy') ||
                         query.toLowerCase().includes('bought') ||
                         query.toLowerCase().includes('order');

  if (isPurchaseQuery && !entities.eventTypes.includes('purchase')) {
    console.log('🛒 Query is purchase-related, forcing purchase event type filter');
    entities.eventTypes.push('purchase');
  }

  // For general queries, use semantic search with entity filtering
  console.log('🤖 Using semantic search with entity filtering');
  const semanticResults = await semanticSearch(queryEmbedding, entities, topK * 2);
  console.log(`Semantic search returned ${semanticResults.rows.length} results before re-ranking`);
  
  // Re-rank results and take exactly topK
  const rerankedResults = reRankResults(semanticResults.rows, query, topK);
  console.log(`After re-ranking: ${rerankedResults.length} results`);
  
  return {
    results: { 
      matches: rerankedResults.map(row => rowToMatch(row, rerankedResults)).slice(0, topK) 
    },
    method: "hybrid-search",
    filters: Object.keys(entities).filter(k => entities[k] && entities[k].length > 0),
    requestedTopK: topK,
    catalogIntents: hasCatalogIntent ? catalogIntents : []
  };
}

async function semanticSearch(queryEmbedding, entities, limit) {
  const whereConditions = [];
  const params = [formatVector(queryEmbedding), limit];
  let paramCount = 3;

  console.log('=== SEMANTIC SEARCH DEBUG ===');
  console.log('Entities for filtering:', entities);

  // Event type filter - CRITICAL: Force event type when specified
  if (entities.eventTypes && entities.eventTypes.length > 0) {
    whereConditions.push(`event_type = ANY($${paramCount})`);
    params.push(entities.eventTypes);
    paramCount++;
    console.log(`Applying event type filter: ${entities.eventTypes.join(', ')}`);
  }

  // Date filter
  if (entities.dates && entities.dates.length > 0) {
    const exactDates = entities.dates.filter(d => /\d{4}-\d{2}-\d{2}/.test(d));
    if (exactDates.length > 0) {
      whereConditions.push(`event_date = ANY($${paramCount})`);
      params.push(exactDates);
      paramCount++;
      console.log(`Applying date filter: ${exactDates.join(', ')}`);
    }
  }

  // Email filter
  if (entities.emails && entities.emails.length > 0) {
    whereConditions.push(`email = ANY($${paramCount})`);
    params.push(entities.emails);
    paramCount++;
    console.log(`Applying email filter: ${entities.emails.join(', ')}`);
  }

  // Brand filter
  if (entities.brands && entities.brands.length > 0) {
    whereConditions.push(`metadata->'brands' ?| $${paramCount}`);
    params.push(entities.brands);
    paramCount++;
    console.log(`Applying brand filter: ${entities.brands.join(', ')}`);
  }

  // Search term filter
  if (entities.searchTerms && entities.searchTerms.length > 0) {
    whereConditions.push(`metadata->>'searchTerm' = ANY($${paramCount})`);
    params.push(entities.searchTerms);
    paramCount++;
    console.log(`Applying search term filter: ${entities.searchTerms.join(', ')}`);
  }

  // Catalog entities filter
  if (entities.catalog) {
    const catalog = entities.catalog;
    
    // Category filter
    if (catalog.category) {
      whereConditions.push(`(
        metadata->>'category' ILIKE $${paramCount} OR 
        metadata->'catalogData'->>'category' ILIKE $${paramCount} OR
        metadata->>'productCategory' ILIKE $${paramCount} OR
        metadata->>'subCategory' ILIKE $${paramCount}
      )`);
      params.push(`%${catalog.category}%`);
      paramCount++;
      console.log(`Applying category filter: ${catalog.category}`);
    }
    
    // Rating threshold filter
    if (catalog.ratingThreshold) {
      whereConditions.push(`(
        (metadata->>'productRating' ~ '^[0-9.]+$' AND (metadata->>'productRating')::numeric >= $${paramCount}) OR
        (metadata->'catalogData'->>'rating' ~ '^[0-9.]+$' AND (metadata->'catalogData'->>'rating')::numeric >= $${paramCount})
      )`);
      params.push(catalog.ratingThreshold);
      paramCount++;
      console.log(`Applying rating threshold: ${catalog.ratingThreshold}`);
    }
    
    // Availability filter
    if (catalog.availability) {
      whereConditions.push(`(
        metadata->>'productAvailability' ILIKE '%in stock%' OR 
        metadata->'catalogData'->>'availability' ILIKE '%in stock%' OR
        metadata->>'productAvailability' ILIKE '%available%'
      )`);
      console.log('Applying availability filter');
    }
  }

  const whereClause = whereConditions.length > 0 ? 
    `WHERE ${whereConditions.join(' AND ')}` : '';

  const searchQuery = `
    SELECT *, 
           vector <=> $1::vector as similarity
    FROM purchase_embeddings
    ${whereClause}
    ORDER BY similarity
    LIMIT $2
  `;

  console.log('Final semantic search query:', searchQuery);
  console.log('Query parameters:', params.map((p, i) => 
    i === 0 ? '[EMBEDDING_VECTOR]' : (Array.isArray(p) ? p.join(',') : p)
  ));

  try {
    const result = await pool.query(searchQuery, params);
    console.log(`Semantic search executed successfully, found ${result.rows.length} results`);
    return result;
  } catch (error) {
    console.error('Semantic search query failed:', error);
    
    // Fallback: try without filters if the query fails
    console.log('Attempting fallback search without filters...');
    const fallbackQuery = `
      SELECT *, 
             vector <=> $1::vector as similarity
      FROM purchase_embeddings
      ORDER BY similarity
      LIMIT $2
    `;
    
    const fallbackResult = await pool.query(fallbackQuery, [formatVector(queryEmbedding), limit]);
    console.log(`Fallback search found ${fallbackResult.rows.length} results`);
    
    return fallbackResult;
  }
}

async function rankingQuery(query, entities, topK) {
  const queryLower = query.toLowerCase();
  const preprocessor = new QueryPreprocessor();
  
  console.log('🎯 Running ranking query for:', query);
  
  // Check if this is a search-related ranking query
  const isSearchRelated = queryLower.includes('search') || entities.eventTypes.includes('search');
  const isMostExpensive = queryLower.includes("highest price") || 
                         queryLower.includes("most expensive") ||
                         queryLower.includes("most costly");
  const isCheapest = queryLower.includes("cheapest") || 
                    queryLower.includes("lowest price") ||
                    queryLower.includes("least expensive");

  // Handle search ranking (top searched categories/terms)
  if (isSearchRelated && !isMostExpensive && !isCheapest) {
    console.log('🔍 Handling search ranking query');
    return await searchRankingQuery(query, entities, topK);
  }

  // Handle price ranking
  if (isMostExpensive || isCheapest) {
    console.log(`💰 Handling price ranking query (${isMostExpensive ? 'most expensive' : 'cheapest'})`);
    
    const whereConditions = ["metadata->>'price' IS NOT NULL", "event_type = 'purchase'"];
    const params = [topK];

    // Add entity filters
    if (entities.brands && entities.brands.length > 0) {
      whereConditions.push(`metadata->'brands' ?| $${params.length + 1}`);
      params.push(entities.brands);
    }

    if (entities.emails && entities.emails.length > 0) {
      whereConditions.push(`email = ANY($${params.length + 1})`);
      params.push(entities.emails);
    }

    // Add category filter if present
    if (entities.catalog && entities.catalog.category) {
      whereConditions.push(`(
        metadata->>'category' ILIKE $${params.length + 1} OR 
        metadata->>'productCategory' ILIKE $${params.length + 1}
      )`);
      params.push(`%${entities.catalog.category}%`);
    }

    const priceQuery = `
      SELECT *, metadata->>'price' as price_value
      FROM purchase_embeddings
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY (metadata->>'price')::numeric ${isMostExpensive ? 'DESC' : 'ASC'}
      LIMIT $1
    `;

    console.log('Price ranking query:', priceQuery);
    console.log('Price ranking params:', params);

    const priceResult = await pool.query(priceQuery, params);
    console.log(`Price ranking found ${priceResult.rows.length} results`);
    
    // Ensure we only return the requested number of results
    const limitedResults = priceResult.rows.slice(0, topK);
    
    return {
      results: { 
        matches: limitedResults.map(row => rowToMatch(row, limitedResults)) 
      },
      method: isMostExpensive ? "price-desc" : "price-asc",
      filters: whereConditions,
      requestedTopK: topK
    };
  }

  // Default ranking: use semantic search with re-ranking
  console.log('🤖 Using default ranking with semantic search');
  const queryEmbedding = await getEmbedding(query);
  const semanticResults = await semanticSearch(queryEmbedding, entities, topK * 2);
  const rerankedResults = reRankResults(semanticResults.rows, query, topK);
  
  return {
    results: { 
      matches: rerankedResults.map(row => rowToMatch(row, rerankedResults)).slice(0, topK) 
    },
    method: "ranking-semantic",
    filters: Object.keys(entities).filter(k => entities[k] && entities[k].length > 0),
    requestedTopK: topK
  };
}

// Fixed search ranking query that handles multiple data formats
async function searchRankingQuery(query, entities, topK) {
  const queryLower = query.toLowerCase();
  
  console.log('Running search ranking query for:', query);
  
  // Determine what to rank for searches
  const rankSearchTerms = queryLower.includes('term') || queryLower.includes('query') || queryLower.includes('search');
  const rankCategories = queryLower.includes('categor');
  
  let rankedField = '';
  let rankedDisplayName = '';
  
  if (rankSearchTerms) {
    // Rank by most frequent search terms
    rankedField = "searchTerm";
    rankedDisplayName = "Search Term";
  } else if (rankCategories) {
    // Rank by most searched categories
    rankedField = "category";
    rankedDisplayName = "Category";
  } else {
    // Default: rank by most frequent search terms
    rankedField = "searchTerm";
    rankedDisplayName = "Search Term";
  }

  console.log(`Ranking by: ${rankedField}, Display: ${rankedDisplayName}`);

  // Try multiple possible field names in metadata
  const possibleFieldNames = {
    searchTerm: ['searchTerm', 'query', 'search', 'term', 'search_query', 'searchTerm'],
    category: ['category', 'categories', 'type', 'group', 'subCategory']
  };

  const fieldNames = possibleFieldNames[rankedField] || [rankedField];
  
  // Build CASE statement to handle multiple possible field names
  const caseStatements = fieldNames.map((field, index) => 
    `WHEN metadata->>'${field}' IS NOT NULL AND metadata->>'${field}' != '' THEN metadata->>'${field}'`
  ).join('\n      ');
  
  const caseStatement = `
    CASE
      ${caseStatements}
      ELSE NULL
    END
  `;

  const whereConditions = ["event_type = 'search'"];
  const params = [topK];

  // Add date filters if provided
  if (entities.dates.length > 0) {
    const exactDates = entities.dates.filter(d => /\d{4}-\d{2}-\d{2}/.test(d));
    if (exactDates.length > 0) {
      whereConditions.push(`event_date = ANY($${params.length + 1})`);
      params.push(exactDates);
    }
  }

  // Build the query
  const searchRankQuery = `
    SELECT 
      ${caseStatement} as ranked_value,
      COUNT(*) as frequency,
      COUNT(DISTINCT email) as unique_searchers
    FROM purchase_embeddings
    WHERE ${whereConditions.join(' AND ')}
      AND ${caseStatement} IS NOT NULL
    GROUP BY ranked_value
    HAVING COUNT(*) > 0
    ORDER BY frequency DESC
    LIMIT $1
  `;

  console.log('Search ranking query:', searchRankQuery);
  console.log('Query parameters:', params);
  
  try {
    const searchResult = await pool.query(searchRankQuery, params);
    console.log(`Found ${searchResult.rows.length} search ranking results`);
    
    if (searchResult.rows.length === 0) {
      // Fallback: try to get any search events to see what data exists
      const fallbackQuery = `
        SELECT metadata, event_date, email
        FROM purchase_embeddings
        WHERE event_type = 'search'
        LIMIT 10
      `;
      const fallbackResult = await pool.query(fallbackQuery);
      console.log('Fallback - sample search events metadata:', fallbackResult.rows.map(r => r.metadata));
      
      // If still no results, try a simpler query without the CASE statement
      const simpleQuery = `
        SELECT metadata->>'searchTerm' as ranked_value, COUNT(*) as frequency
        FROM purchase_embeddings
        WHERE event_type = 'search'
        GROUP BY metadata->>'searchTerm'
        HAVING metadata->>'searchTerm' IS NOT NULL AND metadata->>'searchTerm' != ''
        ORDER BY frequency DESC
        LIMIT $1
      `;
      const simpleResult = await pool.query(simpleQuery, [topK]);
      console.log('Simple query results:', simpleResult.rows);
      
      if (simpleResult.rows.length > 0) {
        // Use the simple query results
        const matches = simpleResult.rows.map((row, index) => ({
          id: `search-rank-${index}`,
          score: 1.0 - (index * 0.1),
          metadata: {
            eventType: 'search',
            rankedValue: row.ranked_value,
            frequency: row.frequency,
            ranking: true,
            rankedField: rankedField,
            displayName: rankedDisplayName
          }
        }));

        return {
          results: { matches },
          method: "search-ranking-simple",
          filters: whereConditions,
          requestedTopK: topK
        };
      }
    }

    // Convert to match format
    const matches = searchResult.rows.map((row, index) => ({
      id: `search-rank-${index}`,
      score: 1.0 - (index * 0.1), // Higher score for top results
      metadata: {
        eventType: 'search',
        rankedValue: row.ranked_value,
        frequency: row.frequency,
        uniqueSearchers: row.unique_searchers,
        ranking: true,
        rankedField: rankedField,
        displayName: rankedDisplayName
      }
    }));

    return {
      results: { matches },
      method: "search-ranking",
      filters: whereConditions,
      requestedTopK: topK
    };
  } catch (error) {
    console.error('Error in search ranking query:', error);
    
    // Final fallback: return actual search events as results
    const fallbackQuery = `
      SELECT *, vector <=> $1::vector as similarity
      FROM purchase_embeddings
      WHERE event_type = 'search'
      ORDER BY similarity
      LIMIT $2
    `;
    
    const fallbackEmbedding = await getEmbedding(query);
    const fallbackResult = await pool.query(fallbackQuery, [formatVector(fallbackEmbedding), topK]);
    
    const matches = fallbackResult.rows.map(row => rowToMatch(row, fallbackResult.rows));
    
    return {
      results: { matches },
      method: "search-fallback",
      filters: ["event_type = 'search'"],
      requestedTopK: topK
    };
  }
}

async function aggregationQuery(query, entities, topK) {
  // Simple aggregation implementation
  const whereConditions = [];
  const params = [];

  // If query is search-related, force search event type
  if (query.toLowerCase().includes('search') && !entities.eventTypes.includes('search')) {
    entities.eventTypes.push('search');
  }

  if (entities.eventTypes.length > 0) {
    whereConditions.push(`event_type = ANY($${params.length + 1})`);
    params.push(entities.eventTypes);
  }

  const whereClause = whereConditions.length > 0 ? 
    `WHERE ${whereConditions.join(' AND ')}` : '';

  const aggQuery = `
    SELECT 
      event_type,
      COUNT(*) as count,
      COUNT(DISTINCT email) as unique_users,
      MIN(event_date) as earliest_date,
      MAX(event_date) as latest_date
    FROM purchase_embeddings
    ${whereClause}
    GROUP BY event_type
    ORDER BY count DESC
    LIMIT $1
  `;

  const aggResult = await pool.query(aggQuery, [...params, topK]);
  
  // Convert to match format for consistency
  const matches = aggResult.rows.map((row, index) => ({
    id: `agg-${index}`,
    score: 1.0,
    metadata: {
      eventType: row.event_type,
      count: row.count,
      uniqueUsers: row.unique_users,
      dateRange: `${row.earliest_date} to ${row.latest_date}`,
      aggregation: true
    }
  }));

  return {
    results: { matches },
    method: "aggregation",
    filters: whereConditions,
    requestedTopK: topK
  };
}

function reRankResults(rows, query, topK) {
  const queryLower = query.toLowerCase();
  const preprocessor = new QueryPreprocessor();
  const catalogIntents = preprocessor.detectCatalogIntent(query);
  
  console.log(`Re-ranking ${rows.length} results for query: "${query}"`);
  console.log('Catalog intents for re-ranking:', catalogIntents);
  
  return rows
    .map(row => {
      let score = 1 - parseFloat(row.similarity || 0);
      const metadata = row.metadata || {};
      const eventType = row.event_type;
      
      console.log(`Initial score for row ${row.id}: ${score}, event type: ${eventType}`);
      
      // Boost exact keyword matches
      const text = JSON.stringify(metadata).toLowerCase();
      const queryTokens = queryLower.split(/\s+/).filter(token => token.length > 2);
      const matchCount = queryTokens.filter(token => text.includes(token)).length;
      const keywordBoost = (matchCount / queryTokens.length) * 0.3;
      score += keywordBoost;
      
      console.log(`Keyword boost: +${keywordBoost.toFixed(3)} (${matchCount}/${queryTokens.length} tokens)`);

      // Boost recent events
      if (row.event_date) {
        const daysSinceEvent = (Date.now() - new Date(row.event_date)) / (1000 * 60 * 60 * 24);
        const recencyBoost = Math.max(0, 1 - (daysSinceEvent / 365)) * 0.2;
        score += recencyBoost;
        console.log(`Recency boost: +${recencyBoost.toFixed(3)} (${daysSinceEvent.toFixed(1)} days ago)`);
      }
      
      // Boost by event type relevance
      const eventRelevance = eventSchemaRegistry[eventType]?.searchWeight || 1.0;
      score *= eventRelevance;
      console.log(`Event relevance multiplier: x${eventRelevance}`);

      // Special handling for catalog queries
      if (catalogIntents.length > 0) {
        // Heavy penalty for non-pageview events in catalog queries
        if (eventType !== 'pageview') {
          score *= 0.1;
          console.log(`Catalog query penalty: non-pageview event multiplied by 0.1`);
        } else {
          // Boost catalog-specific attributes
          if (catalogIntents.includes('top-rated')) {
            const rating = parseFloat(metadata.productRating || metadata.catalogData?.rating || 0);
            const ratingBoost = (rating / 5) * 0.4;
            score += ratingBoost;
            console.log(`Rating boost: +${ratingBoost.toFixed(3)} (rating: ${rating})`);
          }
          
          if (catalogIntents.includes('availability')) {
            const availability = metadata.productAvailability || metadata.catalogData?.availability;
            if (availability && availability.toLowerCase().includes('in stock')) {
              score += 0.3;
              console.log(`Availability boost: +0.3 (in stock)`);
            }
          }
          
          // Boost for category matches in catalog queries
          const queryCategory = preprocessor.extractCategory(query);
          const itemCategory = metadata.category || metadata.catalogData?.category;
          if (queryCategory && itemCategory && itemCategory.toLowerCase().includes(queryCategory)) {
            score += 0.2;
            console.log(`Category match boost: +0.2 (${queryCategory})`);
          }
        }
      }

      // Penalize mismatched event types for specific queries
      if (queryLower.includes('search') && eventType !== 'search') {
        score *= 0.1;
        console.log(`Search query penalty: non-search event multiplied by 0.1`);
      }
      
      if ((queryLower.includes('purchase') || queryLower.includes('buy')) && eventType !== 'purchase') {
        score *= 0.1;
        console.log(`Purchase query penalty: non-purchase event multiplied by 0.1`);
      }
      
      // Ensure score is within bounds
      score = Math.min(1.0, Math.max(0.0, score));
      console.log(`Final re-ranked score: ${score.toFixed(3)}\n`);
      
      return { ...row, rerankedScore: score };
    })
    .sort((a, b) => b.rerankedScore - a.rerankedScore)
    .slice(0, topK);
}

// Helper function to convert PostgreSQL rows to match format
function rowToMatch(row, allRows) {
  // Use reranked score if available, otherwise calculate normalized score
  let normalizedScore;
  
  if (row.rerankedScore !== undefined) {
    normalizedScore = row.rerankedScore;
  } else {
    const similarities = allRows.map(r => 1 - parseFloat(r.similarity || 0));
    const maxSimilarity = Math.max(...similarities);
    const minSimilarity = Math.min(...similarities);
    
    const rawSimilarity = 1 - parseFloat(row.similarity || 0);
    normalizedScore = maxSimilarity !== minSimilarity 
      ? (rawSimilarity - minSimilarity) / (maxSimilarity - minSimilarity)
      : 1.0;
  }

  return {
    id: row.id.toString(),
    score: Math.min(1.0, Math.max(0.0, normalizedScore)), // Ensure score is between 0-1
    metadata: {
      ...row.metadata,
      eventType: row.event_type,
      date: row.event_date,
      email: row.email,
      price: row.metadata?.price || row.price_value,
      // For search ranking results
      rankedValue: row.ranked_value,
      frequency: row.frequency
    }
  };
}

// Utility to convert camelCase → Human Readable
function prettifyKey(key) {
  if (!key) return "";
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
}

// Enhanced formatMetadata function for catalog results
function formatMetadata(metadata) {
  let output = "";

  // Handle catalog results differently
  if (metadata.isCatalogResult) {
    output += `   • Product: ${metadata.productName || 'N/A'}\n`;
    output += `   • Brand: ${metadata.productBrand || 'N/A'}\n`;
    output += `   • Category: ${metadata.productCategory || 'N/A'}\n`;
    
    if (metadata.productDescription) {
      // Truncate long descriptions for better readability
      const maxDescLength = 150;
      const description = metadata.productDescription.length > maxDescLength 
        ? metadata.productDescription.substring(0, maxDescLength) + '...' 
        : metadata.productDescription;
      output += `   • Description: ${description}\n`;
    }
    
    if (metadata.productPrice) {
      output += `   • Price: $${metadata.productPrice}\n`;
    }
    
    if (metadata.productRating) {
      output += `   • Rating: ${metadata.productRating}/5\n`;
    }
    
    if (metadata.productReviews) {
      output += `   • Reviews: ${metadata.productReviews}\n`;
    }
    
    output += `   • Availability: ${metadata.productAvailability || 'N/A'}\n`;
    
    if (metadata.productUrl) {
      output += `   • URL: ${metadata.productUrl}\n`;
    }
    
    if (metadata.productSku) {
      output += `   • SKU: ${metadata.productSku}\n`;
    }
    
    output += `   • Viewed on: ${new Date(metadata.date).toISOString().split("T")[0]}\n`;
    
    return output;
  }

  // Handle aggregation results differently
  if (metadata.aggregation) {
    output += `   • Event Type: ${metadata.eventType === 'pageview' ? 'page view' : metadata.eventType}\n`;
    output += `   • Total Count: ${metadata.count}\n`;
    output += `   • Unique Users: ${metadata.uniqueUsers}\n`;
    output += `   • Date Range: ${metadata.dateRange}\n`;
    return output;
  }

  // Handle search ranking results
  if (metadata.ranking) {
    if (metadata.error) {
      output += `   • Error: ${metadata.message}\n`;
      output += `   • This usually means:\n`;
      output += `     - No search events in database\n`;
      output += `     - Search data format issue\n`;
      output += `     - Check if searchTerm field exists in metadata\n`;
    } else {
      output += `   • ${metadata.displayName || 'Ranked Value'}: ${metadata.rankedValue || 'N/A'}\n`;
      output += `   • Frequency: ${metadata.frequency || 'N/A'}\n`;
      if (metadata.uniqueSearchers) {
        output += `   • Unique Searchers: ${metadata.uniqueSearchers}\n`;
      }
      output += `   • Event Type: search\n`;
    }
    return output;
  }

  // Handle regular search events
  if (metadata.eventType === 'search') {
    output += `   • Search Term: ${metadata.searchTerm || metadata.query || 'N/A'}\n`;
    output += `   • Date: ${new Date(metadata.date).toISOString().split("T")[0]}\n`;
    if (metadata.resultsCount) {
      output += `   • Results Count: ${metadata.resultsCount}\n`;
    }
    if (metadata.email) {
      output += `   • Email: ${scrambleEmail(metadata.email)}\n`;
    }
    return output;
  }

  // Handle purchase events with descriptions
  if (metadata.eventType === 'purchase' && metadata.productDescription) {
    output += `   • Product: ${metadata.productName || 'N/A'}\n`;
    output += `   • Description: ${metadata.productDescription}\n`;
    output += `   • Price: $${metadata.productPrice || 'N/A'}\n`;
    output += `   • Purchased on: ${new Date(metadata.date).toISOString().split("T")[0]}\n`;
    if (metadata.email) {
      output += `   • Email: ${scrambleEmail(metadata.email)}\n`;
    }
    return output;
  }

  Object.entries(metadata).forEach(([key, value]) => {
    if (key === "email") {
      output += `   • Email: ${scrambleEmail(value)}\n`;
      return;
    }

    if (key === "date") {
        output += `   • Date: ${new Date(value).toISOString().split("T")[0]}\n`;
        return;
    }

    if (key === "eventType") {
        output += `   • Event Type: ${value === 'pageview' ? 'page view' : value}\n`;
        return;
    }

    if (Array.isArray(value)) {
      output += `   • ${prettifyKey(key)}: ${value.join(", ")}\n`;
    } else {
      output += `   • ${prettifyKey(key)}: ${value ?? "N/A"}\n`;
    }
  });

  return output;
}

export function generateResponse(query, vectorResults) {
  const matches = vectorResults?.matches || [];
  const requestedTopK = vectorResults?.requestedTopK;
  const catalogIntents = vectorResults?.catalogIntents || [];
  
  if (matches.length === 0) {
    return "I couldn't find any products matching your criteria. Try adjusting your search terms or filters!";
  }

  let reply = `**Here are the products I found:**\n`;
  
  // Show catalog-specific context
  if (catalogIntents.includes('top-rated')) {
    reply += `\n*Showing top-rated products${catalogIntents.includes('category-filter') ? ' in the requested category' : ''}*\n`;
  }
  
  if (catalogIntents.includes('availability')) {
    reply += `\n*Filtered to show available products only*\n`;
  }

  // Check if we have catalog results
  if (matches[0]?.metadata?.isCatalogResult) {
    matches.forEach((match, index) => {
      const m = match.metadata;
      reply += `\n**${index + 1}. ${m.productName || 'Unknown Product'}**\n`;
      
      // Add rating stars for visual appeal
      if (m.productRating) {
        const rating = parseFloat(m.productRating);
        const stars = '⭐'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '');
        reply += `   ${stars} (${m.productRating}/5)`;
        if (m.productReviews) {
          reply += ` • ${m.productReviews} reviews\n`;
        } else {
          reply += `\n`;
        }
      }
      
      reply += `${formatMetadata(m)}\n`;
    });
    
    return reply;
  }

  // Show how many results were requested vs returned
  if (requestedTopK && matches.length < requestedTopK) {
    reply += `\n_Note: You asked for ${requestedTopK} results, but I found only ${matches.length} matching records._\n`;
  }

  // Check if we have aggregation results
  if (matches[0]?.metadata?.aggregation) {
    reply += `\n**Aggregation Results:**\n`;
    matches.forEach((match, index) => {
      const m = match.metadata;
      reply += `\n**${index + 1}. ${m.eventType === 'pageview' ? 'page view' : m.eventType}**\n`;
      reply += `${formatMetadata(m)}\n`;
    });
    return reply;
  }

  // Check if we have ranking results
  if (matches[0]?.metadata?.ranking) {
    reply += `\n**Ranking Results:**\n`;
    matches.forEach((match, index) => {
      const m = match.metadata;
      reply += `\n**${index + 1}. ${m.rankedValue || 'Unknown'}**\n`;
      reply += `${formatMetadata(m)}\n`;
    });
    return reply;
  }

  // Group events by eventType for regular results
  const grouped = matches.reduce((acc, match) => {
    const type = match.metadata.eventType || "unknown";
    acc[type] = acc[type] || [];
    acc[type].push(match);
    return acc;
  }, {});

  // Build chatbot-style structured response
  for (const [eventType, events] of Object.entries(grouped)) {
    reply += `\n **${eventType === 'pageview' ? 'page view' : eventType} (${events.length})**\n`;

    events.forEach((e, index) => {
      const m = e.metadata;
      reply += `\n **${index + 1}. ${new Date(m.date).toISOString().split("T")[0] || "Unknown Date"}**\n`;
      reply += `${formatMetadata(m)}\n`;
    });
  }

  console.log('Generated chatbot response for query:', query);
  console.log('Requested TopK:', requestedTopK, 'Returned:', matches.length);
  return reply;
}

// Debug function to check what search data exists
export async function debugSearchData() {
  try {
    console.log('=== DEBUG SEARCH DATA ===');
    
    // Check total search events
    const countResult = await pool.query(`
      SELECT COUNT(*) as total_search_events
      FROM purchase_embeddings 
      WHERE event_type = 'search'
    `);
    console.log('Total search events:', countResult.rows[0].total_search_events);

    // Check sample search events and their metadata structure
    const sampleResult = await pool.query(`
      SELECT metadata, event_date, email
      FROM purchase_embeddings
      WHERE event_type = 'search'
      LIMIT 5
    `);
    
    console.log('Sample search events metadata:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}.`, row.metadata);
    });

    // Check what fields exist in search metadata
    const fieldResult = await pool.query(`
      SELECT 
        COUNT(CASE WHEN metadata ? 'searchTerm' THEN 1 END) as has_searchTerm,
        COUNT(CASE WHEN metadata ? 'query' THEN 1 END) as has_query,
        COUNT(CASE WHEN metadata ? 'category' THEN 1 END) as has_category,
        COUNT(CASE WHEN metadata->>'searchTerm' IS NOT NULL AND metadata->>'searchTerm' != '' THEN 1 END) as non_empty_searchTerm
      FROM purchase_embeddings
      WHERE event_type = 'search'
    `);
    
    console.log('Search metadata field analysis:', fieldResult.rows[0]);
    
    // Check top search terms if they exist
    const topTermsResult = await pool.query(`
      SELECT 
        metadata->>'searchTerm' as term,
        COUNT(*) as frequency
      FROM purchase_embeddings
      WHERE event_type = 'search' 
        AND metadata->>'searchTerm' IS NOT NULL 
        AND metadata->>'searchTerm' != ''
      GROUP BY metadata->>'searchTerm'
      ORDER BY frequency DESC
      LIMIT 10
    `);
    
    console.log('Top search terms:');
    topTermsResult.rows.forEach(row => {
      console.log(`  "${row.term}": ${row.frequency} times`);
    });

    console.log('=== END DEBUG ===');
    
    return {
      totalSearchEvents: countResult.rows[0].total_search_events,
      sampleMetadata: sampleResult.rows,
      fieldAnalysis: fieldResult.rows[0],
      topTerms: topTermsResult.rows
    };
  } catch (error) {
    console.error('Debug search data error:', error);
    return { error: error.message };
  }
}

// Add this debug function to check catalog data
export async function debugCatalogData(category = null) {
  try {
    console.log('=== DEBUG CATALOG DATA ===');
    
    // Check total pageview events
    const countResult = await pool.query(`
      SELECT COUNT(*) as total_pageviews
      FROM purchase_embeddings 
      WHERE event_type = 'pageview'
    `);
    console.log('Total pageview events:', countResult.rows[0].total_pageviews);

    // Check sample pageview events and their metadata structure
    let sampleQuery = `
      SELECT metadata, event_date, event_type
      FROM purchase_embeddings
      WHERE event_type = 'pageview'
    `;
    
    if (category) {
      sampleQuery += ` AND (
        metadata->>'category' ILIKE '%${category}%' OR 
        metadata->'catalogData'->>'category' ILIKE '%${category}%' OR
        metadata->>'productCategory' ILIKE '%${category}%'
      )`;
    }
    
    sampleQuery += ' LIMIT 5';
    
    const sampleResult = await pool.query(sampleQuery);
    
    console.log('Sample pageview events metadata:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}.`, {
        event_type: row.event_type,
        date: row.event_date,
        metadata_keys: Object.keys(row.metadata || {}),
        category: row.metadata?.category,
        productCategory: row.metadata?.productCategory,
        catalogData: row.metadata?.catalogData
      });
    });

    // Check what category data exists
    const categoryResult = await pool.query(`
      SELECT 
        metadata->>'category' as category,
        metadata->>'productCategory' as product_category,
        metadata->'catalogData'->>'category' as catalog_category,
        COUNT(*) as count
      FROM purchase_embeddings
      WHERE event_type = 'pageview'
      GROUP BY 
        metadata->>'category',
        metadata->>'productCategory', 
        metadata->'catalogData'->>'category'
      ORDER BY count DESC
      LIMIT 10
    `);
    
    console.log('Category distribution:');
    categoryResult.rows.forEach(row => {
      console.log(`  Category: "${row.category}", Product Category: "${row.product_category}", Catalog Category: "${row.catalog_category}", Count: ${row.count}`);
    });

    console.log('=== END DEBUG ===');
    
    return {
      totalPageviews: countResult.rows[0].total_pageviews,
      sampleMetadata: sampleResult.rows,
      categoryDistribution: categoryResult.rows
    };
  } catch (error) {
    console.error('Debug catalog data error:', error);
    return { error: error.message };
  }
}

// Generate synthetic training queries
const queryTemplates = {
  purchase: [
    "Show me purchases of {brand} products",
    "What did {email} buy on {date}",
    "Find all purchases above ${price}",
    "Top {n} most expensive purchases",
    "Who bought {product} last week"
  ],
  pageview: [
    "Which pages did {email} visit",
    "Show page views in {category}",
    "Most viewed pages on {date}",
    "Page views for {url}"
  ],
  search: [
    "What did users search for on {date}",
    "Show me searches for {term}",
    "Top {n} search queries",
    "Who searched for {term}",
    "Top {n} searched categories",
    "Most popular search terms",
    "What are the top searched items"
  ],
  catalog: [
    "Top rated products in {category}",
    "Available {category} products under ${price}",
    "Best selling {category} items",
    "Most reviewed products in {category}",
    "Products in {category} category with 4+ rating",
    "What {category} products are in stock",
    "Show me available {brand} {category} products",
    "Top {n} products in {category} with descriptions",
    "Highly rated {category} products with good reviews"
  ]
};

export function generateTrainingQueries(records, count = 100) {
  const queries = [];
  
  for (let i = 0; i < count; i++) {
    const record = records[Math.floor(Math.random() * records.length)];
    const eventType = record.event_type;
    const templates = queryTemplates[eventType] || [];
    
    if (templates.length === 0) continue;
    
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    // Fill template with actual data
    const query = template
      .replace('{brand}', record.metadata?.brands?.[0] || 'Sephora')
      .replace('{email}', record.email || 'N/A')
      .replace('{date}', record.event_date || '2024-01-01')
      .replace('{price}', record.metadata?.price || '100')
      .replace('{n}', Math.floor(Math.random() * 10) + 1)
      .replace('{product}', record.metadata?.products?.[0] || 'shoes')
      .replace('{category}', record.metadata?.category || 'fashion')
      .replace('{url}', record.metadata?.url || '/products')
      .replace('{term}', record.metadata?.searchTerm || 'shoes');
    
    queries.push({
      query,
      expectedEventType: eventType,
      expectedResults: [record.id]
    });
  }
  
  return queries;
}

// Debug function to test top K extraction
export function debugTopKExtraction(query) {
  const requestedTopK = extractTopKFromQuery(query);
  const defaultTopK = 10;
  const finalTopK = requestedTopK || defaultTopK;
  
  console.log('=== TOP K DEBUG INFO ===');
  console.log('Query:', query);
  console.log('Requested TopK:', requestedTopK);
  console.log('Default TopK:', defaultTopK);
  console.log('Final TopK:', finalTopK);
  console.log('========================');
  
  return finalTopK;
}

// Utility function to check database health
export async function checkDatabaseHealth() {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_vectors,
        COUNT(DISTINCT event_type) as unique_event_types,
        COUNT(DISTINCT email) as unique_emails,
        MIN(event_date) as earliest_date,
        MAX(event_date) as latest_date
      FROM purchase_embeddings
    `);
    
    return {
      healthy: true,
      stats: result.rows[0],
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      healthy: false,
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Clear database function
export async function clearDatabase(mode = 'all') {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    if (mode === 'all') {
      // Truncate table (fastest way to clear all data)
      await client.query('TRUNCATE TABLE purchase_embeddings RESTART IDENTITY');
      await client.query('TRUNCATE TABLE query_logs RESTART IDENTITY');
      console.log('Cleared all data from PostgreSQL');
      
      // Reset cache
      statsCache = null;
      chartsCache = null;
    } else if (mode === 'cache') {
      // Only clear in-memory cache
      statsCache = null;
      chartsCache = null;
      console.log('Cleared in-memory cache');
    } else {
      throw new Error('Invalid mode. Use "all" or "cache"');
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Cleanup function
export async function closeDatabase() {
  await pool.end();
  console.log('Database connection closed');
}


export async function generateLLMResponse(query, vectorResults) {
  const matches = vectorResults?.matches || [];
  const requestedTopK = vectorResults?.requestedTopK;
  const method = vectorResults?.method;
  const catalogIntents = vectorResults?.catalogIntents || [];

  if (matches.length === 0) {
    return "I couldn't find any results matching your query. Try adjusting your search terms!";
  }

  // Prepare context for LLM
  const context = {
    query,
    method,
    totalResults: matches.length,
    requestedTopK,
    catalogIntents,
    results: matches.map((match, index) => ({
      rank: index + 1,
      score: match.score,
      ...match.metadata
    }))
  };

  // Build the prompt for the LLM
  const prompt = `You are a helpful e-commerce assistant analyzing customer behavior data.

User Query: "${query}"

Search Method Used: ${method}
Results Found: ${matches.length}${requestedTopK ? ` (user requested top ${requestedTopK})` : ''}

Results Data:
${JSON.stringify(context.results, null, 2)}

Please provide a natural, conversational response that:
1. Directly answers the user's question
2. Highlights the most relevant findings
3. Uses bullet points or numbered lists only when appropriate
4. For product results, focus on key details like name, price, rating, and availability
5. For analytics queries, provide clear insights
6. Keep it concise but informative
7. Use a friendly, helpful tone

Response:`;

  try {
    const OLLAMA_URL = process.env.OLLAMA_URL?.replace('/api/embeddings', '/api/generate') 
                      || 'http://localhost:11434/api/generate';
    const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL;

    console.log(`Generating LLM response using ${OLLAMA_CHAT_MODEL}...`);

    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_CHAT_MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 1000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    const llmResponse = data.response;

    console.log('LLM response generated successfully');
    return llmResponse;

  } catch (err) {
    console.error('LLM response generation error:', err);
    console.log('Falling back to template-based response');
    // Fallback to original generateResponse
    return generateResponse(query, vectorResults);
  }
}

// Alternative: Use OpenAI-compatible API
export async function generateLLMResponseOpenAI(query, vectorResults) {
  const matches = vectorResults?.matches || [];

  if (matches.length === 0) {
    return "I couldn't find any results matching your query.";
  }

  const context = {
    query,
    totalResults: matches.length,
    results: matches.map((match, index) => ({
      rank: index + 1,
      score: match.score,
      ...match.metadata
    }))
  };

  const messages = [
    {
      role: "system",
      content: "You are a helpful e-commerce assistant. Provide clear, concise answers based on the data provided. Use natural language and format responses in a user-friendly way."
    },
    {
      role: "user",
      content: `Query: "${query}"\n\nResults:\n${JSON.stringify(context.results, null, 2)}\n\nPlease provide a natural response answering the user's query.`
    }
  ];

  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured, falling back to template response');
      return generateResponse(query, vectorResults);
    }

    console.log(`Generating OpenAI response using ${OPENAI_MODEL}...`);
    console.log(`OpenAI Base URL: ${OPENAI_BASE_URL}`);

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    // Get response text for debugging
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('OpenAI API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = JSON.parse(responseText);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected OpenAI response format:', data);
      throw new Error('Invalid OpenAI response format');
    }

    const llmResponse = data.choices[0].message.content;
    console.log('OpenAI response generated successfully');
    return llmResponse;

  } catch (err) {
    console.error('OpenAI response generation error:', err);
    console.log('Falling back to template-based response');
    return generateResponse(query, vectorResults);
  }
}

// Initialize database on import
initDB().catch(console.error);