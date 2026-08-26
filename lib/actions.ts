"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidUrl, isValidUuid, normalizeSlug, randomSlug } from "@/lib/toko";

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

  const slug = slugInput ? normalizeSlug(slugInput) : randomSlug();
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

  if (!isValidUuid(id)) throw new Error("ID tidak valid");

  const nama = String(formData.get("nama") ?? "").trim();
  const link = String(formData.get("link_review") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();

  if (!nama) throw new Error("Nama wajib diisi");

  const slug = slugInput ? normalizeSlug(slugInput) : randomSlug();
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

  if (!isValidUuid(id)) throw new Error("ID tidak valid");

  const { error } = await supabase.from("toko").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}

export async function fillLink(formData: FormData) {
  const supabase = await requireUser();

  const id = String(formData.get("id") ?? "");

  if (!isValidUuid(id)) throw new Error("ID tidak valid");

  const link = String(formData.get("link_review") ?? "").trim();

  if (!isValidUrl(link)) throw new Error("Link tidak valid");

  const { data: toko, error } = await supabase
    .from("toko")
    .update({ link_review: link, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("slug")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/");
  redirect(`/${toko.slug}`);
}
