"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

// Next 16 passes retry (not reset) to error boundaries.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState icon={TriangleAlert} title="Something went wrong" action={<Button onClick={() => retry()}>Try again</Button>}>
      Check your connection, then try again.
    </EmptyState>
  );
}
