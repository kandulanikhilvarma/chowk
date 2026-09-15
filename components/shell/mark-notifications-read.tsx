"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";

// Opening the page counts as reading. New rows stay bold until the next visit, so people see what was new.
export function MarkNotificationsRead() {
  useEffect(() => {
    createClient()
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null)
      .then(({ error }) => {
        if (error) console.error("mark notifications read failed", error);
      });
  }, []);
  return null;
}
