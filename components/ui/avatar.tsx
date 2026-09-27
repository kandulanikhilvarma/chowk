"use client";

import { useState } from "react";

// profiles.avatar_url is writable by its owner, so only Google profile photos render; the CSP allows
// nothing else anyway. Anything else, or a photo that fails to load, falls back to the initial.
const ALLOWED = /^https:\/\/lh3\.googleusercontent\.com\//;

const sizes = {
  md: "size-12 text-xl",
  lg: "size-16 text-3xl",
};

export function Avatar({ name, src, size = "md" }: { name: string; src?: string | null; size?: keyof typeof sizes }) {
  const [failed, setFailed] = useState(false);
  const photo = src && ALLOWED.test(src) && !failed;

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft font-display font-bold text-primary ${sizes[size]}`}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- a 96 px remote avatar needs no optimisation
        <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        (name.trim().charAt(0) || "C").toUpperCase()
      )}
    </span>
  );
}
