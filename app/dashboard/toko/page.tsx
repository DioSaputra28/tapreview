import Link from "next/link";
import {
  BuildingStorefrontIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/server";
import { deleteToko } from "@/lib/actions";
import { CopyLinkButton } from "@/components/copy-link-button";

export const dynamic = "force-dynamic";

export default async function TokoPage() {
  const supabase = await createClient();
  const { data: tokoList } = await supabase
    .from("toko")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-surface mb-2">Toko</h2>
          <p className="text-sm text-on-surface-variant">
            Kelola semua toko dan link Google review.
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className="px-6 py-2.5 rounded-full bg-primary text-white font-semibold text-sm hover:bg-opacity-90 transition-colors flex items-center gap-2 shadow-md"
        >
          <PlusIcon className="h-4 w-4" />
          Toko Baru
        </Link>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-on-surface-variant border-b border-outline-variant/30">
              <th className="px-6 py-4 font-semibold">Nama</th>
              <th className="px-6 py-4 font-semibold">Slug</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Klik</th>
              <th className="px-6 py-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {tokoList && tokoList.length > 0 ? (
              tokoList.map((toko) => (
                <tr
                  key={toko.id}
                  className="border-b border-outline-variant/20 last:border-b-0 hover:bg-surface-container-low transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary shrink-0">
                        <BuildingStorefrontIcon className="h-4 w-4" />
                      </div>
                      <span className="font-semibold text-on-surface truncate">
                        {toko.nama}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">
                    /{toko.slug}
                  </td>
                  <td className="px-6 py-4">
                    {toko.link_review ? (
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-md bg-secondary-container/50 text-on-secondary-container">
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-md bg-surface-container-highest text-on-surface-variant">
                        Belum ada link
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-on-surface">
                    {toko.total_klik}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <CopyLinkButton slug={toko.slug} />
                      <Link
                        href={`/dashboard/${toko.id}`}
                        className="rounded-full border border-outline-variant p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                        title="Edit"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </Link>
                      <form action={deleteToko.bind(null, toko.id)}>
                        <button
                          type="submit"
                          className="rounded-full border border-outline-variant p-2 text-error hover:bg-error hover:text-white transition-colors"
                          title="Hapus"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                  Belum ada toko.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
