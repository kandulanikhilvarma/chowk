import { describe, expect, it } from "vitest";
import { z } from "zod";
import { listingSchema, listingStrength, type ListingInput } from "../../lib/listing-schema";

const valid: ListingInput = {
  kind: "offer",
  title: "  Honda Activa 6G 2022  ",
  description: "",
  categoryId: 3,
  priceType: "fixed",
  priceRupees: 55000,
  condition: "good",
  cityId: 4,
  locality: "",
  pincode: "",
  attributes: { km: 9000 },
  photos: [],
  acceptTerms: true,
};

const errors = (input: ListingInput) => {
  const r = listingSchema.safeParse(input);
  return r.success ? {} : z.flattenError(r.error).fieldErrors;
};

describe("listingSchema", () => {
  it("accepts a valid ad and trims the title", () => {
    expect(listingSchema.parse(valid).title).toBe("Honda Activa 6G 2022");
  });

  it("needs a price unless the ad is free or swap", () => {
    expect(errors({ ...valid, priceRupees: null })).toHaveProperty("priceRupees");
    expect(errors({ ...valid, priceType: "free", priceRupees: null })).toEqual({});
    expect(errors({ ...valid, priceType: "swap", priceRupees: null })).toEqual({});
  });

  it("checks title length, PIN code and category", () => {
    expect(errors({ ...valid, title: "Bike" })).toHaveProperty("title");
    expect(errors({ ...valid, pincode: "012345" })).toHaveProperty("pincode");
    expect(errors({ ...valid, pincode: "500001" })).toEqual({});
    expect(errors({ ...valid, categoryId: 0 })).toHaveProperty("categoryId");
  });

  it("allows at most 12 photos", () => {
    const photo = { path: "u/a.webp", thumbPath: "u/a_t.webp", width: 1600, height: 1200 };
    expect(errors({ ...valid, photos: Array(12).fill(photo) })).toEqual({});
    expect(errors({ ...valid, photos: Array(13).fill(photo) })).toHaveProperty("photos");
  });
});

describe("listingStrength", () => {
  it("starts at 20 with the photo tip", () => {
    expect(listingStrength({ title: "", description: "", photos: 0, priceSet: false, placeSet: false })).toEqual({
      percent: 20,
      tip: "Add at least 3 photos. Ads with photos get more chats.",
    });
  });

  it("reaches 100 with no tip when every check passes", () => {
    const full = { title: "Honda Activa 6G 2022, 9,000 km", description: "x".repeat(80), photos: 3, priceSet: true, placeSet: true };
    expect(listingStrength(full)).toEqual({ percent: 100, tip: null });
  });
});
