import { SunsamaClient } from "sunsama-api/client";
import type { z, ZodTypeAny } from "zod";
import { toTsv } from "../utils/to-tsv.js";

// ---------------------------------------------------------------------------
// Bulk operation types and utilities
// ---------------------------------------------------------------------------

export type BulkTaskResult =
  | { taskId: string; status: "fulfilled" }
  | { taskId: string; status: "rejected"; error: string };

export interface BulkOperationResponse {
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
  results: BulkTaskResult[];
}

function extractErrorDetail(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  let code: unknown;
  if ("statusCode" in err) code = err.statusCode;
  else if ("code" in err) code = err.code;
  const prefix = code != null ? `[${code}] ` : "";
  return `${prefix}${err.message}`;
}

/**
 * Runs an async operation for every task ID sequentially.
 * Sequential execution avoids triggering third-party API rate limits.
 * One failure does not block others. Returns per-task results.
 */
export async function executeBulk(
  taskIds: string[],
  operation: (taskId: string) => Promise<unknown>,
): Promise<BulkOperationResponse> {
  const results: BulkTaskResult[] = [];
  let succeeded = 0;

  for (const taskId of taskIds) {
    try {
      await operation(taskId);
      results.push({ taskId, status: "fulfilled" });
      succeeded++;
    } catch (err) {
      const error = extractErrorDetail(err);
      console.error(`[executeBulk] Task ${taskId} failed:`, err);
      results.push({ taskId, status: "rejected", error });
    }
  }

  return {
    summary: {
      total: taskIds.length,
      succeeded,
      failed: taskIds.length - succeeded,
    },
    results,
  };
}

/**
 * Formats a bulk operation response as a summary header line + TSV of per-task results.
 */
export function formatBulkResponse(
  response: BulkOperationResponse,
): McpResponse {
  const header = `# Summary: total=${response.summary.total}, succeeded=${response.summary.succeeded}, failed=${response.summary.failed}`;
  const tsvData = toTsv(response.results);
  const allFailed =
    response.summary.total > 0 && response.summary.succeeded === 0;

  return {
    isError: allFailed,
    content: [
      {
        type: "text",
        text: `${header}\n${tsvData}`,
      },
    ],
  };
}

/**
 * MCP-compliant text response returned by all tool execute functions.
 * The index signature is required for structural compatibility with the SDK's CallToolResult.
 */
export interface McpResponse {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
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
