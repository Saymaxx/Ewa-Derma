/**
 * Frontend In-Memory Cache Utility
 *
 * Provides short-lived in-memory caching for read-heavy, low-churn catalog data
 * to reduce redundant network roundtrips across navigation and modal opens.
 *
 * Standard Cache Key Conventions & Recommended TTLs:
 * - 'doctors_list':    5 minutes (300,000 ms) - Clinical doctor profiles and fees
 * - 'services_list':   5 minutes (300,000 ms) - Clinical service pricing catalog
 * - 'medicines_list':  2 minutes (120,000 ms) - Medicines & formulary catalog
 * - 'suppliers_list':  5 minutes (300,000 ms) - Inventory vendor / supplier roster
 */

export const CACHE_KEYS = {
  DOCTORS_LIST: 'doctors_list',
  SERVICES_LIST: 'services_list',
  MEDICINES_LIST: 'medicines_list',
  SUPPLIERS_LIST: 'suppliers_list',
} as const;

export const DEFAULT_TTLS = {
  DOCTORS: 5 * 60 * 1000,
  SERVICES: 5 * 60 * 1000,
  MEDICINES: 2 * 60 * 1000,
  SUPPLIERS: 5 * 60 * 1000,
  DEFAULT: 60 * 1000,
} as const;

type CacheEntry<T> = {
  data: T;
  expiry: number;
};

const memoryCache = new Map<string, CacheEntry<any>>();

export function getCachedData<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedData<T>(key: string, data: T, ttlMs: number = DEFAULT_TTLS.DEFAULT): void {
  memoryCache.set(key, {
    data,
    expiry: Date.now() + ttlMs,
  });
}

export function clearCache(key?: string): void {
  if (key) {
    memoryCache.delete(key);
  } else {
    memoryCache.clear();
  }
}
