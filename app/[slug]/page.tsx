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
