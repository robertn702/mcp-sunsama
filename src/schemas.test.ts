import { describe, test, expect } from "bun:test";
import {
  completionFilterSchema,
  getTasksByDaySchema,
  getTasksBacklogSchema,
  getArchivedTasksSchema,
  getUserSchema,
  getStreamsSchema,
  createTaskSchema,
  updateTaskCompleteSchema,
  deleteTaskSchema,
  updateTaskSnoozeDateSchema,
  updateTaskBacklogSchema,
  updateTaskPlannedTimeSchema,
  updateTaskNotesSchema,
  updateTaskDueDateSchema,
  updateTaskStreamSchema,
  updateTaskTextSchema,
  userProfileSchema,
  groupSchema,
  userSchema,
  taskSchema,
  streamSchema,
  userResponseSchema,
  tasksResponseSchema,
  streamsResponseSchema,
  errorResponseSchema,
} from "./schemas.js";

describe("Tool Parameter Schemas", () => {
  describe("completionFilterSchema", () => {
    test("should accept valid completion filter values", () => {
      expect(() => completionFilterSchema.parse("all")).not.toThrow();
      expect(() => completionFilterSchema.parse("incomplete")).not.toThrow();
      expect(() => completionFilterSchema.parse("completed")).not.toThrow();
    });

    test("should reject invalid completion filter values", () => {
      expect(() => completionFilterSchema.parse("invalid")).toThrow();
      expect(() => completionFilterSchema.parse("")).toThrow();
      expect(() => completionFilterSchema.parse(null)).toThrow();
      expect(() => completionFilterSchema.parse(undefined)).toThrow();
    });
  });

  describe("getTasksByDaySchema", () => {
    test("should accept valid day format", () => {
      const validInput = {
        day: "2024-01-15",
        timezone: "America/New_York",
        completionFilter: "all" as const,
      };
      expect(() => getTasksByDaySchema.parse(validInput)).not.toThrow();
    });

    test("should accept minimal required input", () => {
      const minimalInput = { day: "2024-01-15" };
      expect(() => getTasksByDaySchema.parse(minimalInput)).not.toThrow();
    });

    test("should reject invalid day formats", () => {
      expect(() => getTasksByDaySchema.parse({ day: "2024/01/15" })).toThrow();
      expect(() => getTasksByDaySchema.parse({ day: "01-15-2024" })).toThrow();
      expect(() => getTasksByDaySchema.parse({ day: "2024-1-15" })).toThrow();
      expect(() => getTasksByDaySchema.parse({ day: "2024-01-5" })).toThrow();
      expect(() => getTasksByDaySchema.parse({ day: "" })).toThrow();
      expect(() => getTasksByDaySchema.parse({})).toThrow();
    });

    test("should reject invalid completion filters", () => {
      expect(() =>
        getTasksByDaySchema.parse({
          day: "2024-01-15",
          completionFilter: "invalid",
        })
      ).toThrow();
    });
  });

  describe("getTasksBacklogSchema", () => {
    test("should accept empty object", () => {
      expect(() => getTasksBacklogSchema.parse({})).not.toThrow();
    });

    test("should ignore extra properties", () => {
      expect(() =>
        getTasksBacklogSchema.parse({ extra: "property" })
      ).not.toThrow();
    });
  });

  describe("getArchivedTasksSchema", () => {
    test("should accept valid pagination parameters", () => {
      const validInput = { offset: 0, limit: 100 };
      expect(() => getArchivedTasksSchema.parse(validInput)).not.toThrow();
    });

    test("should accept empty object", () => {
      expect(() => getArchivedTasksSchema.parse({})).not.toThrow();
    });

    test("should accept valid ranges", () => {
      expect(() => getArchivedTasksSchema.parse({ offset: 0 })).not.toThrow();
      expect(() => getArchivedTasksSchema.parse({ limit: 1 })).not.toThrow();
      expect(() => getArchivedTasksSchema.parse({ limit: 1000 })).not.toThrow();
    });

    test("should reject invalid offset values", () => {
      expect(() => getArchivedTasksSchema.parse({ offset: -1 })).toThrow();
      expect(() => getArchivedTasksSchema.parse({ offset: 1.5 })).toThrow();
    });

    test("should reject invalid limit values", () => {
      expect(() => getArchivedTasksSchema.parse({ limit: 0 })).toThrow();
      expect(() => getArchivedTasksSchema.parse({ limit: 1001 })).toThrow();
      expect(() => getArchivedTasksSchema.parse({ limit: -1 })).toThrow();
      expect(() => getArchivedTasksSchema.parse({ limit: 1.5 })).toThrow();
    });
  });

  describe("getUserSchema", () => {
    test("should accept empty object", () => {
      expect(() => getUserSchema.parse({})).not.toThrow();
    });
  });

  describe("getStreamsSchema", () => {
    test("should accept empty object", () => {
      expect(() => getStreamsSchema.parse({})).not.toThrow();
    });
  });

  describe("createTaskSchema", () => {
    test("should accept valid task creation input", () => {
      const validInput = {
        text: "Test task",
        notes: "Task notes",
        streamIds: ["stream1", "stream2"],
        timeEstimate: 60,
        dueDate: "2024-01-15T10:00:00Z",
        snoozeUntil: "2024-01-16T09:00:00Z",
        private: true,
        taskId: "custom-task-id",
      };
      expect(() => createTaskSchema.parse(validInput)).not.toThrow();
    });

    test("should accept minimal required input", () => {
      const minimalInput = { text: "Test task" };
      expect(() => createTaskSchema.parse(minimalInput)).not.toThrow();
    });

    test("should reject empty text", () => {
      expect(() => createTaskSchema.parse({ text: "" })).toThrow();
      expect(() => createTaskSchema.parse({})).toThrow();
    });

    test("should reject invalid time estimate", () => {
      expect(() =>
        createTaskSchema.parse({ text: "Test", timeEstimate: 0 })
      ).toThrow();
      expect(() =>
        createTaskSchema.parse({ text: "Test", timeEstimate: -1 })
      ).toThrow();
      expect(() =>
        createTaskSchema.parse({ text: "Test", timeEstimate: 1.5 })
      ).toThrow();
    });
  });

  describe("updateTaskCompleteSchema", () => {
    test("should accept valid task completion input", () => {
      const validInput = {
        taskId: "task-123",
        completeOn: "2024-01-15T10:00:00Z",
        limitResponsePayload: true,
      };
      expect(() => updateTaskCompleteSchema.parse(validInput)).not.toThrow();
    });

    test("should accept minimal required input", () => {
      const minimalInput = { taskId: "task-123" };
      expect(() => updateTaskCompleteSchema.parse(minimalInput)).not.toThrow();
    });

    test("should reject empty task ID", () => {
      expect(() => updateTaskCompleteSchema.parse({ taskId: "" })).toThrow();
      expect(() => updateTaskCompleteSchema.parse({})).toThrow();
    });
  });

  describe("deleteTaskSchema", () => {
    test("should accept valid task deletion input", () => {
      const validInput = {
        taskId: "task-123",
        limitResponsePayload: true,
        wasTaskMerged: false,
      };
      expect(() => deleteTaskSchema.parse(validInput)).not.toThrow();
    });

    test("should accept minimal required input", () => {
      const minimalInput = { taskId: "task-123" };
      expect(() => deleteTaskSchema.parse(minimalInput)).not.toThrow();
    });

    test("should reject empty task ID", () => {
      expect(() => deleteTaskSchema.parse({ taskId: "" })).toThrow();
      expect(() => deleteTaskSchema.parse({})).toThrow();
    });
  });

  describe("updateTaskSnoozeDateSchema", () => {
    test("should accept valid date input", () => {
      const validInput = {
        taskId: "task-123",
        newDay: "2024-01-15",
        timezone: "America/New_York",
        limitResponsePayload: true,
      };
      expect(() => updateTaskSnoozeDateSchema.parse(validInput)).not.toThrow();
    });


    test("should accept minimal required input", () => {
      const minimalInput = { taskId: "task-123", newDay: "2024-01-15" };
      expect(() => updateTaskSnoozeDateSchema.parse(minimalInput)).not.toThrow();
    });

    test("should reject empty task ID", () => {
      expect(() =>
        updateTaskSnoozeDateSchema.parse({ taskId: "", newDay: "2024-01-15" })
      ).toThrow();
      expect(() =>
        updateTaskSnoozeDateSchema.parse({ newDay: "2024-01-15" })
      ).toThrow();
    });

    test("should reject invalid date formats", () => {
      expect(() =>
        updateTaskSnoozeDateSchema.parse({
          taskId: "task-123",
          newDay: "2024/01/15",
        })
      ).toThrow();
      expect(() =>
        updateTaskSnoozeDateSchema.parse({
          taskId: "task-123",
          newDay: "01-15-2024",
        })
      ).toThrow();
      expect(() =>
        updateTaskSnoozeDateSchema.parse({
          taskId: "task-123",
          newDay: "invalid-date",
        })
      ).toThrow();
    });

    test("should reject missing newDay", () => {
      expect(() =>
        updateTaskSnoozeDateSchema.parse({ taskId: "task-123" })
      ).toThrow();
    });
  });

  describe("updateTaskBacklogSchema", () => {
    test("should accept valid task backlog input", () => {
      const validInput = {
        taskId: "task-123",
        timezone: "America/New_York",
        limitResponsePayload: true,
      };
      expect(() => updateTaskBacklogSchema.parse(validInput)).not.toThrow();
    });

    test("should accept minimal required input", () => {
      const minimalInput = { taskId: "task-123" };
      expect(() => updateTaskBacklogSchema.parse(minimalInput)).not.toThrow();
    });

    test("should reject empty task ID", () => {
      expect(() =>
        updateTaskBacklogSchema.parse({ taskId: "" })
      ).toThrow();
      expect(() =>
        updateTaskBacklogSchema.parse({})
      ).toThrow();
    });
  });

  describe("updateTaskPlannedTimeSchema", () => {
    test("should accept valid task planned time input", () => {
      const validInput = {
        taskId: "task-123",
        timeEstimateMinutes: 45,
        limitResponsePayload: true,
      };
      expect(() => updateTaskPlannedTimeSchema.parse(validInput)).not.toThrow();
    });

    test("should accept minimal required input", () => {
      const minimalInput = { 
        taskId: "task-123", 
        timeEstimateMinutes: 30 
      };
      expect(() => updateTaskPlannedTimeSchema.parse(minimalInput)).not.toThrow();
    });

    test("should accept zero time estimate", () => {
      const zeroInput = { 
        taskId: "task-123", 
        timeEstimateMinutes: 0 
      };
      expect(() => updateTaskPlannedTimeSchema.parse(zeroInput)).not.toThrow();
    });

    test("should reject empty task ID", () => {
      expect(() =>
        updateTaskPlannedTimeSchema.parse({ 
          taskId: "", 
          timeEstimateMinutes: 30 
        })
      ).toThrow();
      expect(() =>
        updateTaskPlannedTimeSchema.parse({ 
          timeEstimateMinutes: 30 
        })
      ).toThrow();
    });

    test("should reject negative time estimate", () => {
      expect(() =>
        updateTaskPlannedTimeSchema.parse({ 
          taskId: "task-123", 
          timeEstimateMinutes: -1 
        })
      ).toThrow();
    });

    test("should reject non-integer time estimate", () => {
      expect(() =>
        updateTaskPlannedTimeSchema.parse({ 
          taskId: "task-123", 
          timeEstimateMinutes: 30.5 
        })
      ).toThrow();
    });

    test("should reject missing time estimate", () => {
      expect(() =>
        updateTaskPlannedTimeSchema.parse({ 
          taskId: "task-123" 
        })
      ).toThrow();
    });
  });

  describe("updateTaskNotesSchema", () => {
    test("should accept valid HTML content", () => {
      const htmlInput = {
        taskId: "task-123",
        html: "<p>This is HTML content</p>",
        limitResponsePayload: true,
      };
      expect(() => updateTaskNotesSchema.parse(htmlInput)).not.toThrow();
    });

    test("should accept valid Markdown content", () => {
      const markdownInput = {
        taskId: "task-123",
        markdown: "# This is Markdown content",
        limitResponsePayload: true,
      };
      expect(() => updateTaskNotesSchema.parse(markdownInput)).not.toThrow();
    });

    test("should accept minimal HTML input", () => {
      const minimalHtmlInput = {
        taskId: "task-123",
        html: "<p>Simple HTML</p>",
      };
      expect(() => updateTaskNotesSchema.parse(minimalHtmlInput)).not.toThrow();
    });

    test("should accept minimal Markdown input", () => {
      const minimalMarkdownInput = {
        taskId: "task-123",
        markdown: "Simple markdown",
      };
      expect(() => updateTaskNotesSchema.parse(minimalMarkdownInput)).not.toThrow();
    });

    test("should reject both HTML and Markdown provided", () => {
      const invalidInput = {
        taskId: "task-123",
        html: "<p>HTML content</p>",
        markdown: "Markdown content",
      };
      expect(() => updateTaskNotesSchema.parse(invalidInput)).toThrow();
    });

    test("should reject neither HTML nor Markdown provided", () => {
      const invalidInput = {
        taskId: "task-123",
        limitResponsePayload: true,
      };
      expect(() => updateTaskNotesSchema.parse(invalidInput)).toThrow();
    });

    test("should reject empty task ID", () => {
      expect(() =>
        updateTaskNotesSchema.parse({
          taskId: "",
          html: "<p>Content</p>",
        })
      ).toThrow();
      expect(() =>
        updateTaskNotesSchema.parse({
          markdown: "Content",
        })
      ).toThrow();
    });

    test("should accept empty HTML content", () => {
      expect(() =>
        updateTaskNotesSchema.parse({
          taskId: "task-123",
          html: "",
        })
      ).not.toThrow();
    });

    test("should accept empty Markdown content", () => {
      expect(() =>
        updateTaskNotesSchema.parse({
          taskId: "task-123",
          markdown: "",
        })
      ).not.toThrow();
    });
  });

  describe("updateTaskDueDateSchema", () => {
    test("should accept valid ISO date string", () => {
      const validInput = {
        taskId: "task-123",
        dueDate: "2024-06-21T04:00:00.000Z",
        limitResponsePayload: true,
      };
      expect(() => updateTaskDueDateSchema.parse(validInput)).not.toThrow();
    });

    test("should accept valid ISO date-time string with Z timezone", () => {
      const validInput = {
        taskId: "task-123",
        dueDate: "2024-06-21T14:30:00.000Z",
        limitResponsePayload: false,
      };
      expect(() => updateTaskDueDateSchema.parse(validInput)).not.toThrow();
    });

    test("should accept null to clear due date", () => {
      const validInput = {
        taskId: "task-123",
        dueDate: null,
        limitResponsePayload: true,
      };
      expect(() => updateTaskDueDateSchema.parse(validInput)).not.toThrow();
    });

    test("should accept minimal required input with ISO date", () => {
      const minimalInput = {
        taskId: "task-123",
        dueDate: "2024-06-21T09:00:00Z",
      };
      expect(() => updateTaskDueDateSchema.parse(minimalInput)).not.toThrow();
    });

    test("should accept minimal required input with null", () => {
      const minimalInput = {
        taskId: "task-123",
        dueDate: null,
      };
      expect(() => updateTaskDueDateSchema.parse(minimalInput)).not.toThrow();
    });

    test("should reject empty task ID", () => {
      expect(() =>
        updateTaskDueDateSchema.parse({
          taskId: "",
          dueDate: "2024-06-21T09:00:00Z",
        })
      ).toThrow();
      expect(() =>
        updateTaskDueDateSchema.parse({
          dueDate: "2024-06-21T09:00:00Z",
        })
      ).toThrow();
    });

    test("should reject invalid date formats", () => {
      // Date-only format
      expect(() =>
        updateTaskDueDateSchema.parse({
          taskId: "task-123",
          dueDate: "2024-06-21",
        })
      ).toThrow();

      // Non-ISO format
      expect(() =>
        updateTaskDueDateSchema.parse({
          taskId: "task-123",
          dueDate: "06/21/2024",
        })
      ).toThrow();

      // Invalid ISO format
      expect(() =>
        updateTaskDueDateSchema.parse({
          taskId: "task-123",
          dueDate: "2024-06-21T25:00:00Z",
        })
      ).toThrow();

      // Plain text
      expect(() =>
        updateTaskDueDateSchema.parse({
          taskId: "task-123",
          dueDate: "tomorrow",
        })
      ).toThrow();

      // Empty string
      expect(() =>
        updateTaskDueDateSchema.parse({
          taskId: "task-123",
          dueDate: "",
        })
      ).toThrow();
    });

    test("should reject undefined due date", () => {
      expect(() =>
        updateTaskDueDateSchema.parse({
          taskId: "task-123",
          dueDate: undefined,
        })
      ).toThrow();
    });

    test("should reject missing due date", () => {
      expect(() =>
        updateTaskDueDateSchema.parse({
          taskId: "task-123",
        })
      ).toThrow();
    });

    test("should reject non-string, non-null due date values", () => {
      expect(() =>
        updateTaskDueDateSchema.parse({
          taskId: "task-123",
          dueDate: new Date(),
        })
      ).toThrow();

      expect(() =>
        updateTaskDueDateSchema.parse({
          taskId: "task-123",
          dueDate: 1640995200000, // timestamp
        })
      ).toThrow();

      expect(() =>
        updateTaskDueDateSchema.parse({
          taskId: "task-123",
          dueDate: true,
        })
      ).toThrow();
    });
  });

  describe("updateTaskStreamSchema", () => {
    test("should accept valid task stream assignment", () => {
      const validInput = {
        taskId: "task-123",
        streamIds: ["stream-1", "stream-2"],
        recommendedStreamId: "stream-1",
        limitResponsePayload: true,
      };
      expect(() => updateTaskStreamSchema.parse(validInput)).not.toThrow();
    });

    test("should accept empty streamIds array", () => {
      const validInput = {
        taskId: "task-123",
        streamIds: [],
        recommendedStreamId: null,
        limitResponsePayload: false,
      };
      expect(() => updateTaskStreamSchema.parse(validInput)).not.toThrow();
    });

    test("should accept single stream ID", () => {
      const validInput = {
        taskId: "task-123",
        streamIds: ["stream-1"],
        recommendedStreamId: "stream-1",
      };
      expect(() => updateTaskStreamSchema.parse(validInput)).not.toThrow();
    });

    test("should accept null recommendedStreamId", () => {
      const validInput = {
        taskId: "task-123",
        streamIds: ["stream-1", "stream-2"],
        recommendedStreamId: null,
      };
      expect(() => updateTaskStreamSchema.parse(validInput)).not.toThrow();
    });

    test("should accept undefined recommendedStreamId", () => {
      const validInput = {
        taskId: "task-123",
        streamIds: ["stream-1"],
      };
      expect(() => updateTaskStreamSchema.parse(validInput)).not.toThrow();
    });

    test("should reject empty taskId", () => {
      expect(() =>
        updateTaskStreamSchema.parse({
          taskId: "",
          streamIds: ["stream-1"],
        })
      ).toThrow();
    });

    test("should reject missing taskId", () => {
      expect(() =>
        updateTaskStreamSchema.parse({
          streamIds: ["stream-1"],
        })
      ).toThrow();
    });

    test("should reject missing streamIds", () => {
      expect(() =>
        updateTaskStreamSchema.parse({
          taskId: "task-123",
        })
      ).toThrow();
    });

    test("should reject non-string task ID", () => {
      expect(() =>
        updateTaskStreamSchema.parse({
          taskId: 123,
          streamIds: ["stream-1"],
        })
      ).toThrow();

      expect(() =>
        updateTaskStreamSchema.parse({
          taskId: null,
          streamIds: ["stream-1"],
        })
      ).toThrow();

      expect(() =>
        updateTaskStreamSchema.parse({
          taskId: undefined,
          streamIds: ["stream-1"],
        })
      ).toThrow();
    });

    test("should reject non-array streamIds", () => {
      expect(() =>
        updateTaskStreamSchema.parse({
          taskId: "task-123",
          streamIds: "stream-1",
        })
      ).toThrow();

      expect(() =>
        updateTaskStreamSchema.parse({
          taskId: "task-123",
          streamIds: null,
        })
      ).toThrow();

      expect(() =>
        updateTaskStreamSchema.parse({
          taskId: "task-123",
          streamIds: undefined,
        })
      ).toThrow();
    });

    test("should reject non-string elements in streamIds array", () => {
      expect(() =>
        updateTaskStreamSchema.parse({
          taskId: "task-123",
          streamIds: [123, "stream-1"],
        })
      ).toThrow();

      expect(() =>
        updateTaskStreamSchema.parse({
          taskId: "task-123",
          streamIds: ["stream-1", null],
        })
      ).toThrow();

      expect(() =>
        updateTaskStreamSchema.parse({
          taskId: "task-123",
          streamIds: ["stream-1", undefined],
        })
      ).toThrow();
    });

    test("should reject non-string, non-null recommendedStreamId", () => {
      expect(() =>
        updateTaskStreamSchema.parse({
          taskId: "task-123",
          streamIds: ["stream-1"],
          recommendedStreamId: 123,
        })
      ).toThrow();

      expect(() =>
        updateTaskStreamSchema.parse({
          taskId: "task-123",
          streamIds: ["stream-1"],
          recommendedStreamId: true,
        })
      ).toThrow();
    });

    test("should reject non-boolean limitResponsePayload", () => {
      expect(() =>
        updateTaskStreamSchema.parse({
          taskId: "task-123",
          streamIds: ["stream-1"],
          limitResponsePayload: "true",
        })
      ).toThrow();

      expect(() =>
        updateTaskStreamSchema.parse({
          taskId: "task-123",
          streamIds: ["stream-1"],
          limitResponsePayload: 1,
        })
      ).toThrow();
    });
  });
});

