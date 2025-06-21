import { z } from "zod";

/**
 * Helper Schemas
 */

export const jsonStringSchema = z.string().transform((str, ctx) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
    return z.NEVER;
  }
});

/**
 * Task Operation Schemas
 */

// Completion filter schema
export const completionFilterSchema = z.enum(["all", "incomplete", "completed"]);

// Get tasks by day parameters
export const getTasksByDaySchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Day must be in YYYY-MM-DD format"),
  timezone: z.string().optional().describe("Timezone string (e.g., 'America/New_York'). If not provided, uses user's default timezone"),
  completionFilter: completionFilterSchema.optional().describe("Filter tasks by completion status. 'all' returns all tasks, 'incomplete' returns only incomplete tasks, 'completed' returns only completed tasks. Defaults to 'all'"),
});

// Get tasks backlog parameters (no parameters needed)
export const getTasksBacklogSchema = z.object({});

// Get archived tasks parameters
export const getArchivedTasksSchema = z.object({
  offset: z.number().int().min(0).optional().describe("Pagination offset (defaults to 0)"),
  limit: z.number().int().min(1).max(1000).optional().describe("Maximum number of tasks to return (defaults to 100)"),
});

// Get task by ID parameters
export const getTaskByIdSchema = z.object({
  taskId: z.string().min(1, "Task ID is required").describe("The ID of the task to retrieve"),
});

/**
 * User Operation Schemas
 */

// Get user parameters (no parameters needed)
export const getUserSchema = z.object({});

/**
 * Stream Operation Schemas
 */

// Get streams parameters (no parameters needed, uses cached group ID)
export const getStreamsSchema = z.object({});

/**
 * Task Mutation Operation Schemas
 */

// Create task parameters
export const createTaskSchema = z.object({
  text: z.string().min(1, "Task text is required").describe("Task title/description"),
  notes: z.string().optional().describe("Additional task notes"),
  streamIds: z.array(z.string()).optional().describe("Array of stream IDs to associate with the task"),
  timeEstimate: z.number().int().positive().optional().describe("Time estimate in minutes"),
  dueDate: z.string().optional().describe("Due date string (ISO format)"),
  snoozeUntil: z.string().optional().describe("Snooze until date string (ISO format)"),
  private: z.boolean().optional().describe("Whether the task is private"),
  taskId: z.string().optional().describe("Custom task ID (auto-generated if not provided)"),
});

// Update task complete parameters
export const updateTaskCompleteSchema = z.object({
  taskId: z.string().min(1, "Task ID is required").describe("The ID of the task to mark as complete"),
  completeOn: z.string().optional().describe("Completion timestamp (ISO format). Defaults to current time"),
  limitResponsePayload: z.boolean().optional().describe("Whether to limit the response payload size"),
});

// Delete task parameters
export const deleteTaskSchema = z.object({
  taskId: z.string().min(1, "Task ID is required").describe("The ID of the task to delete"),
  limitResponsePayload: z.boolean().optional().describe("Whether to limit response size"),
  wasTaskMerged: z.boolean().optional().describe("Whether the task was merged before deletion"),
});

// Update task snooze date parameters
export const updateTaskSnoozeDateSchema = z.object({
  taskId: z.string().min(1, "Task ID is required").describe("The ID of the task to reschedule"),
  newDay: z.string().date("Must be a valid date in YYYY-MM-DD format").describe("Target date in YYYY-MM-DD format"),
  timezone: z.string().optional().describe("Timezone string (e.g., 'America/New_York'). If not provided, uses user's default timezone"),
  limitResponsePayload: z.boolean().optional().describe("Whether to limit the response payload size"),
});

// Update task backlog parameters
export const updateTaskBacklogSchema = z.object({
  taskId: z.string().min(1, "Task ID is required").describe("The ID of the task to move to backlog"),
  timezone: z.string().optional().describe("Timezone string (e.g., 'America/New_York'). If not provided, uses user's default timezone"),
  limitResponsePayload: z.boolean().optional().describe("Whether to limit the response payload size"),
});

