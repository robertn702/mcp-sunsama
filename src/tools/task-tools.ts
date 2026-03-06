import type { CreateTaskOptions } from "sunsama-api/types";
import {
  type AddSubtaskInput,
  addSubtaskSchema,
  type CompleteSubtaskInput,
  completeSubtaskSchema,
  type CreateSubtasksInput,
  createSubtasksSchema,
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
  type UncompleteSubtaskInput,
  uncompleteSubtaskSchema,
  type UpdateSubtaskTitleInput,
  updateSubtaskTitleSchema,
  type UpdateTaskBacklogInput,
  updateTaskBacklogSchema,
  type UpdateTaskCompleteInput,
  updateTaskCompleteSchema,
  type UpdateTaskUncompleteInput,
  updateTaskUncompleteSchema,
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
  type ReorderTaskInput,
  reorderTaskSchema,
} from "../schemas.js";
import { filterTasksByCompletion } from "../utils/task-filters.js";
import { trimTasksForResponse } from "../utils/task-trimmer.js";
import {
  formatJsonResponse,
  formatPaginatedTsvResponse,
  formatTsvResponse,
  type ToolConfig,
  type ToolContext,
} from "./shared.js";
import { withTransportClient } from "./transport-wrapper.js";

// Task Query Tools
export const getTasksBacklogConfig: ToolConfig<typeof getTasksBacklogSchema> = {
  name: "get-tasks-backlog",
  description: "Get tasks from the backlog",
  parameters: getTasksBacklogSchema,
  execute: async (_args: GetTasksBacklogInput, context: ToolContext) => {
    const tasks = await context.client.getTasksBacklog();
    const trimmedTasks = trimTasksForResponse(tasks);

    return formatTsvResponse(trimmedTasks);
  },
};
export const getTasksBacklogTool = withTransportClient(getTasksBacklogConfig);

export const getTasksByDayConfig: ToolConfig<typeof getTasksByDaySchema> = {
  name: "get-tasks-by-day",
  description:
    "Get tasks for a specific day with optional filtering by completion status",
  parameters: getTasksByDaySchema,
  execute: async (
    { day, timezone, completionFilter = "all" }: GetTasksByDayInput,
    context: ToolContext,
  ) => {
    let resolvedTimezone = timezone;
    if (!resolvedTimezone) {
      resolvedTimezone = await context.client.getUserTimezone();
    }

    const tasks = await context.client.getTasksByDay(day, resolvedTimezone);
    const filteredTasks = filterTasksByCompletion(tasks, completionFilter);
    const trimmedTasks = trimTasksForResponse(filteredTasks);

    return formatTsvResponse(trimmedTasks);
  },
};
export const getTasksByDayTool = withTransportClient(getTasksByDayConfig);

export const getArchivedTasksConfig: ToolConfig<typeof getArchivedTasksSchema> = {
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
};
export const getArchivedTasksTool = withTransportClient(getArchivedTasksConfig);

export const getTaskByIdConfig: ToolConfig<typeof getTaskByIdSchema> = {
  name: "get-task-by-id",
  description: "Get a specific task by its ID",
  parameters: getTaskByIdSchema,
  execute: async ({ taskId }: GetTaskByIdInput, context: ToolContext) => {
    const task = await context.client.getTaskById(taskId) || null;

    return formatJsonResponse(task);
  },
};
export const getTaskByIdTool = withTransportClient(getTaskByIdConfig);

// Task Lifecycle Tools
export const createTaskConfig: ToolConfig<typeof createTaskSchema> = {
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
      integration,
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
    if (integration) options.integration = integration;

    const result = await context.client.createTask(text, options);

    return formatJsonResponse({
      success: result.success,
      taskId: result.updatedFields?._id,
      title: text,
      created: true,
      updatedFields: result.updatedFields,
    });
  },
};
export const createTaskTool = withTransportClient(createTaskConfig);

export const deleteTaskConfig: ToolConfig<typeof deleteTaskSchema> = {
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
};
export const deleteTaskTool = withTransportClient(deleteTaskConfig);

// Task Update Tools
export const updateTaskCompleteConfig: ToolConfig<typeof updateTaskCompleteSchema> = {
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
};
export const updateTaskCompleteTool = withTransportClient(updateTaskCompleteConfig);

