import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";

export interface Env {
  MCP_AGENT: DurableObjectNamespace;
  OAUTH_KV: KVNamespace;
  OAUTH_PROVIDER: OAuthHelpers;
  JWT_SIGNING_KEY: string;
  COOKIE_ENCRYPTION_KEY: string;
}

/** Props stored in OAuth token, available to MCP agent via this.props */
export interface SunsamaOAuthProps extends Record<string, unknown> {
  sunsamaSessionToken: string;
  email: string;
}
