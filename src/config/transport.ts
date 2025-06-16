/**
 * Transport configuration for the Sunsama MCP Server
 * Supports both stdio and httpStream transports based on environment variables
 */

import { z } from "zod";

export type TransportType = "stdio" | "httpStream";

export type TransportConfig =
  | {
  transportType: "stdio";
}
  | {
  transportType: "httpStream";
  httpStream: {
    port: number;
    endpoint: `/${string}`;
  };
};

/**
 * Zod schema for validating transport-related environment variables
 */
const TransportEnvSchema = z.object({
  TRANSPORT_TYPE: z.enum(["stdio", "httpStream"]).default("stdio"),
  PORT: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(65535))
    .optional(),
  HTTP_ENDPOINT: z.string().refine(val => val.startsWith("/"), {
    message: "HTTP_ENDPOINT must start with '/'"
  }).transform(val => val as `/${string}`).default("/mcp")
});

/**
 * Gets the transport configuration based on environment variables
 *
 * Environment Variables:
 * - TRANSPORT_TYPE: "stdio" | "httpStream" (default: "stdio")
 * - PORT: HTTP server port (default: 3000, only for httpStream)
 * - HTTP_ENDPOINT: HTTP endpoint path (default: "/mcp", only for httpStream)
 *
 * @throws {z.ZodError} When environment variables are invalid
 */
export function getTransportConfig(): TransportConfig {
  try {
    const env = TransportEnvSchema.parse(process.env);

    if (env.TRANSPORT_TYPE === "httpStream") {
      return {
        transportType: "httpStream",
        httpStream: {
          port: env.PORT || 3000,
          endpoint: env.HTTP_ENDPOINT
        }
      };
    }

    return {
      transportType: "stdio"
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue =>
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');
      throw new Error(`Invalid transport configuration: ${issues}`);
    }
    throw error;
  }
}

/**
 * Returns true if the current transport configuration is for HTTP streaming
 */
export function isHttpStreamTransport(): boolean {
  return getTransportConfig().transportType === "httpStream";
}

/**
 * Returns true if the current transport configuration is for stdio
 */
export function isStdioTransport(): boolean {
  return getTransportConfig().transportType === "stdio";
}