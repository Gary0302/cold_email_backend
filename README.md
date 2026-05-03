# ColdReach

AI agent that finds founders/execs via Apollo, drafts personalized cold emails, then lets
you swipe to send via Gmail. Fully integrated Next.js 16 monorepo — UI and backend in one app.

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, TSX) |
| UI | shadcn/ui (new-york style) · Tailwind v4 · Radix UI |
| Agent | Vercel AI SDK v6 → `anthropic/claude-opus-4.6` |
| Auth | Auth.js v5 / NextAuth — Google OAuth with `gmail.send` scope |
| Send | `googleapis` (Gmail v1) |
| Contacts | Apollo.io REST (mock fallback when key is missing) |
| Storage | `@vercel/kv` (Upstash Redis) |

## App Flow

```
Intro → Prescreen (upload docs) → AI Questions (4 Q&A) →
→ Pick company + dept → Agent generates drafts via Apollo
→ Contact list (real drafts from KV) → Email deck (swipe to send/edit/queue)
```

## API Surface

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/agent` | Vercel AI SDK stream. Body: `{ messages: UIMessage[] }`. Agent calls `apollo_search_contacts` → `draft_cold_email` × N. |
| `GET` | `/api/auth/signin` | NextAuth Google sign-in page. |
| `GET` | `/api/drafts?status=` | List drafts. `status` ∈ `pending`, `queued_for_edit`, `sent`. |
| `PATCH` | `/api/drafts/:id` | `{ subject?, body?, status? }` — edit body or queue for edit. |
| `DELETE` | `/api/drafts/:id` | Hard delete. |
| `POST` | `/api/drafts/:id/send` | Right-swipe — sends via Gmail and stamps `status:"sent"`. |

## Local Dev

### 1. Install

```bash
pnpm install
```

### 2. Env vars

```bash
cp .env.local.example .env.local
```

| Var | Where to get it | Required for |
|-----|-----------------|--------------|
| `AI_GATEWAY_API_KEY` | Vercel dashboard → AI Gateway → create key | Agent calls |
| `AUTH_SECRET` | `openssl rand -hex 32` | NextAuth (any deploy) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud → Credentials → OAuth client. Redirect: `http://localhost:3000/api/auth/callback/google` | Sign-in + Gmail send |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | `vercel env pull` after creating KV store | Persisting drafts |
| `APOLLO_API_KEY` | Apollo dashboard → Settings → API | Real contact search (falls back to mocks without) |
| `DEV_USER_ID` | Any string e.g. `local-dev-user` | Bypasses auth for local dev. Sending still requires Google session. |

### 3. Provision Vercel KV

```bash
pnpm dlx vercel link
pnpm dlx vercel kv create cold-email-kv
pnpm dlx vercel env pull .env.local
```

### 4. Configure Google OAuth

1. <https://console.cloud.google.com> → APIs & Services → OAuth consent screen → External.
2. Credentials → Create OAuth client → Web application.
3. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-vercel-url>/api/auth/callback/google`
4. Enable the **Gmail API** in the same project.

### 5. Run

```bash
pnpm dev
```

Open http://localhost:3000.

### Smoke Test (no UI required)

With `DEV_USER_ID=local-dev-user` and `pnpm dev` running:

```bash
# Hit the agent — streams tool calls + draft persistence
curl -N -X POST http://localhost:3000/api/agent \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","parts":[{"type":"text","text":"Find CEOs at YC fintech startups in SF, draft 2 cold emails per contact."}]}]}'

# List the drafts
curl http://localhost:3000/api/drafts?status=pending | jq

# Queue one for edit (left-swipe)
curl -X PATCH http://localhost:3000/api/drafts/<id> \
  -H 'Content-Type: application/json' \
  -d '{"status":"queued_for_edit"}'
```

Sending requires Google sign-in — open `http://localhost:3000` in a browser first.

## Deploy

```bash
pnpm dlx vercel --prod
```

Add the production callback URL to your Google OAuth client, then re-pull env vars:
`vercel env pull`.

## Repo Layout

```
app/
  page.tsx                      Server entry — reads session, renders ColdReachApp
  layout.tsx                    Root layout — fonts, theme, metadata
  globals.css                   Tailwind v4 + shadcn CSS variables
  api/
    agent/route.ts              POST: streams agent w/ Apollo + draft tools
    auth/[...nextauth]/route.ts NextAuth handler
    drafts/route.ts             GET list
    drafts/[id]/route.ts        PATCH / DELETE
    drafts/[id]/send/route.ts   POST → Gmail send
auth.ts                         NextAuth v5 config (Google + gmail.send scope)
components/
  cold-reach-app.tsx            Main client component — all app steps + API wiring
  step-indicator.tsx            Progress indicator shared component
  theme-provider.tsx            next-themes wrapper
  ui/                           shadcn/ui components (button, card, select, etc.)
lib/
  types.ts                      Draft / Contact / FilterInput / DraftStatus
  kv.ts                         Typed @vercel/kv wrappers
  session.ts                    getAuthedUser (with DEV_USER_ID fallback)
  apollo.ts                     Apollo REST client + mock fallback
  gmail.ts                      sendGmail (RFC 2822 + base64url)
  utils.ts                      cn() utility
  agent/
    prompts.ts                  Cold-email system prompt (3 angles)
    tools.ts                    apollo_search_contacts, draft_cold_email, list_pending_drafts, update_draft
    mcp.ts                      Placeholder: AI SDK v6 dropped built-in MCP
components.json                 shadcn/ui config
vercel.json                     maxDuration overrides
```

## Known Caveats

- **`@vercel/kv` v3 is deprecated** in favour of `@upstash/redis`. Works for demo; swap post-MVP.
- **OAuth refresh tokens** are persisted in the JWT but not rotated. Tokens last ~1h — re-sign in if Gmail returns 401.
- **Vercel hobby plan** caps function duration at 10 s. The agent route needs Pro / Fluid Compute (60 s set in `vercel.json`).
- **Apollo mock fallback** — without `APOLLO_API_KEY` five hard-coded contacts are returned (Stripe / Retool / Vercel / Linear / Warp), great for UI demos.
