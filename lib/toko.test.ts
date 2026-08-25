import { describe, expect, it } from "vitest";
import { isValidUrl, normalizeSlug, slugFromName } from "./toko";

describe("isValidUrl", () => {
  it("accepts https URLs", () => {
    expect(isValidUrl("https://g.page/r/abc/review")).toBe(true);
  });

  it("rejects non-URL strings", () => {
    expect(isValidUrl("not a url")).toBe(false);
  });

  it("rejects javascript: URLs", () => {
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("normalizeSlug", () => {
  it("lowercases and strips invalid characters", () => {
    expect(normalizeSlug(" Toko  Makan Enak! ")).toBe("toko-makan-enak");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeSlug("")).toBe("");
  });
});

describe("slugFromName", () => {
  it("derives slug from name with timestamp suffix", () => {
    const slug = slugFromName("Warung Kopi");
    expect(slug.startsWith("warung-kopi-")).toBe(true);
  });
});
