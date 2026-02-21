import { SunsamaClient } from "sunsama-api/client";
import type { z, ZodTypeAny } from "zod";
import { toTsv } from "../utils/to-tsv.js";
import { getClient } from "../utils/client-resolver.js";

/**
 * MCP-compliant text response returned by all tool execute functions.
 * The index signature is required for structural compatibility with the SDK's CallToolResult.
 */
export interface McpResponse {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
}

/**
 * Tool context injected into every tool's execute function.
 * client is always present — resolved by withTransportClient before calling execute.
 */
export interface ToolContext {
  client: SunsamaClient;
  session?: unknown;
}

/**
 * Tool configuration, generic over the Zod schema type so that
 * execute receives args typed from the schema rather than `any`.
 * This interface is for authoring tools — TypeScript enforces the
 * arg types derived from the schema at the point of definition.
 */
export interface ToolConfig<TSchema extends ZodTypeAny> {
  name: string;
  description: string;
  parameters: TSchema;
  execute: (args: z.infer<TSchema>, context: ToolContext) => Promise<McpResponse>;
}

/**
 * The object returned by withTransportClient and registered with the MCP SDK.
 * Uses Record<string, unknown> for the execute signature so it is compatible
 * with server.registerTool regardless of which schema each tool uses.
 * Type safety is enforced at authoring time via ToolConfig<TSchema>.
 */
export interface ToolWrapper {
  name: string;
  description: string;
  parameters: ZodTypeAny;
  /** Extracted ZodRawShape for direct use with server.registerTool. */
  inputSchema: Record<string, ZodTypeAny>;
  execute: (args: Record<string, unknown>, extra: Record<string, unknown>) => Promise<McpResponse>;
}

/**
 * Higher-order function that enhances a tool with transport-aware client injection.
 * Automatically provides the correct SunsamaClient based on the transport type:
 * - stdio: Uses global authenticated client
 * - HTTP: Uses per-request authenticated client from session
 */
export function withTransportClient<TSchema extends ZodTypeAny>(
  toolConfig: ToolConfig<TSchema>,
): ToolWrapper {
  // Extract the ZodRawShape so main.ts can pass it directly to server.registerTool.
  // All tool parameters are ZodObjects, so .shape is always present at runtime.
  const inputSchema = (
    "shape" in toolConfig.parameters
      ? (toolConfig.parameters as { shape: Record<string, ZodTypeAny> }).shape
      : {}
  ) as Record<string, ZodTypeAny>;

  return {
    name: toolConfig.name,
    description: toolConfig.description,
    parameters: toolConfig.parameters,
    inputSchema,
    execute: async (args: Record<string, unknown>, extra: Record<string, unknown> = {}) => {
      try {
        // Auto-resolve client based on transport
        const client = await getClient(extra);

        // Execute tool with injected client
        const context: ToolContext = { client, session: extra };

        // Safe cast: the MCP SDK validates args against the schema before calling execute,
        // so args will match z.infer<TSchema> at runtime.
        return await toolConfig.execute(args as z.infer<TSchema>, context);
      } catch (error) {
        console.error(`Tool ${toolConfig.name} error:`, error);
        throw error;
      }
    }
  };
}

/**
 * Formats data as a JSON text response.
 */
export function formatJsonResponse(data: unknown): McpResponse {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Formats array data as a TSV text response.
 */
export function formatTsvResponse(data: unknown[]): McpResponse {
  return {
    content: [
      {
        type: "text",
        text: toTsv(data),
      },
    ],
  };
}

/**
 * Formats paginated array data as a TSV text response with a pagination metadata header.
 */
export function formatPaginatedTsvResponse(
  data: unknown[],
  pagination: {
    offset: number;
    limit: number;
    count: number;
    hasMore: boolean;
    nextOffset: number | null;
  },
): McpResponse {
  const header =
    `# Pagination: offset=${pagination.offset}, limit=${pagination.limit}, count=${pagination.count}, hasMore=${pagination.hasMore}, nextOffset=${
      pagination.nextOffset ?? "null"
    }`;
  const responseText = `${header}\n${toTsv(data)}`;

  return {
    content: [
      {
        type: "text",
        text: responseText,
      },
    ],
  };
}
