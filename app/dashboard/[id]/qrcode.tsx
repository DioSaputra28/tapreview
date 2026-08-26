"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export function QrCode({ value, slug }: { value: string; slug: string }) {
  const [show, setShow] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${slug}.png`;
    link.click();
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="rounded-full border border-outline-variant px-4 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors"
      >
        {show ? "Sembunyikan QR" : "Generate QR"}
      </button>
      {show && (
        <div className="mt-4 inline-block rounded-2xl border border-outline-variant bg-white p-4">
          <QRCodeCanvas ref={canvasRef} value={value} size={200} />
          <p className="mt-2 break-all text-xs text-on-surface-variant">
            {value}
          </p>
          <button
            type="button"
            onClick={download}
            className="mt-3 w-full rounded-full bg-primary px-3 py-2 text-sm text-white"
          >
            Download PNG
          </button>
        </div>
      )}
    </div>
  );
}
