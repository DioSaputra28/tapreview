"use client";

import { useState } from "react";
import { ClipboardIcon, CheckIcon } from "@heroicons/react/24/outline";

export function CopyButton({
  text,
  title = "Copy",
}: {
  text: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
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
      title={title}
      className="rounded-full border border-outline-variant p-2 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
    >
      {copied ? (
        <CheckIcon className="h-4 w-4 text-secondary" />
      ) : (
        <ClipboardIcon className="h-4 w-4" />
      )}
    </button>
  );
}
