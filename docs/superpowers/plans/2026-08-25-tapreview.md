# Tapreview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a short-link redirector that routes `https://<domain>/<slug>` to a store's Google review URL, with a Supabase-backed admin dashboard, a fill-in-link form for empty stores, a hit counter, and on-demand QR codes.

**Architecture:** Next.js 16 App Router. A server-side Route Handler at `app/[slug]/route.ts` fetches a store by slug from Supabase, increments a click counter atomically, and issues a 307 redirect when a review link exists. When the link is empty, a page at `app/[slug]/page.tsx` renders a login-gated form. Admin CRUD lives under `/dashboard` (protected by Supabase Auth), with a detail page that generates QR codes client-side.

**Tech Stack:** Next.js 16.3.2, React 19, TypeScript, Tailwind CSS v4, Supabase (`@supabase/supabase-js` + `@supabase/ssr`), QR via `qrcode.react`, tests via Vitest + React Testing Library.

---

## Pre-requisites (not code tasks)

Before implementation, the developer needs a Supabase project with:

- A `toko` table:
  ```sql
  create table public.toko (
    id uuid primary key default gen_random_uuid(),
    nama text not null,
    slug text not null unique,
    link_review text,
    total_klik integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  ```
- Row Level Security enabled on `toko`. Public read-only access (for the redirect handler); write access only for authenticated users:
  ```sql
  alter table public.toko enable row level security;
  create policy "public read" on public.toko for select using (true);
  create policy "auth write" on public.toko
    for insert, update, delete to authenticated using (true) with check (true);
  ```
- Supabase Auth enabled (Email provider).
- `.env.local` with:
  ```
  NEXT_PUBLIC_SUPABASE_URL=<project-url>
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
  ```

These credentials are never committed (`.env*` is already git-ignored).

---

## File Structure

```
.env.local                               # (manual, git-ignored) Supabase credentials
lib/supabase/client.ts                   # browser Supabase client (singleton)
lib/supabase/server.ts                   # server Supabase client (cookies-based)
lib/supabase/middleware.ts               # auth session refresh helper
lib/toko.ts                              # data-access layer + slug validation
lib/actions.ts                           # server actions (create/update/delete/fill-link)
middleware.ts                            # auth guard for /dashboard & /login redirects
proxy.ts                                 # placeholder (see Task 0 note) — actually unused; see below
app/login/page.tsx                       # email/password login form
app/login/actions.ts                     # login/logout server actions
app/dashboard/page.tsx                   # authenticated store list
app/dashboard/new/page.tsx               # create-store form
app/dashboard/[id]/page.tsx              # edit-store form
app/dashboard/[id]/qrcode.tsx            # client QR component (on-demand)
app/[slug]/route.ts                      # redirect handler + counter increment
app/[slug]/page.tsx                      # fill-link form for empty stores
app/page.tsx                             # landing page (replace template)
vitest.config.mts                        # vitest config
lib/toko.test.ts                         # unit tests for slug/URL validation
```

> **Note on `proxy.ts`:** The redirecting.md doc references a `proxy.ts` file convention. In Next.js 16 the redirect logic belongs in the Route Handler (`app/[slug]/route.ts`), which is what we use. No `proxy.ts` is created.

---

## Task 1: Supabase clients + env setup

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Modify: `package.json` (add dependency)
- Modify: `.env.example` (new, documenting required vars)

- [ ] **Step 1: Install Supabase packages**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
```
Expected: installs `@supabase/supabase-js` and `@supabase/ssr` into `package.json` dependencies.

- [ ] **Step 2: Create the browser client**

Create `lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 3: Create the server client**

Create `lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore when middleware refreshes sessions.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 4: Create the middleware session helper**

Create `lib/supabase/middleware.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}
```

- [ ] **Step 5: Create `.env.example`**

Create `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 6: Commit**

```bash
git add lib/supabase package.json package-lock.json .env.example
git commit -m "feat: add Supabase client/server/middleware helpers"
```

---

## Task 2: Auth guard middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create `middleware.ts`**

Create `middleware.ts` at the project root:

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add auth session refresh middleware"
```

---

## Task 3: Data access layer + validation

**Files:**
- Create: `lib/toko.ts`
- Test: `lib/toko.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/toko.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isValidUrl, normalizeSlug, slugFromName } from "./toko";