// Update task planned time parameters
export const updateTaskPlannedTimeSchema = z.object({
  taskId: z.string().min(1, "Task ID is required").describe("The ID of the task to update planned time for"),
  timeEstimateMinutes: z.number().int().min(0).describe("Time estimate in minutes (use 0 to clear the time estimate)"),
  limitResponsePayload: z.boolean().optional().describe("Whether to limit the response payload size"),
});

// Update task notes base parameters (without content)
const updateTaskNotesBaseSchema = z.object({
  taskId: z.string().min(1, "Task ID is required").describe("The ID of the task to update notes for"),
  limitResponsePayload: z.boolean().optional().describe("Whether to limit the response payload size (defaults to true)"),
});

// Update task notes parameters with XOR content
export const updateTaskNotesSchema = updateTaskNotesBaseSchema.and(
  z.union([
    z.object({ 
      html: z.string().describe("HTML content for the task notes"),
      markdown: z.never().optional()
    }),
    z.object({ 
      markdown: z.string().describe("Markdown content for the task notes"),
      html: z.never().optional()
    })
  ])
);

/**
 * Response Type Schemas (for validation and documentation)
 */

// Basic user profile schema
export const userProfileSchema = z.object({
  _id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  timezone: z.string(),
  avatarUrl: z.string().url().optional(),
});

// Group schema
export const groupSchema = z.object({
  groupId: z.string(),
  name: z.string(),
  role: z.string().optional(),
});

// User schema with primary group
export const userSchema = z.object({
  _id: z.string(),
  email: z.string().email(),
  profile: userProfileSchema,
  primaryGroup: groupSchema.optional(),
});

// Task schema (simplified - based on common task properties)
export const taskSchema = z.object({
  _id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  scheduledDate: z.string().optional(),
  completedAt: z.string().optional(),
  streamId: z.string().optional(),
  userId: z.string(),
  groupId: z.string(),
});

// Stream schema
export const streamSchema = z.object({
  _id: z.string(),
  name: z.string(),
  color: z.string().optional(),
  groupId: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * API Response Schemas
 */

// User response
export const userResponseSchema = z.object({
  user: userSchema,
});

// Tasks response
export const tasksResponseSchema = z.object({
  tasks: z.array(taskSchema),
  count: z.number(),
});

// Streams response
export const streamsResponseSchema = z.object({
  streams: z.array(streamSchema),
  count: z.number(),
});

/**
 * Error Response Schema
 */
export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
});

/**
 * Type Exports (for use in tools)
 */
export type CompletionFilter = z.infer<typeof completionFilterSchema>;

export type GetTasksByDayInput = z.infer<typeof getTasksByDaySchema>;
export type GetTasksBacklogInput = z.infer<typeof getTasksBacklogSchema>;
export type GetArchivedTasksInput = z.infer<typeof getArchivedTasksSchema>;
export type GetTaskByIdInput = z.infer<typeof getTaskByIdSchema>;
export type GetUserInput = z.infer<typeof getUserSchema>;
export type GetStreamsInput = z.infer<typeof getStreamsSchema>;

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskCompleteInput = z.infer<typeof updateTaskCompleteSchema>;
export type DeleteTaskInput = z.infer<typeof deleteTaskSchema>;
export type UpdateTaskSnoozeDateInput = z.infer<typeof updateTaskSnoozeDateSchema>;
export type UpdateTaskPlannedTimeInput = z.infer<typeof updateTaskPlannedTimeSchema>;
export type UpdateTaskNotesInput = z.infer<typeof updateTaskNotesSchema>;

export type User = z.infer<typeof userSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Stream = z.infer<typeof streamSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type TasksResponse = z.infer<typeof tasksResponseSchema>;
export type StreamsResponse = z.infer<typeof streamsResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;