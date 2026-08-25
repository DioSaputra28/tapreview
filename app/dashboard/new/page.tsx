import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createToko } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function NewTokoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-lg flex-1 p-6">
      <h1 className="text-2xl font-semibold">Toko Baru</h1>
      <form action={createToko} className="mt-6 space-y-4">
        <label className="block space-y-1">
          <span className="text-sm">Nama</span>
          <input
            name="nama"
            required
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">Slug (kosongkan untuk otomatis)</span>
          <input
            name="slug"
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">Link Google Review</span>
          <input
            name="link_review"
            type="url"
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-foreground px-4 py-2 text-background"
          >
            Simpan
          </button>
          <Link href="/dashboard" className="rounded-md border px-4 py-2">
            Batal
          </Link>
        </div>
      </form>
    </main>
  );
}
