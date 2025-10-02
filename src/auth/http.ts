import { SunsamaClient } from "sunsama-api";
import type { SessionData } from "./types.js";

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
 * Authenticate HTTP request and create session-scoped client
 */
export async function authenticateHttpRequest(
  authHeader?: string
): Promise<SessionData> {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    throw new Error("Basic Auth required");
  }

  const { email, password } = parseBasicAuth(authHeader);

  // Create new client for this request
  const sunsamaClient = new SunsamaClient();
  await sunsamaClient.login(email, password);

  return {
    sunsamaClient,
    email
  };
}
