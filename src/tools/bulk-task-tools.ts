import {
  type DeleteTaskBulkInput,
  deleteTaskBulkSchema,
  type UpdateTaskBacklogBulkInput,
  updateTaskBacklogBulkSchema,
  type UpdateTaskCompleteBulkInput,
  updateTaskCompleteBulkSchema,
  type UpdateTaskSnoozeDateBulkInput,
  updateTaskSnoozeDateBulkSchema,
  type UpdateTaskUncompleteBulkInput,
  updateTaskUncompleteBulkSchema,
} from "../schemas.js";
import {
  executeBulk,
  formatBulkResponse,
  withTransportClient,
  type ToolContext,
} from "./shared.js";

export const updateTaskCompleteBulkTool = withTransportClient({
  name: "update-task-complete-bulk",
  description:
    "Mark multiple tasks as complete in a single operation. Individual failures do not block others.",
  parameters: updateTaskCompleteBulkSchema,
  execute: async (
    { taskIds, completeOn }: UpdateTaskCompleteBulkInput,
    context: ToolContext,
  ) => {
    const result = await executeBulk(taskIds, (taskId) =>
      context.client.updateTaskComplete(taskId, completeOn, true),
    );
    return formatBulkResponse(result);
  },
});

export const updateTaskUncompleteBulkTool = withTransportClient({
  name: "update-task-uncomplete-bulk",
  description:
    "Mark multiple completed tasks as incomplete in a single operation. Individual failures do not block others.",
  parameters: updateTaskUncompleteBulkSchema,
  execute: async (
    { taskIds }: UpdateTaskUncompleteBulkInput,
    context: ToolContext,
  ) => {
    const result = await executeBulk(taskIds, (taskId) =>
      context.client.updateTaskUncomplete(taskId, true),
    );
    return formatBulkResponse(result);
  },
});

export const deleteTaskBulkTool = withTransportClient({
  name: "delete-task-bulk",
  description:
    "Delete multiple tasks permanently in a single operation. Individual failures do not block others.",
  parameters: deleteTaskBulkSchema,
  execute: async (
    { taskIds }: DeleteTaskBulkInput,
    context: ToolContext,
  ) => {
    const result = await executeBulk(taskIds, (taskId) =>
      context.client.deleteTask(taskId, true),
    );
    return formatBulkResponse(result);
  },
});

export const updateTaskSnoozeDateBulkTool = withTransportClient({
  name: "update-task-snooze-date-bulk",
  description:
    "Reschedule multiple tasks to a specific date in a single operation. Individual failures do not block others.",
  parameters: updateTaskSnoozeDateBulkSchema,
  execute: async (
    { taskIds, newDay, timezone }: UpdateTaskSnoozeDateBulkInput,
    context: ToolContext,
  ) => {
    const options: { timezone?: string; limitResponsePayload?: boolean } = {
      limitResponsePayload: true,
    };
    if (timezone) options.timezone = timezone;

    const result = await executeBulk(taskIds, (taskId) =>
      context.client.updateTaskSnoozeDate(taskId, newDay, options),
    );
    return formatBulkResponse(result);
  },
});

export const updateTaskBacklogBulkTool = withTransportClient({
  name: "update-task-backlog-bulk",
  description:
    "Move multiple tasks to the backlog in a single operation. Individual failures do not block others.",
  parameters: updateTaskBacklogBulkSchema,
  execute: async (
    { taskIds, timezone }: UpdateTaskBacklogBulkInput,
    context: ToolContext,
  ) => {
    const options: { timezone?: string; limitResponsePayload?: boolean } = {
      limitResponsePayload: true,
    };
    if (timezone) options.timezone = timezone;

    const result = await executeBulk(taskIds, (taskId) =>
      context.client.updateTaskSnoozeDate(taskId, null, options),
    );
    return formatBulkResponse(result);
  },
});

export const bulkTaskTools = [
  updateTaskCompleteBulkTool,
  updateTaskUncompleteBulkTool,
  deleteTaskBulkTool,
  updateTaskSnoozeDateBulkTool,
  updateTaskBacklogBulkTool,
];
