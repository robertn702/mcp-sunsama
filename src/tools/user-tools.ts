import { getUserSchema, type GetUserInput } from "../schemas.js";
import { createToolWrapper, getClient, formatJsonResponse, type ToolContext } from "./shared.js";

export const getUserTool = createToolWrapper({
  name: "get-user",
  description: "Get current user information including profile, timezone, and group details",
  parameters: getUserSchema,
  execute: async (_args: GetUserInput, context: ToolContext) => {
    context.log.info("Getting user information");

    const sunsamaClient = getClient(context.session);
    const user = await sunsamaClient.getUser();

    context.log.info("Successfully retrieved user information", { userId: user._id });

    return formatJsonResponse(user);
  }
});

export const userTools = [getUserTool];