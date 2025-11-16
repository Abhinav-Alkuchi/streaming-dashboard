export const EVENT_TYPE_MAP = {
  purchase: "purchase",
  pageview: "pageview",
  "page view": "pageview",
  search: "search",
};

export function scrambleEmail(email) {
    const visibleChars = 4,
        maskChar = '#',
        minMaskLength = 3
    
    
    if (!email || typeof email !== 'string') {
        return '';
    }
    
    const [localPart, domain] = email.split('@');
    
    if (!localPart || !domain) {
        return email;
    }
    
    const charsToShow = Math.min(visibleChars, localPart.length);
    const visiblePart = localPart.substring(0, charsToShow);
    const maskLength = Math.max(minMaskLength, localPart.length - charsToShow);
    const maskedPart = maskChar.repeat(maskLength);

    console.log(`${visiblePart}${maskedPart}@${domain}`);
    
    return `${visiblePart}${maskedPart}@${domain}`;
}

// Event type processors
export const eventProcessors = {
  purchase: (record) => {
    const brands = record.sotV07
      ? record.sotV07
          .split(";")
          .map((b) => b.trim())
          .filter((b) => b)
      : [];

    const searchableText = `Purchase event on ${record.event_date} by ${
      scrambleEmail(record.emailId)
    }
Event Type: purchase
SKU: ${record.sotV04 || "N/A"}
Product ID: ${record.sotV15 || "N/A"}
Product Name: ${record.sotV215 || "N/A"}
Brands: ${brands.join(", ")}
Quantity: ${record.sotV05 || 0}
Price: ${record.sotV06 || "N/A"}
Order Number: ${record.sotV10 || "N/A"}
Country: ${record.sotV119 || "N/A"}`;

    const metadata = {
      eventType: "purchase",
      date: record.event_date,
      email: scrambleEmail(record.emailId.toLowerCase()),
      sku: record.sotV04,
      quantity: parseInt(record.sotV05) || 0,
      price: parseFloat(record.sotV06?.replace(/[^0-9.]/g, "")) || 0,
      productId: record.sotV15,
      productName: record.sotV215,
      brands: brands,
      orderNumber: record.sotV10,
      country: record.sotV119,
    };

    return { searchableText, metadata };
  },

  pageview: (record) => {
    const searchableText = `Page View event on ${record.event_date} by ${
      scrambleEmail(record.emailId)
    }
Event Type: page view
Sub Type: ${record.sotSubType || "N/A"}
Sub Category: ${record.sotSubCategory || "N/A"}
URL: ${record.url || "N/A"}
Country: ${record.sotV119 || "N/A"}`;

    const metadata = {
      eventType: "page view",
      date: record.event_date,
      email: scrambleEmail(record.emailId.toLowerCase()),
      subType: record.sotSubType,
      subCategory: record.sotSubCategory,
      url: record.url,
      country: record.sotV119,
    };

    return { searchableText, metadata };
  },

  search: (record) => {
    const searchableText = `Search event on ${record.event_date} by ${
      scrambleEmail(record.emailId)
    }
Event Type: search
Search Term: ${record.sotV104 || "N/A"}
URL: ${record.url || "N/A"}
Country: ${record.sotV119 || "N/A"}`;

    const metadata = {
      eventType: "search",
      date: record.event_date,
      email: scrambleEmail(record.emailId.toLowerCase()),
      searchTerm: record.sotV104,
      url: record.url,
      country: record.sotV119,
    };

    return { searchableText, metadata };
  },
};

export function normaliseEventType(raw) {
  if (!raw) return "unknown";
  const lowered = raw.toString().toLowerCase().trim();
  const compacted = lowered.replace(/\s+/g, "");
  return EVENT_TYPE_MAP[lowered] ?? EVENT_TYPE_MAP[compacted] ?? compacted;
}

export function extractTopKFromQuery(query) {
  // 1. Explicit "top X", "show X", "first X", "limit X", etc.
  const explicit = query.match(
    /\b(top|show|first|last|low|high|best|most|middle|limit|return|give me)\s+(\d+)\b/i
  );
  if (explicit) {
    const n = parseInt(explicit[2], 10);
    if (n > 0 && n <= 200) return n; // sane upper bound
  }

  // 2. "all", "everything", "every" → return a large enough number
  if (/\b(all|everything|every)\b/i.test(query)) {
    return 200; // Pinecone max per request
  }

  // 3. Default fallback
  return null;
}

export function extractBrand(query) {
  const knownBrands = [
    "sephora collection",
    "yves saint laurent",
    "nars",
    "fenty",
    "rare beauty",
    "dior",
    "lancome",
    "mac",
  ];

  for (let b of knownBrands) {
    if (query.includes(b.toLowerCase())) return b;
  }
  return null;
}

export function generateStatsCache(results, statsData) {
  return {
    totalRecords: statsData.totalRecords,
    byEventType: statsData.byEventType,
    uniqueDates: statsData.uniqueDates.size,
    uniqueEmails: statsData.uniqueEmails.size,
    uniqueBrands: statsData.uniqueBrands.size,
    avgPrice:
      statsData.priceList.length > 0
        ? statsData.priceList.reduce((a, b) => a + b, 0) /
          statsData.priceList.length
        : 0,
    topSearchTerms: Object.entries(statsData.searchTerms)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([term, count]) => ({ term, count })),
    topPageViewCategories: Object.entries(statsData.pageViewCategories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([category, count]) => ({ category, count })),
  };
}

export function generateChartsCache(results, statsData) {
  const dateMap = {};
  results.forEach((r) => {
    dateMap[r.event_date] = (dateMap[r.event_date] || 0) + 1;
  });

  const sortedDates = Object.entries(dateMap).sort(
    ([a], [b]) => new Date(a) - new Date(b)
  );

  return {
    dateData: sortedDates.map(([date, count]) => ({ date, count })),
    eventTypeData: Object.entries(statsData.byEventType).map(
      ([type, count]) => ({
        name: type,
        value: count,
      })
    ),
  };
}