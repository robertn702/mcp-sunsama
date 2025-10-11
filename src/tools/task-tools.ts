import type { CreateTaskOptions } from "sunsama-api/types";
import {
  type CreateTaskInput,
  createTaskSchema,
  type DeleteTaskInput,
  deleteTaskSchema,
  type GetArchivedTasksInput,
  getArchivedTasksSchema,
  type GetTaskByIdInput,
  getTaskByIdSchema,
  type GetTasksBacklogInput,
  getTasksBacklogSchema,
  type GetTasksByDayInput,
  getTasksByDaySchema,
  type UpdateTaskBacklogInput,
  updateTaskBacklogSchema,
  type UpdateTaskCompleteInput,
  updateTaskCompleteSchema,
  type UpdateTaskDueDateInput,
  updateTaskDueDateSchema,
  type UpdateTaskNotesInput,
  updateTaskNotesSchema,
  type UpdateTaskPlannedTimeInput,
  updateTaskPlannedTimeSchema,
  type UpdateTaskSnoozeDateInput,
  updateTaskSnoozeDateSchema,
  type UpdateTaskStreamInput,
  updateTaskStreamSchema,
  type UpdateTaskTextInput,
  updateTaskTextSchema,
} from "../schemas.js";
import { filterTasksByCompletion } from "../utils/task-filters.js";
import { trimTasksForResponse } from "../utils/task-trimmer.js";
import {
  formatJsonResponse,
  formatPaginatedTsvResponse,
  formatTsvResponse,
  withTransportClient,
  type ToolContext,
} from "./shared.js";

// Task Query Tools
export const getTasksBacklogTool = withTransportClient({
  name: "get-tasks-backlog",
  description: "Get tasks from the backlog",
  parameters: getTasksBacklogSchema,
  execute: async (_args: GetTasksBacklogInput, context: ToolContext) => {
    const tasks = await context.client.getTasksBacklog();
    const trimmedTasks = trimTasksForResponse(tasks);

    return formatTsvResponse(trimmedTasks);
  },
});

export const getTasksByDayTool = withTransportClient({
  name: "get-tasks-by-day",
  description:
    "Get tasks for a specific day with optional filtering by completion status",
  parameters: getTasksByDaySchema,
  execute: async (
    { day, timezone, completionFilter = "all" }: GetTasksByDayInput,
    context: ToolContext,
  ) => {
    // If no timezone provided, get the user's default timezone
    let resolvedTimezone = timezone;
    if (!resolvedTimezone) {
      resolvedTimezone = await context.client.getUserTimezone();
    }

    const tasks = await context.client.getTasksByDay(day, resolvedTimezone);
    const filteredTasks = filterTasksByCompletion(tasks, completionFilter);
    const trimmedTasks = trimTasksForResponse(filteredTasks);

    return formatTsvResponse(trimmedTasks);
  },
});

export const getArchivedTasksTool = withTransportClient({
  name: "get-archived-tasks",
  description: "Get archived tasks with optional pagination",
  parameters: getArchivedTasksSchema,
  execute: async (
    { offset = 0, limit = 100 }: GetArchivedTasksInput,
    context: ToolContext,
  ) => {
    const requestedLimit = limit;
    const fetchLimit = requestedLimit + 1;

    const allTasks = await context.client.getArchivedTasks(offset, fetchLimit);

    const hasMore = allTasks.length > requestedLimit;
    const tasks = hasMore ? allTasks.slice(0, requestedLimit) : allTasks;
    const trimmedTasks = trimTasksForResponse(tasks);

    const paginationInfo = {
      offset,
      limit: requestedLimit,
      count: tasks.length,
      hasMore,
      nextOffset: hasMore ? offset + requestedLimit : null,
    };

    return formatPaginatedTsvResponse(trimmedTasks, paginationInfo);
  },
});

export const getTaskByIdTool = withTransportClient({
  name: "get-task-by-id",
  description: "Get a specific task by its ID",
  parameters: getTaskByIdSchema,
  execute: async ({ taskId }: GetTaskByIdInput, context: ToolContext) => {
    const task = await context.client.getTaskById(taskId) || null;

    return formatJsonResponse(task);
  },
});

