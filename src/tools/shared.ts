import { toTsv } from "../utils/to-tsv.js";
import { getClient } from "../utils/client-resolver.js";

/**
 * Tool context interface for withTransportClient pattern
 */
export interface ToolContext {
  session?: any;
  client?: any;
  [key: string]: any;
}

/**
 * Tool configuration interface
 */
export interface ToolConfig {
  name: string;
  description: string;
  parameters: any;
  execute: (args: any, context: ToolContext) => Promise<any>;
}

/**
 * Higher-order function that enhances a tool with transport-aware client injection.
 * Automatically provides the correct SunsamaClient based on the transport type:
 * - stdio: Uses global authenticated client
 * - HTTP: Uses per-request authenticated client from session
 */
export function withTransportClient(toolConfig: ToolConfig) {
  return {
    name: toolConfig.name,
    description: toolConfig.description,
    parameters: toolConfig.parameters,
    execute: async (args: any, extra: any = {}) => {
      try {
        // Auto-resolve client based on transport
        const client = await getClient(extra.session);

        // Execute tool with injected client
        const context: ToolContext = { ...extra, client };
        const result = await toolConfig.execute(args, context);

        // Ensure MCP-compliant response format
        if (result && Array.isArray(result.content)) {
          return result;
        }

        // Wrap if needed
        return {
          content: [
            {
              type: "text",
              text: typeof result === "string"
                ? result
                : JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error(`Tool ${toolConfig.name} error:`, error);
        throw error;
      }
    }
  };
}

/**
 * Formats data as JSON response
 */
export function formatJsonResponse(data: any) {
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
 * Formats array data as TSV response
 */
export function formatTsvResponse(data: any[]) {
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
 * Formats paginated TSV response with metadata header
 */
export function formatPaginatedTsvResponse(
  data: any[],
  pagination: {
    offset: number;
    limit: number;
    count: number;
    hasMore: boolean;
    nextOffset: number | null;
  },
) {
  const header =
    `# Pagination: offset=${pagination.offset}, limit=${pagination.limit}, count=${pagination.count}, hasMore=${pagination.hasMore}, nextOffset=${
      pagination.nextOffset || "null"
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
