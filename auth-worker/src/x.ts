/**
 * X (Twitter) OAuth Integration Module
 *
 * Handles OAuth 2.0 flow to link GitHub accounts with X accounts
 * and generates cryptographically signed JWT tokens as proof of linking.
 */

import { generateLinkingJWT } from "./jwt";

export interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  X_CLIENT_ID: string;
  X_CLIENT_SECRET: string;
  LINKING_SECRET: string;
  ALLOWED_ORIGIN: string;
  LINKING_KV: KVNamespace;
}

interface LinkingData {
  githubUsername: string;
  createdAt: number;
}

interface XTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface XUserResponse {
  data: {
    id: string;
    username: string;
    name: string;
  };
}

/**
 * Endpoint: POST /api/x/initiate-link
 * Headers: Authorization: Bearer <github_token>
 *
 * Generates a linking token and returns the X authorization URL
 */
export async function handleInitiateXLink(
  request: Request,
  env: Env,
): Promise<Response> {
  // 1. Verify GitHub authentication
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing GitHub authentication" }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(env),
        },
      },
    );
  }

  const githubToken = authHeader.replace("Bearer ", "");

  try {
    // 2. Fetch GitHub username
    const githubUserResponse = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${githubToken}` },
    });

    if (!githubUserResponse.ok) {
      throw new Error("Invalid GitHub token");
    }

    const githubUser = (await githubUserResponse.json()) as { login: string };

    // 3. Generate unique linking token
    const linkingToken = crypto.randomUUID();

    // 4. Store in KV with 15-minute TTL
    await env.LINKING_KV.put(
      `x-link:${linkingToken}`,
      JSON.stringify({
        githubUsername: githubUser.login,
        createdAt: Date.now(),
      } as LinkingData),
      { expirationTtl: 900 }, // 15 minutes
    );

    // 5. Build X authorization URL
    const redirectUri = `${env.ALLOWED_ORIGIN}/auth/x/callback`;
    const xAuthUrl = new URL("https://x.com/i/oauth2/authorize");

    xAuthUrl.searchParams.set("response_type", "code");
    xAuthUrl.searchParams.set("client_id", env.X_CLIENT_ID);
    xAuthUrl.searchParams.set("redirect_uri", redirectUri);
    xAuthUrl.searchParams.set("scope", "tweet.read users.read follows.read");
    xAuthUrl.searchParams.set("state", linkingToken);
    xAuthUrl.searchParams.set("code_challenge", "challenge"); // PKCE (simplified)
    xAuthUrl.searchParams.set("code_challenge_method", "plain");

    return new Response(
      JSON.stringify({
        authUrl: xAuthUrl.toString(),
        linkingToken,
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
    console.error("Error initiating X link:", error);
    return new Response(
      JSON.stringify({ error: "Failed to initiate X linking" }),
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

/**
 * Endpoint: GET /api/x/callback?code=...&state=...
 *
 * Exchanges the OAuth code for a token, fetches X user info,
 * and generates a signed JWT
 */
export async function handleXCallback(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // Our linkingToken

  if (!code || !state) {
    return new Response(
      JSON.stringify({ error: "Missing code or state parameter" }),
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
    // 1. Retrieve linking data from KV
    const linkingDataStr = await env.LINKING_KV.get(`x-link:${state}`);

    if (!linkingDataStr) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired linking token" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...getCorsHeaders(env),
          },
        },
      );
    }

    const linkingData = JSON.parse(linkingDataStr) as LinkingData;

    // 2. Exchange code for access token
    const tokenResponse = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${env.X_CLIENT_ID}:${env.X_CLIENT_SECRET}`)}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: `${env.ALLOWED_ORIGIN}/auth/x/callback`,
        code_verifier: "challenge", // PKCE
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("X token exchange failed:", errorText);
      throw new Error("X token exchange failed");
    }

    const tokenData = (await tokenResponse.json()) as XTokenResponse;

    // 3. Fetch X user info
    const userResponse = await fetch("https://api.x.com/2/users/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to fetch X user info");
    }

    const userData = (await userResponse.json()) as XUserResponse;

    // 4. Generate signed JWT
    const linkingProof = await generateLinkingJWT(
      {
        githubUsername: linkingData.githubUsername,
        xUserId: userData.data.id,
        xUsername: userData.data.username,
        linkedAt: new Date().toISOString(),
      },
      env.LINKING_SECRET,
    );

    // 5. Cleanup KV
    await env.LINKING_KV.delete(`x-link:${state}`);

    // 6. Return JWT
    return new Response(
      JSON.stringify({
        success: true,
        linkingProof,
        xUsername: userData.data.username,
        githubUsername: linkingData.githubUsername,
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
    console.error("Error in X callback:", error);
    return new Response(
      JSON.stringify({ error: "Failed to complete X linking" }),
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

function getCorsHeaders(env: Env): HeadersInit {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
  };
}
