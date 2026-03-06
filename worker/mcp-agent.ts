import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SunsamaClient } from "sunsama-api/client";
import { allToolConfigs } from "../src/tools/index";
import type { ToolContext } from "../src/tools/shared";
import type { Env, SunsamaOAuthProps } from "./types";
import type { ZodTypeAny } from "zod";

/**
 * Cloudflare Durable Object that serves as an MCP server for Sunsama.
 * Each user session gets its own instance with OAuth props containing
 * the Sunsama session token.
 */
export class SunsamaMcpAgent extends McpAgent<Env, unknown, SunsamaOAuthProps> {
  server = new McpServer({
    name: "Sunsama MCP Server",
    version: "0.19.1",
  });

  async init(): Promise<void> {
    // Create a SunsamaClient from the OAuth session token
    const sessionToken = this.props?.sunsamaSessionToken;
    if (!sessionToken) {
      throw new Error("No Sunsama session token in OAuth props — user must re-authenticate");
    }

    const client = new SunsamaClient({ sessionToken });
    const context: ToolContext = { client };

    // Register all tools from existing configs
    for (const config of allToolConfigs) {
      const inputSchema = (
        "shape" in config.parameters
          ? (config.parameters as { shape: Record<string, ZodTypeAny> }).shape
          : {}
      ) as Record<string, ZodTypeAny>;

      this.server.registerTool(
        config.name,
        {
          description: config.description,
          inputSchema,
        },
        async (args: Record<string, unknown>) => {
          return await config.execute(args as never, context);
        },
      );
    }
  }
}
