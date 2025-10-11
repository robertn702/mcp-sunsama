import type { Task, TaskIntegration } from "sunsama-api/types";

/**
 * Trimmed task type containing only essential properties for API responses.
 * Reduces response size by 60-80% while preserving core task information.
 *
 * Extends core Task properties with simplified versions of complex fields:
 * - integration: Service name only (instead of full nested object)
 * - subtasks: Array of titles only (instead of full subtask objects)
 */
export type TrimmedTask = Pick<Task,
  | '_id'
  | 'text'
  | 'completed'
  | 'assigneeId'
  | 'createdAt'
  | 'lastModified'
  | 'objectiveId'
  | 'completeDate'
  | 'timeEstimate'
  | 'dueDate'
  | 'notes'
  | 'streamIds'
> & {
  /** Integration service name (e.g., 'website', 'googleCalendar') or null */
  integration: {
    service: TaskIntegration['service'];
    url?: string;
  } | null;
  /** Array of subtask titles only (simplified from full subtask objects) */
  subtasks: string[];
};

/**
 * Trims a task object to include only essential properties for API responses.
 *
 * Included properties:
 * - Core identifiers: _id, assigneeId, objectiveId
 * - Content: text, notes
 * - Status: completed, completeDate
 * - Timestamps: createdAt, lastModified
 * - Planning: timeEstimate, dueDate, streamIds
 * - Simplified integration: service name only (not full nested object)
 * - Simplified subtasks: titles only (not full objects with metadata)
 *
 * Excluded properties (for size reduction):
 * - Internal metadata: notesChecksum, editorVersion, collabSnapshot, __typename
 * - Complex nested objects: full integration objects, sequence, ritual, eventInfo, runDate, timeHorizon
 * - Large arrays: comments, orderings, backlogOrderings, actualTime, scheduledTime, full subtask objects
 * - UI state: subtasksCollapsed, seededEventIds, followers
 * - Redundant fields: completedBy, completeOn, recommendedTimeEstimate, recommendedStreamId, notesMarkdown
 * - Metadata: groupId, taskType, private, deleted, createdBy, archivedAt, duration
 *
 * @param task - Full task object from Sunsama API
 * @returns Trimmed task object with only essential properties
 */
export function trimTaskForResponse(task: Task): TrimmedTask {
  let integration: TrimmedTask['integration'] = null;

  // Extract minimal integration data: service type and URL if available
  // Integration identifiers vary by service - some have URLs (websites), others have different properties
  if (task.integration) {
    integration = { service: task.integration.service };
    if ("url" in task.integration.identifier) {
      integration.url = task.integration.identifier.url;
    }
  }

  return {
    _id: task._id,
    assigneeId: task.assigneeId,
    completeDate: task.completeDate,
    completed: task.completed,
    createdAt: task.createdAt,
    dueDate: task.dueDate,
    integration: integration,
    lastModified: task.lastModified,
    notes: task.notes,
    objectiveId: task.objectiveId,
    streamIds: task.streamIds,
    subtasks: task.subtasks.map((st) => st.title),
    text: task.text,
    timeEstimate: task.timeEstimate
  };
}

/**
 * Trims an array of task objects to include only essential properties.
 *
 * @param tasks - Array of full task objects from Sunsama API
 * @returns Array of trimmed task objects
 */
export function trimTasksForResponse(tasks: Task[]): TrimmedTask[] {
  return tasks.map(trimTaskForResponse);
}