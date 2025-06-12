import { SunsamaClient } from "sunsama-api";

/**
 * Global Sunsama client instance for stdio transport
 */
let globalSunsamaClient: SunsamaClient | null = null;

/**
 * Initialize stdio authentication using environment variables
 * @throws {Error} If credentials are missing or authentication fails
 */
export async function initializeStdioAuth(): Promise<void> {
  if (!process.env.SUNSAMA_EMAIL || !process.env.SUNSAMA_PASSWORD) {
    throw new Error(
      "Sunsama credentials not configured. Please set SUNSAMA_EMAIL and SUNSAMA_PASSWORD environment variables."
    );
  }

  globalSunsamaClient = new SunsamaClient();
  await globalSunsamaClient.login(process.env.SUNSAMA_EMAIL, process.env.SUNSAMA_PASSWORD);
}

/**
 * Get the global Sunsama client instance for stdio transport
 * @returns {SunsamaClient} The authenticated global client
 * @throws {Error} If global client is not initialized
 */
export function getGlobalSunsamaClient(): SunsamaClient {
  if (!globalSunsamaClient) {
    throw new Error("Global Sunsama client not initialized.");
  }
  return globalSunsamaClient;
}