"use client";

import { useState } from "react";
import { setLinkByToken } from "@/lib/actions";

export function TokenSetupForm({
  slug,
  hasLink,
}: {
  slug: string;
  hasLink: boolean;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={async (formData) => {
        const res = await setLinkByToken(formData);
        if (res?.error) setError(res.error);
      }}
      className="mt-6 space-y-4"
    >
      <input type="hidden" name="slug" value={slug} />
      {error && <p className="text-sm text-error">{error}</p>}
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-on-surface">Token</span>
        <input
          name="token"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{8}"
          maxLength={8}
          required
          placeholder="12345678"
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
          required
          placeholder="https://g.page/r/.../review"
          className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
        />
      </label>
      <button
        type="submit"
        className="rounded-full bg-primary px-4 py-2 text-white font-semibold"
      >
        {hasLink ? "Ubah Link" : "Simpan Link"}
      </button>
    </form>
  );
}