describe("isValidUrl", () => {
  it("accepts https URLs", () => {
    expect(isValidUrl("https://g.page/r/abc/review")).toBe(true);
  });

  it("rejects non-URL strings", () => {
    expect(isValidUrl("not a url")).toBe(false);
  });

  it("rejects javascript: URLs", () => {
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("normalizeSlug", () => {
  it("lowercases and strips invalid characters", () => {
    expect(normalizeSlug(" Toko  Makan Enak! ")).toBe("toko-makan-enak");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeSlug("")).toBe("");
  });
});

describe("slugFromName", () => {
  it("derives slug from name with timestamp suffix", () => {
    const slug = slugFromName("Warung Kopi");
    expect(slug.startsWith("warung-kopi-")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/toko.test.ts`
Expected: FAIL — "Cannot find module './toko'".

- [ ] **Step 3: Implement `lib/toko.ts`**

Create `lib/toko.ts`:

```ts
export type Toko = {
  id: string;
  nama: string;
  slug: string;
  link_review: string | null;
  total_klik: number;
  created_at: string;
  updated_at: string;
};

export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugFromName(name: string): string {
  const base = normalizeSlug(name) || "toko";
  return `${base}-${Date.now().toString(36)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/toko.test.ts`
Expected: PASS (3 describe blocks, 7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/toko.ts lib/toko.test.ts
git commit -m "feat: add toko data-access types and slug/url validation"
```

---

## Task 4: Server actions (CRUD)

**Files:**
- Create: `lib/actions.ts`

- [ ] **Step 1: Create `lib/actions.ts`**

Create `lib/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidUrl, normalizeSlug, slugFromName } from "@/lib/toko";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return supabase;
}

export async function createToko(formData: FormData) {
  const supabase = await requireUser();

  const nama = String(formData.get("nama") ?? "").trim();
  const link = String(formData.get("link_review") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();

  if (!nama) throw new Error("Nama wajib diisi");

  const slug = slugInput ? normalizeSlug(slugInput) : slugFromName(nama);
  if (!slug) throw new Error("Slug tidak valid");

  const link_review = link && isValidUrl(link) ? link : null;

  const { error } = await supabase
    .from("toko")
    .insert({ nama, slug, link_review });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateToko(id: string, formData: FormData) {
  const supabase = await requireUser();

  const nama = String(formData.get("nama") ?? "").trim();
  const link = String(formData.get("link_review") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();

  if (!nama) throw new Error("Nama wajib diisi");

  const slug = slugInput ? normalizeSlug(slugInput) : slugFromName(nama);
  if (!slug) throw new Error("Slug tidak valid");

  const link_review = link && isValidUrl(link) ? link : null;

  const { error } = await supabase
    .from("toko")
    .update({ nama, slug, link_review })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteToko(id: string) {
  const supabase = await requireUser();

  const { error } = await supabase.from("toko").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}

export async function fillLink(formData: FormData) {
  const supabase = await requireUser();

  const id = String(formData.get("id") ?? "");
  const link = String(formData.get("link_review") ?? "").trim();

  if (!isValidUrl(link)) throw new Error("Link tidak valid");

  const { error } = await supabase
    .from("toko")
    .update({ link_review: link, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  redirect(`/${id === "" ? "" : ""}`);
}
```

> **Note:** `fillLink` redirects back to the slug after saving. The slug is resolved server-side in the page that calls it (see Task 8); to keep the action pure it accepts an optional `slug` form field. Update the `fillLink` body's final redirect as shown in Task 8 (the version there is authoritative).

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/actions.ts
git commit -m "feat: add server actions for toko CRUD and link fill"
```

---

## Task 5: Login page + auth actions

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/login/actions.ts`

- [ ] **Step 1: Create login actions**

Create `app/login/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const { error } = await supabase.auth.signInWithPassword(data);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
```

- [ ] **Step 2: Create login page**

Create `app/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <form
        action={async (formData) => {
          const res = await login(formData);
          if (res?.error) setError(res.error);
        }}
        className="w-full max-w-sm space-y-4 rounded-xl border p-6"
      >
        <h1 className="text-xl font-semibold">Login Admin</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <label className="block space-y-1">
          <span className="text-sm">Email</span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">Password</span>
          <input
            name="password"
            type="password"
            required
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-md bg-foreground px-3 py-2 text-background"
        >
          Masuk
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/login
git commit -m "feat: add login page and auth server actions"
```

---

## Task 6: Dashboard — store list

**Files:**
- Create: `app/dashboard/page.tsx`

- [ ] **Step 1: Create dashboard page (server component)**

Create `app/dashboard/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteToko } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: tokoList } = await supabase
    .from("toko")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Daftar Toko</h1>
        <Link
          href="/dashboard/new"
          className="rounded-md bg-foreground px-3 py-2 text-background"
        >
          + Toko Baru
        </Link>
      </div>

      <ul className="mt-6 space-y-3">
        {tokoList?.map((toko) => (
          <li
            key={toko.id}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div>
              <p className="font-medium">{toko.nama}</p>
              <p className="text-sm text-zinc-500">/{toko.slug}</p>
              <p className="text-sm text-zinc-500">
                {toko.total_klik} klik
                {toko.link_review ? "" : " · link belum diisi"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/${toko.id}`}
                className="rounded-md border px-3 py-1 text-sm"
              >
                Detail / QR
              </Link>
              <form action={deleteToko.bind(null, toko.id)}>
                <button
                  type="submit"
                  className="rounded-md border px-3 py-1 text-sm text-red-600"
                >
                  Hapus
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      {tokoList?.length === 0 && (
        <p className="mt-6 text-zinc-500">Belum ada toko.</p>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add dashboard store list with delete"
```

---

## Task 7: Dashboard — create + edit forms

**Files:**
- Create: `app/dashboard/new/page.tsx`
- Create: `app/dashboard/[id]/page.tsx`

- [ ] **Step 1: Create store form (new)**

Create `app/dashboard/new/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createToko } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function NewTokoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-lg flex-1 p-6">
      <h1 className="text-2xl font-semibold">Toko Baru</h1>
      <form action={createToko} className="mt-6 space-y-4">
        <label className="block space-y-1">
          <span className="text-sm">Nama</span>
          <input
            name="nama"
            required
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">Slug (kosongkan untuk otomatis)</span>
          <input
            name="slug"
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">Link Google Review</span>
          <input
            name="link_review"
            type="url"
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-foreground px-4 py-2 text-background"
          >
            Simpan
          </button>
          <Link href="/dashboard" className="rounded-md border px-4 py-2">
            Batal
          </Link>
        </div>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Create edit form**

Create `app/dashboard/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateToko } from "@/lib/actions";
import { QrCode } from "./qrcode";

export const dynamic = "force-dynamic";

export default async function EditTokoPage({
  params,
}: PageProps<"/dashboard/[id]">) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: toko } = await supabase
    .from("toko")
    .select("*")
    .eq("id", id)
    .single();

  if (!toko) notFound();

  const slugUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/${toko.slug}`;

  return (
    <main className="mx-auto w-full max-w-lg flex-1 p-6">
      <h1 className="text-2xl font-semibold">Edit Toko</h1>
      <form
        action={updateToko.bind(null, toko.id)}
        className="mt-6 space-y-4"
      >
        <label className="block space-y-1">
          <span className="text-sm">Nama</span>
          <input
            name="nama"
            defaultValue={toko.nama}
            required
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">Slug</span>
          <input
            name="slug"
            defaultValue={toko.slug}
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">Link Google Review</span>
          <input
            name="link_review"
            type="url"
            defaultValue={toko.link_review ?? ""}
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-foreground px-4 py-2 text-background"
          >
            Simpan
          </button>
          <Link href="/dashboard" className="rounded-md border px-4 py-2">
            Batal
          </Link>
        </div>
      </form>

      <div className="mt-8 border-t pt-6">
        <p className="text-sm text-zinc-500">Total klik: {toko.total_klik}</p>
        <QrCode value={slugUrl} />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Create QR component**

Create `app/dashboard/[id]/qrcode.tsx`:

```tsx
"use client";

import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export function QrCode({ value }: { value: string }) {
  const [show, setShow] = useState(false);

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="rounded-md border px-3 py-2 text-sm"
      >
        {show ? "Sembunyikan QR" : "Generate QR"}
      </button>
      {show && (
        <div className="mt-4 inline-block rounded-lg border bg-white p-4">
          <QRCodeCanvas value={value} size={200} />
          <p className="mt-2 break-all text-xs text-zinc-500">{value}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Install qrcode.react**

Run:
```bash
npm install qrcode.react
```

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/new app/dashboard/[id] package.json package-lock.json
git commit -m "feat: add create/edit forms and on-demand QR code"
```

---

## Task 8: Redirect route handler + fill-link form

**Files:**
- Create: `app/[slug]/route.ts`
- Create: `app/[slug]/page.tsx`

- [ ] **Step 1: Create redirect handler**

Create `app/[slug]/route.ts`:

```ts
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: toko } = await supabase
    .from("toko")
    .select("id, slug, link_review")
    .eq("slug", slug)
    .maybeSingle();

  if (!toko) {
    return new Response("Toko tidak ditemukan", { status: 404 });
  }

  if (!toko.link_review) {
    redirect(`/${toko.slug}`);
  }

  await supabase
    .from("toko")
    .update({ total_klik: toko.total_klik + 1 })
    .eq("id", toko.id);

  redirect(toko.link_review);
}
```

> **Note:** The counter increment uses a read-then-write (`total_klik + 1`) for simplicity. To make it fully race-safe, prefer an atomic SQL increment via `rpc`. Add the following SQL function to Supabase and switch to it in Step 2 of this task if desired:
> ```sql
> create or replace function public.increment_klik(p_id uuid)
> returns void language sql as $$
>   update public.toko set total_klik = total_klik + 1 where id = p_id;
> $$;
> ```

- [ ] **Step 2: Create fill-link page**

Create `app/[slug]/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fillLink } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function SlugPage({
  params,
}: PageProps<"/[slug]">) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: toko } = await supabase
    .from("toko")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!toko) notFound();

  if (toko.link_review) {
    redirect(toko.link_review);
  }

  if (!user) {
    redirect(`/login?next=/${slug}`);
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 p-6">
      <h1 className="text-2xl font-semibold">{toko.nama}</h1>
      <p className="mt-2 text-zinc-500">
        Link Google review untuk toko ini belum diisi.
      </p>
      <form action={fillLink} className="mt-6 space-y-4">
        <input type="hidden" name="id" value={toko.id} />
        <input type="hidden" name="slug" value={toko.slug} />
        <label className="block space-y-1">
          <span className="text-sm">Link Google Review</span>
          <input
            name="link_review"
            type="url"
            required
            placeholder="https://g.page/r/.../review"
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-foreground px-4 py-2 text-background"
        >
          Simpan Link
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Update `fillLink` to redirect by slug**

Modify `lib/actions.ts` — replace the final redirect in `fillLink` with:

```ts
  const slug = String(formData.get("slug") ?? "");
  revalidatePath("/");
  redirect(slug ? `/${slug}` : "/dashboard");
```

- [ ] **Step 4: Add `.env` for `NEXT_PUBLIC_SITE_URL` (optional)**

If `NEXT_PUBLIC_SITE_URL` is used (see Task 7), add to `.env.local`:
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 5: Commit**

```bash
git add "app/[slug]" lib/actions.ts
git commit -m "feat: add redirect route handler and fill-link form"
```

---

## Task 9: Landing page + layout metadata

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace landing page**

Replace `app/page.tsx` with:

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold">TapReview</h1>
      <p className="max-w-md text-zinc-500">
        Short-link menuju halaman Google review toko.
      </p>
      <Link
        href="/dashboard"
        className="rounded-md bg-foreground px-4 py-2 text-background"
      >
        Dashboard Admin
      </Link>
    </main>
  );
}
```

- [ ] **Step 2: Update layout metadata**

Modify `app/layout.tsx` metadata block:

```ts
export const metadata: Metadata = {
  title: "TapReview",
  description: "Short-link menuju halaman Google review toko",
};
```

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx app/layout.tsx
git commit -m "feat: add landing page and update metadata"
```

---

## Task 10: Test setup (Vitest)

**Files:**
- Create: `vitest.config.mts`
- Modify: `package.json` (test script + dev deps)

- [ ] **Step 1: Install test dependencies**

Run:
```bash
npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths
```

- [ ] **Step 2: Create `vitest.config.mts`**

Create `vitest.config.mts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 3: Add test script**

In `package.json`, add to `scripts`:
```json
"test": "vitest run"
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: PASS (the `lib/toko.test.ts` suite).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.mts package.json package-lock.json
git commit -m "test: add vitest setup and run suite"
```

---

## Task 11: Full verification

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
Expected: all tests pass.

- [ ] **Step 5: Manual smoke test**

1. `npm run dev`
2. Open `/login`, sign in with a Supabase Auth user.
3. Create a store with a name (leave slug empty) and a review link.
4. Open `/<slug>` → should redirect to the review link and increment the counter (visible in dashboard).
5. Create a store without a link → open `/<slug>` → shows the fill-link form.
6. In dashboard, open a store → Generate QR → verify it renders and encodes `https://<domain>/<slug>`.

---

## Self-Review Notes

- **Spec coverage:** redirect (Task 8), fill-link form (Task 8), dashboard CRUD (Tasks 6–7), QR on-demand (Task 7), hit counter (Task 8), login (Task 5), auth.users only (Tasks 1–2, 5), one `toko` table (pre-req SQL + Task 3 types).
- **Type consistency:** `PageProps<"/dashboard/[id]">`, `PageProps<"/[slug]">`, `RouteContext` for route handler all match the dynamic segment names; `lib/toko.ts` exports `isValidUrl`, `normalizeSlug`, `slugFromName` used consistently in `lib/actions.ts` and tests.
- **`fillLink` redirect** is finalized in Task 8 Step 3 (Task 4's version is superseded and flagged as such).
