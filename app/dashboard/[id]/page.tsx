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
