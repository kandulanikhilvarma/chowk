"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// moderate_report checks is_admin() in the database, so a direct POST from a non-admin fails there.
export async function moderate(reportId: number, remove: boolean): Promise<{ error?: string }> {
  if (!Number.isSafeInteger(reportId) || reportId <= 0 || typeof remove !== "boolean") return { error: "Report not found." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_report", { p_report: reportId, p_remove: remove });
  if (error) {
    if (error.code === "42501") return { error: "Only admins can do this." };
    if (error.code === "P0002") return { error: "Report not found." };
    console.error("moderate_report failed", error);
    return { error: "That did not work. Try again." };
  }

  revalidatePath("/admin/reports");
  revalidatePath("/");
  return {};
}