describe("Response Schemas", () => {
  describe("userProfileSchema", () => {
    test("should accept valid user profile", () => {
      const validProfile = {
        _id: "user-123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        timezone: "America/New_York",
        avatarUrl: "https://example.com/avatar.jpg",
      };
      expect(() => userProfileSchema.parse(validProfile)).not.toThrow();
    });

    test("should accept profile without optional fields", () => {
      const minimalProfile = {
        _id: "user-123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        timezone: "America/New_York",
      };
      expect(() => userProfileSchema.parse(minimalProfile)).not.toThrow();
    });

    test("should reject invalid email", () => {
      const invalidProfile = {
        _id: "user-123",
        email: "invalid-email",
        firstName: "John",
        lastName: "Doe",
        timezone: "America/New_York",
      };
      expect(() => userProfileSchema.parse(invalidProfile)).toThrow();
    });

    test("should reject invalid avatar URL", () => {
      const invalidProfile = {
        _id: "user-123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        timezone: "America/New_York",
        avatarUrl: "invalid-url",
      };
      expect(() => userProfileSchema.parse(invalidProfile)).toThrow();
    });
  });

  describe("groupSchema", () => {
    test("should accept valid group", () => {
      const validGroup = {
        groupId: "group-123",
        name: "Test Group",
        role: "admin",
      };
      expect(() => groupSchema.parse(validGroup)).not.toThrow();
    });

    test("should accept group without optional role", () => {
      const minimalGroup = {
        groupId: "group-123",
        name: "Test Group",
      };
      expect(() => groupSchema.parse(minimalGroup)).not.toThrow();
    });
  });

  describe("userSchema", () => {
    test("should accept valid user", () => {
      const validUser = {
        _id: "user-123",
        email: "test@example.com",
        profile: {
          _id: "user-123",
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          timezone: "America/New_York",
        },
        primaryGroup: {
          groupId: "group-123",
          name: "Test Group",
        },
      };
      expect(() => userSchema.parse(validUser)).not.toThrow();
    });

    test("should accept user without primary group", () => {
      const userWithoutGroup = {
        _id: "user-123",
        email: "test@example.com",
        profile: {
          _id: "user-123",
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          timezone: "America/New_York",
        },
      };
      expect(() => userSchema.parse(userWithoutGroup)).not.toThrow();
    });
  });

  describe("taskSchema", () => {
    test("should accept valid task", () => {
      const validTask = {
        _id: "task-123",
        title: "Test Task",
        description: "Task description",
        status: "active",
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T11:00:00Z",
        scheduledDate: "2024-01-16",
        completedAt: "2024-01-16T12:00:00Z",
        streamId: "stream-123",
        userId: "user-123",
        groupId: "group-123",
      };
      expect(() => taskSchema.parse(validTask)).not.toThrow();
    });

    test("should accept task with minimal required fields", () => {
      const minimalTask = {
        _id: "task-123",
        title: "Test Task",
        status: "active",
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T11:00:00Z",
        userId: "user-123",
        groupId: "group-123",
      };
      expect(() => taskSchema.parse(minimalTask)).not.toThrow();
    });
  });

  describe("streamSchema", () => {
    test("should accept valid stream", () => {
      const validStream = {
        _id: "stream-123",
        name: "Test Stream",
        color: "#FF0000",
        groupId: "group-123",
        isActive: true,
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T11:00:00Z",
      };
      expect(() => streamSchema.parse(validStream)).not.toThrow();
    });

    test("should accept stream without optional color", () => {
      const minimalStream = {
        _id: "stream-123",
        name: "Test Stream",
        groupId: "group-123",
        isActive: true,
        createdAt: "2024-01-15T10:00:00Z",
        updatedAt: "2024-01-15T11:00:00Z",
      };
      expect(() => streamSchema.parse(minimalStream)).not.toThrow();
    });
  });

  describe("userResponseSchema", () => {
    test("should accept valid user response", () => {
      const validResponse = {
        user: {
          _id: "user-123",
          email: "test@example.com",
          profile: {
            _id: "user-123",
            email: "test@example.com",
            firstName: "John",
            lastName: "Doe",
            timezone: "America/New_York",
          },
        },
      };
      expect(() => userResponseSchema.parse(validResponse)).not.toThrow();
    });
  });

  describe("tasksResponseSchema", () => {
    test("should accept valid tasks response", () => {
      const validResponse = {
        tasks: [
          {
            _id: "task-123",
            title: "Test Task",
            status: "active",
            createdAt: "2024-01-15T10:00:00Z",
            updatedAt: "2024-01-15T11:00:00Z",
            userId: "user-123",
            groupId: "group-123",
          },
        ],
        count: 1,
      };
      expect(() => tasksResponseSchema.parse(validResponse)).not.toThrow();
    });

    test("should accept empty tasks response", () => {
      const emptyResponse = {
        tasks: [],
        count: 0,
      };
      expect(() => tasksResponseSchema.parse(emptyResponse)).not.toThrow();
    });
  });

  describe("streamsResponseSchema", () => {
    test("should accept valid streams response", () => {
      const validResponse = {
        streams: [
          {
            _id: "stream-123",
            name: "Test Stream",
            groupId: "group-123",
            isActive: true,
            createdAt: "2024-01-15T10:00:00Z",
            updatedAt: "2024-01-15T11:00:00Z",
          },
        ],
        count: 1,
      };
      expect(() => streamsResponseSchema.parse(validResponse)).not.toThrow();
    });
  });

  describe("errorResponseSchema", () => {
    test("should accept valid error response", () => {
      const validError = {
        error: "ValidationError",
        message: "Invalid input provided",
        code: "400",
      };
      expect(() => errorResponseSchema.parse(validError)).not.toThrow();
    });

    test("should accept error without optional code", () => {
      const minimalError = {
        error: "ValidationError",
        message: "Invalid input provided",
      };
      expect(() => errorResponseSchema.parse(minimalError)).not.toThrow();
    });
  });
});

