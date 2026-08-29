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