// Task Lifecycle Tools
export const createTaskTool = withTransportClient({
  name: "create-task",
  description: "Create a new task with optional properties",
  parameters: createTaskSchema,
  execute: async (
    {
      text,
      notes,
      streamIds,
      timeEstimate,
      dueDate,
      snoozeUntil,
      private: isPrivate,
      taskId,
    }: CreateTaskInput,
    context: ToolContext,
  ) => {
    const options: CreateTaskOptions = {};
    if (notes) options.notes = notes;
    if (streamIds) options.streamIds = streamIds;
    if (timeEstimate) options.timeEstimate = timeEstimate;
    if (dueDate) options.dueDate = dueDate;
    if (snoozeUntil) options.snoozeUntil = snoozeUntil;
    if (isPrivate !== undefined) options.private = isPrivate;
    if (taskId) options.taskId = taskId;

    const result = await context.client.createTask(text, options);

    return formatJsonResponse({
      success: result.success,
      taskId: result.updatedFields?._id,
      title: text,
      created: true,
      updatedFields: result.updatedFields,
    });
  },
});

export const deleteTaskTool = withTransportClient({
  name: "delete-task",
  description: "Delete a task permanently",
  parameters: deleteTaskSchema,
  execute: async (
    { taskId, limitResponsePayload, wasTaskMerged }: DeleteTaskInput,
    context: ToolContext,
  ) => {
    const result = await context.client.deleteTask(
      taskId,
      limitResponsePayload,
      wasTaskMerged,
    );

    return formatJsonResponse({
      success: result.success,
      taskId,
      deleted: true,
      updatedFields: result.updatedFields,
    });
  },
});

// Task Update Tools
export const updateTaskCompleteTool = withTransportClient({
  name: "update-task-complete",
  description: "Mark a task as complete with optional completion timestamp",
  parameters: updateTaskCompleteSchema,
  execute: async (
    { taskId, completeOn, limitResponsePayload }: UpdateTaskCompleteInput,
    context: ToolContext,
  ) => {
    const result = await context.client.updateTaskComplete(
      taskId,
      completeOn,
      limitResponsePayload,
    );

    return formatJsonResponse({
      success: result.success,
      taskId,
      completed: true,
      updatedFields: result.updatedFields,
    });
  },
});

export const updateTaskSnoozeDateTool = withTransportClient({
  name: "update-task-snooze-date",
  description:
    "Update task snooze date to reschedule tasks or move them to backlog",
  parameters: updateTaskSnoozeDateSchema,
  execute: async (
    { taskId, newDay, timezone, limitResponsePayload }:
      UpdateTaskSnoozeDateInput,
    context: ToolContext,
  ) => {
    const options: { timezone?: string; limitResponsePayload?: boolean } = {};
    if (timezone) options.timezone = timezone;
    if (limitResponsePayload !== undefined) {
      options.limitResponsePayload = limitResponsePayload;
    }

    const result = await context.client.updateTaskSnoozeDate(
      taskId,
      newDay,
      options,
    );

    return formatJsonResponse({
      success: result.success,
      taskId,
      newDay,
      updatedFields: result.updatedFields,
    });
  },
});

export const updateTaskBacklogTool = withTransportClient({
  name: "update-task-backlog",
  description: "Move a task to the backlog",
  parameters: updateTaskBacklogSchema,
  execute: async (
    { taskId, timezone, limitResponsePayload }: UpdateTaskBacklogInput,
    context: ToolContext,
  ) => {
    const options: { timezone?: string; limitResponsePayload?: boolean } = {};
    if (timezone) options.timezone = timezone;
    if (limitResponsePayload !== undefined) {
      options.limitResponsePayload = limitResponsePayload;
    }

    const result = await context.client.updateTaskSnoozeDate(
      taskId,
      null,
      options,
    );

    return formatJsonResponse({
      success: result.success,
      taskId,
      movedToBacklog: true,
      updatedFields: result.updatedFields,
    });
  },
});

