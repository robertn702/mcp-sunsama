import { SunsamaClient } from "sunsama-api";
import { getGlobalSunsamaClient } from "../auth/stdio.js";
import type { SessionData } from "../auth/types.js";
import { getTransportConfig } from "../config/transport.js";

/**
 * Gets the appropriate SunsamaClient instance based on transport type
 * @param session - Session data for HTTP transport (undefined/null for stdio)
 * @returns Promise<SunsamaClient> Authenticated SunsamaClient instance
 * @throws {Error} If session is not available for HTTP transport or global client not initialized for stdio
 */
export async function getSunsamaClient(session?: SessionData | null): Promise<SunsamaClient> {
  const transportConfig = getTransportConfig();

  if (transportConfig.transportType === "httpStream") {
    if (!session?.sunsamaClient) {
      throw new Error("Session not available. Authentication may have failed.");
    }
    return session.sunsamaClient;
  }

  return await getGlobalSunsamaClient();
}