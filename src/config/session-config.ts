import { z } from "zod";

const SessionConfigSchema = z.object({
  // Client cache timeouts
  CLIENT_IDLE_TIMEOUT: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(60000)) // Min 1 minute
    .default("600000"), // 10 minutes

  CLIENT_MAX_LIFETIME: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(300000)) // Min 5 minutes
    .default("3600000"), // 1 hour

  // Transport/session cache timeouts
  TRANSPORT_IDLE_TIMEOUT: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(60000)) // Min 1 minute
    .default("900000"), // 15 minutes

  TRANSPORT_MAX_LIFETIME: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(300000)) // Min 5 minutes
    .default("7200000"), // 2 hours

  // Cleanup interval
  CLEANUP_INTERVAL: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(60000)) // Min 1 minute
    .default("300000"), // 5 minutes
});

export type SessionConfig = z.infer<typeof SessionConfigSchema>;

export function getSessionConfig(): SessionConfig {
  return SessionConfigSchema.parse(process.env);
}

/**
 * Session TTL Behavior:
 *
 * 1. Idle Timeout (sliding window):
 *    - Resets on each access
 *    - Session stays alive as long as it's used
 *    - Applied to both client and transport/session caches
 *
 * 2. Max Lifetime (absolute):
 *    - Never resets, absolute from creation time
 *    - Ensures sessions don't live forever
 *    - Security feature to force re-authentication
 *
 * 3. Cleanup Strategy:
 *    - Lazy: Checked on access (fast path)
 *    - Active: Periodic sweep (configurable interval)
 *    - Graceful: All sessions closed on shutdown
 *
 * Environment Variables:
 * - CLIENT_IDLE_TIMEOUT: Client idle timeout in ms (default: 600000 = 10 min)
 * - CLIENT_MAX_LIFETIME: Client max lifetime in ms (default: 3600000 = 1 hour)
 * - TRANSPORT_IDLE_TIMEOUT: Session idle timeout in ms (default: 900000 = 15 min)
 * - TRANSPORT_MAX_LIFETIME: Session max lifetime in ms (default: 7200000 = 2 hours)
 * - CLEANUP_INTERVAL: Cleanup check interval in ms (default: 300000 = 5 min)
 */
