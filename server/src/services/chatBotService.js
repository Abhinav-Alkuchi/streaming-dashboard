import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

import { 
  eventProcessors, 
  normaliseEventType, 
  extractTopKFromQuery, 
  extractBrand,
  generateStatsCache,
  generateChartsCache,
  scrambleEmail
} from '../utils/chatBotUtils.js';

dotenv.config();

if (!process.env.PINECONE_API_KEY) {
  console.error("Missing PINECONE_API_KEY in .env");
  process.exit(1);
}

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const indexName = process.env.PINECONE_INDEX_NAME || "purchases";

// In-memory cache
export let statsCache = null;
export let chartsCache = null;

// Lazy init Pinecone
let index = null;

export async function getIndex() {
  if (!index) {
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexName = process.env.PINECONE_INDEX_NAME || "purchases";

    index = pinecone.Index(indexName);

    try {
      // FIX: Ensure this warm-up vector matches your model's dimension (768D for nomic-embed-text)
      await index
        .namespace("")
        .query({ topK: 1, vector: new Array(768).fill(0) });
      console.log(`Pinecone index "${indexName}" initialized`);
    } catch (err) {
      console.warn("Index warm-up failed (normal if empty):", err.message);
    }
  }
  return index;
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

  // Batch upsert in chunks of 100
  for (let i = 0; i < vectors.length; i += 100) {
    const chunk = vectors.slice(i, i + 100);
    await (await getIndex()).upsert(chunk);
  }

  // Compute final stats
  statsCache = generateStatsCache(results, statsData);
  chartsCache = generateChartsCache(results, statsData);

  console.log(`Upserted ${results.length} vectors to Pinecone`);
}

export async function processQuery(query, defaultTopK = 10) {
  const queryLower = query.toLowerCase();
  const index = await getIndex();

  // 1. Get dynamic event types from eventProcessors
  const dynamicEventTypes = Object.keys(eventProcessors).map((t) =>
    t.toLowerCase()
  );

  // 2. Extract dynamic topK
  const requestedTopK = extractTopKFromQuery(query);
  const finalTopK = requestedTopK || defaultTopK;

  // 3. Generate embedding for the query
  const queryEmbedding = await getEmbedding(query);

  // -------------------------------
  // 4. Build dynamic filter object
  // -------------------------------
  let filter = {};

  // 4A. Try to detect event type via keyword match
  let eventType = dynamicEventTypes.find((t) =>
    queryLower.includes(t.toLowerCase())
  );

  // 4B. Semantic fallback: ask Pinecone what event type the question relates to
  if (!eventType) {
    try {
      const guess = await index.query({
        topK: 3,
        vector: queryEmbedding,
        includeMetadata: true,
      });

      eventType = guess.matches?.[0]?.metadata?.eventType?.toLowerCase();
      console.log(`Semantic event type inferred: ${eventType}`);
    } catch (err) {
      console.warn("Event type semantic inference failed:", err.message);
    }
  }

  // Apply event type filter if found
  if (eventType) filter.eventType = { $eq: eventType };

  // --------------------------------
  // 4C. Other dynamic filters
  // --------------------------------

  // Date filter
  const dateMatch = queryLower.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) filter.date = { $eq: dateMatch[1] };

  // Email filter
  const emailMatch = query.match(/[\w.-]+@[\w.-]+\.[\w]+/);
  if (emailMatch) filter.email = { $eq: emailMatch[0].toLowerCase() };

  // Search term filter
  if (
    queryLower.includes("searched for") ||
    queryLower.includes("search term")
  ) {
    const termMatch =
      queryLower.match(/["']([^"']+)["']/) ||
      queryLower.match(/searched for\s+(\w+)/);

    if (termMatch) filter.searchTerm = { $eq: termMatch[1] };
  }

  // Price filters (highest/lowest purchase price)
  const isMostExpensive =
    queryLower.includes("highest price") ||
    queryLower.includes("most expensive");
  const isCheapest =
    queryLower.includes("cheapest") || queryLower.includes("lowest price");

  if (isMostExpensive || isCheapest) {
    // Always restrict to purchase events
    filter.eventType = { $eq: "purchase" };

    const priceResults = await index.query({
      topK: 200,
      vector: queryEmbedding,
      filter,
      includeMetadata: true,
    });

    const sorted = priceResults.matches
      .filter((m) => m.metadata.price)
      .sort((a, b) =>
        isMostExpensive
          ? b.metadata.price - a.metadata.price
          : a.metadata.price - b.metadata.price
      )
      .slice(0, finalTopK);

    return {
      results: { matches: sorted },
      method: isMostExpensive ? "price-desc" : "price-asc",
      filters: filter,
    };
  }

  // Brand filter (dynamic via extractBrand)
  const brand = extractBrand(queryLower);
  if (brand) filter.brands = { $in: [brand] };

  // Final Pinecone query
  const hasFilters = Object.keys(filter).length > 0;

  const results = await index.query({
    topK: finalTopK,
    vector: queryEmbedding,
    ...(hasFilters && { filter }),
    includeMetadata: true,
  });

  return {
    results,
    method: hasFilters ? "filtered-semantic" : "semantic",
    filters: filter,
  };
}


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
      response += `**${i + 1}.** ${m.date} | ${scrambleEmail(m.email)}\n`;

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