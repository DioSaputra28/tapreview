"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

const PAGE_SIZES = [10, 20, 50];

export function TokoControls({
  initialQuery,
  initialPerPage,
}: {
  initialQuery: string;
  initialPerPage: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [perPage, setPerPage] = useState(initialPerPage);
  const didMount = useRef(false);
  const perPageRef = useRef(perPage);

  const navigate = useCallback(
    (nextQuery: string, nextPerPage: number) => {
      const params = new URLSearchParams();
      if (nextQuery) params.set("q", nextQuery);
      if (nextPerPage !== 10) params.set("per_page", String(nextPerPage));
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router]
  );

  useEffect(() => {
    perPageRef.current = perPage;
  }, [perPage]);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const timer = setTimeout(() => {
      navigate(query, perPageRef.current);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, navigate]);

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama / slug"
          className="w-64 rounded-full border border-outline-variant bg-surface-container-lowest pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-on-surface-variant">
        Tampilkan
        <select
          value={perPage}
          onChange={(e) => {
            const v = Number(e.target.value);
            setPerPage(v);
            navigate(query, v);
          }}
          className="rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
