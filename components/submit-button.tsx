"use client";

import { useFormStatus } from "react-dom";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

export function SubmitButton({
  children,
  className = "rounded-full bg-primary px-6 py-2.5 text-white font-semibold text-sm hover:bg-opacity-90 transition-colors",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2`}
    >
      {pending && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
      {pending ? "Memproses..." : children}
    </button>
  );
}
