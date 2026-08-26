# TapReview UI Redesign — Design Spec

## Ringkasan

Menerapkan gaya visual Material Design 3 (referensi dari desain "Donezo Dashboard" yang disediakan user di `stitch_toko_management_dashboard/code.html`) ke seluruh halaman TapReview. Tujuannya: tampilan dashboard admin yang modern (sidebar + top nav + kartu KPI), serta konsistensi warna/font/tema di semua halaman lain.

## Scope

Seluruh halaman:
- Dashboard (`/dashboard`, `/dashboard/new`, `/dashboard/[id]`)
- Login (`/login`)
- Landing (`/`)
- Form slug (`/[slug]`)

## Design System

### Warna (Material 3, diambil dari Donezo)

Diterjemahkan menjadi token Tailwind v4 `@theme` di `app/globals.css`:

| Token | Nilai |
|---|---|
| `primary` | `#003626` |
| `secondary` | `#006e2f` |
| `secondary-container` | `#6bff8f` |
| `on-secondary-container` | `#007432` |
| `background` | `#f8f9ff` |
| `surface` | `#f8f9ff` |
| `surface-bright` | `#f8f9ff` |
| `surface-container-lowest` | `#ffffff` |
| `surface-container-low` | `#eff4ff` |
| `surface-container` | `#e5eeff` |
| `surface-container-high` | `#dce9ff` |
| `surface-container-highest` | `#d3e4fe` |
| `on-surface` | `#0b1c30` |
| `on-surface-variant` | `#404944` |
| `outline` | `#707974` |
| `outline-variant` | `#c0c9c2` |
| `error` | `#ba1a1a` |
| `primary-fixed-dim` | `#99d3b8` |
| `on-primary` | `#ffffff` |

Catatan: `--background`/`--foreground` yang lama dihapus dan diganti token Material 3 di atas. Mode gelap tidak dipertahankan untuk saat ini (YAGNI) — aplikasi selalu light.

### Font & Icon

- Font: **Hanken Grotesk** (via `next/font/google`) untuk seluruh teks.
- Icon: **Material Symbols Outlined** dimuat via `<link>` Google Fonts di root layout.
- Icon dirender sebagai `<span className="material-symbols-outlined">...</span>`.

### Radius & Spacing

- `rounded-2xl` untuk kartu besar; `rounded-xl` untuk list item; `rounded-full` untuk tombol pill/icon.
- Gutter antar grid = 20px.

## Komponen Reusable

### `components/sidebar.tsx`

- Lebar 260px, fixed kiri, `bg-surface-bright`, border kanan `outline-variant`.
- Brand: icon `target` + judul "TapReview" + sublabel "Management".
- Menu: Dashboard (aktif), Toko. Menu aktif: `bg-secondary-container text-on-secondary-container`, `border-l-4 border-secondary`.
- Footer: Logout (memanggil `logout` server action dari `app/login/actions.ts`).
- Props: `active` (string) untuk menandai menu aktif.

### `components/top-nav.tsx`

- Sticky top, `backdrop-blur`.
- Kiri: search input (placeholder "Cari toko", belum fungsional untuk saat ini).
- Kanan: email user login (diteruskan sebagai prop `email`).

### `components/stat-card.tsx`

Kartu KPI dengan 3 varian tampilan:
- **primary** (bg `primary`, teks putih) untuk kartu pertama.
- **default** (bg `surface-container-lowest`, border `outline-variant/30`).

Props: `variant`, `label`, `value`, `icon`.

## Layout

### `app/dashboard/layout.tsx` (baru)

Server component yang membungkus halaman dashboard dengan `<Sidebar>` + `<TopNav>` + area konten. Sidebar 260px kiri, konten di kanan dengan `ml-[260px]`. Menerima `children`.

TopNav perlu email user → layout fetch user via `createClient()`.

## Halaman

### Dashboard list (`app/dashboard/page.tsx`)

- KPI cards (4): Total Toko, Total Klik (sum `total_klik`), Toko Aktif (ada `link_review`), Toko Tanpa Link.
- Daftar toko sebagai list item (kartu) dengan: nama, `/slug`, jumlah klik, badge status link (terisi/belum), tombol Detail/QR dan Hapus.
- Tombol "+ Toko Baru" pill di header (bg primary).

### Create (`app/dashboard/new/page.tsx`) & Edit (`app/dashboard/[id]/page.tsx`)

- Form dalam kartu `surface-container-lowest` dengan input bergaya Material 3 (border `outline-variant`, focus ring `secondary`).
- Edit tetap menampilkan total klik + QR + tombol Download PNG (fitur yang sudah ada dipertahankan).

### Login (`app/login/page.tsx`)

- Kartu login dengan warna/tema/font Material 3 (tetap sederhana, tanpa sidebar).

### Landing (`app/page.tsx`)

- Tetap sederhana, tapi pakai font & warna Material 3.

### Form slug (`app/[slug]/page.tsx`)

- Form isi link dalam kartu Material 3.

## Error Handling

Tidak ada perubahan logika error handling dari kondisi sebelumnya (404, unauthorized redirect, validasi URL tetap seperti sedia kala).

## Non-Goals

- Tidak ada dark mode.
- Search di top nav tidak fungsional (placeholder).
- Tidak ada menu Settings/Help (dibuang).
- Tidak ada halaman "Toko" terpisah — menu Toko mengarah ke `/dashboard`.
- Tidak ada chart/grafik analitik.

## Testing

- Test unit `lib/toko.test.ts` tidak terpengaruh (tidak ada perubahan logika).
- Verifikasi: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- Smoke test manual: navigasi dashboard, login, buat/edit toko, generate QR.
