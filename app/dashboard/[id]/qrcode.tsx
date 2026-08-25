"use client";

import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export function QrCode({ value }: { value: string }) {
  const [show, setShow] = useState(false);

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="rounded-md border px-3 py-2 text-sm"
      >
        {show ? "Sembunyikan QR" : "Generate QR"}
      </button>
      {show && (
        <div className="mt-4 inline-block rounded-lg border bg-white p-4">
          <QRCodeCanvas value={value} size={200} />
          <p className="mt-2 break-all text-xs text-zinc-500">{value}</p>
        </div>
      )}
    </div>
  );
}
