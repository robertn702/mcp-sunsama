import type { CreateTaskOptions } from "sunsama-api";
import {
  createTaskSchema,
  deleteTaskSchema,
  getArchivedTasksSchema,
  getTaskByIdSchema,
  getTasksBacklogSchema,
  getTasksByDaySchema,
  updateTaskBacklogSchema,
  updateTaskCompleteSchema,
  updateTaskDueDateSchema,
  updateTaskNotesSchema,
  updateTaskPlannedTimeSchema,
  updateTaskSnoozeDateSchema,
  updateTaskStreamSchema,
  updateTaskTextSchema,
  type GetTasksBacklogInput,
  type GetTasksByDayInput,
  type GetArchivedTasksInput,
  type GetTaskByIdInput,
  type CreateTaskInput,
  type DeleteTaskInput,
  type UpdateTaskCompleteInput,
  type UpdateTaskSnoozeDateInput,
  type UpdateTaskBacklogInput,
  type UpdateTaskPlannedTimeInput,
  type UpdateTaskNotesInput,
  type UpdateTaskDueDateInput,
  type UpdateTaskTextInput,
  type UpdateTaskStreamInput
} from "../schemas.js";
import { filterTasksByCompletion } from "../utils/task-filters.js";
import { trimTasksForResponse } from "../utils/task-trimmer.js";
import { getSunsamaClient } from "../utils/client-resolver.js";
import {
  createToolWrapper,
  formatJsonResponse,
  formatTsvResponse,
  formatPaginatedTsvResponse,
  type ToolContext
} from "./shared.js";

// Task Query Tools
export const getTasksBacklogTool = createToolWrapper({
  name: "get-tasks-backlog",
  description: "Get tasks from the backlog",
  parameters: getTasksBacklogSchema,
  execute: async (_args: GetTasksBacklogInput, context: ToolContext) => {
    context.log.info("Getting backlog tasks");

    const sunsamaClient = await getSunsamaClient(context.session);
    const tasks = await sunsamaClient.getTasksBacklog();
    const trimmedTasks = trimTasksForResponse(tasks);

    context.log.info("Successfully retrieved backlog tasks", { count: tasks.length });

    return formatTsvResponse(trimmedTasks);
  }
});

export const getTasksByDayTool = createToolWrapper({
  name: "get-tasks-by-day",
  description: "Get tasks for a specific day with optional filtering by completion status",
  parameters: getTasksByDaySchema,
  execute: async ({ day, timezone, completionFilter = "all" }: GetTasksByDayInput, context: ToolContext) => {
    context.log.info("Getting tasks for day", {
      day,
      timezone,
      completionFilter
    });

    const sunsamaClient = await getSunsamaClient(context.session);

    // If no timezone provided, get the user's default timezone
    let resolvedTimezone = timezone;
    if (!resolvedTimezone) {
      resolvedTimezone = await sunsamaClient.getUserTimezone();
      context.log.info("Using user's default timezone", { timezone: resolvedTimezone });
    }

    const tasks = await sunsamaClient.getTasksByDay(day, resolvedTimezone);
    const filteredTasks = filterTasksByCompletion(tasks, completionFilter);
    const trimmedTasks = trimTasksForResponse(filteredTasks);

    context.log.info("Successfully retrieved tasks for day", {
      day,
      totalCount: tasks.length,
      filteredCount: filteredTasks.length,
      filter: completionFilter,
      timezone: resolvedTimezone
    });

    return formatTsvResponse(trimmedTasks);
  }
});

