"use client";

import { useState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <form
        action={async (formData) => {
          const res = await login(formData);
          if (res?.error) setError(res.error);
        }}
        className="w-full max-w-sm space-y-4 rounded-xl border p-6"
      >
        <h1 className="text-xl font-semibold">Login Admin</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <label className="block space-y-1">
          <span className="text-sm">Email</span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">Password</span>
          <input
            name="password"
            type="password"
            required
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-md bg-foreground px-3 py-2 text-background"
        >
          Masuk
        </button>
      </form>
    </main>
  );
}
