import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/me/settings-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage() {
  const supabase = await createClient();
  const uid = (await supabase.auth.getClaims()).data?.claims.sub;
  if (!uid) redirect("/login?next=/me/settings");

  const [profile, secret] = await Promise.all([
    supabase.from("profiles").select("display_name, is_business").eq("id", uid).single(),
    supabase.from("profile_private").select("upi_id").eq("id", uid).maybeSingle(),
  ]);
  if (profile.error) throw new Error(`profile read failed: ${profile.error.message}`);
  if (secret.error) throw new Error(`profile_private read failed: ${secret.error.message}`);

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 pt-6 md:pt-10">
      <h1 className="text-3xl font-bold">Settings</h1>
      <SettingsForm
        initial={{ displayName: profile.data.display_name, isBusiness: profile.data.is_business, upiId: secret.data?.upi_id ?? "" }}
      />
    </div>
  );
}
