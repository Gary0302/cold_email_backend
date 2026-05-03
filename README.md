# Cold Email Tinder

AI agent that finds founders/execs via Apollo, drafts cold emails, then lets
you swipe to send via Gmail. Built on Next.js 15 + Vercel AI SDK + Vercel KV.

## Stack

- **Framework:** Next.js 15 (App Router, TSX) — frontend + API routes in one repo
- **Agent:** Vercel AI SDK (`ai`) → `anthropic/claude-opus-4.6` via Vercel AI Gateway
- **Auth:** Auth.js v5 / NextAuth — Google OAuth with `gmail.send` scope
- **Send:** `googleapis` (Gmail v1)
- **Contacts:** Apollo.io REST (mock fallback when key is missing)
- **Storage:** `@vercel/kv` (Upstash Redis)
- **UI (planned):** shadcn/ui + framer-motion swipe deck (frontend team owns)

## API surface

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/agent` | AI SDK UI message stream. Body: `{ messages: UIMessage[] }`. Agent calls `apollo_search_contacts` → `draft_cold_email` × N. |
| `GET` | `/api/auth/signin` | NextAuth-hosted login page (Google). |
| `GET` | `/api/drafts?status=` | List drafts. `status` ∈ `pending` (deck), `queued_for_edit` (saved for later), `sent`. |
| `PATCH` | `/api/drafts/:id` | `{ subject?, body?, status? }` — left-swipe sends `{ status: "queued_for_edit" }`. |
| `DELETE` | `/api/drafts/:id` | Hard delete. |
| `POST` | `/api/drafts/:id/send` | Right-swipe — sends via Gmail and stamps `status:"sent"` + `gmailMessageId`. |

## Local dev

### 1. Install

```bash
pnpm install
```

### 2. Env vars

```bash
cp .env.local.example .env.local
```

Fill in:

| Var | Where to get it | Required for |
| --- | --- | --- |
| `AI_GATEWAY_API_KEY` | Vercel dashboard → AI Gateway → create key | Agent calls |
| `AUTH_SECRET` | `openssl rand -hex 32` | NextAuth (any deploy) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud → Credentials → OAuth client (Web). Authorized redirect: `http://localhost:3000/api/auth/callback/google` for dev | Sign-in + Gmail send |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | `vercel env pull` after creating KV (see below) | Persisting drafts |
| `APOLLO_API_KEY` | Apollo dashboard → Settings → API | Real contact search (else falls back to mocks) |
| `DEV_USER_ID` | Anything (e.g. `local-dev-user`) | Optional — lets you hit `/api/agent` & list drafts without signing in. **Sending still requires a real Google session.** |

### 3. Provision Vercel KV

```bash
pnpm dlx vercel link             # link this dir to a Vercel project
pnpm dlx vercel kv create cold-email-kv
pnpm dlx vercel env pull .env.local
```

### 4. Configure Google OAuth

1. https://console.cloud.google.com → APIs & Services → OAuth consent screen → External, test users include yourself.
2. Credentials → Create OAuth client → Web application.
3. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-vercel-url>/api/auth/callback/google`
4. Enable the **Gmail API** in the same project.
5. Copy the client id/secret into `.env.local`.

### 5. Run

```bash
pnpm dev
```

Open http://localhost:3000.

## Smoke test (no UI required)

With `DEV_USER_ID=local-dev-user` set and `pnpm dev` running:

```bash
# Hit the agent — should stream tool calls + draft persistence
curl -N -X POST http://localhost:3000/api/agent \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","parts":[{"type":"text","text":"Find CEOs at YC fintech startups in SF, draft 2 cold emails per contact."}]}]}'

# List the drafts the agent just persisted
curl http://localhost:3000/api/drafts?status=pending | jq

# Swipe left on one of them
curl -X PATCH http://localhost:3000/api/drafts/<id> \
  -H 'Content-Type: application/json' \
  -d '{"status":"queued_for_edit"}'
```

Sending requires Google sign-in:

```bash
# Open in browser, sign in:
open http://localhost:3000/api/auth/signin

# Then in same browser, swipe-right (or via curl using session cookie):
curl -X POST http://localhost:3000/api/drafts/<id>/send -b cookies.txt
```

Without `APOLLO_API_KEY` you'll see `[apollo] APOLLO_API_KEY not set, returning mock contacts` in the dev console — five hard-coded contacts at Stripe / Retool / Vercel / Linear / Warp. Lets the swipe deck demo without an Apollo account.

## Deploy

```bash
pnpm dlx vercel --prod
```

`vercel.json` already overrides `maxDuration` to 60s for `/api/agent` (multi-step
agent loops can run long) and 30s for `/api/drafts/:id/send`.

After deploy, add the production callback URL to your Google OAuth client and
re-pull env vars: `vercel env pull`.

## Repo layout

```
app/
  page.tsx                      Landing (placeholder until v0 frontend lands)
  api/
    agent/route.ts              POST: streams agent w/ tools
    auth/[...nextauth]/route.ts NextAuth handler
    drafts/route.ts             GET list
    drafts/[id]/route.ts        PATCH / DELETE
    drafts/[id]/send/route.ts   POST → Gmail send
auth.ts                         NextAuth v5 config (Google + gmail.send scope)
lib/
  types.ts                      Draft / Contact / FilterInput / DraftStatus
  kv.ts                         Typed @vercel/kv wrappers
  session.ts                    getAuthedUser (with DEV_USER_ID fallback)
  apollo.ts                     Apollo REST client + mock fallback
  gmail.ts                      sendGmail (RFC 2822 + base64url)
  agent/
    prompts.ts                  Cold-email system prompt (3 angles)
    tools.ts                    apollo_search_contacts, draft_cold_email,
                                list_pending_drafts, update_draft
    mcp.ts                      Placeholder: AI SDK v6 dropped built-in MCP
vercel.json                     maxDuration overrides
```

## Known caveats

- **AI SDK v6** removed `experimental_createMCPClient`. The original plan used Apollo's MCP server — we ship REST instead. Re-add MCP via `@modelcontextprotocol/sdk` if Apollo's hosted MCP becomes a hard requirement.
- **`@vercel/kv` v3 is deprecated** by Vercel in favor of `@upstash/redis`. Works fine for the demo; swap post-MVP.
- **OAuth refresh tokens** are persisted in the JWT but not currently rotated. Tokens last ~1h — re-sign in if you hit a 401 from Gmail.
- **Vercel hobby plan** caps function duration at 10s. The agent route needs Pro / Fluid Compute (60s default in `vercel.json`).
