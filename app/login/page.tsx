"use client";

import { useState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6 bg-background">
      <form
        action={async (formData) => {
          const res = await login(formData);
          if (res?.error) setError(res.error);
        }}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="material-symbols-outlined text-secondary text-3xl">
            target
          </span>
          <h1 className="text-xl font-semibold text-on-surface">TapReview</h1>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-on-surface">Email</span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-on-surface">Password</span>
          <input
            name="password"
            type="password"
            required
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm focus:ring-2 focus:ring-secondary focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-full bg-primary px-3 py-2 text-white font-semibold"
        >
          Masuk
        </button>
      </form>
    </main>
  );
}
