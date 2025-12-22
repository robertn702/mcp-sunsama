import { SunsamaClient } from "sunsama-api/client";

/**
 * Session data interface for HTTP transport
 */
export interface SessionData extends Record<string, unknown> {
  sunsamaClient: SunsamaClient;
  email?: string;
  createdAt: number;
  lastAccessedAt: number;
}