export const getArchivedTasksTool = createToolWrapper({
  name: "get-archived-tasks",
  description: "Get archived tasks with optional pagination",
  parameters: getArchivedTasksSchema,
  execute: async ({ offset = 0, limit = 100 }: GetArchivedTasksInput, context: ToolContext) => {
    const requestedLimit = limit;
    const fetchLimit = requestedLimit + 1;

    context.log.info("Getting archived tasks", {
      offset,
      requestedLimit,
      fetchLimit
    });

    const sunsamaClient = await getSunsamaClient(context.session);
    const allTasks = await sunsamaClient.getArchivedTasks(offset, fetchLimit);

    const hasMore = allTasks.length > requestedLimit;
    const tasks = hasMore ? allTasks.slice(0, requestedLimit) : allTasks;
    const trimmedTasks = trimTasksForResponse(tasks);

    const paginationInfo = {
      offset,
      limit: requestedLimit,
      count: tasks.length,
      hasMore,
      nextOffset: hasMore ? offset + requestedLimit : null
    };

    context.log.info("Successfully retrieved archived tasks", {
      totalReturned: tasks.length,
      hasMore,
      offset,
      requestedLimit
    });

    return formatPaginatedTsvResponse(trimmedTasks, paginationInfo);
  }
});

export const getTaskByIdTool = createToolWrapper({
  name: "get-task-by-id",
  description: "Get a specific task by its ID",
  parameters: getTaskByIdSchema,
  execute: async ({ taskId }: GetTaskByIdInput, context: ToolContext) => {
    context.log.info("Getting task by ID", { taskId });

    const sunsamaClient = await getSunsamaClient(context.session);
    const task = await sunsamaClient.getTaskById(taskId);

    if (task) {
      context.log.info("Successfully retrieved task by ID", {
        taskId,
        taskText: task.text
      });
      return formatJsonResponse(task);
    } else {
      context.log.info("Task not found", { taskId });
      return formatJsonResponse(null);
    }
  }
});

// Task Lifecycle Tools
export const createTaskTool = createToolWrapper({
  name: "create-task",
  description: "Create a new task with optional properties",
  parameters: createTaskSchema,
  execute: async ({ text, notes, streamIds, timeEstimate, dueDate, snoozeUntil, private: isPrivate, taskId }: CreateTaskInput, context: ToolContext) => {

    context.log.info("Creating new task", {
      text: text,
      hasNotes: !!notes,
      streamCount: streamIds?.length || 0,
      timeEstimate: timeEstimate,
      hasDueDate: !!dueDate,
      hasSnooze: !!snoozeUntil,
      isPrivate: isPrivate,
      customTaskId: !!taskId
    });

    const sunsamaClient = await getSunsamaClient(context.session);

    const options: CreateTaskOptions = {};
    if (notes) options.notes = notes;
    if (streamIds) options.streamIds = streamIds;
    if (timeEstimate) options.timeEstimate = timeEstimate;
    if (dueDate) options.dueDate = dueDate;
    if (snoozeUntil) options.snoozeUntil = snoozeUntil;
    if (isPrivate !== undefined) options.private = isPrivate;
    if (taskId) options.taskId = taskId;

    const result = await sunsamaClient.createTask(text, options);

    context.log.info("Successfully created task", {
      taskId: result.updatedFields?._id || 'unknown',
      title: text,
      success: result.success
    });

    return formatJsonResponse({
      success: result.success,
      taskId: result.updatedFields?._id,
      title: text,
      created: true,
      updatedFields: result.updatedFields
    });
  }
});

export const deleteTaskTool = createToolWrapper({
  name: "delete-task",
  description: "Delete a task permanently",
  parameters: deleteTaskSchema,
  execute: async ({ taskId, limitResponsePayload, wasTaskMerged }: DeleteTaskInput, context: ToolContext) => {

    context.log.info("Deleting task", {
      taskId,
      limitResponsePayload,
      wasTaskMerged
    });

    const sunsamaClient = await getSunsamaClient(context.session);
    const result = await sunsamaClient.deleteTask(taskId, limitResponsePayload, wasTaskMerged);

    context.log.info("Successfully deleted task", {
      taskId,
      success: result.success
    });

    return formatJsonResponse({
      success: result.success,
      taskId,
      deleted: true,
      updatedFields: result.updatedFields
    });
  }
});

