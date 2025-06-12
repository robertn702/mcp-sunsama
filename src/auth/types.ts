import { SunsamaClient } from "sunsama-api";

/**
 * Session data interface for HTTP transport
 */
export interface SessionData extends Record<string, unknown> {
  sunsamaClient: SunsamaClient;
  email: string;
}