export const updateTaskPlannedTimeTool = withTransportClient({
  name: "update-task-planned-time",
  description: "Update the planned time (time estimate) for a task",
  parameters: updateTaskPlannedTimeSchema,
  execute: async (
    { taskId, timeEstimateMinutes, limitResponsePayload }:
      UpdateTaskPlannedTimeInput,
    context: ToolContext,
  ) => {
    const result = await context.client.updateTaskPlannedTime(
      taskId,
      timeEstimateMinutes,
      limitResponsePayload,
    );

    return formatJsonResponse({
      success: result.success,
      taskId,
      timeEstimateMinutes,
      updatedFields: result.updatedFields,
    });
  },
});

export const updateTaskNotesTool = withTransportClient({
  name: "update-task-notes",
  description: "Update the notes content for a task",
  parameters: updateTaskNotesSchema,
  execute: async (
    { taskId, html, markdown, limitResponsePayload }: UpdateTaskNotesInput,
    context: ToolContext,
  ) => {
    const content = html
      ? { type: "html" as const, value: html }
      : { type: "markdown" as const, value: markdown! };

    const options: { limitResponsePayload?: boolean } = {};
    if (limitResponsePayload !== undefined) {
      options.limitResponsePayload = limitResponsePayload;
    }

    const apiContent = content.type === "html"
      ? { html: content.value }
      : { markdown: content.value };
    const result = await context.client.updateTaskNotes(
      taskId,
      apiContent,
      options,
    );

    return formatJsonResponse({
      success: result.success,
      taskId,
      notesUpdated: true,
      updatedFields: result.updatedFields,
    });
  },
});

export const updateTaskDueDateTool = withTransportClient({
  name: "update-task-due-date",
  description: "Update the due date for a task",
  parameters: updateTaskDueDateSchema,
  execute: async (
    { taskId, dueDate, limitResponsePayload }: UpdateTaskDueDateInput,
    context: ToolContext,
  ) => {
    const result = await context.client.updateTaskDueDate(
      taskId,
      dueDate,
      limitResponsePayload,
    );

    return formatJsonResponse({
      success: result.success,
      taskId,
      dueDate,
      dueDateUpdated: true,
      updatedFields: result.updatedFields,
    });
  },
});

export const updateTaskTextTool = withTransportClient({
  name: "update-task-text",
  description: "Update the text/title of a task",
  parameters: updateTaskTextSchema,
  execute: async (
    { taskId, text, recommendedStreamId, limitResponsePayload }:
      UpdateTaskTextInput,
    context: ToolContext,
  ) => {
    const options: {
      recommendedStreamId?: string | null;
      limitResponsePayload?: boolean;
    } = {};
    if (recommendedStreamId !== undefined) {
      options.recommendedStreamId = recommendedStreamId;
    }
    if (limitResponsePayload !== undefined) {
      options.limitResponsePayload = limitResponsePayload;
    }

    const result = await context.client.updateTaskText(taskId, text, options);

    return formatJsonResponse({
      success: result.success,
      taskId,
      text,
      textUpdated: true,
      updatedFields: result.updatedFields,
    });
  },
});

export const updateTaskStreamTool = withTransportClient({
  name: "update-task-stream",
  description: "Update the stream/channel assignment for a task",
  parameters: updateTaskStreamSchema,
  execute: async (
    { taskId, streamId, limitResponsePayload }: UpdateTaskStreamInput,
    context: ToolContext,
  ) => {
    const result = await context.client.updateTaskStream(
      taskId,
      streamId,
      limitResponsePayload !== undefined ? limitResponsePayload : true,
    );

    return formatJsonResponse({
      success: result.success,
      taskId,
      streamId,
      streamUpdated: true,
      updatedFields: result.updatedFields,
    });
  },
});

// Export all task tools
export const taskTools = [
  // Query tools
  getTasksBacklogTool,
  getTasksByDayTool,
  getArchivedTasksTool,
  getTaskByIdTool,

  // Lifecycle tools
  createTaskTool,
  deleteTaskTool,

  // Update tools
  updateTaskCompleteTool,
  updateTaskSnoozeDateTool,
  updateTaskBacklogTool,
  updateTaskPlannedTimeTool,
  updateTaskNotesTool,
  updateTaskDueDateTool,
  updateTaskTextTool,
  updateTaskStreamTool,
];
