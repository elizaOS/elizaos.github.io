/**
 * JWT Generation and Signing Module
 *
 * Generates cryptographically signed JWT tokens using HMAC-SHA256
 * to prove the link between GitHub and X accounts.
 */

export interface LinkingPayload {
  githubUsername: string;
  xUserId: string;
  xUsername: string;
  linkedAt: string;
}

/**
 * Generates a JWT signed with HS256 (HMAC-SHA256)
 */
export async function generateLinkingJWT(
  payload: LinkingPayload,
  secret: string,
): Promise<string> {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const claims = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    iss: "sendo-auth-worker",
  };

  // Encode header and payload in base64url
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));

  // Create signature
  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = await signHMAC(message, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Signs a message with HMAC-SHA256
 */
async function signHMAC(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);

  return base64UrlEncode(signature);
}

/**
 * Encodes data in base64url format (JWT-compatible)
 */
function base64UrlEncode(data: string | ArrayBuffer): string {
  let base64: string;

  if (typeof data === "string") {
    base64 = btoa(data);
  } else {
    const bytes = new Uint8Array(data);
    const binaryString = Array.from(bytes)
      .map((b) => String.fromCharCode(b))
      .join("");
    base64 = btoa(binaryString);
  }

  // Convert base64 to base64url
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
