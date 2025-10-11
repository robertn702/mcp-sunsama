import { SunsamaClient } from "sunsama-api";
import { getGlobalSunsamaClient } from "../auth/stdio.js";
import type { SessionData } from "../auth/types.js";
import { sessionManager } from "../transports/http.js";

/**
 * Gets the appropriate SunsamaClient instance based on context
 * - HTTP transport: Uses session-scoped client from request
 * - Stdio transport: Uses global singleton client
 */
export async function getClient(session?: any): Promise<SunsamaClient> {
  // Check if session has a client directly (might be set by transport)
  if (session?.sunsamaClient) {
    return session.sunsamaClient;
  }

  // Check if session has an ID we can use to lookup in SessionManager
  if (session?.id) {
    const sessionData = sessionManager.getSessionData(session.id);
    if (sessionData) {
      return sessionData.sunsamaClient;
    }
  }

  // Fallback to stdio transport: global client
  return await getGlobalSunsamaClient();
}
