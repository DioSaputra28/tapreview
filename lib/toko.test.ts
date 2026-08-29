import { describe, expect, it } from "vitest";
import { generateToken, isValidUrl, normalizeSlug, randomSlug } from "./toko";

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

describe("randomSlug", () => {
  it("returns a 12-char alphanumeric string", () => {
    expect(randomSlug()).toMatch(/^[a-z0-9]{12}$/);
  });

  it("returns unique values", () => {
    const a = randomSlug();
    const b = randomSlug();
    expect(a).not.toBe(b);
  });
});

describe("generateToken", () => {
  it("returns an 8-digit zero-padded string", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateToken()).toMatch(/^\d{8}$/);
    }
  });
});
