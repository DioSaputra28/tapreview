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
