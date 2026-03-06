import type { z, ZodTypeAny } from "zod";
import { getClient } from "../utils/client-resolver.js";
import type { ToolConfig, ToolContext, ToolWrapper } from "./shared.js";

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
