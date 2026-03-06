import { type GetStreamsInput, getStreamsSchema } from "../schemas.js";
import { formatTsvResponse, type ToolConfig, type ToolContext } from "./shared.js";
import { withTransportClient } from "./transport-wrapper.js";

export const getStreamsConfig: ToolConfig<typeof getStreamsSchema> = {
  name: "get-streams",
  description:
    "Get streams for the user's group (streams are called 'channels' in the Sunsama UI)",
  parameters: getStreamsSchema,
  execute: async (_args: GetStreamsInput, context: ToolContext) => {
    const streams = await context.client.getStreamsByGroupId();

    return formatTsvResponse(streams);
  },
};
export const getStreamsTool = withTransportClient(getStreamsConfig);

export const streamToolConfigs = [getStreamsConfig];
export const streamTools = [getStreamsTool];
