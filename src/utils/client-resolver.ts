import { SunsamaClient } from "sunsama-api/client";
import { getGlobalSunsamaClient } from "../auth/stdio.js";
import { sessionManager } from "../transports/http.js";

/**
 * Gets the appropriate SunsamaClient instance based on context
 * - HTTP transport: Uses session-scoped client from request
 * - Stdio transport: Uses global singleton client
 */
export async function getClient(session?: unknown): Promise<SunsamaClient> {
  // Check if session has a client directly (might be set by transport)
  if (hasClient(session)) {
    return session.sunsamaClient;
  }

  // Check if session has an ID we can use to lookup in SessionManager
  if (hasId(session)) {
    const sessionData = sessionManager.getSessionData(session.id);
    if (sessionData) {
      return sessionData.sunsamaClient;
    }
  }

  // Fallback to stdio transport: global client
  return await getGlobalSunsamaClient();
}

function hasClient(session: unknown): session is { sunsamaClient: SunsamaClient } {
  return (
    typeof session === "object" &&
    session !== null &&
    "sunsamaClient" in session
  );
}

function hasId(session: unknown): session is { id: string } {
  return (
    typeof session === "object" &&
    session !== null &&
    "id" in session &&
    typeof (session as Record<string, unknown>).id === "string"
  );
}
