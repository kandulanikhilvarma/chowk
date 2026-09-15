"use client";

import { Heart } from "lucide-react";
import { useState, useTransition } from "react";
import { setFavorite } from "@/app/me/actions";
import { buttonClass } from "@/components/ui/button";
import { ensureSession } from "@/lib/ensure-session";

// ponytail: the ad page is cached for everyone, so the button does not know if this visitor saved it.
// A second save is harmless (the action treats a duplicate as success). Read the state per user if that confuses people.
export function FavoriteButton({ listingId, initialSaved = false }: { listingId: string; initialSaved?: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      setError("");
      if (!(await ensureSession())) return setError("Sign-in is not available now. Try again later.");
      const result = await setFavorite(listingId, !saved);
      if (result.error) return setError(result.error);
      setSaved(!saved);
    });

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={saved}
        className={buttonClass({ variant: "secondary", className: "w-full" })}
      >
        <Heart className={`size-5 ${saved ? "fill-current text-danger" : ""}`} aria-hidden />
        {saved ? (initialSaved ? "Remove from watchlist" : "Saved to watchlist") : "Save to watchlist"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
