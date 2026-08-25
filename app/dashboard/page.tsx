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