// Task Update Tools
export const updateTaskCompleteTool = createToolWrapper({
  name: "update-task-complete",
  description: "Mark a task as complete with optional completion timestamp",
  parameters: updateTaskCompleteSchema,
  execute: async ({ taskId, completeOn, limitResponsePayload }: UpdateTaskCompleteInput, context: ToolContext) => {

    context.log.info("Marking task as complete", {
      taskId,
      hasCustomCompleteOn: !!completeOn,
      limitResponsePayload
    });

    const sunsamaClient = await getSunsamaClient(context.session);
    const result = await sunsamaClient.updateTaskComplete(taskId, completeOn, limitResponsePayload);

    context.log.info("Successfully marked task as complete", {
      taskId,
      success: result.success,
      updatedFields: !!result.updatedFields
    });

    return formatJsonResponse({
      success: result.success,
      taskId,
      completed: true,
      updatedFields: result.updatedFields
    });
  }
});

export const updateTaskSnoozeDateTool = createToolWrapper({
  name: "update-task-snooze-date",
  description: "Update task snooze date to reschedule tasks or move them to backlog",
  parameters: updateTaskSnoozeDateSchema,
  execute: async ({ taskId, newDay, timezone, limitResponsePayload }: UpdateTaskSnoozeDateInput, context: ToolContext) => {

    context.log.info("Updating task snooze date", {
      taskId,
      newDay,
      timezone,
      limitResponsePayload
    });

    const sunsamaClient = await getSunsamaClient(context.session);

    const options: { timezone?: string; limitResponsePayload?: boolean } = {};
    if (timezone) options.timezone = timezone;
    if (limitResponsePayload !== undefined) options.limitResponsePayload = limitResponsePayload;

    const result = await sunsamaClient.updateTaskSnoozeDate(taskId, newDay, options);

    context.log.info("Successfully updated task snooze date", {
      taskId,
      newDay,
      success: result.success
    });

    return formatJsonResponse({
      success: result.success,
      taskId,
      newDay,
      updatedFields: result.updatedFields
    });
  }
});

export const updateTaskBacklogTool = createToolWrapper({
  name: "update-task-backlog",
  description: "Move a task to the backlog",
  parameters: updateTaskBacklogSchema,
  execute: async ({ taskId, timezone, limitResponsePayload }: UpdateTaskBacklogInput, context: ToolContext) => {

    context.log.info("Moving task to backlog", {
      taskId,
      timezone,
      limitResponsePayload
    });

    const sunsamaClient = await getSunsamaClient(context.session);

    const options: { timezone?: string; limitResponsePayload?: boolean } = {};
    if (timezone) options.timezone = timezone;
    if (limitResponsePayload !== undefined) options.limitResponsePayload = limitResponsePayload;

    const result = await sunsamaClient.updateTaskSnoozeDate(taskId, null, options);

    context.log.info("Successfully moved task to backlog", {
      taskId,
      success: result.success
    });

    return formatJsonResponse({
      success: result.success,
      taskId,
      movedToBacklog: true,
      updatedFields: result.updatedFields
    });
  }
});

export const updateTaskPlannedTimeTool = createToolWrapper({
  name: "update-task-planned-time",
  description: "Update the planned time (time estimate) for a task",
  parameters: updateTaskPlannedTimeSchema,
  execute: async ({ taskId, timeEstimateMinutes, limitResponsePayload }: UpdateTaskPlannedTimeInput, context: ToolContext) => {

    context.log.info("Updating task planned time", {
      taskId,
      timeEstimateMinutes,
      limitResponsePayload
    });

    const sunsamaClient = await getSunsamaClient(context.session);
    const result = await sunsamaClient.updateTaskPlannedTime(taskId, timeEstimateMinutes, limitResponsePayload);

    context.log.info("Successfully updated task planned time", {
      taskId,
      timeEstimateMinutes,
      success: result.success
    });

    return formatJsonResponse({
      success: result.success,
      taskId,
      timeEstimateMinutes,
      updatedFields: result.updatedFields
    });
  }
});

