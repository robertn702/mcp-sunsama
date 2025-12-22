import { SunsamaClient } from "sunsama-api/client";

/**
 * Cached authentication promise to prevent concurrent auth attempts
 */
let authenticationPromise: Promise<SunsamaClient> | null = null;

/**
 * Initialize stdio authentication using environment variables
 * Supports session token (SUNSAMA_SESSION_TOKEN) or email/password (SUNSAMA_EMAIL, SUNSAMA_PASSWORD)
 * @throws {Error} If credentials are missing or authentication fails
 */
export async function initializeStdioAuth(): Promise<SunsamaClient> {
  // Prefer session token if available (useful for Google SSO users)
  if (process.env.SUNSAMA_SESSION_TOKEN) {
    const sunsamaClient = new SunsamaClient({
      sessionToken: process.env.SUNSAMA_SESSION_TOKEN
    });
    return sunsamaClient;
  }

  // Fall back to email/password authentication
  if (!process.env.SUNSAMA_EMAIL || !process.env.SUNSAMA_PASSWORD) {
    throw new Error(
      "Sunsama credentials not configured. Please set SUNSAMA_SESSION_TOKEN or both SUNSAMA_EMAIL and SUNSAMA_PASSWORD environment variables."
    );
  }

  const sunsamaClient = new SunsamaClient();
  await sunsamaClient.login(process.env.SUNSAMA_EMAIL, process.env.SUNSAMA_PASSWORD);

  return sunsamaClient;
}

/**
 * Get the global Sunsama client instance for stdio transport
 * @returns {Promise<SunsamaClient>} The authenticated global client
 * @throws {Error} If credentials are missing or authentication fails
 */
export async function getGlobalSunsamaClient(): Promise<SunsamaClient> {
  if (!authenticationPromise) {
    authenticationPromise = initializeStdioAuth();
  }

  return authenticationPromise;
}