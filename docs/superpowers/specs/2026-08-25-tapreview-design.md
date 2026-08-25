# Tapreview — Design Spec

## Ringkasan

Tapreview adalah web fullstack yang bertindak sebagai **short-link redirector** menuju halaman Google review suatu toko. Setiap toko memiliki `slug` unik; ketika pengunjung membuka `https://<domain>/<slug>`, mereka langsung diarahkan ke link Google review toko tersebut.

## Stack

- Next.js 16 (App Router, server-side rendering / route handlers)
- TypeScript
- Tailwind CSS v4
- Supabase (Auth + Postgres)

## Schema Database (Supabase)

### Tabel `toko`

| Kolom         | Tipe        | Keteratan                                        |
| ------------- | ----------- | ------------------------------------------------ |
| `id`          | uuid        | PK, default `gen_random_uuid()`                  |
| `nama`        | text        | nama toko                                        |
| `slug`        | text        | unik, not null                                    |
| `link_review` | text        | URL Google review, nullable (boleh kosong dulu)  |
| `total_klik`  | integer     | default 0                                        |
| `created_at`  | timestamptz | default now()                                    |
| `updated_at`  | timestamptz | default now()                                    |

Constraints: `slug` unique. `link_review` divalidasi sebagai URL.

### Autentikasi admin

Menggunakan `auth.users` bawaan Supabase Auth (email + password). Tidak ada tabel user tambahan.

## Halaman & Alur

### 1. Redirect — `app/[slug]/route.ts` (server-side)

Saat pengunjung membuka `/<slug>`:

1. Fetch toko berdasarkan `slug`.
2. Jika toko tidak ditemukan → tampilkan halaman 404.
3. Jika `link_review` terisi → increment `total_klik` secara atomic, lalu `redirect` (302) ke URL Google review.
4. Jika `link_review` kosong → render halaman form isi link (poin 2).

### 2. Form isi link — `app/[slug]/page.tsx`

Ditampilkan ketika `link_review` kosong. Pengunjung harus login (Supabase Auth) terlebih dahulu untuk mengisi link. Setelah submit, `link_review` tersimpan dan pengunjung diarahkan ke link tersebut.

### 3. Dashboard admin — `/dashboard`

Dilindungi login. Menampilkan daftar semua toko, dengan kemampuan:

- Tambah toko baru (nama + slug; slug dibuat otomatis jika kosong).
- Edit nama / slug / link review.
- Hapus toko.
- Melihat `total_klik` per toko.

### 4. Detail toko & QR code (on-demand)

Klik sebuah toko di dashboard → buka halaman detail toko → tombol "Generate QR". QR di-generate **client-side** saat diminta, berisi URL `https://<domain>/<slug>`, dan dapat di-download. QR tidak disimpan di database.

### 5. Login — `/login`

Halaman login memakai Supabase Auth (email + password).

## Error Handling

- Slug tidak ditemukan → 404.
- `link_review` tidak valid → validasi dan tampilkan error.
- Akses dashboard/form tanpa login → redirect ke `/login`.
- `total_klik` increment menggunakan update atomic (`+ 1`) untuk menghindari race condition.

## Non-Goals (YAGNI)

- Tidak ada tabel log klik terpisah (cukup total counter).
- Tidak ada multi-user / relasi user ↔ toko (skala kecil, satu akun admin).
- QR tidak disimpan ke storage.
- Tidak ada analitik detail (hanya total klik).
