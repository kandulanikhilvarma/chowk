import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <EmptyState heading="h1" icon={SearchX} title="Page not found" action={<ButtonLink href="/s">Search ads</ButtonLink>}>
      The ad is sold, removed or expired, or the link is wrong. Search for something similar.
    </EmptyState>
  );
}
