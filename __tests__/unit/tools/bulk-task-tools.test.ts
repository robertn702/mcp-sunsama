import { describe, test, expect } from "bun:test";
import {
  executeBulk,
  formatBulkResponse,
  type BulkOperationResponse,
} from "../../../src/tools/shared.js";
import {
  updateTaskCompleteBulkSchema,
  updateTaskUncompleteBulkSchema,
  deleteTaskBulkSchema,
  updateTaskSnoozeDateBulkSchema,
  updateTaskBacklogBulkSchema,
} from "../../../src/schemas.js";

// ---------------------------------------------------------------------------
// executeBulk helper
// ---------------------------------------------------------------------------

describe("executeBulk", () => {
  test("all tasks succeed", async () => {
    const operation = async (_taskId: string) => ({ success: true });
    const result = await executeBulk(["t1", "t2", "t3"], operation);

    expect(result.summary).toEqual({ total: 3, succeeded: 3, failed: 0 });
    expect(result.results).toEqual([
      { taskId: "t1", status: "fulfilled" },
      { taskId: "t2", status: "fulfilled" },
      { taskId: "t3", status: "fulfilled" },
    ]);
  });

  test("all tasks fail", async () => {
    const operation = async (_taskId: string) => {
      throw new Error("not found");
    };
    const result = await executeBulk(["t1", "t2"], operation);

    expect(result.summary).toEqual({ total: 2, succeeded: 0, failed: 2 });
    expect(result.results[0]).toEqual({
      taskId: "t1",
      status: "rejected",
      error: "not found",
    });
    expect(result.results[1]).toEqual({
      taskId: "t2",
      status: "rejected",
      error: "not found",
    });
  });

  test("mixed success and failure", async () => {
    const operation = async (taskId: string) => {
      if (taskId === "t2") throw new Error("task t2 failed");
      return { success: true };
    };
    const result = await executeBulk(["t1", "t2", "t3"], operation);

    expect(result.summary).toEqual({ total: 3, succeeded: 2, failed: 1 });
    expect(result.results[0].status).toBe("fulfilled");
    expect(result.results[1]).toEqual({
      taskId: "t2",
      status: "rejected",
      error: "task t2 failed",
    });
    expect(result.results[2].status).toBe("fulfilled");
  });

  test("empty array", async () => {
    const operation = async (_taskId: string) => ({ success: true });
    const result = await executeBulk([], operation);

    expect(result.summary).toEqual({ total: 0, succeeded: 0, failed: 0 });
    expect(result.results).toEqual([]);
  });

  test("single task", async () => {
    const operation = async (_taskId: string) => ({ success: true });
    const result = await executeBulk(["t1"], operation);

    expect(result.summary).toEqual({ total: 1, succeeded: 1, failed: 0 });
    expect(result.results).toHaveLength(1);
  });

  test("captures non-Error rejection as string", async () => {
    const operation = async (_taskId: string) => {
      throw "string error";
    };
    const result = await executeBulk(["t1"], operation);

    expect(result.results[0]).toEqual({
      taskId: "t1",
      status: "rejected",
      error: "string error",
    });
  });
});

// ---------------------------------------------------------------------------
// formatBulkResponse
// ---------------------------------------------------------------------------

describe("formatBulkResponse", () => {
  test("produces summary header and TSV body", () => {
    const response: BulkOperationResponse = {
      summary: { total: 2, succeeded: 1, failed: 1 },
      results: [
        { taskId: "t1", status: "fulfilled" },
        { taskId: "t2", status: "rejected", error: "not found" },
      ],
    };

    const mcpResponse = formatBulkResponse(response);

    expect(mcpResponse.content).toHaveLength(1);
    const text = mcpResponse.content[0].text;
    expect(text).toStartWith("# Summary: total=2, succeeded=1, failed=1\n");
    // TSV body should contain task IDs and statuses
    expect(text).toContain("t1");
    expect(text).toContain("t2");
    expect(text).toContain("fulfilled");
    expect(text).toContain("rejected");
  });

  test("handles all-success response", () => {
    const response: BulkOperationResponse = {
      summary: { total: 3, succeeded: 3, failed: 0 },
      results: [
        { taskId: "t1", status: "fulfilled" },
        { taskId: "t2", status: "fulfilled" },
        { taskId: "t3", status: "fulfilled" },
      ],
    };

    const mcpResponse = formatBulkResponse(response);
    const text = mcpResponse.content[0].text;
    expect(text).toStartWith("# Summary: total=3, succeeded=3, failed=0\n");
  });

  test("handles empty results", () => {
    const response: BulkOperationResponse = {
      summary: { total: 0, succeeded: 0, failed: 0 },
      results: [],
    };

    const mcpResponse = formatBulkResponse(response);
    const text = mcpResponse.content[0].text;
    expect(text).toStartWith("# Summary: total=0, succeeded=0, failed=0\n");
  });
});

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

