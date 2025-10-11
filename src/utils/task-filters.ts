import type { Task } from "sunsama-api/types";
import type { CompletionFilter } from "../schemas.js";

/**
 * Filters an array of tasks based on completion status.
 *
 * @param tasks - Array of Task objects to filter
 * @param filter - Completion filter mode:
 *   - "all": Return all tasks (no filtering)
 *   - "incomplete": Return only tasks where completed is false
 *   - "completed": Return only tasks where completed is true
 * @returns Filtered array of tasks
 * @throws {Error} If an invalid filter value is provided
 *
 * @example
 * ```typescript
 * const allTasks = await sunsamaClient.getTasksByDay("2024-01-15", "UTC");
 *
 * // Get only incomplete tasks for focused work
 * const incompleteTasks = filterTasksByCompletion(allTasks, "incomplete");
 *
 * // Get only completed tasks for review
 * const completedTasks = filterTasksByCompletion(allTasks, "completed");
 *
 * // Get all tasks (no filtering)
 * const allTasksFiltered = filterTasksByCompletion(allTasks, "all");
 * ```
 */
export function filterTasksByCompletion(tasks: Task[], filter: CompletionFilter): Task[] {
  // Validate filter parameter
  if (!["all", "incomplete", "completed"].includes(filter)) {
    throw new Error(`Invalid completion filter: ${filter}. Must be 'all', 'incomplete', or 'completed'.`);
  }

  switch (filter) {
    case "all":
      return tasks; // No filtering - return all tasks

    case "incomplete":
      return tasks.filter(task => !task.completed);

    case "completed":
      return tasks.filter(task => task.completed);

    default:
      // TypeScript exhaustiveness check - should never reach here
      throw new Error(`Unhandled completion filter: ${filter satisfies never}`);
  }
}
