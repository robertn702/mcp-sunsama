import { type GetStreamsInput, getStreamsSchema } from "../schemas.js";
import { formatTsvResponse, withTransportClient, type ToolContext } from "./shared.js";

export const getStreamsTool = withTransportClient({
  name: "get-streams",
  description:
    "Get streams for the user's group (streams are called 'channels' in the Sunsama UI)",
  parameters: getStreamsSchema,
  execute: async (_args: GetStreamsInput, context: ToolContext) => {
    const streams = await context.client.getStreamsByGroupId();

    return formatTsvResponse(streams);
  },
});

export const streamTools = [getStreamsTool];
