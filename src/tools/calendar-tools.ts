import type { CalendarEventUpdateData, CreateCalendarEventOptions } from "sunsama-api/types";
import {
  type CreateCalendarEventInput,
  createCalendarEventSchema,
  type UpdateCalendarEventInput,
  updateCalendarEventSchema,
} from "../schemas.js";
import {
  formatJsonResponse,
  withTransportClient,
  type ToolConfig,
  type ToolContext,
} from "./shared.js";

export const createCalendarEventConfig: ToolConfig<typeof createCalendarEventSchema> = {
  name: "create-calendar-event",
  description: "Create a new calendar event in Sunsama",
  parameters: createCalendarEventSchema,
  execute: async (
    {
      title,
      startDate,
      endDate,
      description,
      calendarId,
      service,
      streamIds,
      visibility,
      transparency,
      isAllDay,
      seedTaskId,
    }: CreateCalendarEventInput,
    context: ToolContext,
  ) => {
    const options: CreateCalendarEventOptions = {};
    if (description !== undefined) options.description = description;
    if (calendarId !== undefined) options.calendarId = calendarId;
    if (service !== undefined) options.service = service;
    if (streamIds !== undefined) options.streamIds = streamIds;
    if (visibility !== undefined) options.visibility = visibility;
    if (transparency !== undefined) options.transparency = transparency;
    if (isAllDay !== undefined) options.isAllDay = isAllDay;
    if (seedTaskId !== undefined) options.seedTaskId = seedTaskId;
    options.limitResponsePayload = false;

    const result = await context.client.createCalendarEvent(
      title,
      startDate,
      endDate,
      options,
    );

    return formatJsonResponse({
      success: result.success,
      calendarEvent: result.createdCalendarEvent,
      updatedFields: result.updatedFields,
    });
  },
};
export const createCalendarEventTool = withTransportClient(createCalendarEventConfig);

export const updateCalendarEventConfig: ToolConfig<typeof updateCalendarEventSchema> = {
  name: "update-calendar-event",
  description:
    "Update an existing calendar event. Requires the full CalendarEventUpdateData object — fetch the event first to get all required fields.",
  parameters: updateCalendarEventSchema,
  execute: async (
    { eventId, update, isInviteeStatusUpdate, skipReorder }: UpdateCalendarEventInput,
    context: ToolContext,
  ) => {
    const result = await context.client.updateCalendarEvent(
      eventId,
      update as unknown as CalendarEventUpdateData,
      {
        isInviteeStatusUpdate,
        skipReorder,
        limitResponsePayload: false,
      },
    );

    return formatJsonResponse({
      success: result.success,
      skipped: result.skipped,
      calendarEvent: result.updatedCalendarEvent,
      updatedFields: result.updatedFields,
    });
  },
};
export const updateCalendarEventTool = withTransportClient(updateCalendarEventConfig);

export const calendarToolConfigs = [
  createCalendarEventConfig,
  updateCalendarEventConfig,
];

export const calendarTools = [
  createCalendarEventTool,
  updateCalendarEventTool,
];
