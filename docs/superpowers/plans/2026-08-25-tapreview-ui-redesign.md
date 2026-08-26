# TapReview UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the entire TapReview app to a Material Design 3 look (sidebar + top nav + KPI cards + card-based content), based on the "Donezo" reference in `stitch_toko_management_dashboard/code.html`.

**Architecture:** A shared design system (color tokens + font) lives in `app/globals.css` via Tailwind v4 `@theme`. Reusable components (`Sidebar`, `TopNav`, `StatCard`) live under `components/`. A new `app/dashboard/layout.tsx` wraps all dashboard pages with the sidebar/top-nav shell. All existing pages are restyled to use the new tokens and card layout. No business logic changes.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, `next/font/google` (Hanken Grotesk), Material Symbols Outlined.

---

## File Structure

```
app/globals.css                    # (modify) Material 3 color tokens + font via @theme
app/layout.tsx                     # (modify) load Hanken Grotesk + Material Symbols icon link
components/sidebar.tsx             # (create) 260px sidebar with nav + logout
components/top-nav.tsx             # (create) sticky top bar with search + email
components/stat-card.tsx           # (create) KPI card component
app/dashboard/layout.tsx           # (create) dashboard shell (sidebar + top nav + content)
app/dashboard/page.tsx             # (modify) KPI cards + store list (restyled)
app/dashboard/new/page.tsx         # (modify) create form (restyled)
app/dashboard/[id]/page.tsx        # (modify) edit form + QR (restyled)
app/dashboard/[id]/qrcode.tsx      # (modify) minor restyle (already has download)
app/login/page.tsx                 # (modify) restyled login card
app/page.tsx                       # (modify) restyled landing
app/[slug]/page.tsx                # (modify) restyled fill-link form
```

---

## Task 1: Design system — color tokens + font

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace `app/globals.css` with Material 3 tokens**

Replace the ENTIRE content of `app/globals.css` with:

```css
@import "tailwindcss";

@theme {
  --color-primary: #003626;
  --color-secondary: #006e2f;
  --color-secondary-container: #6bff8f;
  --color-on-secondary-container: #007432;
  --color-background: #f8f9ff;
  --color-surface: #f8f9ff;
  --color-surface-bright: #f8f9ff;
  --color-surface-container-lowest: #ffffff;
  --color-surface-container-low: #eff4ff;
  --color-surface-container: #e5eeff;
  --color-surface-container-high: #dce9ff;
  --color-surface-container-highest: #d3e4fe;
  --color-on-surface: #0b1c30;
  --color-on-surface-variant: #404944;
  --color-on-primary: #ffffff;
  --color-outline: #707974;
  --color-outline-variant: #c0c9c2;
  --color-error: #ba1a1a;
  --color-primary-fixed-dim: #99d3b8;

  --font-sans: var(--font-hanken), ui-sans-serif, system-ui, sans-serif;
}

body {
  background: var(--color-background);
  color: var(--color-on-surface);
  font-family: var(--font-sans);
}
```

- [ ] **Step 2: Load Hanken Grotesk + Material Symbols in root layout**

Replace the ENTIRE content of `app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TapReview",
  description: "Short-link menuju halaman Google review toko",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${hanken.variable} h-full antialiased`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Verify build still compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: add Material 3 color tokens and Hanken Grotesk font"
```

---

## Task 2: Sidebar component

**Files:**
- Create: `components/sidebar.tsx`

- [ ] **Step 1: Create `components/sidebar.tsx`**

Create `components/sidebar.tsx`:

```tsx
import Link from "next/link";
import { logout } from "@/app/login/actions";

