import type { Context } from "fastmcp";
import type { SessionData } from "../auth/types.js";
import { getSunsamaClient } from "../utils/client-resolver.js";
import { toTsv } from "../utils/to-tsv.js";

export type ToolContext = Context<SessionData>;

export interface ToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
}

/**
 * Creates a standardized tool execution wrapper with error handling and logging
 */
export function createToolWrapper<T>(config: {
  name: string;
  description: string;
  parameters: any;
  execute: (args: T, context: ToolContext) => Promise<any>;
}) {
  return {
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    execute: async (args: T, context: ToolContext) => {
      try {
        context.log.info(`Executing ${config.name}`);
        const result = await config.execute(args, context);
        context.log.info(`Successfully executed ${config.name}`);
        return result;
      } catch (error) {
        context.log.error(`Failed to execute ${config.name}`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw new Error(`Failed to execute ${config.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };
}

/**
 * Gets the Sunsama client for the current session
 */
export function getClient(session: SessionData | undefined | null) {
  return getSunsamaClient(session as SessionData | null);
}

/**
 * Formats data as JSON response
 */
export function formatJsonResponse(data: any): ToolResponse {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}

/**
 * Formats array data as TSV response
 */
export function formatTsvResponse(data: any[]): ToolResponse {
  return {
    content: [
      {
        type: "text",
        text: toTsv(data)
      }
    ]
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
  }
): ToolResponse {
  const header = `# Pagination: offset=${pagination.offset}, limit=${pagination.limit}, count=${pagination.count}, hasMore=${pagination.hasMore}, nextOffset=${pagination.nextOffset || 'null'}`;
  const responseText = `${header}\n${toTsv(data)}`;
  
  return {
    content: [
      {
        type: "text",
        text: responseText
      }
    ]
  };
}

