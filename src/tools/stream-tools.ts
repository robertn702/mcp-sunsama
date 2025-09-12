import { type GetStreamsInput, getStreamsSchema } from "../schemas.js";
import { formatTsvResponse } from "./shared.js";

import { getSunsamaClient } from "../utils/client-resolver.js";

export const getStreamsTool = {
  name: "get-streams",
  description:
    "Get streams for the user's group (streams are called 'channels' in the Sunsama UI)",
  parameters: getStreamsSchema,
  execute: async (args: GetStreamsInput) => {
    const sunsamaClient = getSunsamaClient();
    const streams = await sunsamaClient.getStreamsByGroupId();

    return formatTsvResponse(streams);
  },
};

export const streamTools = [getStreamsTool];
