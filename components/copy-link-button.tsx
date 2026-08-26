"use client";

import { useState } from "react";
import { ClipboardIcon, CheckIcon } from "@heroicons/react/24/outline";

export function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-full border border-outline-variant p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
      title="Copy link"
    >
      {copied ? (
        <CheckIcon className="h-4 w-4 text-secondary" />
      ) : (
        <ClipboardIcon className="h-4 w-4" />
      )}
    </button>
  );
}
