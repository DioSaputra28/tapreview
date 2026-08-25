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
