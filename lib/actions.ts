"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidUrl, normalizeSlug, slugFromName } from "@/lib/toko";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return supabase;
}

export async function createToko(formData: FormData) {
  const supabase = await requireUser();

  const nama = String(formData.get("nama") ?? "").trim();
  const link = String(formData.get("link_review") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();

  if (!nama) throw new Error("Nama wajib diisi");

  const slug = slugInput ? normalizeSlug(slugInput) : slugFromName(nama);
  if (!slug) throw new Error("Slug tidak valid");

  const link_review = link && isValidUrl(link) ? link : null;

  const { error } = await supabase
    .from("toko")
    .insert({ nama, slug, link_review });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateToko(id: string, formData: FormData) {
  const supabase = await requireUser();

  const nama = String(formData.get("nama") ?? "").trim();
  const link = String(formData.get("link_review") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();

  if (!nama) throw new Error("Nama wajib diisi");

  const slug = slugInput ? normalizeSlug(slugInput) : slugFromName(nama);
  if (!slug) throw new Error("Slug tidak valid");

  const link_review = link && isValidUrl(link) ? link : null;

  const { error } = await supabase
    .from("toko")
    .update({ nama, slug, link_review })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteToko(id: string) {
  const supabase = await requireUser();

  const { error } = await supabase.from("toko").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}

export async function fillLink(formData: FormData) {
  const supabase = await requireUser();

  const id = String(formData.get("id") ?? "");
  const link = String(formData.get("link_review") ?? "").trim();

  if (!isValidUrl(link)) throw new Error("Link tidak valid");

  const { error } = await supabase
    .from("toko")
    .update({ link_review: link, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);

  const slug = String(formData.get("slug") ?? "");
  revalidatePath("/");
  redirect(slug ? `/${slug}` : "/dashboard");
}
