"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowPathIcon, TrashIcon } from "@heroicons/react/24/outline";
import { deleteToko } from "@/lib/actions";

function DeleteSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-error px-5 py-2 text-sm text-white font-semibold inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
      {pending ? "Menghapus..." : "Hapus"}
    </button>
  );
}

export function DeleteButton({
  id,
  nama,
  variant = "icon",
}: {
  id: string;
  nama: string;
  variant?: "icon" | "text";
}) {
  const [open, setOpen] = useState(false);

  const triggerClass =
    variant === "icon"
      ? "rounded-full border border-outline-variant p-2 text-error hover:bg-error hover:text-white transition-colors"
      : "rounded-full border border-outline-variant px-4 py-1.5 text-sm text-error hover:bg-error hover:text-white transition-colors";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClass}
        title="Hapus"
      >
        {variant === "icon" ? (
          <TrashIcon className="h-4 w-4" />
        ) : (
          "Hapus"
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-surface-container-lowest p-6 shadow-xl border border-outline-variant"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-on-surface">
              Hapus Toko?
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Tindakan ini tidak bisa dibatalkan. Apakah kamu yakin ingin
              menghapus{" "}
              <span className="font-semibold text-on-surface">{nama}</span>?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-outline-variant px-5 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors"
              >
                Batal
              </button>
              <form action={deleteToko.bind(null, id)}>
                <DeleteSubmit />
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
