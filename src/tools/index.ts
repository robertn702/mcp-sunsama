import { userTools, userToolConfigs } from "./user-tools.js";
import { taskTools, taskToolConfigs } from "./task-tools.js";
import { streamTools, streamToolConfigs } from "./stream-tools.js";
import { calendarTools, calendarToolConfigs } from "./calendar-tools.js";
import { bulkTaskTools, bulkTaskToolConfigs } from "./bulk-task-tools.js";

export const allTools = [
  ...userTools,
  ...taskTools,
  ...streamTools,
  ...calendarTools,
  ...bulkTaskTools,
];

/** Raw tool configs for use outside the Node.js transport (e.g. Cloudflare Worker). */
export const allToolConfigs = [
  ...userToolConfigs,
  ...taskToolConfigs,
  ...streamToolConfigs,
  ...calendarToolConfigs,
  ...bulkTaskToolConfigs,
];

export * from "./user-tools.js";
export * from "./task-tools.js";
export * from "./stream-tools.js";
export * from "./calendar-tools.js";
export * from "./bulk-task-tools.js";
export * from "./shared.js";
export * from "./transport-wrapper.js";
