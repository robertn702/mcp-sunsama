import { z } from "zod";

/**
 * Task Operation Schemas
 */

// Get tasks by day parameters
export const getTasksByDaySchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Day must be in YYYY-MM-DD format"),
  timezone: z.string().optional().describe("Timezone string (e.g., 'America/New_York'). If not provided, uses user's default timezone"),
});

// Get tasks backlog parameters (no parameters needed)
export const getTasksBacklogSchema = z.object({});

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
export type GetTasksByDayInput = z.infer<typeof getTasksByDaySchema>;
export type GetTasksBacklogInput = z.infer<typeof getTasksBacklogSchema>;
export type GetUserInput = z.infer<typeof getUserSchema>;
export type GetStreamsInput = z.infer<typeof getStreamsSchema>;

export type User = z.infer<typeof userSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Stream = z.infer<typeof streamSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
export type TasksResponse = z.infer<typeof tasksResponseSchema>;
export type StreamsResponse = z.infer<typeof streamsResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;