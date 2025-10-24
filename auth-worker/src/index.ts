import { handleInitiateXLink, handleXCallback } from "./x";

// Cloudflare Worker environment
export interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  ALLOWED_ORIGIN: string;
  // X OAuth integration
  X_CLIENT_ID: string;
  X_CLIENT_SECRET: string;
  LINKING_SECRET: string;
  // KV Namespace
  LINKING_KV: KVNamespace;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: unknown): Promise<Response> {
    console.log("Request received:", { request, ctx });
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return handleCors(request, env);
    }

    const url = new URL(request.url);

    try {
      // Route the request based on the path
      if (url.pathname === "/api/auth/callback") {
        return await handleCallback(request, env);
      } else if (url.pathname === "/api/status") {
        return handleStatus(env);
      }
      // X OAuth routes
      else if (url.pathname === "/api/x/initiate-link") {
        return await handleInitiateXLink(request, env);
      } else if (url.pathname === "/api/x/callback") {
        return await handleXCallback(request, env);
      } else {
        return new Response("Not found", { status: 404 });
      }
    } catch (error) {
      console.error("Error in worker:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(env),
        },
      });
    }
  },
};

export default worker;
// Handler for the GitHub OAuth callback
async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response(
      JSON.stringify({ error: "Missing authorization code" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(env),
        },
      },
    );
  }

  try {
    // Exchange the code for an access token
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      },
    );

    if (!tokenResponse.ok) {
      throw new Error(`GitHub token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      token_type: string;
      scope: string;
      error?: string;
      error_description?: string;
    };
    console.log("Token data:", tokenData);
    // Check if we got an error response from GitHub
    if (tokenData.error) {
      return new Response(
        JSON.stringify({
          error: tokenData.error,
          description: tokenData.error_description,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(env),
          },
        },
      );
    }

    // Check if the token has the required scope
    if (!tokenData.scope?.includes("read:user")) {
      return new Response(
        JSON.stringify({
          error: "Insufficient permissions. The 'read:user' scope is required.",
        }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(env),
          },
        },
      );
    }

    // Return the token data to the client
    const expiresInMilliseconds = 3 * 60 * 60 * 1000; // 3 hours
    const expiresAt = Date.now() + expiresInMilliseconds;

    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
        expires_at: expiresAt,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(env),
        },
      },
    );
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to exchange authorization code for access token",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(env),
        },
      },
    );
  }
}

// Handler for status checks
function handleStatus(env: Env): Response {
  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(env),
    },
  });
}

// Helper to handle CORS preflight requests
function handleCors(request: Request, env: Env): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(env),
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// Helper to get CORS headers for responses
function getCorsHeaders(env: Env): HeadersInit {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
  };
}
