import { type GetUserInput, getUserSchema } from "../schemas.js";
import { formatJsonResponse, withTransportClient, type ToolConfig, type ToolContext } from "./shared.js";

export const getUserConfig: ToolConfig<typeof getUserSchema> = {
  name: "get-user",
  description:
    "Get current user information including profile, timezone, and group details",
  parameters: getUserSchema,
  execute: async (_args: GetUserInput, context: ToolContext) => {
    const user = await context.client.getUser();

    return formatJsonResponse(user);
  },
};
export const getUserTool = withTransportClient(getUserConfig);

export const userToolConfigs = [getUserConfig];
export const userTools = [getUserTool];
