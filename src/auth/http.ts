import { SunsamaClient } from "sunsama-api";
import type { SessionData } from "./types.js";
import { IncomingMessage } from "http";

/**
 * Parse HTTP Basic Auth credentials from Authorization header
 * @param authHeader - The Authorization header value
 * @returns Object containing email and password
 * @throws {Error} If the header format is invalid
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
 * HTTP Basic Auth authenticator for httpStream transport
 * @param request - The incoming request object
 * @returns SessionData with authenticated SunsamaClient
 * @throws {Response} HTTP 401 response for authentication failures
 */
export async function httpStreamAuthenticator(request: IncomingMessage): Promise<SessionData> {
  const authHeader = request.headers["authorization"];
  
  if (!authHeader || Array.isArray(authHeader) || !authHeader.startsWith('Basic ')) {
    throw new Response(null, {
      status: 401,
      statusText: "Unauthorized: Basic Auth required",
      headers: { 'WWW-Authenticate': 'Basic realm="Sunsama MCP"' }
    });
  }

  try {
    // Parse Basic Auth credentials
    const { email, password } = parseBasicAuth(authHeader);

    // Create and authenticate SunsamaClient
    const sunsamaClient = new SunsamaClient();
    await sunsamaClient.login(email, password);
    
    console.log(`HTTP session authenticated for user: ${email}`);
    
    return {
      sunsamaClient,
      email
    };
  } catch (error) {
    console.log("Authentication failed:", error instanceof Error ? error.message : 'Unknown error');
    throw new Response(null, {
      status: 401,
      statusText: "Unauthorized: Invalid Sunsama credentials"
    });
  }
}