import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountActions } from "@/components/me/account-actions";
import { SettingsForm } from "@/components/me/settings-form";
import { BlockButton } from "@/components/safety/block-button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage() {
  const supabase = await createClient();
  const uid = (await supabase.auth.getClaims()).data?.claims.sub;
  if (!uid) redirect("/login?next=/me/settings");

  const [profile, secret, blocks] = await Promise.all([
    supabase.from("profiles").select("display_name, is_business").eq("id", uid).single(),
    supabase.from("profile_private").select("upi_id").eq("id", uid).maybeSingle(),
    supabase
      .from("blocks")
      .select("blocked_id, blocked:profiles!blocks_blocked_id_fkey(display_name)")
      .order("created_at", { ascending: false }),
  ]);
  if (profile.error) throw new Error(`profile read failed: ${profile.error.message}`);
  if (secret.error) throw new Error(`profile_private read failed: ${secret.error.message}`);
  if (blocks.error) throw new Error(`blocks read failed: ${blocks.error.message}`);

  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 pt-6 md:pt-10">
      <h1 className="text-3xl font-bold">Settings</h1>
      <SettingsForm
        initial={{ displayName: profile.data.display_name, isBusiness: profile.data.is_business, upiId: secret.data?.upi_id ?? "" }}
      />

      <section aria-labelledby="blocked" className="space-y-3">
        <h2 id="blocked" className="text-xl font-bold">
          Blocked people
        </h2>
        {blocks.data.length ? (
          <ul className="divide-y divide-line rounded-card bg-surface ring-1 ring-line">
            {blocks.data.map((b) => (
              <li key={b.blocked_id} className="flex items-center justify-between gap-3 p-3">
                <span className="truncate">{b.blocked?.display_name ?? "Chowk member"}</span>
                <BlockButton userId={b.blocked_id} name={b.blocked?.display_name ?? "this person"} blocked />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-2">You have not blocked anyone.</p>
        )}
      </section>

      <AccountActions uid={uid} />
    </div>
  );
}
