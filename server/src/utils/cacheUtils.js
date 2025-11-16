export function generateCacheKey(baseKey, params) {
  return `${baseKey}_${JSON.stringify(params)}`;
}

export function getCachedData(queryCache, cacheKey, bypassCache = false, CACHE_TTL) {
  if (bypassCache) return null;

  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("====> Returning cached data");
    return cached.data;
  }
  return null;
}

export function setCachedData(queryCache, cacheKey, data) {
  queryCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
}