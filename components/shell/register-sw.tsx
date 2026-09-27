"use client";

import { useEffect } from "react";

// Registers the worker that makes Chowk installable, gives it an offline page and receives push.
// ponytail: no update prompt. skipWaiting in sw.js means the next page load runs the new worker.
export function RegisterServiceWorker() {
  useEffect(() => {
    // Dev only: Turbopack reuses asset URLs, so the cache-first rule in sw.js would keep
    // serving yesterday's CSS. Production filenames are content-hashed, so caching is safe.
    if (process.env.NODE_ENV === "development") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    // Registering competes with the first paint for bandwidth, so it waits for load.
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
