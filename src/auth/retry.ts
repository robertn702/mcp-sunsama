import { SunsamaClient } from "sunsama-api/client";
import { SunsamaAuthError } from "sunsama-api/errors";

const RETRY_DELAYS = [1_000, 5_000, 15_000]; // ms

/**
 * Calls sunsamaClient.login() with exponential backoff on 429 rate limit errors.
 * Makes up to 4 attempts total (initial + 3 retries) with delays of 5s, 15s, 45s.
 * Non-429 errors are rethrown immediately without retrying.
 */
export async function loginWithRetry(
  client: SunsamaClient,
  email: string,
  password: string,
): Promise<void> {
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      await client.login(email, password);
      return;
    } catch (err) {
      const isRateLimit =
        err instanceof SunsamaAuthError && err.message.includes("429");

      if (!isRateLimit || attempt === RETRY_DELAYS.length) {
        throw err;
      }

      const delay = RETRY_DELAYS[attempt]!;
      console.error(
        `[Auth] Rate limited (429). Retrying in ${delay / 1000}s (attempt ${attempt + 1}/${RETRY_DELAYS.length})`,
      );
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }
}
