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
