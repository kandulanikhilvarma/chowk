"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, Plus, Search, User } from "lucide-react";
import { CountBadge } from "./header-links";
import { useUnread } from "./use-unread";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/s", label: "Search", icon: Search },
  { href: "/post", label: "Sell", icon: Plus, raised: true },
  { href: "/messages", label: "Chats", icon: MessageCircle },
  { href: "/me", label: "My Chowk", icon: User },
];

// Mobile only. Sell sits in the center because it is the action we want to be easiest.
export function BottomNav() {
  const path = usePathname();
  const { chats } = useUnread();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {items.map(({ href, label, icon: Icon, raised }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`pressable flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? "text-primary" : "text-ink-2"}`}
              >
                {raised ? (
                  <span className="-mt-6 grid size-12 place-items-center rounded-full bg-accent text-on-accent shadow-card ring-4 ring-surface">
                    <Icon className="size-6" strokeWidth={2.5} aria-hidden />
                  </span>
                ) : (
                  <span className="relative">
                    <Icon className="size-6" strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                    {href === "/messages" && <CountBadge count={chats} />}
                  </span>
                )}
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
