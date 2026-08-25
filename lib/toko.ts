export type Toko = {
  id: string;
  nama: string;
  slug: string;
  link_review: string | null;
  total_klik: number;
  created_at: string;
  updated_at: string;
};

export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugFromName(name: string): string {
  const base = normalizeSlug(name) || "toko";
  return `${base}-${Date.now().toString(36)}`;
}