export const updateTaskNotesTool = createToolWrapper({
  name: "update-task-notes",
  description: "Update the notes content for a task",
  parameters: updateTaskNotesSchema,
  execute: async ({ taskId, html, markdown, limitResponsePayload }: UpdateTaskNotesInput, context: ToolContext) => {

    const content = html 
      ? { type: "html" as const, value: html } 
      : { type: "markdown" as const, value: markdown! };

    context.log.info("Updating task notes", {
      taskId,
      contentType: content.type,
      contentLength: content.value.length,
      limitResponsePayload
    });

    const sunsamaClient = await getSunsamaClient(context.session);

    const options: { limitResponsePayload?: boolean } = {};
    if (limitResponsePayload !== undefined) options.limitResponsePayload = limitResponsePayload;

    const apiContent = content.type === "html" ? { html: content.value } : { markdown: content.value };
    const result = await sunsamaClient.updateTaskNotes(taskId, apiContent, options);

    context.log.info("Successfully updated task notes", {
      taskId,
      success: result.success,
      contentType: content.type
    });

    return formatJsonResponse({
      success: result.success,
      taskId,
      notesUpdated: true,
      updatedFields: result.updatedFields
    });
  }
});

export const updateTaskDueDateTool = createToolWrapper({
  name: "update-task-due-date",
  description: "Update the due date for a task",
  parameters: updateTaskDueDateSchema,
  execute: async ({ taskId, dueDate, limitResponsePayload }: UpdateTaskDueDateInput, context: ToolContext) => {

    context.log.info("Updating task due date", {
      taskId,
      dueDate,
      limitResponsePayload
    });

    const sunsamaClient = await getSunsamaClient(context.session);
    const result = await sunsamaClient.updateTaskDueDate(taskId, dueDate, limitResponsePayload);

    context.log.info("Successfully updated task due date", {
      taskId,
      dueDate,
      success: result.success
    });

    return formatJsonResponse({
      success: result.success,
      taskId,
      dueDate,
      dueDateUpdated: true,
      updatedFields: result.updatedFields
    });
  }
});

export const updateTaskTextTool = createToolWrapper({
  name: "update-task-text",
  description: "Update the text/title of a task",
  parameters: updateTaskTextSchema,
  execute: async ({ taskId, text, recommendedStreamId, limitResponsePayload }: UpdateTaskTextInput, context: ToolContext) => {

    context.log.info("Updating task text", {
      taskId,
      text,
      recommendedStreamId,
      limitResponsePayload
    });

    const sunsamaClient = await getSunsamaClient(context.session);

    const options: { recommendedStreamId?: string | null; limitResponsePayload?: boolean } = {};
    if (recommendedStreamId !== undefined) options.recommendedStreamId = recommendedStreamId;
    if (limitResponsePayload !== undefined) options.limitResponsePayload = limitResponsePayload;

    const result = await sunsamaClient.updateTaskText(taskId, text, options);

    context.log.info("Successfully updated task text", {
      taskId,
      text,
      success: result.success
    });

    return formatJsonResponse({
      success: result.success,
      taskId,
      text,
      textUpdated: true,
      updatedFields: result.updatedFields
    });
  }
});

export const updateTaskStreamTool = createToolWrapper({
  name: "update-task-stream",
  description: "Update the stream/channel assignment for a task",
  parameters: updateTaskStreamSchema,
  execute: async ({ taskId, streamId, limitResponsePayload }: UpdateTaskStreamInput, context: ToolContext) => {

    context.log.info("Updating task stream assignment", {
      taskId,
      streamId,
      limitResponsePayload
    });

    const sunsamaClient = await getSunsamaClient(context.session);
    const result = await sunsamaClient.updateTaskStream(
      taskId,
      streamId,
      limitResponsePayload !== undefined ? limitResponsePayload : true
    );

    context.log.info("Successfully updated task stream assignment", {
      taskId,
      streamId,
      success: result.success
    });

    return formatJsonResponse({
      success: result.success,
      taskId,
      streamId,
      streamUpdated: true,
      updatedFields: result.updatedFields
    });
  }
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
  updateTaskStreamTool
];