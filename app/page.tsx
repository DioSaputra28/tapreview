import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold">TapReview</h1>
      <p className="max-w-md text-zinc-500">
        Short-link menuju halaman Google review toko.
      </p>
      <Link
        href="/dashboard"
        className="rounded-md bg-foreground px-4 py-2 text-background"
      >
        Dashboard Admin
      </Link>
    </main>
  );
}
