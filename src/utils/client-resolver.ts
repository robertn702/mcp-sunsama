import { SunsamaClient } from "sunsama-api";
import { getGlobalSunsamaClient } from "../auth/stdio.js";

/**
 * Gets the appropriate SunsamaClient instance based on transport type
 * @param session - Session data for HTTP transport (null for stdio)
 * @returns Authenticated SunsamaClient instance
 * @throws {Error} If session is not available for HTTP transport or global client not initialized for stdio
 */
export function getSunsamaClient(): SunsamaClient {
  return getGlobalSunsamaClient();
}
