# TapReview Token-based Link Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let resellers/partners set a store's Google review link without logging in, using a permanent 8-digit token, via a public `/<slug>/setup` page.

**Architecture:** A new `toko_tokens` table (not publicly readable) holds one 8-digit token per store. A `SECURITY DEFINER` RPC `set_link_by_token` validates the token and updates `link_review`, so anon visitors can set a link without ever reading the token. The public `/<slug>` page redirects to `/<slug>/setup` when no link is set; the setup page renders a single token+link form. The admin dashboard shows and resets each store's token.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase (`@supabase/ssr`), Heroicons, Vitest.

**Note on rate limiting:** Implemented as an in-memory sliding-window limiter (`lib/rate-limit.ts`). On Vercel serverless, memory is not shared across instances, so this is best-effort protection for a small app. Upgrade path (Upstash Redis) is intentionally out of scope.

---

## File Structure

```
lib/toko.ts                     # (modify) add generateToken()
lib/rate-limit.ts               # (create) in-memory sliding-window rate limiter
lib/actions.ts                  # (modify) createToko token, remove fillLink, add setLinkByToken + resetToken
app/[slug]/page.tsx             # (modify) redirect to /<slug>/setup when no link
app/[slug]/setup/page.tsx       # (create) public setup page (server component)
components/token-setup-form.tsx # (create) client form (token + link)
components/copy-button.tsx      # (create) generic copy-to-clipboard button
components/copy-link-button.tsx # (delete) replaced by copy-button
app/dashboard/toko/page.tsx     # (modify) show token column + copy/reset + URLs
app/dashboard/[id]/page.tsx     # (modify) show token + copy/reset + URLs
lib/toko.test.ts                # (modify) add generateToken tests
lib/rate-limit.test.ts          # (create) rate limiter tests
```

---

## Task 1: Database migration (manual Supabase SQL)

**Files:** none (run in Supabase SQL Editor)

> This is a manual prerequisite. Run it once in Supabase Dashboard → SQL Editor before the app code touches `toko_tokens` or `set_link_by_token`.

- [ ] **Step 1: Create the `toko_tokens` table and RLS policies**

Run this SQL in the Supabase SQL Editor:

```sql
-- Token table: one 8-digit token per store, NOT publicly readable
create table if not exists public.toko_tokens (
  toko_id uuid primary key references public.toko(id) on delete cascade,
  token text not null,
  created_at timestamptz not null default now()
);

alter table public.toko_tokens enable row level security;

-- Only authenticated users (admin) can read/write tokens directly
create policy "authenticated select tokens"
  on public.toko_tokens for select
  to authenticated using (true);

create policy "authenticated insert tokens"
  on public.toko_tokens for insert
  to authenticated with check (true);

create policy "authenticated update tokens"
  on public.toko_tokens for update
  to authenticated using (true);

create policy "authenticated delete tokens"
  on public.toko_tokens for delete
  to authenticated using (true);
```

- [ ] **Step 2: Create the `set_link_by_token` RPC**

Run this SQL in the Supabase SQL Editor:

```sql
create or replace function public.set_link_by_token(p_slug text, p_token text, p_link text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_toko_id uuid;
  v_token text;
begin
  select id into v_toko_id from public.toko where slug = p_slug;
  if v_toko_id is null then
    return false;
  end if;

  select token into v_token from public.toko_tokens where toko_id = v_toko_id;
  if v_token is null or v_token <> p_token then
    return false;
  end if;

  update public.toko
    set link_review = p_link, updated_at = now()
    where id = v_toko_id;

  return true;
end;
$$;

grant execute on function public.set_link_by_token(text, text, text) to anon, authenticated;
```

- [ ] **Step 3: Verify**

In Supabase SQL Editor run:

```sql
select * from public.toko_tokens limit 1;
```

Expected: no error (empty result is fine).

---

## Task 2: `generateToken()` util

**Files:**
- Modify: `lib/toko.ts`
- Test: `lib/toko.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `lib/toko.test.ts`:

```ts
import { isValidUrl, normalizeSlug, randomSlug, generateToken } from "./toko";

describe("generateToken", () => {
  it("returns an 8-digit zero-padded string", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateToken()).toMatch(/^\d{8}$/);
    }
  });
});
```

(Also update the existing import line at the top of the file to include `generateToken`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/toko.test.ts`
Expected: FAIL — `generateToken` is not exported.

- [ ] **Step 3: Implement `generateToken`**