describe("Edge Cases and Error Handling", () => {
  test("should handle null values appropriately", () => {
    // updateTaskBacklogSchema should accept all parameters as optional except taskId
    expect(() =>
      updateTaskBacklogSchema.parse({
        taskId: "task-123"
      })
    ).not.toThrow();

    // Other schemas should reject null where not expected
    expect(() => getTasksByDaySchema.parse({ day: null })).toThrow();
    expect(() => createTaskSchema.parse({ text: null })).toThrow();
  });

  test("should handle undefined values appropriately", () => {
    // Optional fields should accept undefined
    expect(() =>
      getTasksByDaySchema.parse({
        day: "2024-01-15",
        timezone: undefined,
        completionFilter: undefined,
      })
    ).not.toThrow();

    // Required fields should reject undefined
    expect(() => getTasksByDaySchema.parse({ day: undefined })).toThrow();
    expect(() => createTaskSchema.parse({ text: undefined })).toThrow();
  });

  test("should handle type coercion correctly", () => {
    // Numbers as strings should be rejected where numbers are expected
    expect(() =>
      getArchivedTasksSchema.parse({ offset: "0", limit: "100" })
    ).toThrow();

    // Boolean strings should be rejected where booleans are expected
    expect(() =>
      createTaskSchema.parse({ text: "Test", private: "true" })
    ).toThrow();
  });

  test("should validate string formats correctly", () => {
    // Email validation
    expect(() =>
      userProfileSchema.parse({
        _id: "user-123",
        email: "@example.com",
        firstName: "John",
        lastName: "Doe",
        timezone: "America/New_York",
      })
    ).toThrow();

    // URL validation
    expect(() =>
      userProfileSchema.parse({
        _id: "user-123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        timezone: "America/New_York",
        avatarUrl: "not-a-url",
      })
    ).toThrow();

    // Date regex validation
    expect(() =>
      getTasksByDaySchema.parse({ day: "2024-13-01" })
    ).not.toThrow(); // Regex allows invalid month/day numbers
    expect(() => getTasksByDaySchema.parse({ day: "24-01-01" })).toThrow(); // But rejects wrong format
  });

  describe("updateTaskTextSchema", () => {
    test("should accept valid task text input", () => {
      const validInput = {
        taskId: "task-123",
        text: "Updated task title",
        recommendedStreamId: "stream-456",
        limitResponsePayload: true,
      };
      expect(() => updateTaskTextSchema.parse(validInput)).not.toThrow();
    });

    test("should accept minimal required input", () => {
      const minimalInput = {
        taskId: "task-123",
        text: "Simple task title",
      };
      expect(() => updateTaskTextSchema.parse(minimalInput)).not.toThrow();
    });

    test("should accept null recommended stream ID", () => {
      const validInput = {
        taskId: "task-123",
        text: "Task with null stream",
        recommendedStreamId: null,
        limitResponsePayload: false,
      };
      expect(() => updateTaskTextSchema.parse(validInput)).not.toThrow();
    });

    test("should reject empty task ID", () => {
      expect(() =>
        updateTaskTextSchema.parse({
          taskId: "",
          text: "Valid text",
        })
      ).toThrow();
      expect(() =>
        updateTaskTextSchema.parse({
          text: "Valid text",
        })
      ).toThrow();
    });

    test("should reject empty task text", () => {
      expect(() =>
        updateTaskTextSchema.parse({
          taskId: "task-123",
          text: "",
        })
      ).toThrow();
      expect(() =>
        updateTaskTextSchema.parse({
          taskId: "task-123",
        })
      ).toThrow();
    });

    test("should reject invalid types", () => {
      expect(() =>
        updateTaskTextSchema.parse({
          taskId: 123,
          text: "Valid text",
        })
      ).toThrow();

      expect(() =>
        updateTaskTextSchema.parse({
          taskId: "task-123",
          text: 123,
        })
      ).toThrow();

      expect(() =>
        updateTaskTextSchema.parse({
          taskId: "task-123",
          text: "Valid text",
          recommendedStreamId: 123,
        })
      ).toThrow();

      expect(() =>
        updateTaskTextSchema.parse({
          taskId: "task-123",
          text: "Valid text",
          limitResponsePayload: "true",
        })
      ).toThrow();
    });
  });
});