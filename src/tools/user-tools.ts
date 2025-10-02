import { type GetUserInput, getUserSchema } from "../schemas.js";
import { formatJsonResponse, withTransportClient, type ToolContext } from "./shared.js";

export const getUserTool = withTransportClient({
  name: "get-user",
  description:
    "Get current user information including profile, timezone, and group details",
  parameters: getUserSchema,
  execute: async (_args: GetUserInput, context: ToolContext) => {
    // Client auto-injected by withTransportClient
    const user = await context.client.getUser();

    return formatJsonResponse(user);
  },
});

export const userTools = [getUserTool];