export const updateTaskUncompleteConfig: ToolConfig<typeof updateTaskUncompleteSchema> = {
  name: "update-task-uncomplete",
  description: "Mark a completed task as incomplete",
  parameters: updateTaskUncompleteSchema,
  execute: async (
    { taskId, limitResponsePayload }: UpdateTaskUncompleteInput,
    context: ToolContext,
  ) => {
    const result = await context.client.updateTaskUncomplete(
      taskId,
      limitResponsePayload,
    );

    return formatJsonResponse({
      success: result.success,
      taskId,
      completed: false,
      updatedFields: result.updatedFields,
    });
  },
};
export const updateTaskUncompleteTool = withTransportClient(updateTaskUncompleteConfig);

export const updateTaskSnoozeDateConfig: ToolConfig<typeof updateTaskSnoozeDateSchema> = {
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
};
export const updateTaskSnoozeDateTool = withTransportClient(updateTaskSnoozeDateConfig);

export const updateTaskBacklogConfig: ToolConfig<typeof updateTaskBacklogSchema> = {
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
};
export const updateTaskBacklogTool = withTransportClient(updateTaskBacklogConfig);

export const updateTaskPlannedTimeConfig: ToolConfig<typeof updateTaskPlannedTimeSchema> = {
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
};
export const updateTaskPlannedTimeTool = withTransportClient(updateTaskPlannedTimeConfig);

