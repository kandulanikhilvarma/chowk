import type { ReactNode } from "react";

const tones = {
  neutral: "bg-surface-2 text-ink-2",
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent text-on-accent",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
};

export function Badge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: keyof typeof tones;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}
