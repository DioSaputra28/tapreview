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