export const updateTaskNotesConfig: ToolConfig<typeof updateTaskNotesSchema> = {
  name: "update-task-notes",
  description: "Update the notes content for a task",
  parameters: updateTaskNotesSchema,
  execute: async (
    { taskId, html, markdown, limitResponsePayload }: UpdateTaskNotesInput,
    context: ToolContext,
  ) => {
    // XOR validation: exactly one of html or markdown must be provided
    const hasHtml = html !== undefined;
    const hasMarkdown = markdown !== undefined;
    if (hasHtml === hasMarkdown) {
      throw new Error("Exactly one of 'html' or 'markdown' must be provided");
    }

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
};
export const updateTaskNotesTool = withTransportClient(updateTaskNotesConfig);

export const updateTaskDueDateConfig: ToolConfig<typeof updateTaskDueDateSchema> = {
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
};
export const updateTaskDueDateTool = withTransportClient(updateTaskDueDateConfig);

export const updateTaskTextConfig: ToolConfig<typeof updateTaskTextSchema> = {
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
};
export const updateTaskTextTool = withTransportClient(updateTaskTextConfig);

export const updateTaskStreamConfig: ToolConfig<typeof updateTaskStreamSchema> = {
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
};
export const updateTaskStreamTool = withTransportClient(updateTaskStreamConfig);

// Subtask Management Tools
export const createSubtasksConfig: ToolConfig<typeof createSubtasksSchema> = {
  name: "create-subtasks",
  description: "Create multiple subtasks for a task (low-level API for bulk operations)",
  parameters: createSubtasksSchema,
  execute: async (
    { taskId, subtaskIds, limitResponsePayload }: CreateSubtasksInput,
    context: ToolContext,
  ) => {
    const result = await context.client.createSubtasks(
      taskId,
      subtaskIds,
      limitResponsePayload,
    );

    return formatJsonResponse({
      success: result.success,
      taskId,
      subtaskIds,
      subtasksCreated: true,
      count: subtaskIds.length,
      updatedFields: result.updatedFields,
    });
  },
};
export const createSubtasksTool = withTransportClient(createSubtasksConfig);

export const updateSubtaskTitleConfig: ToolConfig<typeof updateSubtaskTitleSchema> = {
  name: "update-subtask-title",
  description: "Update the title of a subtask",
  parameters: updateSubtaskTitleSchema,
  execute: async (
    { taskId, subtaskId, title }: UpdateSubtaskTitleInput,
    context: ToolContext,
  ) => {
    const result = await context.client.updateSubtaskTitle(
      taskId,
      subtaskId,
      title,
    );

    return formatJsonResponse({
      success: result.success,
      taskId,
      subtaskId,
      title,
      subtaskTitleUpdated: true,
      updatedFields: result.updatedFields,
    });
  },
};
export const updateSubtaskTitleTool = withTransportClient(updateSubtaskTitleConfig);

export const completeSubtaskConfig: ToolConfig<typeof completeSubtaskSchema> = {
  name: "complete-subtask",
  description: "Mark a subtask as complete with optional completion timestamp",
  parameters: completeSubtaskSchema,
  execute: async (
    { taskId, subtaskId, completedDate, limitResponsePayload }: CompleteSubtaskInput,
    context: ToolContext,
  ) => {
    const result = await context.client.completeSubtask(
      taskId,
      subtaskId,
      completedDate,
      limitResponsePayload,
    );

    return formatJsonResponse({
      success: result.success,
      taskId,
      subtaskId,
      subtaskCompleted: true,
      completedDate: completedDate || new Date().toISOString(),
      updatedFields: result.updatedFields,
    });
  },
};
export const completeSubtaskTool = withTransportClient(completeSubtaskConfig);

export const uncompleteSubtaskConfig: ToolConfig<typeof uncompleteSubtaskSchema> = {
  name: "uncomplete-subtask",
  description: "Mark a subtask as incomplete (uncomplete it)",
  parameters: uncompleteSubtaskSchema,
  execute: async (
    { taskId, subtaskId, limitResponsePayload }: UncompleteSubtaskInput,
    context: ToolContext,
  ) => {
    const result = await context.client.uncompleteSubtask(
      taskId,
      subtaskId,
      limitResponsePayload,
    );

    return formatJsonResponse({
      success: result.success,
      taskId,
      subtaskId,
      subtaskUncompleted: true,
      updatedFields: result.updatedFields,
    });
  },
};
export const uncompleteSubtaskTool = withTransportClient(uncompleteSubtaskConfig);

export const addSubtaskConfig: ToolConfig<typeof addSubtaskSchema> = {
  name: "add-subtask",
  description: "Convenience method to create a subtask with a title in one call (recommended for single subtask creation)",
  parameters: addSubtaskSchema,
  execute: async (
    { taskId, title }: AddSubtaskInput,
    context: ToolContext,
  ) => {
    const result = await context.client.addSubtask(taskId, title);

    return formatJsonResponse({
      success: result.result.success,
      taskId,
      subtaskId: result.subtaskId,
      title,
      subtaskAdded: true,
      updatedFields: result.result.updatedFields,
    });
  },
};
export const addSubtaskTool = withTransportClient(addSubtaskConfig);

export const reorderTaskConfig: ToolConfig<typeof reorderTaskSchema> = {
  name: "reorder-task",
  description:
    "Reorder a task within a day by moving it to a specific 0-based position (0 = top)",
  parameters: reorderTaskSchema,
  execute: async (
    { taskId, position, day, timezone }: ReorderTaskInput,
    context: ToolContext,
  ) => {
    let resolvedTimezone = timezone;
    if (!resolvedTimezone) {
      resolvedTimezone = await context.client.getUserTimezone();
    }

    const result = await context.client.reorderTask(taskId, position, day, {
      timezone: resolvedTimezone,
    });

    return formatJsonResponse({
      success: true,
      taskId,
      position,
      day,
      updatedTaskIds: result.updatedTaskIds,
    });
  },
};
export const reorderTaskTool = withTransportClient(reorderTaskConfig);

// Export all task tool configs (for worker reuse)
export const taskToolConfigs = [
  getTasksBacklogConfig,
  getTasksByDayConfig,
  getArchivedTasksConfig,
  getTaskByIdConfig,
  createTaskConfig,
  deleteTaskConfig,
  updateTaskCompleteConfig,
  updateTaskUncompleteConfig,
  updateTaskSnoozeDateConfig,
  updateTaskBacklogConfig,
  updateTaskPlannedTimeConfig,
  updateTaskNotesConfig,
  updateTaskDueDateConfig,
  updateTaskTextConfig,
  updateTaskStreamConfig,
  createSubtasksConfig,
  updateSubtaskTitleConfig,
  completeSubtaskConfig,
  uncompleteSubtaskConfig,
  addSubtaskConfig,
  reorderTaskConfig,
];

// Export all task tools (wrapped for Node.js transport)
export const taskTools = [
  getTasksBacklogTool,
  getTasksByDayTool,
  getArchivedTasksTool,
  getTaskByIdTool,
  createTaskTool,
  deleteTaskTool,
  updateTaskCompleteTool,
  updateTaskUncompleteTool,
  updateTaskSnoozeDateTool,
  updateTaskBacklogTool,
  updateTaskPlannedTimeTool,
  updateTaskNotesTool,
  updateTaskDueDateTool,
  updateTaskTextTool,
  updateTaskStreamTool,
  createSubtasksTool,
  updateSubtaskTitleTool,
  completeSubtaskTool,
  uncompleteSubtaskTool,
  addSubtaskTool,
  reorderTaskTool,
];
