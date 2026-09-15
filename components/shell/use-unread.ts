"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type Counts = { chats: number; notifications: number };
const NONE: Counts = { chats: 0, notifications: 0 };

// ponytail: refetched on each navigation, no live push. Subscribe to notifications with Realtime if badges feel slow.
export function useUnread(): Counts {
  const path = usePathname();
  const [counts, setCounts] = useState<Counts>(NONE);

  useEffect(() => {
    let current = true;
    const supabase = createClient();
    supabase.auth.getClaims().then(async ({ data }) => {
      if (!data?.claims) {
        if (current) setCounts(NONE);
        return;
      }
      const { data: next, error } = await supabase.rpc("unread_counts");
      if (error) console.error("unread_counts failed", error);
      if (current && next) setCounts(next as Counts);
    });
    return () => {
      current = false;
    };
  }, [path]);

  return counts;
}
