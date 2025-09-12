import { type GetStreamsInput, getStreamsSchema } from "../schemas.js";
import { formatTsvResponse } from "./shared.js";
import { getGlobalSunsamaClient } from "../auth/stdio.js";

export const getStreamsTool = {
  name: "get-streams",
  description:
    "Get streams for the user's group (streams are called 'channels' in the Sunsama UI)",
  parameters: getStreamsSchema,
  execute: async (_args: GetStreamsInput) => {
    const sunsamaClient = await getGlobalSunsamaClient();
    const streams = await sunsamaClient.getStreamsByGroupId();

    return formatTsvResponse(streams);
  },
};

export const streamTools = [getStreamsTool];
