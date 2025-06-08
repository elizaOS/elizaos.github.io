---
sidebar_position: 5
---

# Authentication (`/auth-worker`)

The `/auth-worker` directory contains a [Cloudflare Worker](https://workers.cloudflare.com/) that handles the server-side logic for our GitHub authentication process. Using a serverless worker provides a secure and scalable way to manage OAuth credentials and user tokens without maintaining a traditional backend server.

## Purpose and Workflow

The primary responsibility of this worker is to facilitate the OAuth 2.0 flow with GitHub.

1.  **Initiation**: When a user clicks the "Login with GitHub" button on the frontend, they are redirected to GitHub's authorization page.
2.  **Callback**: After the user approves the authorization request, GitHub redirects them back to a specific endpoint handled by this Cloudflare Worker (`/auth/callback`).
3.  **Token Exchange**: The worker receives a temporary `code` from GitHub. It then securely exchanges this code for a permanent `access_token` by making a server-to-server request to GitHub's token endpoint, using the client ID and client secret stored as secure environment variables in the Cloudflare dashboard.
4.  **Redirection**: Once the worker has obtained the access token, it redirects the user back to the main application, passing the token along so the frontend can store it and make authenticated requests on the user's behalf.

## Key Files

- **`src/index.ts`**: This is the main entry point for the worker. It contains the logic for handling the callback request, exchanging the code for a token, and managing the final redirection.
- **`wrangler.toml`**: This is the configuration file for the Cloudflare Worker, defining its name, compatibility date, and other settings.
- **`package.json`**: Defines the dependencies for the worker, which are typically minimal.

By isolating this sensitive logic in a serverless worker, we keep our client-side application clean and ensure that our OAuth client secret is never exposed to the browser.
