import { getStreamsSchema, type GetStreamsInput } from "../schemas.js";
import { getSunsamaClient } from "../utils/client-resolver.js";
import { createToolWrapper, formatTsvResponse, type ToolContext } from "./shared.js";

export const getStreamsTool = createToolWrapper({
  name: "get-streams",
  description: "Get streams for the user's group (streams are called 'channels' in the Sunsama UI)",
  parameters: getStreamsSchema,
  execute: async (_args: GetStreamsInput, context: ToolContext) => {
    context.log.info("Getting streams for user's group");

    const sunsamaClient = await getSunsamaClient(context.session);
    const streams = await sunsamaClient.getStreamsByGroupId();

    context.log.info("Successfully retrieved streams", { count: streams.length });

    return formatTsvResponse(streams);
  }
});

export const streamTools = [getStreamsTool];