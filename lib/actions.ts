"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { generateToken, isValidUrl, isValidUuid, normalizeSlug, randomSlug } from "@/lib/toko";
import { tokenRateLimiter } from "@/lib/rate-limit";

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

  const { data: created, error } = await supabase
    .from("toko")
    .insert({ nama, slug, link_review })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const token = generateToken();
  const { error: tokenError } = await supabase
    .from("toko_tokens")
    .insert({ toko_id: created.id, token });

  if (tokenError) throw new Error(tokenError.message);

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/toko");
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

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/toko");
}

export async function deleteToko(id: string) {
  const supabase = await requireUser();

  if (!isValidUuid(id)) throw new Error("ID tidak valid");

  const { error } = await supabase.from("toko").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard", "layout");
}

export async function setLinkByToken(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  const link = String(formData.get("link_review") ?? "").trim();

  if (!slug) return { error: "Slug tidak valid" };
  if (!/^\d{8}$/.test(token)) return { error: "Token salah" };
  if (!isValidUrl(link)) return { error: "Link tidak valid" };

  const headersList = await headers();
  const rawIp =
    headersList.get("x-real-ip") ??
    headersList.get("x-forwarded-for") ??
    "unknown";
  const ip = rawIp.split(",")[0].trim() || "unknown";
  const key = `${ip}:${slug}`;

  if (tokenRateLimiter.isBlocked(key)) {
    return { error: "Terlalu banyak percobaan, coba lagi nanti" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_link_by_token", {
    p_slug: slug,
    p_token: token,
    p_link: link,
  });

  if (error) {
    console.error("set_link_by_token failed:", error.message);
    return { error: "Terjadi kesalahan, coba lagi" };
  }

  if (!data) {
    tokenRateLimiter.recordFailure(key);
    return { error: "Token salah" };
  }

  tokenRateLimiter.clear(key);
  revalidatePath(`/${slug}`);
  redirect(`/${slug}`);
}

export async function resetToken(id: string) {
  const supabase = await requireUser();

  if (!isValidUuid(id)) throw new Error("ID tidak valid");

  const token = generateToken();
  const { error } = await supabase
    .from("toko_tokens")
    .upsert({ toko_id: id, token });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard", "layout");
}
