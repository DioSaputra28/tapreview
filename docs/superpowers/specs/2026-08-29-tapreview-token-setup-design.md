# TapReview — Token-based Link Setup (Multi-User) Design

**Date:** 2026-08-29
**Status:** Draft (awaiting user review)

## Goal

Allow resellers/partners to set the Google review link for a store **without logging in**, using a per-store numeric token. The admin (store owner / supplier) keeps full control via the existing dashboard.

The web app remains an intermediary: the physical product is an acrylic piece with NFC + QR that points to `domain/slug`, which redirects to the store's Google review link.

## Context & Current State

- Single admin logs in via Supabase Auth (`auth.users`), no custom users table.
- `toko` table: `id` uuid PK, `nama` text, `slug` text unique, `link_review` text nullable, `total_klik` bigint, `created_at`, `updated_at`.
- RLS: public SELECT, authenticated INSERT/UPDATE/DELETE.
- RPC `increment_klik(p_id uuid)` — `SECURITY DEFINER`, granted to `anon, authenticated`.
- `app/[slug]/page.tsx` currently: has link → redirect + counter; else → shows a fill-link form (requires login).
- Server actions in `lib/actions.ts` guarded by `requireUser()`.

## New Behavior

### Public flow (`domain/slug`)
1. Visit `domain/slug` (this is what the QR/NFC points to).
2. If `link_review` is set → `increment_klik` + redirect to the review link (unchanged).
3. If not set → **redirect to the setup page** `domain/slug/setup`.

### Setup page (`domain/slug/setup`)
- Accessible directly (resellers can open it anytime, even when a link is already set).
- A **single form** with two fields: **token** (8 digits) + **Google review link**.
- On submit: validate token → if valid, assign/update `link_review` → redirect to `domain/slug` (which now redirects to the review link).
- Wrong token → generic "Token salah"; invalid link → "Link tidak valid".
- Token is **permanent** — can be reused anytime to change the link later.

### Admin dashboard (unchanged auth, additive)
- Admin logs in as today.
- Each store shows its **8-digit token** (auto-generated on create), with **copy** and **reset** actions, plus the two URLs (main `domain/slug` and setup `domain/slug/setup`) for sharing with resellers.
- Admin keeps full read/write/delete over all stores and tokens.

## Security Model

**Token must NOT be readable by the public.** The `toko` table is publicly SELECTable (needed by the public slug page), so the token cannot live in a publicly-readable column.

### Database changes (manual Supabase SQL)

1. **New table `toko_tokens`:**
   - `toko_id` uuid PK (FK → `toko.id` on delete cascade)
   - `token` text not null
   - `created_at` timestamptz default now()
   - RLS: `USING (auth.role() = 'authenticated')` for all — **no public read/write**. (Alternatively `FORCE ROW LEVEL SECURITY` + no policies, and access via a SECURITY DEFINER RPC only.)

2. **New RPC `set_link_by_token(p_slug text, p_token text, p_link text) returns boolean`:**
   - `SECURITY DEFINER SET search_path = public`.
   - Find the store by `slug`; if not found → false.
   - If its token matches `p_token` → update `link_review` (validate URL server-side before calling) and return true.
   - Else return false.
   - `GRANT EXECUTE ... TO anon, authenticated`.

> Note: The RPC must be rate-limited at the app layer (see below), because anon can call it freely.

### App layer changes

1. **`app/[slug]/page.tsx`** — simplify:
   - Server component reads the store by slug.
   - If `link_review` set → redirect + counter (existing behavior).
   - Else → `redirect(\`/${slug}/setup\`)`.

2. **`app/[slug]/setup/page.tsx`** (new) — the setup page:
   - Server component reads the store by slug; if not found → `notFound()`.
   - Renders a client form (`components/token-setup-form.tsx`) with two fields: token + link.
   - Shows the store name so the reseller knows which store they're configuring.

3. **`lib/actions.ts`** — add one public action:
   - `setLinkByToken(formData)` — rate-limit, validate `isValidUrl`, call `set_link_by_token` RPC; on success `redirect(\`/${slug}\`)`, on failure return a generic error (no slug/token enumeration).

4. **Rate limiting** on `setLinkByToken`:
   - In-memory or simple KV (e.g., per-IP sliding window) — e.g., 5 failed attempts per IP per minute → block for 15 min.
   - Implemented before calling the RPC.

5. **Dashboard** (`app/dashboard/toko/page.tsx` + create/edit):
   - On `createToko`, generate an 8-digit numeric token and insert into `toko_tokens` (server-side, admin only).
   - Show token in the Toko table and edit page with copy + reset (regenerate) actions, plus the main and setup URLs for sharing.
   - Admin token reads go through the authenticated Supabase client (RLS: authenticated only).

## Token Specification

- Format: 8-digit numeric (`00000000`–`99999999`), zero-padded.
- Generated with `crypto.getRandomValues` / `randomUUID`-derived numeric, or `Math.floor(random * 1e8)` — must be cryptographically secure enough for 8 digits (100M space).
- Stored plaintext in `toko_tokens.token` (admin may view anytime; accepted trade-off given token only gates link-setting, not sensitive data).
- Permanent until admin resets it.

## Data Flow

```
Public visitor
  GET /slug ──► link set? ──yes──► increment_klik ──► redirect(link)
                  │no
                  ▼
            redirect(/slug/setup)

Reseller (setup)
  GET /slug/setup ──► single form (token + link)
                          │ submit
                          ▼
            setLinkByToken() → rate-limit → isValidUrl → set_link_by_token RPC
                          │ success
                          ▼
            redirect(/slug) ──► (link now set) ──► redirect(link)
                          │ failure (bad token/link)
                          ▼
            re-render form with generic error
```

## Error Handling

- Invalid token → generic "Token salah" (do not reveal whether slug exists vs token wrong).
- Invalid link → "Link tidak valid".
- Rate limited → "Terlalu banyak percobaan, coba lagi nanti".
- Slug not found → `notFound()` (both public page and setup page).

## Testing

- Unit: token generation format (8 digits, unique), URL validation unchanged.
- Server-action tests: `setLinkByToken` honors rate limit, validates URL, rejects bad token.
- Manual smoke: create store (token shown), open `/slug` unauthenticated → redirects to `/slug/setup`; enter wrong token (rejected), correct token + link → redirect to review; counter increments; reopen `/slug/setup` and change link with same token; admin reset token invalidates old one.

## Out of Scope

- Multi-admin / per-reseller accounts (resellers never log in).
- Token expiry or single-use.
- Email/notification features.

## Open Questions

- None — all resolved during brainstorming.