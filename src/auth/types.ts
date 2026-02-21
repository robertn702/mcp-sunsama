import { SunsamaClient } from "sunsama-api/client";

/**
 * Session data interface for HTTP transport
 */
export interface SessionData extends Record<string, unknown> {
  sunsamaClient: SunsamaClient;
  email?: string;
  createdAt: number;
  lastAccessedAt: number;
}

/**
 * Error thrown when authentication fails (missing/invalid credentials or login failure).
 * Used to distinguish auth failures (401) from other server errors (500) in HTTP transport.
 */
export class AuthenticationError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "AuthenticationError";
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}