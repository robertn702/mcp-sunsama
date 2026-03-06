import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SunsamaClient } from "sunsama-api/client";
import type { CreateTaskOptions, CalendarEventUpdateData, CreateCalendarEventOptions } from "sunsama-api/types";
import { z } from "zod";
import type { Env, SunsamaOAuthProps } from "./types";

// Pure imports — these have no Node.js transport dependencies
import { VERSION, SERVER_NAME } from "../src/constants";
import * as S from "../src/schemas";
import { filterTasksByCompletion } from "../src/utils/task-filters";
import { trimTasksForResponse } from "../src/utils/task-trimmer";
import { toTsv } from "../src/utils/to-tsv";

// ---------------------------------------------------------------------------
// Response helpers (inlined to avoid importing from tools/shared which would
// pull in the Node.js transport chain via re-exports)
// ---------------------------------------------------------------------------

type McpResponse = {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

function json(data: unknown): McpResponse {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function tsvResponse(data: unknown[]): McpResponse {
  return { content: [{ type: "text", text: toTsv(data) }] };
}

function paginatedTsv(
  data: unknown[],
  p: { offset: number; limit: number; count: number; hasMore: boolean; nextOffset: number | null },
): McpResponse {
  const header = `# Pagination: offset=${p.offset}, limit=${p.limit}, count=${p.count}, hasMore=${p.hasMore}, nextOffset=${p.nextOffset ?? "null"}`;
  return { content: [{ type: "text", text: `${header}\n${toTsv(data)}` }] };
}

type BulkResult =
  | { taskId: string; status: "fulfilled" }
  | { taskId: string; status: "rejected"; error: string };

async function executeBulk(
  taskIds: string[],
  op: (id: string) => Promise<unknown>,
): Promise<McpResponse> {
  const results: BulkResult[] = [];
  let succeeded = 0;
  for (const taskId of taskIds) {
    try {
      await op(taskId);
      results.push({ taskId, status: "fulfilled" });
      succeeded++;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      results.push({ taskId, status: "rejected", error });
    }
  }
  const total = taskIds.length;
  const failed = total - succeeded;
  const header = `# Summary: total=${total}, succeeded=${succeeded}, failed=${failed}`;
  return {
    isError: total > 0 && succeeded === 0,
    content: [{ type: "text", text: `${header}\n${toTsv(results)}` }],
  };
}

// Helper to extract .shape from a ZodObject for MCP SDK registration
function shape(schema: z.ZodTypeAny): Record<string, z.ZodTypeAny> {
  return "shape" in schema
    ? (schema as unknown as { shape: Record<string, z.ZodTypeAny> }).shape
    : {};
}

// ---------------------------------------------------------------------------
// McpAgent Durable Object
// ---------------------------------------------------------------------------

export class SunsamaMcpAgent extends McpAgent<Env, unknown, SunsamaOAuthProps> {
  server = new McpServer({ name: SERVER_NAME, version: VERSION });

  async init(): Promise<void> {
    const sessionToken = this.props?.sunsamaSessionToken;
    if (!sessionToken) {
      throw new Error("No Sunsama session token in OAuth props — user must re-authenticate");
    }
    const c = new SunsamaClient({ sessionToken });

    // --- User tools ---

    this.server.tool("get-user", "Get current user information including profile, timezone, and group details", shape(S.getUserSchema), async () => {
      return json(await c.getUser());
    });

    // --- Stream tools ---

    this.server.tool("get-streams", "Get streams for the user's group (streams are called 'channels' in the Sunsama UI)", shape(S.getStreamsSchema), async () => {
      return tsvResponse(await c.getStreamsByGroupId());
    });

    // --- Task query tools ---

    this.server.tool("get-tasks-backlog", "Get tasks from the backlog", shape(S.getTasksBacklogSchema), async () => {
      return tsvResponse(trimTasksForResponse(await c.getTasksBacklog()));
    });

    this.server.tool("get-tasks-by-day", "Get tasks for a specific day with optional filtering by completion status", shape(S.getTasksByDaySchema), async (args) => {
      const { day, timezone, completionFilter = "all" } = args as S.GetTasksByDayInput;
      const tz = timezone ?? await c.getUserTimezone();
      const tasks = await c.getTasksByDay(day, tz);
      return tsvResponse(trimTasksForResponse(filterTasksByCompletion(tasks, completionFilter)));
    });

    this.server.tool("get-archived-tasks", "Get archived tasks with optional pagination", shape(S.getArchivedTasksSchema), async (args) => {
      const { offset = 0, limit = 100 } = args as S.GetArchivedTasksInput;
      const all = await c.getArchivedTasks(offset, limit + 1);
      const hasMore = all.length > limit;
      const tasks = hasMore ? all.slice(0, limit) : all;
      return paginatedTsv(trimTasksForResponse(tasks), { offset, limit, count: tasks.length, hasMore, nextOffset: hasMore ? offset + limit : null });
    });

    this.server.tool("get-task-by-id", "Get a specific task by its ID", shape(S.getTaskByIdSchema), async (args) => {
      const { taskId } = args as S.GetTaskByIdInput;
      return json(await c.getTaskById(taskId) || null);
    });

    // --- Task lifecycle tools ---

    this.server.tool("create-task", "Create a new task with optional properties", shape(S.createTaskSchema), async (args) => {
      const { text, notes, streamIds, timeEstimate, dueDate, snoozeUntil, private: isPrivate, taskId, integration } = args as S.CreateTaskInput;
      const opts: CreateTaskOptions = {};
      if (notes) opts.notes = notes;
      if (streamIds) opts.streamIds = streamIds;
      if (timeEstimate) opts.timeEstimate = timeEstimate;
      if (dueDate) opts.dueDate = dueDate;
      if (snoozeUntil) opts.snoozeUntil = snoozeUntil;
      if (isPrivate !== undefined) opts.private = isPrivate;
      if (taskId) opts.taskId = taskId;
      if (integration) opts.integration = integration;
      const result = await c.createTask(text, opts);
      return json({ success: result.success, taskId: result.updatedFields?._id, title: text, created: true, updatedFields: result.updatedFields });
    });

    this.server.tool("delete-task", "Delete a task permanently", shape(S.deleteTaskSchema), async (args) => {
      const { taskId, limitResponsePayload, wasTaskMerged } = args as S.DeleteTaskInput;
      const result = await c.deleteTask(taskId, limitResponsePayload, wasTaskMerged);
      return json({ success: result.success, taskId, deleted: true, updatedFields: result.updatedFields });
    });

    // --- Task update tools ---

    this.server.tool("update-task-complete", "Mark a task as complete with optional completion timestamp", shape(S.updateTaskCompleteSchema), async (args) => {
      const { taskId, completeOn, limitResponsePayload } = args as S.UpdateTaskCompleteInput;
      const result = await c.updateTaskComplete(taskId, completeOn, limitResponsePayload);
      return json({ success: result.success, taskId, completed: true, updatedFields: result.updatedFields });
    });

    this.server.tool("update-task-uncomplete", "Mark a completed task as incomplete", shape(S.updateTaskUncompleteSchema), async (args) => {
      const { taskId, limitResponsePayload } = args as S.UpdateTaskUncompleteInput;
      const result = await c.updateTaskUncomplete(taskId, limitResponsePayload);
      return json({ success: result.success, taskId, completed: false, updatedFields: result.updatedFields });
    });

    this.server.tool("update-task-snooze-date", "Update task snooze date to reschedule tasks or move them to backlog", shape(S.updateTaskSnoozeDateSchema), async (args) => {
      const { taskId, newDay, timezone, limitResponsePayload } = args as S.UpdateTaskSnoozeDateInput;
      const opts: { timezone?: string; limitResponsePayload?: boolean } = {};
      if (timezone) opts.timezone = timezone;
      if (limitResponsePayload !== undefined) opts.limitResponsePayload = limitResponsePayload;
      const result = await c.updateTaskSnoozeDate(taskId, newDay, opts);
      return json({ success: result.success, taskId, newDay, updatedFields: result.updatedFields });
    });

    this.server.tool("update-task-backlog", "Move a task to the backlog", shape(S.updateTaskBacklogSchema), async (args) => {
      const { taskId, timezone, limitResponsePayload } = args as S.UpdateTaskBacklogInput;
      const opts: { timezone?: string; limitResponsePayload?: boolean } = {};
      if (timezone) opts.timezone = timezone;
      if (limitResponsePayload !== undefined) opts.limitResponsePayload = limitResponsePayload;
      const result = await c.updateTaskSnoozeDate(taskId, null, opts);
      return json({ success: result.success, taskId, movedToBacklog: true, updatedFields: result.updatedFields });
    });

    this.server.tool("update-task-planned-time", "Update the planned time (time estimate) for a task", shape(S.updateTaskPlannedTimeSchema), async (args) => {
      const { taskId, timeEstimateMinutes, limitResponsePayload } = args as S.UpdateTaskPlannedTimeInput;
      const result = await c.updateTaskPlannedTime(taskId, timeEstimateMinutes, limitResponsePayload);
      return json({ success: result.success, taskId, timeEstimateMinutes, updatedFields: result.updatedFields });
    });

    this.server.tool("update-task-notes", "Update the notes content for a task", shape(S.updateTaskNotesSchema), async (args) => {
      const { taskId, html, markdown, limitResponsePayload } = args as S.UpdateTaskNotesInput;
      const hasHtml = html !== undefined;
      const hasMarkdown = markdown !== undefined;
      if (hasHtml === hasMarkdown) throw new Error("Exactly one of 'html' or 'markdown' must be provided");
      const apiContent = html ? { html } : { markdown: markdown! };
      const opts: { limitResponsePayload?: boolean } = {};
      if (limitResponsePayload !== undefined) opts.limitResponsePayload = limitResponsePayload;
      const result = await c.updateTaskNotes(taskId, apiContent, opts);
      return json({ success: result.success, taskId, notesUpdated: true, updatedFields: result.updatedFields });
    });

    this.server.tool("update-task-due-date", "Update the due date for a task", shape(S.updateTaskDueDateSchema), async (args) => {
      const { taskId, dueDate, limitResponsePayload } = args as S.UpdateTaskDueDateInput;
      const result = await c.updateTaskDueDate(taskId, dueDate, limitResponsePayload);
      return json({ success: result.success, taskId, dueDate, dueDateUpdated: true, updatedFields: result.updatedFields });
    });

    this.server.tool("update-task-text", "Update the text/title of a task", shape(S.updateTaskTextSchema), async (args) => {
      const { taskId, text, recommendedStreamId, limitResponsePayload } = args as S.UpdateTaskTextInput;
      const opts: { recommendedStreamId?: string | null; limitResponsePayload?: boolean } = {};
      if (recommendedStreamId !== undefined) opts.recommendedStreamId = recommendedStreamId;
      if (limitResponsePayload !== undefined) opts.limitResponsePayload = limitResponsePayload;
      const result = await c.updateTaskText(taskId, text, opts);
      return json({ success: result.success, taskId, text, textUpdated: true, updatedFields: result.updatedFields });
    });

    this.server.tool("update-task-stream", "Update the stream/channel assignment for a task", shape(S.updateTaskStreamSchema), async (args) => {
      const { taskId, streamId, limitResponsePayload } = args as S.UpdateTaskStreamInput;
      const result = await c.updateTaskStream(taskId, streamId, limitResponsePayload !== undefined ? limitResponsePayload : true);
      return json({ success: result.success, taskId, streamId, streamUpdated: true, updatedFields: result.updatedFields });
    });

    this.server.tool("reorder-task", "Reorder a task within a day by moving it to a specific 0-based position (0 = top)", shape(S.reorderTaskSchema), async (args) => {
      const { taskId, position, day, timezone } = args as S.ReorderTaskInput;
      const tz = timezone ?? await c.getUserTimezone();
      const result = await c.reorderTask(taskId, position, day, { timezone: tz });
      return json({ success: true, taskId, position, day, updatedTaskIds: result.updatedTaskIds });
    });

    // --- Subtask tools ---

    this.server.tool("create-subtasks", "Create multiple subtasks for a task (low-level API for bulk operations)", shape(S.createSubtasksSchema), async (args) => {
      const { taskId, subtaskIds, limitResponsePayload } = args as S.CreateSubtasksInput;
      const result = await c.createSubtasks(taskId, subtaskIds, limitResponsePayload);
      return json({ success: result.success, taskId, subtaskIds, subtasksCreated: true, count: subtaskIds.length, updatedFields: result.updatedFields });
    });

    this.server.tool("update-subtask-title", "Update the title of a subtask", shape(S.updateSubtaskTitleSchema), async (args) => {
      const { taskId, subtaskId, title } = args as S.UpdateSubtaskTitleInput;
      const result = await c.updateSubtaskTitle(taskId, subtaskId, title);
      return json({ success: result.success, taskId, subtaskId, title, subtaskTitleUpdated: true, updatedFields: result.updatedFields });
    });

    this.server.tool("complete-subtask", "Mark a subtask as complete with optional completion timestamp", shape(S.completeSubtaskSchema), async (args) => {
      const { taskId, subtaskId, completedDate, limitResponsePayload } = args as S.CompleteSubtaskInput;
      const result = await c.completeSubtask(taskId, subtaskId, completedDate, limitResponsePayload);
      return json({ success: result.success, taskId, subtaskId, subtaskCompleted: true, completedDate: completedDate || new Date().toISOString(), updatedFields: result.updatedFields });
    });

    this.server.tool("uncomplete-subtask", "Mark a subtask as incomplete (uncomplete it)", shape(S.uncompleteSubtaskSchema), async (args) => {
      const { taskId, subtaskId, limitResponsePayload } = args as S.UncompleteSubtaskInput;
      const result = await c.uncompleteSubtask(taskId, subtaskId, limitResponsePayload);
      return json({ success: result.success, taskId, subtaskId, subtaskUncompleted: true, updatedFields: result.updatedFields });
    });

    this.server.tool("add-subtask", "Convenience method to create a subtask with a title in one call (recommended for single subtask creation)", shape(S.addSubtaskSchema), async (args) => {
      const { taskId, title } = args as S.AddSubtaskInput;
      const result = await c.addSubtask(taskId, title);
      return json({ success: result.result.success, taskId, subtaskId: result.subtaskId, title, subtaskAdded: true, updatedFields: result.result.updatedFields });
    });

    // --- Calendar tools ---

    this.server.tool("create-calendar-event", "Create a new calendar event in Sunsama", shape(S.createCalendarEventSchema), async (args) => {
      const { title, startDate, endDate, description, calendarId, service, streamIds, visibility, transparency, isAllDay, seedTaskId } = args as S.CreateCalendarEventInput;
      const opts: CreateCalendarEventOptions = {};
      if (description !== undefined) opts.description = description;
      if (calendarId !== undefined) opts.calendarId = calendarId;
      if (service !== undefined) opts.service = service;
      if (streamIds !== undefined) opts.streamIds = streamIds;
      if (visibility !== undefined) opts.visibility = visibility;
      if (transparency !== undefined) opts.transparency = transparency;
      if (isAllDay !== undefined) opts.isAllDay = isAllDay;
      if (seedTaskId !== undefined) opts.seedTaskId = seedTaskId;
      opts.limitResponsePayload = false;
      const result = await c.createCalendarEvent(title, startDate, endDate, opts);
      return json({ success: result.success, calendarEvent: result.createdCalendarEvent, updatedFields: result.updatedFields });
    });

    this.server.tool("update-calendar-event", "Update an existing calendar event. Requires the full CalendarEventUpdateData object — fetch the event first to get all required fields.", shape(S.updateCalendarEventSchema), async (args) => {
      const { eventId, update, isInviteeStatusUpdate, skipReorder } = args as S.UpdateCalendarEventInput;
      const result = await c.updateCalendarEvent(eventId, update as unknown as CalendarEventUpdateData, { isInviteeStatusUpdate, skipReorder, limitResponsePayload: false });
      return json({ success: result.success, skipped: result.skipped, calendarEvent: result.updatedCalendarEvent, updatedFields: result.updatedFields });
    });

    // --- Bulk tools ---

    this.server.tool("update-task-complete-bulk", "Mark multiple tasks as complete in a single operation. Individual failures do not block others.", shape(S.updateTaskCompleteBulkSchema), async (args) => {
      const { taskIds, completeOn } = args as S.UpdateTaskCompleteBulkInput;
      return executeBulk(taskIds, (id) => c.updateTaskComplete(id, completeOn, true));
    });

    this.server.tool("update-task-uncomplete-bulk", "Mark multiple completed tasks as incomplete in a single operation. Individual failures do not block others.", shape(S.updateTaskUncompleteBulkSchema), async (args) => {
      const { taskIds } = args as S.UpdateTaskUncompleteBulkInput;
      return executeBulk(taskIds, (id) => c.updateTaskUncomplete(id, true));
    });

    this.server.tool("delete-task-bulk", "Delete multiple tasks permanently in a single operation. Individual failures do not block others.", shape(S.deleteTaskBulkSchema), async (args) => {
      const { taskIds } = args as S.DeleteTaskBulkInput;
      return executeBulk(taskIds, (id) => c.deleteTask(id, true));
    });

    this.server.tool("update-task-snooze-date-bulk", "Reschedule multiple tasks to a specific date in a single operation. Individual failures do not block others.", shape(S.updateTaskSnoozeDateBulkSchema), async (args) => {
      const { taskIds, newDay, timezone } = args as S.UpdateTaskSnoozeDateBulkInput;
      const opts: { timezone?: string; limitResponsePayload?: boolean } = { limitResponsePayload: true };
      if (timezone) opts.timezone = timezone;
      return executeBulk(taskIds, (id) => c.updateTaskSnoozeDate(id, newDay, opts));
    });

    this.server.tool("update-task-backlog-bulk", "Move multiple tasks to the backlog in a single operation. Individual failures do not block others.", shape(S.updateTaskBacklogBulkSchema), async (args) => {
      const { taskIds, timezone } = args as S.UpdateTaskBacklogBulkInput;
      const opts: { timezone?: string; limitResponsePayload?: boolean } = { limitResponsePayload: true };
      if (timezone) opts.timezone = timezone;
      return executeBulk(taskIds, (id) => c.updateTaskSnoozeDate(id, null, opts));
    });
  }
}
