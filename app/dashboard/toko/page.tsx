import Link from "next/link";
import {
  BuildingStorefrontIcon,
  PencilSquareIcon,
  PlusIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/server";
import { resetToken } from "@/lib/actions";
import { CopyButton } from "@/components/copy-button";
import { DeleteButton } from "@/components/delete-button";
import { TokoControls } from "@/components/toko-controls";

export const dynamic = "force-dynamic";

const PAGE_SIZES = [10, 20, 50] as const;

type SortKey = "created" | "klik_desc" | "klik_asc";

const SORT_OPTIONS: Record<SortKey, { column: string; ascending: boolean }> = {
  created: { column: "created_at", ascending: false },
  klik_desc: { column: "total_klik", ascending: false },
  klik_asc: { column: "total_klik", ascending: true },
};

export default async function TokoPage({
  searchParams,
}: PageProps<"/dashboard/toko">) {
  const { q, per_page, page: pageParam, sort: sortParam } = await searchParams;

  const query = typeof q === "string" ? q.trim() : "";
  const perPageRaw = Number(
    Array.isArray(per_page) ? per_page[0] : per_page
  );
  const perPage = PAGE_SIZES.includes(
    perPageRaw as (typeof PAGE_SIZES)[number]
  )
    ? (perPageRaw as (typeof PAGE_SIZES)[number])
    : 10;
  const pageRaw = Number(
    Array.isArray(pageParam) ? pageParam[0] : pageParam
  );
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const sortRaw = Array.isArray(sortParam) ? sortParam[0] : sortParam;
  const sort: SortKey = (sortRaw as SortKey) in SORT_OPTIONS
    ? (sortRaw as SortKey)
    : "created";

  const supabase = await createClient();

  let countQuery = supabase
    .from("toko")
    .select("id", { count: "exact", head: true });
  let dataQuery = supabase.from("toko").select("*");

  if (query) {
    const ilike = `%${query}%`;
    countQuery = countQuery.or(`nama.ilike.${ilike},slug.ilike.${ilike}`);
    dataQuery = dataQuery.or(`nama.ilike.${ilike},slug.ilike.${ilike}`);
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { column, ascending } = SORT_OPTIONS[sort];

  const [{ count }, { data: tokoList }, { data: tokenRows }] =
    await Promise.all([
      countQuery,
      dataQuery.order(column, { ascending }).range(from, to),
      supabase.from("toko_tokens").select("toko_id, token"),
    ]);

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const currentPage = Math.min(page, totalPages);

  const tokenMap = new Map((tokenRows ?? []).map((t) => [t.toko_id, t.token]));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (perPage !== 10) params.set("per_page", String(perPage));
    if (sort !== "created") params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/dashboard/toko${s ? `?${s}` : ""}`;
  }

  function sortHref(nextSort: SortKey) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (perPage !== 10) params.set("per_page", String(perPage));
    if (nextSort !== "created") params.set("sort", nextSort);
    const s = params.toString();
    return `/dashboard/toko${s ? `?${s}` : ""}`;
  }

  const nextKlikSort: SortKey =
    sort === "created"
      ? "klik_desc"
      : sort === "klik_desc"
      ? "klik_asc"
      : "created";

  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalCount);

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-surface mb-2">Toko</h2>
          <p className="text-sm text-on-surface-variant">
            Kelola semua toko dan link Google review.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TokoControls
            initialQuery={query}
            initialPerPage={perPage}
          />
          <Link
            href="/dashboard/new"
            className="px-6 py-2.5 rounded-full bg-primary text-white font-semibold text-sm hover:bg-opacity-90 transition-colors flex items-center gap-2 shadow-md"
          >
            <PlusIcon className="h-4 w-4" />
            Toko Baru
          </Link>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant/30 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-on-surface-variant border-b border-outline-variant/30">
              <th className="px-6 py-4 font-semibold">Nama</th>
              <th className="px-6 py-4 font-semibold">Slug</th>
              <th className="px-6 py-4 font-semibold">Token</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">
                <Link
                  href={sortHref(nextKlikSort)}
                  className="inline-flex items-center gap-1 hover:text-on-surface transition-colors"
                >
                  Klik
                  {sort === "klik_desc" ? (
                    <ArrowDownIcon className="h-4 w-4" />
                  ) : sort === "klik_asc" ? (
                    <ArrowUpIcon className="h-4 w-4" />
                  ) : null}
                </Link>
              </th>
              <th className="px-6 py-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {tokoList && tokoList.length > 0 ? (
              tokoList.map((toko) => {
                const token = tokenMap.get(toko.id);
                return (
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
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-on-surface">
                          {token ?? "—"}
                        </span>
                        {token && (
                          <CopyButton text={token} title="Copy token" />
                        )}
                      </div>
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
                        <CopyButton
                          text={`${siteUrl}/${toko.slug}`}
                          title="Copy link utama"
                        />
                        <Link
                          href={`/dashboard/${toko.id}`}
                          className="rounded-full border border-outline-variant p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </Link>
                        <form action={resetToken.bind(null, toko.id)}>
                          <button
                            type="submit"
                            className="rounded-full border border-outline-variant p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                            title="Reset token"
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                          </button>
                        </form>
                        <DeleteButton id={toko.id} nama={toko.nama} />
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-on-surface-variant"
                >
                  {query ? "Tidak ada hasil yang cocok." : "Belum ada toko."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-on-surface-variant">
        <p>
          Menampilkan {startItem}–{endItem} dari {totalCount} toko
        </p>
        <div className="flex items-center gap-1">
          <Link
            href={pageHref(Math.max(1, currentPage - 1))}
            className={`rounded-full border border-outline-variant px-3 py-1.5 ${
              currentPage <= 1
                ? "pointer-events-none opacity-40"
                : "hover:bg-surface-container"
            }`}
          >
            Sebelumnya
          </Link>
          <span className="px-3 py-1.5 text-on-surface font-semibold">
            {currentPage} / {totalPages}
          </span>
          <Link
            href={pageHref(Math.min(totalPages, currentPage + 1))}
            className={`rounded-full border border-outline-variant px-3 py-1.5 ${
              currentPage >= totalPages
                ? "pointer-events-none opacity-40"
                : "hover:bg-surface-container"
            }`}
          >
            Berikutnya
          </Link>
        </div>
      </div>
    </>
  );
}
