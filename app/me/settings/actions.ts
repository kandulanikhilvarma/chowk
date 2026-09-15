"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  displayName: z.string().trim().min(1, "Enter a name.").max(40, "Use 40 characters or fewer."),
  isBusiness: z.boolean(),
  // Same rule as the profile_private check constraint. Empty removes the UPI ID.
  upiId: z
    .string()
    .trim()
    .regex(/^([a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,64})?$/, "Enter a UPI ID like name@okbank."),
});

export type SettingsInput = z.input<typeof schema>;
export type SettingsResult = { error?: string; notice?: string; fields?: Record<string, string[] | undefined> };

const FAILED = { error: "Your settings were not saved. Try again." };

export async function saveSettings(input: unknown): Promise<SettingsResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Check the marked fields.", fields: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const uid = (await supabase.auth.getClaims()).data?.claims.sub;
  if (!uid) return { error: "Your session ended. Sign in again." };
  const { displayName, isBusiness, upiId } = parsed.data;

  const profile = await supabase.from("profiles").update({ display_name: displayName, is_business: isBusiness }).eq("id", uid);
  if (profile.error) {
    console.error("profile update failed", profile.error);
    return FAILED;
  }

  const existing = await supabase.from("profile_private").select("id").eq("id", uid).maybeSingle();
  if (existing.error) {
    console.error("profile_private read failed", existing.error);
    return FAILED;
  }
  const upi_id = upiId || null;
  const secret = existing.data
    ? await supabase.from("profile_private").update({ upi_id }).eq("id", uid)
    : await supabase.from("profile_private").insert({ upi_id });
  if (secret.error) {
    console.error("profile_private write failed", secret.error);
    return FAILED;
  }

  revalidatePath("/me");
  revalidatePath(`/u/${uid}`);
  return { notice: "Saved." };
}