describe("Bulk schemas", () => {
  describe("updateTaskCompleteBulkSchema", () => {
    test("accepts valid input with taskIds only", () => {
      const result = updateTaskCompleteBulkSchema.safeParse({
        taskIds: ["t1", "t2"],
      });
      expect(result.success).toBe(true);
    });

    test("accepts valid input with completeOn", () => {
      const result = updateTaskCompleteBulkSchema.safeParse({
        taskIds: ["t1"],
        completeOn: "2026-02-23T12:00:00Z",
      });
      expect(result.success).toBe(true);
    });

    test("rejects empty taskIds array", () => {
      const result = updateTaskCompleteBulkSchema.safeParse({ taskIds: [] });
      expect(result.success).toBe(false);
    });

    test("rejects empty string in taskIds", () => {
      const result = updateTaskCompleteBulkSchema.safeParse({
        taskIds: ["t1", ""],
      });
      expect(result.success).toBe(false);
    });

    test("rejects missing taskIds", () => {
      const result = updateTaskCompleteBulkSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("updateTaskUncompleteBulkSchema", () => {
    test("accepts valid input", () => {
      const result = updateTaskUncompleteBulkSchema.safeParse({
        taskIds: ["t1"],
      });
      expect(result.success).toBe(true);
    });

    test("rejects empty taskIds", () => {
      const result = updateTaskUncompleteBulkSchema.safeParse({ taskIds: [] });
      expect(result.success).toBe(false);
    });
  });

  describe("deleteTaskBulkSchema", () => {
    test("accepts valid input", () => {
      const result = deleteTaskBulkSchema.safeParse({ taskIds: ["t1", "t2"] });
      expect(result.success).toBe(true);
    });

    test("rejects empty taskIds", () => {
      const result = deleteTaskBulkSchema.safeParse({ taskIds: [] });
      expect(result.success).toBe(false);
    });
  });

  describe("updateTaskSnoozeDateBulkSchema", () => {
    test("accepts valid input with required fields", () => {
      const result = updateTaskSnoozeDateBulkSchema.safeParse({
        taskIds: ["t1"],
        newDay: "2026-02-25",
      });
      expect(result.success).toBe(true);
    });

    test("accepts valid input with timezone", () => {
      const result = updateTaskSnoozeDateBulkSchema.safeParse({
        taskIds: ["t1", "t2"],
        newDay: "2026-02-25",
        timezone: "America/New_York",
      });
      expect(result.success).toBe(true);
    });

    test("rejects missing newDay", () => {
      const result = updateTaskSnoozeDateBulkSchema.safeParse({
        taskIds: ["t1"],
      });
      expect(result.success).toBe(false);
    });

    test("rejects invalid date format", () => {
      const result = updateTaskSnoozeDateBulkSchema.safeParse({
        taskIds: ["t1"],
        newDay: "02-25-2026",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateTaskBacklogBulkSchema", () => {
    test("accepts valid input", () => {
      const result = updateTaskBacklogBulkSchema.safeParse({
        taskIds: ["t1"],
      });
      expect(result.success).toBe(true);
    });

    test("accepts valid input with timezone", () => {
      const result = updateTaskBacklogBulkSchema.safeParse({
        taskIds: ["t1"],
        timezone: "Europe/London",
      });
      expect(result.success).toBe(true);
    });

    test("rejects empty taskIds", () => {
      const result = updateTaskBacklogBulkSchema.safeParse({ taskIds: [] });
      expect(result.success).toBe(false);
    });
  });
});
