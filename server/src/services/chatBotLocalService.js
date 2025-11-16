import dotenv from "dotenv";
import { 
  eventProcessors, 
  normaliseEventType, 
  extractTopKFromQuery, 
  extractBrand,
  generateStatsCache,
  generateChartsCache 
} from '../utils/chatBotUtils.js';
import { getLocalVectorStore } from './localVectorStore.js';

dotenv.config();

// In-memory cache
export let statsCache = null;
export let chartsCache = null;

// Local vector store
let vectorStore = null;

export async function getVectorStore() {
  if (!vectorStore) {
    vectorStore = getLocalVectorStore({
      dimension: 768, // Match your embedding model dimension
      autoSave: true,
      savePath: './data/vectorstore.json'
    });
    
    console.log("Local vector store initialized");
    
    // Load existing data if available
    try {
      await vectorStore.loadFromDisk();
      console.log(`Vector store loaded with ${vectorStore.getStats().totalVectors} vectors`);
    } catch (error) {
      console.log("Starting with empty vector store");
    }
  }
  return vectorStore;
}

// Keep the same getEmbedding function
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
    console.log('embedding===', data.embedding);
    return data.embedding;
  } catch (err) {
    console.error("Ollama Embedding error:", err);
    throw new Error(
      `Failed to generate embedding with ${OLLAMA_MODEL}. Is Ollama running?`
    );
  }
}

export async function processAndUpsert(results) {
  const vectors = [];
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

  for (let i = 0; i < results.length; i++) {
    const record = results[i];
    const sotType = record.sotType?.toLowerCase() || "unknown";
    const eventType = normaliseEventType(sotType);

    // Get the appropriate processor
    const processor = eventProcessors[eventType];
    if (!processor) {
      console.warn(`Unknown event type: ${eventType}`);
      continue;
    }

    const { searchableText, metadata } = processor(record);
    const embedding = await getEmbedding(searchableText);

    const id = `${record.event_date}-${record.atgId || i}-${eventType}`;
    vectors.push({ id, values: embedding, metadata });

    // Collect stats
    statsData.totalRecords++;
    statsData.byEventType[eventType] =
      (statsData.byEventType[eventType] || 0) + 1;
    statsData.uniqueDates.add(record.event_date);
    statsData.uniqueEmails.add(record.emailId);

    // Event-specific stats
    if (eventType === "purchase") {
      if (metadata.brands) {
        metadata.brands.forEach((b) => statsData.uniqueBrands.add(b));
      }
      if (metadata.price) {
        statsData.priceList.push(metadata.price);
      }
    } else if (eventType === "search" && metadata.searchTerm) {
      statsData.searchTerms[metadata.searchTerm] =
        (statsData.searchTerms[metadata.searchTerm] || 0) + 1;
    } else if (eventType === "page view" && metadata.subCategory) {
      statsData.pageViewCategories[metadata.subCategory] =
        (statsData.pageViewCategories[metadata.subCategory] || 0) + 1;
    }
  }

  // Upsert to local vector store
  const store = await getVectorStore();
  await store.upsert(vectors);

  // Compute final stats
  statsCache = generateStatsCache(results, statsData);
  chartsCache = generateChartsCache(results, statsData);

  console.log(`Upserted ${results.length} vectors to local vector store`);
}

