import { toTsv } from "../utils/to-tsv.js";

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