Add to `lib/toko.ts`, after `randomSlug`:

```ts
export function generateToken(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 100_000_000).padStart(8, "0");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/toko.test.ts`
Expected: PASS (7 existing + 1 new = 8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/toko.ts lib/toko.test.ts
git commit -m "feat: add generateToken util for 8-digit store tokens"
```

---

## Task 3: Rate limiter util

**Files:**
- Create: `lib/rate-limit.ts`
- Test: `lib/rate-limit.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/rate-limit.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("blocks a key after max failures within the window", () => {
    const rl = createRateLimiter({ maxAttempts: 3, windowMs: 60_000, blockMs: 60_000 });
    const now = 1_000_000;
    expect(rl.isBlocked("ip:slug", now)).toBe(false);
    rl.recordFailure("ip:slug", now);
    rl.recordFailure("ip:slug", now + 1_000);
    rl.recordFailure("ip:slug", now + 2_000);
    expect(rl.isBlocked("ip:slug", now + 3_000)).toBe(true);
  });

  it("unblocks after blockMs", () => {
    const rl = createRateLimiter({ maxAttempts: 2, windowMs: 60_000, blockMs: 60_000 });
    const now = 1_000_000;
    rl.recordFailure("ip:slug", now);
    rl.recordFailure("ip:slug", now + 1_000);
    expect(rl.isBlocked("ip:slug", now + 2_000)).toBe(true);
    expect(rl.isBlocked("ip:slug", now + 61_000)).toBe(false);
  });

  it("resets the window after windowMs when max not reached", () => {
    const rl = createRateLimiter({ maxAttempts: 5, windowMs: 60_000, blockMs: 60_000 });
    const now = 1_000_000;
    rl.recordFailure("ip:slug", now);
    rl.recordFailure("ip:slug", now + 1_000);
    expect(rl.isBlocked("ip:slug", now + 70_000)).toBe(false);
    rl.recordFailure("ip:slug", now + 70_000);
    expect(rl.isBlocked("ip:slug", now + 70_000)).toBe(false);
  });

  it("clear removes a block", () => {
    const rl = createRateLimiter({ maxAttempts: 2, windowMs: 60_000, blockMs: 60_000 });
    const now = 1_000_000;
    rl.recordFailure("ip:slug", now);
    rl.recordFailure("ip:slug", now + 1_000);
    expect(rl.isBlocked("ip:slug", now + 2_000)).toBe(true);
    rl.clear("ip:slug");
    expect(rl.isBlocked("ip:slug", now + 2_000)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/rate-limit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the rate limiter**

Create `lib/rate-limit.ts`:

```ts
export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
}

interface Bucket {
  count: number;
  windowStart: number;
  blockedUntil: number;
}

export function createRateLimiter({
  maxAttempts = 5,
  windowMs = 60_000,
  blockMs = 15 * 60_000,
}: Partial<RateLimitConfig> = {}) {
  const buckets = new Map<string, Bucket>();

  return {
    isBlocked(key: string, now: number = Date.now()): boolean {
      const bucket = buckets.get(key);
      if (!bucket) return false;
      if (bucket.blockedUntil > 0) {
        if (now < bucket.blockedUntil) return true;
        buckets.delete(key);
        return false;
      }
      return false;
    },

    recordFailure(key: string, now: number = Date.now()): void {
      const bucket = buckets.get(key);
      if (!bucket) {
        buckets.set(key, { count: 1, windowStart: now, blockedUntil: 0 });
        return;
      }
      if (bucket.blockedUntil > 0) return;
      if (now >= bucket.windowStart + windowMs) {
        buckets.set(key, { count: 1, windowStart: now, blockedUntil: 0 });
        return;
      }
      bucket.count += 1;
      if (bucket.count >= maxAttempts) {
        bucket.blockedUntil = now + blockMs;
      }
    },

    clear(key: string): void {
      buckets.delete(key);
    },
  };
}

export const tokenRateLimiter = createRateLimiter();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/rate-limit.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/rate-limit.ts lib/rate-limit.test.ts
git commit -m "feat: add in-memory rate limiter for token attempts"
```

---

## Task 4: Server actions — token create/set/reset

**Files:**
- Modify: `lib/actions.ts`

- [ ] **Step 1: Update imports**

Replace the import block at the top of `lib/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { generateToken, isValidUrl, isValidUuid, normalizeSlug, randomSlug } from "@/lib/toko";
import { tokenRateLimiter } from "@/lib/rate-limit";
```

- [ ] **Step 2: Update `createToko` to also insert a token**

Replace the existing `createToko` function (lines 17–39) with:

```ts
export async function createToko(formData: FormData) {
  const supabase = await requireUser();

  const nama = String(formData.get("nama") ?? "").trim();
  const link = String(formData.get("link_review") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();

  if (!nama) throw new Error("Nama wajib diisi");

  const slug = slugInput ? normalizeSlug(slugInput) : randomSlug();
  if (!slug) throw new Error("Slug tidak valid");

  const link_review = link && isValidUrl(link) ? link : null;

  const { data: created, error } = await supabase
    .from("toko")
    .insert({ nama, slug, link_review })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const token = generateToken();
  const { error: tokenError } = await supabase
    .from("toko_tokens")
    .insert({ toko_id: created.id, token });

  if (tokenError) throw new Error(tokenError.message);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
```

- [ ] **Step 3: Remove the now-unused `fillLink`**

Delete the entire `fillLink` function (lines 79–101). It is no longer used (the public slug page will redirect instead of rendering a form).

- [ ] **Step 4: Add `setLinkByToken` and `resetToken`**

Append to `lib/actions.ts`:

```ts
export async function setLinkByToken(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  const link = String(formData.get("link_review") ?? "").trim();

  if (!slug) return { error: "Slug tidak valid" };
  if (!/^\d{8}$/.test(token)) return { error: "Token salah" };
  if (!isValidUrl(link)) return { error: "Link tidak valid" };

  const headersList = await headers();
  const ip = (headersList.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const key = `${ip}:${slug}`;

  if (tokenRateLimiter.isBlocked(key)) {
    return { error: "Terlalu banyak percobaan, coba lagi nanti" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_link_by_token", {
    p_slug: slug,
    p_token: token,
    p_link: link,
  });

  if (error) {
    console.error("set_link_by_token failed:", error.message);
    return { error: "Terjadi kesalahan, coba lagi" };
  }

  if (!data) {
    tokenRateLimiter.recordFailure(key);
    return { error: "Token salah" };
  }

  tokenRateLimiter.clear(key);
  revalidatePath(`/${slug}`);
  redirect(`/${slug}`);
}

export async function resetToken(id: string) {
  const supabase = await requireUser();

  if (!isValidUuid(id)) throw new Error("ID tidak valid");

  const token = generateToken();
  const { error } = await supabase
    .from("toko_tokens")
    .upsert({ toko_id: id, token });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/actions.ts
git commit -m "feat: add setLinkByToken and resetToken actions, token on create"
```

---

## Task 5: Public slug page redirects to setup

**Files:**
- Modify: `app/[slug]/page.tsx`

- [ ] **Step 1: Replace the page**

Replace the entire content of `app/[slug]/page.tsx` with:

```tsx
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SlugPage({
  params,
}: PageProps<"/[slug]">) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: toko } = await supabase
    .from("toko")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!toko) notFound();

  if (toko.link_review) {
    await supabase.rpc("increment_klik", { p_id: toko.id });
    redirect(toko.link_review);
  }

  redirect(`/${slug}/setup`);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/[slug]/page.tsx"
git commit -m "feat: redirect public slug page to setup when no link"
```

---

## Task 6: Setup page + form component

**Files:**
- Create: `app/[slug]/setup/page.tsx`
- Create: `components/token-setup-form.tsx`

- [ ] **Step 1: Create the client form component**

Create `components/token-setup-form.tsx`:

```tsx
"use client";

import { useState } from "react";
import { setLinkByToken } from "@/lib/actions";

export function TokenSetupForm({
  slug,
  hasLink,
}: {
  slug: string;
  hasLink: boolean;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={async (formData) => {
        const res = await setLinkByToken(formData);
        if (res?.error) setError(res.error);
      }}
      className="mt-6 space-y-4"
    >
      <input type="hidden" name="slug" value={slug} />
      {error && <p className="text-sm text-error">{error}</p>}
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-on-surface">Token</span>
        <input
          name="token"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{8}"
          maxLength={8}
          required
          placeholder="12345678"
          className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-on-surface">
          Link Google Review
        </span>
        <input
          name="link_review"
          type="url"
          required
          placeholder="https://g.page/r/.../review"
          className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
        />
      </label>
      <button
        type="submit"
        className="rounded-full bg-primary px-4 py-2 text-white font-semibold"
      >
        {hasLink ? "Ubah Link" : "Simpan Link"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create the setup page**

Create `app/[slug]/setup/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TokenSetupForm } from "@/components/token-setup-form";

export const dynamic = "force-dynamic";

export default async function SetupPage({
  params,
}: PageProps<"/[slug]/setup">) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: toko } = await supabase
    .from("toko")
    .select("id, nama, slug, link_review")
    .eq("slug", slug)
    .maybeSingle();

  if (!toko) notFound();

  return (
    <main className="mx-auto w-full max-w-lg flex-1 p-6">
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <h1 className="text-2xl font-semibold text-on-surface">{toko.nama}</h1>
        <p className="mt-2 text-on-surface-variant">
          {toko.link_review
            ? "Ganti link Google review untuk toko ini."
            : "Isi link Google review untuk toko ini."}
        </p>
        <TokenSetupForm slug={toko.slug} hasLink={!!toko.link_review} />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Build to regenerate route types**

Run: `npm run build`
Expected: build succeeds; `PageProps<"/[slug]/setup">` is now a valid generated type (see `.next/types/routes.d.ts`).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/[slug]/setup" components/token-setup-form.tsx
git commit -m "feat: add public token setup page and form"
```

---

## Task 7: Generic copy button + dashboard token display

**Files:**
- Create: `components/copy-button.tsx`
- Delete: `components/copy-link-button.tsx`
- Modify: `app/dashboard/toko/page.tsx`

- [ ] **Step 1: Create the generic copy button**

Create `components/copy-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ClipboardIcon, CheckIcon } from "@heroicons/react/24/outline";

export function CopyButton({
  text,
  title = "Copy",
}: {
  text: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={title}
      className="rounded-full border border-outline-variant p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
    >
      {copied ? (
        <CheckIcon className="h-4 w-4 text-secondary" />
      ) : (
        <ClipboardIcon className="h-4 w-4" />
      )}
    </button>
  );
}
```

- [ ] **Step 2: Delete the old copy-link-button**

```bash
git rm components/copy-link-button.tsx
```

- [ ] **Step 3: Rewrite the Toko page with token column**

Replace the entire content of `app/dashboard/toko/page.tsx` with:

```tsx
import Link from "next/link";
import {
  BuildingStorefrontIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/server";
import { deleteToko, resetToken } from "@/lib/actions";
import { CopyButton } from "@/components/copy-button";

export const dynamic = "force-dynamic";

export default async function TokoPage() {
  const supabase = await createClient();
  const [{ data: tokoList }, { data: tokenRows }] = await Promise.all([
    supabase.from("toko").select("*").order("created_at", { ascending: false }),
    supabase.from("toko_tokens").select("toko_id, token"),
  ]);

  const tokenMap = new Map((tokenRows ?? []).map((t) => [t.toko_id, t.token]));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-surface mb-2">Toko</h2>
          <p className="text-sm text-on-surface-variant">
            Kelola semua toko dan link Google review.
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="px-6 py-2.5 rounded-full bg-primary text-white font-semibold text-sm hover:bg-opacity-90 transition-colors flex items-center gap-2 shadow-md"
        >
          <PlusIcon className="h-4 w-4" />
          Toko Baru
        </Link>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-on-surface-variant border-b border-outline-variant/30">
              <th className="px-6 py-4 font-semibold">Nama</th>
              <th className="px-6 py-4 font-semibold">Slug</th>
              <th className="px-6 py-4 font-semibold">Token</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Klik</th>
              <th className="px-6 py-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {tokoList && tokoList.length > 0 ? (
              tokoList.map((toko) => {
                const token = tokenMap.get(toko.id);
                return (
                  <tr
                    key={toko.id}
                    className="border-b border-outline-variant/20 last:border-b-0 hover:bg-surface-container-low transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary shrink-0">
                          <BuildingStorefrontIcon className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-on-surface truncate">
                          {toko.nama}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      /{toko.slug}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-on-surface">
                          {token ?? "—"}
                        </span>
                        {token && (
                          <CopyButton text={token} title="Copy token" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {toko.link_review ? (
                        <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-md bg-secondary-container/50 text-on-secondary-container">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-md bg-surface-container-highest text-on-surface-variant">
                          Belum ada link
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-on-surface">
                      {toko.total_klik}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <CopyButton
                          text={`${siteUrl}/${toko.slug}`}
                          title="Copy link utama"
                        />
                        <Link
                          href={`/dashboard/${toko.id}`}
                          className="rounded-full border border-outline-variant p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </Link>
                        <form action={resetToken.bind(null, toko.id)}>
                          <button
                            type="submit"
                            className="rounded-full border border-outline-variant p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                            title="Reset token"
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                          </button>
                        </form>
                        <form action={deleteToko.bind(null, toko.id)}>
                          <button
                            type="submit"
                            className="rounded-full border border-outline-variant p-2 text-error hover:bg-error hover:text-white transition-colors"
                            title="Hapus"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-on-surface-variant"
                >
                  Belum ada toko.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/copy-button.tsx components/copy-link-button.tsx app/dashboard/toko/page.tsx
git commit -m "feat: show store token in dashboard with copy/reset actions"
```

---

## Task 8: Edit page — token section

**Files:**
- Modify: `app/dashboard/[id]/page.tsx`

- [ ] **Step 1: Fetch the token**

In `app/dashboard/[id]/page.tsx`, after the existing `toko` query (after line 19), add:

```ts
  const { data: tokenRow } = await supabase
    .from("toko_tokens")
    .select("token")
    .eq("toko_id", id)
    .maybeSingle();
```

- [ ] **Step 2: Add imports**

Update the import block at the top to add `resetToken` and `CopyButton`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateToko, resetToken } from "@/lib/actions";
import { QrCode } from "./qrcode";
import { CopyButton } from "@/components/copy-button";
```

- [ ] **Step 3: Add the token & URL card**

Immediately after the closing `</form>` card (before the QR `<div>`), insert:

```tsx
      <div className="max-w-lg mt-6 bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30">
        <h3 className="text-xl font-semibold text-on-surface mb-2">
          Token & URL
        </h3>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-on-surface">
            Token: {tokenRow?.token ?? "—"}
          </span>
          {tokenRow?.token && (
            <CopyButton text={tokenRow.token} title="Copy token" />
          )}
          <form action={resetToken.bind(null, toko.id)} className="inline-block">
            <button
              type="submit"
              className="rounded-full border border-outline-variant px-3 py-1 text-xs text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Reset token
            </button>
          </form>
        </div>
        <div className="space-y-1 text-sm text-on-surface-variant">
          <p>
            Link utama:{" "}
            <span className="text-on-surface break-all">
              {`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/${toko.slug}`}
            </span>
          </p>
          <p>
            Link setup:{" "}
            <span className="text-on-surface break-all">
              {`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/${toko.slug}/setup`}
            </span>
          </p>
        </div>
      </div>
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/dashboard/[id]/page.tsx"
git commit -m "feat: show token and setup URL on edit page"
```

---

## Task 9: Full verification

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Tests**

Run: `npx vitest run`
Expected: all pass (8 lib/toko tests + 4 rate-limit tests).

- [ ] **Step 5: Manual smoke test**

1. Run Task 1 SQL if not already done.
2. `npm run dev`, log in as admin.
3. Create a store → note its token in the dashboard.
4. Open `/<slug>` unauthenticated → redirects to `/<slug>/setup`.
5. Enter a wrong token → "Token salah".
6. Enter the correct token + a review link → redirects to the review link.
7. Reopen `/<slug>` → redirects to review link, and `total_klik` incremented.
8. Reopen `/<slug>/setup`, change the link with the same token → link updated.
9. In dashboard, click "Reset token" → old token no longer works.

---

## Self-Review Notes

- **Spec coverage:** token table + RPC (Task 1), token generation (Task 2), rate limiting (Task 3), set/reset/create actions (Task 4), public redirect (Task 5), setup page + form (Task 6), dashboard token display + copy/reset (Tasks 7–8), verification (Task 9). Matches spec sections.
- **Type consistency:** `generateToken` exported from `lib/toko` and imported in `lib/actions`; `createRateLimiter`/`tokenRateLimiter` exported from `lib/rate-limit` and imported in `lib/actions`; `setLinkByToken`/`resetToken` imported by `components/token-setup-form.tsx` and dashboard pages; `CopyButton` imported by dashboard pages. RPC params `p_slug/p_token/p_link` match the SQL function signature.
- **`fillLink` removal:** the old public fill-link form is replaced by the redirect (Task 5) and `fillLink` is removed (Task 4); confirmed it was only referenced by `app/[slug]/page.tsx`.
- **Route types:** `PageProps<"/[slug]/setup">` requires a build to regenerate `.next/types/routes.d.ts` (Task 6 Step 3 runs build before typecheck).
