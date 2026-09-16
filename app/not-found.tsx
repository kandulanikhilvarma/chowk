import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <EmptyState icon={SearchX} title="Page not found" action={<ButtonLink href="/s">Search ads</ButtonLink>}>
      The ad may be sold, removed or expired. Search for something similar.
    </EmptyState>
  );
}
