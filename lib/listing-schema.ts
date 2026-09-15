import { z } from "zod";

export const MAX_PHOTOS = 12;

// One schema for the post form (checks before any upload) and the server action (the check that counts).
// Limits match the table checks in supabase/migrations/20260914210347_core_schema.sql.
export const listingSchema = z
  .object({
    kind: z.enum(["offer", "wanted"]),
    title: z
      .string()
      .trim()
      .min(5, "Write a title of at least 5 characters.")
      .max(90, "Keep the title under 90 characters."),
    description: z.string().trim().max(4000, "Keep the description under 4,000 characters."),
    categoryId: z.number().int().positive("Choose a category."),
    priceType: z.enum(["fixed", "negotiable", "free", "swap"]),
    priceRupees: z.number("Enter the price in rupees.").int().min(0).max(1_000_000_000).nullable(),
    condition: z.enum(["new", "like_new", "good", "fair", "for_parts"]).nullable(),
    cityId: z.number().int().positive("Choose a city."),
    locality: z.string().trim().max(60, "Keep the area name under 60 characters."),
    pincode: z.string().trim().regex(/^([1-9][0-9]{5})?$/, "A PIN code has 6 digits."),
    attributes: z.record(z.string().max(40), z.union([z.string().trim().max(60), z.number(), z.boolean()])),
    photos: z
      .array(
        z.object({
          path: z.string().min(1),
          thumbPath: z.string().min(1),
          width: z.number().int().min(1).max(4000),
          height: z.number().int().min(1).max(4000),
        }),
      )
      .max(MAX_PHOTOS, `Add up to ${MAX_PHOTOS} photos.`),
    acceptTerms: z.boolean(),
  })
  .refine((l) => l.priceType === "free" || l.priceType === "swap" || l.priceRupees !== null, {
    path: ["priceRupees"],
    message: "Enter a price, or choose Free or Swap.",
  });

export type ListingInput = z.input<typeof listingSchema>;

export type StrengthDraft = {
  title: string;
  description: string;
  photos: number;
  priceSet: boolean;
  placeSet: boolean;
};

// Starts at 20 so the meter never reads as empty (endowed progress). One tip at a time.
export function listingStrength(d: StrengthDraft) {
  const checks = [
    { ok: d.photos >= 3, tip: "Add at least 3 photos. Ads with photos get more chats." },
    { ok: d.title.trim().length >= 20, tip: "Put the brand, model or size in the title." },
    { ok: d.description.trim().length >= 80, tip: "Describe the condition and why you sell it." },
    { ok: d.priceSet, tip: "Set a price, or choose Free or Swap." },
    { ok: d.placeSet, tip: "Choose a category and a city." },
  ];
  const done = checks.filter((c) => c.ok).length;
  return { percent: 20 + done * 16, tip: checks.find((c) => !c.ok)?.tip ?? null };
}
