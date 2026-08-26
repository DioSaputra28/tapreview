import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center bg-background">
      <span className="material-symbols-outlined text-secondary text-5xl">
        target
      </span>
      <h1 className="text-3xl font-semibold text-on-surface">TapReview</h1>
      <p className="max-w-md text-on-surface-variant">
        Short-link menuju halaman Google review toko.
      </p>
      <Link
        href="/dashboard"
        className="rounded-full bg-primary px-6 py-2.5 text-white font-semibold"
      >
        Dashboard Admin
      </Link>
    </main>
  );
}
