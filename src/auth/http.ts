import { createHash } from "crypto";
import { SunsamaClient } from "sunsama-api";
import type { SessionData } from "./types.js";
import { getSessionConfig } from "../config/session-config.js";

// Client cache with TTL management (keyed by credential hash for security)
const clientCache = new Map<string, SessionData>();

// Pending authentication promises to prevent race conditions
const authPromises = new Map<string, Promise<SessionData>>();

// Configuration - loaded from environment
const sessionConfig = getSessionConfig();
const CLIENT_IDLE_TIMEOUT = sessionConfig.CLIENT_IDLE_TIMEOUT;
const CLIENT_MAX_LIFETIME = sessionConfig.CLIENT_MAX_LIFETIME;
const CLEANUP_INTERVAL = sessionConfig.CLEANUP_INTERVAL;

/**
 * Parse HTTP Basic Auth credentials from Authorization header
 */
export function parseBasicAuth(authHeader: string): { email: string; password: string } {
  const base64Credentials = authHeader.replace('Basic ', '');
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [email, password] = credentials.split(':');

  if (!email || !password) {
    throw new Error("Invalid Basic Auth format");
  }

  return { email, password };
}

/**
 * Generate secure cache key from credentials
 * Uses SHA-256 hash to prevent authentication bypass vulnerability
 */
function getCacheKey(email: string, password: string): string {
  return createHash('sha256')
    .update(`${email}:${password}`)
    .digest('hex');
}

/**
 * Check if a cached client is still valid based on TTL
 */
function isClientValid(sessionData: SessionData): boolean {
  const now = Date.now();
  const idleTime = now - sessionData.lastAccessedAt;
  const lifetime = now - sessionData.createdAt;

  return idleTime < CLIENT_IDLE_TIMEOUT && lifetime < CLIENT_MAX_LIFETIME;
}

/**
 * Cleanup expired clients from cache
 */
function cleanupExpiredClients(): void {
  const now = Date.now();

  for (const [cacheKey, sessionData] of clientCache.entries()) {
    if (!isClientValid(sessionData)) {
      console.error(`[Client Cache] Expiring stale client for ${sessionData.email}`);
      try {
        sessionData.sunsamaClient.logout();
      } catch (err) {
        console.error(`[Client Cache] Error logging out client for ${sessionData.email}:`, err);
      }
      clientCache.delete(cacheKey);
    }
  }
}

/**
 * Start periodic cleanup of expired clients
 */
let cleanupTimer: Timer | null = null;

export function startClientCacheCleanup(): void {
  if (cleanupTimer) return; // Already started

  cleanupTimer = setInterval(() => {
    cleanupExpiredClients();
  }, CLEANUP_INTERVAL);

  console.error('[Client Cache] Started periodic cleanup');
}

/**
 * Stop periodic cleanup (for graceful shutdown)
 */
export function stopClientCacheCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    console.error('[Client Cache] Stopped periodic cleanup');
  }
}

/**
 * Cleanup all cached clients (for graceful shutdown)
 */
export function cleanupAllClients(): void {
  console.error('[Client Cache] Cleaning up all cached clients');

  for (const [email, sessionData] of clientCache.entries()) {
    try {
      sessionData.sunsamaClient.logout();
    } catch (err) {
      console.error(`[Client Cache] Error logging out client for ${email}:`, err);
    }
  }

  clientCache.clear();
}

/**
 * Authenticate HTTP request and get or create cached client
 * Uses secure cache key (password hash) and race condition protection
 */
export async function authenticateHttpRequest(
  authHeader?: string
): Promise<SessionData> {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    throw new Error("Basic Auth required");
  }

  const { email, password } = parseBasicAuth(authHeader);
  const cacheKey = getCacheKey(email, password);
  const now = Date.now();

  // Check for pending authentication (race condition protection)
  if (authPromises.has(cacheKey)) {
    console.error(`[Client Cache] Waiting for pending authentication for ${email}`);
    return await authPromises.get(cacheKey)!;
  }

  // Check cache first
  if (clientCache.has(cacheKey)) {
    const cached = clientCache.get(cacheKey)!;

    // Check if still valid (lazy expiration)
    if (isClientValid(cached)) {
      console.error(`[Client Cache] Reusing cached client for ${email}`);
      // Update last accessed time (sliding window)
      cached.lastAccessedAt = now;
      return cached;
    } else {
      console.error(`[Client Cache] Cached client expired for ${email}, re-authenticating`);
      // Cleanup expired client
      try {
        cached.sunsamaClient.logout();
      } catch (err) {
        console.error(`[Client Cache] Error logging out expired client:`, err);
      }
      clientCache.delete(cacheKey);
    }
  }

  // Create authentication promise to prevent concurrent authentications
  console.error(`[Client Cache] Creating new client for ${email}`);
  const authPromise = (async () => {
    try {
      const sunsamaClient = new SunsamaClient();
      await sunsamaClient.login(email, password);

      const sessionData: SessionData = {
        sunsamaClient,
        email,
        createdAt: now,
        lastAccessedAt: now
      };

      clientCache.set(cacheKey, sessionData);
      console.error(`[Client Cache] Cached new client for ${email} (total: ${clientCache.size})`);

      return sessionData;
    } finally {
      // Always remove from pending map
      authPromises.delete(cacheKey);
    }
  })();

  // Store promise to prevent concurrent authentications
  authPromises.set(cacheKey, authPromise);

  return authPromise;
}
