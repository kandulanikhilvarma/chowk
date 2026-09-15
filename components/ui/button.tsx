import Link from "next/link";
import type { ComponentProps } from "react";

const variants = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  accent: "bg-accent text-on-accent hover:shadow-card",
  secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
  ghost: "text-ink hover:bg-surface-2",
};

const sizes = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-6 text-base",
};

type Style = { variant?: keyof typeof variants; size?: keyof typeof sizes; className?: string };

export function buttonClass({ variant = "primary", size = "md", className = "" }: Style = {}) {
  return `pressable inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`;
}

export function Button({ variant, size, className, type = "button", ...props }: Style & ComponentProps<"button">) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: Style & ComponentProps<typeof Link>) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}
