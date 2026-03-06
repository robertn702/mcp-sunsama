import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { SunsamaClient } from "sunsama-api/client";
import { renderLoginPage } from "./login-page";
import type { Env } from "./types";

/**
 * Handles the OAuth authorization flow for Sunsama MCP.
 *
 * GET /authorize  — Renders the login form
 * POST /authorize — Processes login, authenticates with Sunsama, completes OAuth
 */
export const authHandler: ExportedHandler<Env> = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/authorize") {
      if (request.method === "GET") {
        return handleAuthorizePage(request, env);
      }
      if (request.method === "POST") {
        return handleAuthorizeSubmit(request, env);
      }
    }

    // Fallback: show a simple info page for non-authorize routes
    return new Response("Sunsama MCP Server", { status: 200 });
  },
};

/**
 * GET /authorize — Parse the OAuth request, render the login form
 */
async function handleAuthorizePage(request: Request, env: Env): Promise<Response> {
  const oauthHelpers = env.OAUTH_PROVIDER as unknown as OAuthHelpers;

  try {
    const oauthReq = await oauthHelpers.parseAuthRequest(request);
    // Serialize the OAuth request into state so it survives the form POST
    const oauthState = btoa(JSON.stringify(oauthReq));

    return new Response(renderLoginPage(undefined, oauthState), {
      headers: { "Content-Type": "text/html;charset=utf-8" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid OAuth request";
    return new Response(renderLoginPage(message), {
      status: 400,
      headers: { "Content-Type": "text/html;charset=utf-8" },
    });
  }
}

/**
 * POST /authorize — Process login form submission
 * 1. Authenticate against Sunsama API
 * 2. Extract session token
 * 3. Complete OAuth authorization (stores token in encrypted props)
 * 4. Redirect back to Claude.ai
 */
async function handleAuthorizeSubmit(request: Request, env: Env): Promise<Response> {
  const oauthHelpers = env.OAUTH_PROVIDER as unknown as OAuthHelpers;

  let oauthState: string;
  let email: string;
  let password: string;

  try {
    const formData = await request.formData();
    oauthState = formData.get("oauthState") as string;
    email = formData.get("email") as string;
    password = formData.get("password") as string;

    if (!oauthState || !email || !password) {
      return new Response(renderLoginPage("All fields are required.", oauthState), {
        status: 400,
        headers: { "Content-Type": "text/html;charset=utf-8" },
      });
    }
  } catch {
    return new Response(renderLoginPage("Invalid form submission."), {
      status: 400,
      headers: { "Content-Type": "text/html;charset=utf-8" },
    });
  }

  // Restore the original OAuth request
  let oauthReq: AuthRequest;
  try {
    oauthReq = JSON.parse(atob(oauthState)) as AuthRequest;
  } catch {
    return new Response(renderLoginPage("Invalid OAuth state. Please try again."), {
      status: 400,
      headers: { "Content-Type": "text/html;charset=utf-8" },
    });
  }

  // Authenticate with Sunsama
  let sessionToken: string;
  try {
    const client = new SunsamaClient();
    await client.login(email, password);
    const token = await client.getSessionToken();

    if (!token) {
      throw new Error("Failed to obtain session token");
    }

    sessionToken = token;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    const userMessage = message.includes("429")
      ? "Too many login attempts. Please wait and try again."
      : "Invalid email or password.";

    return new Response(renderLoginPage(userMessage, oauthState), {
      status: 401,
      headers: { "Content-Type": "text/html;charset=utf-8" },
    });
  }

  // Complete OAuth authorization — store session token in encrypted props
  try {
    const { redirectTo } = await oauthHelpers.completeAuthorization({
      request: oauthReq,
      userId: email,
      metadata: { email },
      scope: oauthReq.scope,
      props: {
        sunsamaSessionToken: sessionToken,
        email,
      },
    });

    return Response.redirect(redirectTo, 302);
  } catch (err) {
    console.error("Failed to complete OAuth authorization:", err);
    return new Response(renderLoginPage("Authorization failed. Please try again.", oauthState), {
      status: 500,
      headers: { "Content-Type": "text/html;charset=utf-8" },
    });
  }
}
