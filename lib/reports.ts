import type { Enums } from "@/lib/database.types";

export const reportReasons: Record<Enums<"report_reason">, string> = {
  scam: "Scam or fraud",
  prohibited: "Item not allowed",
  wrong_category: "Wrong category",
  duplicate: "Posted many times",
  offensive: "Offensive",
  other: "Something else",
};