export function Sidebar({ active }: { active: "dashboard" | "toko" }) {
  const itemClass = (isActive: boolean) =>
    `flex items-center gap-x-3 px-4 py-3 rounded-xl transition-all ${
      isActive
        ? "bg-secondary-container text-on-secondary-container font-bold border-l-4 border-secondary"
        : "text-on-surface-variant hover:text-secondary hover:bg-surface-container-high"
    }`;

  return (
    <aside className="w-[260px] h-screen fixed left-0 top-0 bg-surface-bright border-r border-outline-variant flex flex-col p-5 z-20">
      <div className="flex items-center gap-3 mb-10 mt-2 px-2">
        <span className="material-symbols-outlined text-secondary text-3xl">
          target
        </span>
        <div>
          <h1 className="text-lg font-semibold text-on-surface">TapReview</h1>
          <p className="text-xs uppercase tracking-wider text-on-surface-variant">
            Management
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        <p className="text-xs uppercase px-4 mb-2 mt-4 text-outline">Menu</p>
        <Link href="/dashboard" className={itemClass(active === "dashboard")}>
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-sm font-semibold">Dashboard</span>
        </Link>
        <Link href="/dashboard" className={itemClass(active === "toko")}>
          <span className="material-symbols-outlined">storefront</span>
          <span className="text-sm">Toko</span>
        </Link>
      </nav>

      <div className="mt-6 pt-6 border-t border-outline-variant">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-x-3 px-4 py-2 text-on-surface-variant hover:text-error transition-colors rounded-xl text-sm"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors (note: `logout` is imported from `@/app/login/actions` — a server action; it is safe to pass to `<form action>` in a client component as long as this file is a server component. This file has no `"use client"` directive, so it is a server component).

- [ ] **Step 3: Commit**

```bash
git add components/sidebar.tsx
git commit -m "feat: add sidebar component"
```

---

## Task 3: Top nav component

**Files:**
- Create: `components/top-nav.tsx`

- [ ] **Step 1: Create `components/top-nav.tsx`**

Create `components/top-nav.tsx`:

```tsx
export function TopNav({ email }: { email: string }) {
  return (
    <header className="flex justify-between items-center w-full px-12 py-6 bg-transparent z-10 sticky top-0 backdrop-blur-sm">
      <div className="relative w-96">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
          search
        </span>
        <input
          className="w-full bg-surface-container-lowest border border-outline-variant rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
          placeholder="Cari toko"
          type="text"
        />
      </div>
      <div className="flex items-center gap-3 border-l border-outline-variant pl-6">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
          <span className="material-symbols-outlined">person</span>
        </div>
        <p className="hidden lg:block text-sm font-semibold text-on-surface">
          {email}
        </p>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/top-nav.tsx
git commit -m "feat: add top nav component"
```

---

## Task 4: Stat card component

**Files:**
- Create: `components/stat-card.tsx`

- [ ] **Step 1: Create `components/stat-card.tsx`**

Create `components/stat-card.tsx`:

```tsx
export function StatCard({
  variant = "default",
  label,
  value,
  icon,
}: {
  variant?: "primary" | "default";
  label: string;
  value: string | number;
  icon: string;
}) {
  if (variant === "primary") {
    return (
      <div className="bg-primary rounded-2xl p-6 text-white shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-base font-semibold text-white/90">{label}</h3>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-sm">
              {icon}
            </span>
          </div>
        </div>
        <p className="text-4xl font-bold">{value}</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-base font-semibold text-on-surface">{label}</h3>
        <div className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface-variant text-sm">
            {icon}
          </span>
        </div>
      </div>
      <p className="text-4xl font-bold text-on-surface">{value}</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/stat-card.tsx
git commit -m "feat: add stat card component"
```

---

## Task 5: Dashboard layout (shell)

**Files:**
- Create: `app/dashboard/layout.tsx`

- [ ] **Step 1: Create `app/dashboard/layout.tsx`**

Create `app/dashboard/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { TopNav } from "@/components/top-nav";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar active="dashboard" />
      <main className="ml-[260px] w-[calc(100%-260px)] h-screen overflow-y-auto flex flex-col">
        <TopNav email={user.email ?? ""} />
        <div className="px-12 pb-12 flex-1 max-w-[1600px] w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors. If `LayoutProps<"/dashboard">` type is not recognized, use the explicit form `{ children }: { children: React.ReactNode }` instead and report the deviation.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/layout.tsx
git commit -m "feat: add dashboard layout shell"
```

---

## Task 6: Restyle dashboard list

**Files:**
- Modify: `app/dashboard/page.tsx` (replace entire content)

- [ ] **Step 1: Replace `app/dashboard/page.tsx`**

Replace the ENTIRE content of `app/dashboard/page.tsx` with:

```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteToko } from "@/lib/actions";
import { StatCard } from "@/components/stat-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: tokoList } = await supabase
    .from("toko")
    .select("*")
    .order("created_at", { ascending: false });

  const totalToko = tokoList?.length ?? 0;
  const totalKlik = (tokoList ?? []).reduce(
    (sum, t) => sum + Number(t.total_klik ?? 0),
    0
  );
  const aktif = (tokoList ?? []).filter((t) => t.link_review).length;
  const tanpaLink = totalToko - aktif;

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-surface mb-2">Dashboard</h2>
          <p className="text-sm text-on-surface-variant">
            Kelola toko dan link Google review kamu.
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="px-6 py-2.5 rounded-full bg-primary text-white font-semibold text-sm hover:bg-opacity-90 transition-colors flex items-center gap-2 shadow-md"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Toko Baru
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
        <StatCard variant="primary" label="Total Toko" value={totalToko} icon="storefront" />
        <StatCard label="Total Klik" value={totalKlik} icon="arrow_outward" />
        <StatCard label="Toko Aktif" value={aktif} icon="check_circle" />
        <StatCard label="Toko Tanpa Link" value={tanpaLink} icon="pending" />
      </div>

      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30">
        <h3 className="text-xl font-semibold text-on-surface mb-6">Daftar Toko</h3>
        {tokoList && tokoList.length > 0 ? (
          <ul className="space-y-3">
            {tokoList.map((toko) => (
              <li
                key={toko.id}
                className="flex items-center justify-between gap-4 p-4 rounded-xl hover:bg-surface-container-low transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-secondary shrink-0">
                    <span className="material-symbols-outlined">storefront</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-on-surface truncate">
                      {toko.nama}
                    </p>
                    <p className="text-xs text-on-surface-variant truncate">
                      /{toko.slug}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-on-surface">
                      {toko.total_klik} klik
                    </p>
                    {toko.link_review ? (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-md bg-secondary-container/50 text-on-secondary-container">
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-md bg-surface-container-highest text-on-surface-variant">
                        Belum ada link
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/${toko.id}`}
                    className="rounded-full border border-outline-variant px-4 py-1.5 text-sm text-on-surface hover:bg-surface-container transition-colors"
                  >
                    Detail / QR
                  </Link>
                  <form action={deleteToko.bind(null, toko.id)}>
                    <button
                      type="submit"
                      className="rounded-full border border-outline-variant px-4 py-1.5 text-sm text-error hover:bg-error hover:text-white transition-colors"
                    >
                      Hapus
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-on-surface-variant">Belum ada toko.</p>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: restyle dashboard with KPI cards and store list"
```

---

## Task 7: Restyle create form

**Files:**
- Modify: `app/dashboard/new/page.tsx` (replace entire content)

- [ ] **Step 1: Replace `app/dashboard/new/page.tsx`**

Replace the ENTIRE content of `app/dashboard/new/page.tsx` with:

```tsx
import Link from "next/link";
import { createToko } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default function NewTokoPage() {
  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-on-surface mb-2">Toko Baru</h2>
        <p className="text-sm text-on-surface-variant">
          Tambahkan toko dan link Google review-nya.
        </p>
      </div>

      <div className="max-w-lg bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30">
        <form action={createToko} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-on-surface">Nama</span>
            <input
              name="nama"
              required
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-on-surface">
              Slug (kosongkan untuk otomatis)
            </span>
            <input
              name="slug"
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
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
            />
          </label>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="rounded-full bg-primary px-6 py-2.5 text-white font-semibold text-sm hover:bg-opacity-90 transition-colors"
            >
              Simpan
            </button>
            <Link
              href="/dashboard"
              className="rounded-full border border-outline-variant px-6 py-2.5 text-sm text-on-surface hover:bg-surface-container transition-colors"
            >
              Batal
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/new/page.tsx
git commit -m "feat: restyle create toko form"
```

---

## Task 8: Restyle edit form + QR

**Files:**
- Modify: `app/dashboard/[id]/page.tsx` (replace entire content)
- Modify: `app/dashboard/[id]/qrcode.tsx` (minor restyle)

- [ ] **Step 1: Replace `app/dashboard/[id]/page.tsx`**

Replace the ENTIRE content of `app/dashboard/[id]/page.tsx` with:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateToko } from "@/lib/actions";
import { QrCode } from "./qrcode";

export const dynamic = "force-dynamic";

export default async function EditTokoPage({
  params,
}: PageProps<"/dashboard/[id]">) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: toko } = await supabase
    .from("toko")
    .select("*")
    .eq("id", id)
    .single();

  if (!toko) notFound();

  const slugUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/${toko.slug}`;

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-on-surface mb-2">Edit Toko</h2>
        <p className="text-sm text-on-surface-variant">
          Ubah data toko dan kelola QR code.
        </p>
      </div>

      <div className="max-w-lg bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30">
        <form action={updateToko.bind(null, toko.id)} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-on-surface">Nama</span>
            <input
              name="nama"
              defaultValue={toko.nama}
              required
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-on-surface">Slug</span>
            <input
              name="slug"
              defaultValue={toko.slug}
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
              defaultValue={toko.link_review ?? ""}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
            />
          </label>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="rounded-full bg-primary px-6 py-2.5 text-white font-semibold text-sm hover:bg-opacity-90 transition-colors"
            >
              Simpan
            </button>
            <Link
              href="/dashboard"
              className="rounded-full border border-outline-variant px-6 py-2.5 text-sm text-on-surface hover:bg-surface-container transition-colors"
            >
              Batal
            </Link>
          </div>
        </form>
      </div>

      <div className="max-w-lg mt-6 bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30">
        <h3 className="text-xl font-semibold text-on-surface mb-2">QR Code</h3>
        <p className="text-sm text-on-surface-variant">
          Total klik: {toko.total_klik}
        </p>
        <QrCode value={slugUrl} slug={toko.slug} />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Restyle `app/dashboard/[id]/qrcode.tsx`**

Replace the ENTIRE content of `app/dashboard/[id]/qrcode.tsx` with:

```tsx
"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export function QrCode({ value, slug }: { value: string; slug: string }) {
  const [show, setShow] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${slug}.png`;
    link.click();
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="rounded-full border border-outline-variant px-4 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors"
      >
        {show ? "Sembunyikan QR" : "Generate QR"}
      </button>
      {show && (
        <div className="mt-4 inline-block rounded-2xl border border-outline-variant bg-white p-4">
          <QRCodeCanvas ref={canvasRef} value={value} size={200} />
          <p className="mt-2 break-all text-xs text-on-surface-variant">
            {value}
          </p>
          <button
            type="button"
            onClick={download}
            className="mt-3 w-full rounded-full bg-primary px-3 py-2 text-sm text-white"
          >
            Download PNG
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/dashboard/[id]"
git commit -m "feat: restyle edit toko form and QR"
```

---

## Task 9: Restyle login, landing, and slug form

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/page.tsx`
- Modify: `app/[slug]/page.tsx`

- [ ] **Step 1: Restyle `app/login/page.tsx`**

Replace the ENTIRE content of `app/login/page.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6 bg-background">
      <form
        action={async (formData) => {
          const res = await login(formData);
          if (res?.error) setError(res.error);
        }}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="material-symbols-outlined text-secondary text-3xl">
            target
          </span>
          <h1 className="text-xl font-semibold text-on-surface">TapReview</h1>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-on-surface">Email</span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-on-surface">Password</span>
          <input
            name="password"
            type="password"
            required
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-primary px-3 py-2 text-white font-semibold"
        >
          Masuk
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Restyle `app/page.tsx`**

Replace the ENTIRE content of `app/page.tsx` with:

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center bg-background">
      <span className="material-symbols-outlined text-secondary text-5xl">
        target
      </span>
      <h1 className="text-3xl font-semibold text-on-surface">TapReview</h1>
      <p className="max-w-md text-on-surface-variant">
        Short-link menuju halaman Google review toko.
      </p>
      <Link
        href="/dashboard"
        className="rounded-full bg-primary px-6 py-2.5 text-white font-semibold"
      >
        Dashboard Admin
      </Link>
    </main>
  );
}
```

- [ ] **Step 3: Restyle `app/[slug]/page.tsx`**

Replace the ENTIRE content of `app/[slug]/page.tsx` with:

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
    await supabase.rpc("increment_klik", { p_id: toko.id });
    redirect(toko.link_review);
  }

  if (!user) {
    redirect(`/login?next=/${slug}`);
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 p-6">
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <h1 className="text-2xl font-semibold text-on-surface">{toko.nama}</h1>
        <p className="mt-2 text-on-surface-variant">
          Link Google review untuk toko ini belum diisi.
        </p>
        <form action={fillLink} className="mt-6 space-y-4">
          <input type="hidden" name="id" value={toko.id} />
          <input type="hidden" name="slug" value={toko.slug} />
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
            Simpan Link
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/login/page.tsx app/page.tsx "app/[slug]/page.tsx"
git commit -m "feat: restyle login, landing, and slug form"
```

---

## Task 10: Full verification

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 4: Tests**

Run: `npx vitest run`
Expected: 7 tests pass.

- [ ] **Step 5: Manual smoke test**

1. `npm run dev`
2. Open `/login` → styled card with Hanken Grotesk font.
3. Login → `/dashboard` shows sidebar + top nav + KPI cards + store list.
4. Create a store → form styled; store appears in list.
5. Open a store → edit form + QR + Download PNG.
6. Open `/<slug>` for a store without link → styled fill-link form.

---

## Self-Review Notes

- **Spec coverage:** color tokens/font (Task 1), Sidebar/TopNav/StatCard (Tasks 2-4), dashboard shell (Task 5), dashboard list + KPI (Task 6), create/edit/QR (Tasks 7-8), login/landing/slug (Task 9). Matches spec sections exactly.
- **Type consistency:** `Sidebar` props `active: "dashboard" | "toko"` matches usage in `app/dashboard/layout.tsx` (`active="dashboard"`). `StatCard` props `variant/label/value/icon` match usage in Task 6. `TopNav` prop `email: string` matches `user.email ?? ""` in Task 5. `QrCode` props `value`/`slug` match usage in Task 8.
- **Font var name:** `--font-hanken` (set via `Hanken_Grotesk({ variable: "--font-hanken" })`) is referenced in `globals.css` as `var(--font-hanken)` — consistent.
- **Auth duplication:** `app/dashboard/layout.tsx` now guards auth (redirects to `/login`), so the individual `app/dashboard/page.tsx` and `app/dashboard/new/page.tsx` no longer need their own auth check. Tasks 6 and 7 drop the per-page `redirect("/login")` guard (auth is handled by the layout). This is an intentional, correct consolidation.
