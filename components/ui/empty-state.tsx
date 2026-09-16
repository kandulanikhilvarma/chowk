import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  heading: Heading = "h2",
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  // h1 when the empty state is the whole page (404, error).
  heading?: "h1" | "h2";
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
        <Icon className="size-7" aria-hidden />
      </span>
      <Heading className="text-xl font-bold text-ink">{title}</Heading>
      {children && <p className="mt-2 text-ink-2">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
