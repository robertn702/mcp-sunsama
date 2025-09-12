import { type GetUserInput, getUserSchema } from "../schemas.js";
import { getGlobalSunsamaClient } from "../auth/stdio.js";
import { formatJsonResponse } from "./shared.js";

export const getUserTool = {
  name: "get-user",
  description:
    "Get current user information including profile, timezone, and group details",
  parameters: getUserSchema,
  execute: async (_args: GetUserInput) => {
    const sunsamaClient = await getGlobalSunsamaClient();
    const user = await sunsamaClient.getUser();

    return formatJsonResponse(user);
  },
};

export const userTools = [getUserTool];
