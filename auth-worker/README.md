# Sendo Auth Worker

Cloudflare Worker for OAuth authentication (GitHub + X/Twitter)

## Features

- GitHub OAuth 2.0 token exchange
- X (Twitter) OAuth 2.0 with JWT-signed account linking
- CORS support for frontend integration
- KV storage for temporary linking tokens

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Create KV Namespace

```bash
# Create production namespace
bunx wrangler kv:namespace create "LINKING_KV"

# Create preview namespace
bunx wrangler kv:namespace create "LINKING_KV" --preview
```

Update the IDs in `wrangler.toml` with the values returned.

### 3. Configure Secrets

For **local development**, copy `.dev.vars.example` to `.dev.vars` and fill in the values:

```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your actual credentials
```

For **production**, set secrets via Wrangler:

```bash
bunx wrangler secret put GITHUB_CLIENT_ID
bunx wrangler secret put GITHUB_CLIENT_SECRET
bunx wrangler secret put X_CLIENT_ID
bunx wrangler secret put X_CLIENT_SECRET
bunx wrangler secret put LINKING_SECRET
```

Generate the linking secret with:

```bash
openssl rand -base64 32
```

### 4. Setup OAuth Apps

#### GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Create New OAuth App
3. Set callback URL: `https://<worker-url>/api/auth/callback`
4. Copy Client ID and Secret

#### X (Twitter) OAuth App

1. Go to https://developer.twitter.com/en/portal/dashboard
2. Create a new app
3. Enable OAuth 2.0
4. Set callback URL: `https://sendo-labs.github.io/auth/x/callback`
5. Set permissions: Read
6. Copy Client ID and Secret

## Development

Run locally:

```bash
bunx wrangler dev
```

The worker will be available at `http://localhost:8787`

## Deployment

```bash
bunx wrangler deploy
```

## Endpoints

### GitHub OAuth

- `GET /api/auth/callback?code=...` - GitHub OAuth callback
- `GET /api/status` - Health check

### X OAuth

- `POST /api/x/initiate-link` - Initiate X account linking (requires GitHub token)
- `GET /api/x/callback?code=...&state=...` - X OAuth callback

## Testing

```bash
# Test status endpoint
curl http://localhost:8787/api/status

# Test X linking initiation (requires valid GitHub token)
curl -X POST http://localhost:8787/api/x/initiate-link \
  -H "Authorization: Bearer <github_token>"
```
