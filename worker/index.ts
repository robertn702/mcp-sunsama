import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { authHandler } from "./auth-handler";
import { SunsamaMcpAgent } from "./mcp-agent";
import type { Env } from "./types";

// Re-export the Durable Object class so Cloudflare can instantiate it
export { SunsamaMcpAgent };

/**
 * Main Worker entry point.
 *
 * OAuthProvider wraps the entire Worker and handles:
 * - OAuth 2.1 metadata endpoints (/.well-known/*)
 * - Token issuance and refresh (/oauth/token)
 * - Dynamic client registration (/oauth/register)
 * - Token validation for API routes (/mcp/*)
 *
 * Authenticated MCP requests are routed to the SunsamaMcpAgent Durable Object.
 * Unauthenticated requests (e.g., /authorize) go to the authHandler.
 */
export default new OAuthProvider<Env>({
  apiRoute: "/mcp",
  // The MCP agent Durable Object handles authenticated API requests
  apiHandler: SunsamaMcpAgent.serve("/mcp"),
  // The auth handler renders the login form and processes credentials
  defaultHandler: authHandler,
  // Standard OAuth endpoints
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/oauth/token",
  clientRegistrationEndpoint: "/oauth/register",
  // Token TTL configuration
  accessTokenTTL: 3600, // 1 hour
  refreshTokenTTL: 2592000, // 30 days
});
