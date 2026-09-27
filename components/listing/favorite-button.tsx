"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { setFavorite } from "@/app/me/actions";
import { buttonClass } from "@/components/ui/button";
import { requireAccount } from "@/lib/require-account";
import { createClient } from "@/lib/supabase/browser";

// The ad page is cached for everyone, so it cannot know whether this visitor saved the ad.
// A signed-in visitor asks once after load (RLS returns only their own rows); guests skip the call.
export function FavoriteButton({ listingId, initialSaved = false }: { listingId: string; initialSaved?: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [shown, setShown] = useOptimistic(saved);
  const [pops, setPops] = useState(0);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (initialSaved) return;
    let live = true;
    (async () => {
      const supabase = createClient();
      const claims = (await supabase.auth.getClaims()).data?.claims;
      if (!claims || claims.is_anonymous) return;
      const { data } = await supabase.from("favorites").select("listing_id").eq("listing_id", listingId).maybeSingle();
      if (live && data) setSaved(true);
    })();
    return () => {
      live = false;
    };
  }, [listingId, initialSaved]);

  // Not disabled while saving: the heart already shows the new state, and a dimmed button would read as failure.
  const toggle = () =>
    !pending &&
    startTransition(async () => {
      setError("");
      if (!(await requireAccount(router))) return;
      const next = !saved;
      setShown(next);
      if (next) setPops((n) => n + 1);
      const result = await setFavorite(listingId, next);
      if (result.error) return setError(result.error);
      setSaved(next);
    });

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={shown}
        className={buttonClass({ variant: "secondary", className: "w-full" })}
      >
        <Heart
          key={pops}
          className={`size-5 ${shown ? "fill-current text-danger" : ""} ${pops > 0 && shown ? "pop" : ""}`}
          aria-hidden
        />
        {shown ? (initialSaved ? "Remove from watchlist" : "Saved to watchlist") : "Save to watchlist"}
      </button>
      {pending && <span className="sr-only">Saving</span>}
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