export async function processQuery(query, topK = 10) {
  const queryLower = query.toLowerCase();
  const store = await getVectorStore();

  // ---------- 1. Dynamically decide topK ----------
  const requestedK = extractTopKFromQuery(query);
  console.log("requestedK===", requestedK);
  const finalTopK = requestedK ? requestedK : topK;

  const dateMatch = queryLower.match(/(\d{4}-\d{2}-\d{2})/);
  const emailMatch = query.match(/[\w.-]+@[\w.-]+\.[\w]+/);
  const eventTypeMatch = queryLower.match(
    /\b(purchase|pageview|page view|search)\b/
  );

  const queryEmbedding = await getEmbedding(query);
  let filter = {};

  // Event type filter
  if (eventTypeMatch) {
    const eventType = eventTypeMatch[1].replace("page view", "pageview");
    filter.eventType = { $eq: eventType };
  }

  // Date filter
  if (dateMatch) {
    filter.date = { $eq: dateMatch[1] };
  }

  // Email filter
  if (emailMatch) {
    filter.email = { $eq: emailMatch[0].toLowerCase() };
  }

  // Search term filter (for search events)
  if (
    queryLower.includes("searched for") ||
    queryLower.includes("search term")
  ) {
    const termMatch =
      queryLower.match(/["']([^"']+)["']/) || queryLower.match(/for\s+(\w+)/);
    if (termMatch) {
      filter.searchTerm = { $eq: termMatch[1] };
    }
  }

  // Price filters (for purchases)
  if (
    queryLower.includes("expensive") ||
    queryLower.includes("highest price")
  ) {
    const results = await store.query({
      topK: 100, // Query for a large batch to perform client-side sorting
      vector: queryEmbedding,
      filter: { eventType: { $eq: "purchase" }, ...filter },
      includeMetadata: true,
    });

    const sorted = results.matches
      .filter((m) => m.metadata.price)
      .sort((a, b) => b.metadata.price - a.metadata.price)
      .slice(0, finalTopK);

    return { results: { matches: sorted }, method: "price-sort-desc" };
  }

  if (queryLower.includes("cheapest") || queryLower.includes("lowest price")) {
    const results = await store.query({
      topK: 100, // Query for a large batch to perform client-side sorting
      vector: queryEmbedding,
      filter: { eventType: { $eq: "purchase" }, ...filter },
      includeMetadata: true,
    });

    const sorted = results.matches
      .filter((m) => m.metadata.price)
      .sort((a, b) => a.metadata.price - b.metadata.price)
      .slice(0, finalTopK);

    return { results: { matches: sorted }, method: "price-sort-asc" };
  }

  // Brand filter (for purchases)
  const brand = extractBrand(queryLower);
  if (brand) {
    filter.brands = { $in: [brand] };
  }

  // Execute query with filters
  const hasFilters = Object.keys(filter).length > 0;
  const results = await store.query({
    topK: finalTopK,
    vector: queryEmbedding,
    filter: hasFilters ? filter : undefined,
    includeMetadata: true,
  });

  return {
    results,
    method: hasFilters ? "filtered-semantic" : "semantic",
    filters: filter,
  };
}

// Keep the same generateResponse function
export function generateResponse(query, pineconeResults) {
  const matches = pineconeResults.matches || [];

  if (matches.length === 0) {
    return "No matches found. Try refining your query with dates, emails, event types, or specific terms.";
  }

  const queryLower = query.toLowerCase();
  let response = "";

  // Group by event type
  const grouped = matches.reduce((acc, match) => {
    const type = match.metadata.eventType || "unknown";
    if (!acc[type]) acc[type] = [];
    acc[type].push(match);
    return acc;
  }, {});

  // Generate response based on event types
  Object.entries(grouped).forEach(([eventType, events]) => {
    response += `\n**${eventType.toUpperCase()} Events (${
      events.length
    }):**\n\n`;

    events.forEach((match, i) => {
      const m = match.metadata;
      response += `**${i + 1}.** ${m.date} | ${m.email}\n`;

      if (eventType === "purchase") {
        response += `   • Product: ${m.productName || "N/A"}\n`;
        response += `   • SKU: ${m.sku}\n`;
        response += `   • Price: $${m.price?.toFixed(2) || "0.00"}\n`;
        response += `   • Quantity: ${m.quantity}\n`;
        response += `   • Brands: ${
          Array.isArray(m.brands) ? m.brands.join(", ") : "N/A"
        }\n`;
        response += `   • Order: ${m.orderNumber}\n`;
      } else if (eventType === "page view") {
        response += `   • Sub Type: ${m.subType || "N/A"}\n`;
        response += `   • Category: ${m.subCategory || "N/A"}\n`;
        response += `   • URL: ${m.url || "N/A"}\n`;
      } else if (eventType === "search") {
        response += `   • Search Term: **${m.searchTerm || "N/A"}**\n`;
        response += `   • URL: ${m.url || "N/A"}\n`;
      }

      response += `   • Country: ${m.country || "N/A"}\n\n`;
    });
  });

  return response;
}

// Additional utility functions for local store management
export async function getVectorStoreStats() {
  const store = await getVectorStore();
  return store.getStats();
}

export async function clearVectorStore() {
  const store = await getVectorStore();
  const count = await store.clear();
  statsCache = null;
  chartsCache = null;
  return count;
}

export async function backupVectorStore() {
  const store = await getVectorStore();
  await store.saveToDisk();
  return { success: true, message: 'Vector store backed up' };
}