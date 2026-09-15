"use client";

import Link from "next/link";
import { Bell, MessageCircle } from "lucide-react";
import { useUnread } from "./use-unread";

export function CountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="absolute -top-1 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold text-on-primary">
      {count > 99 ? "99+" : count}
    </span>
  );
}

const iconLink = "pressable relative size-11 place-items-center rounded-full text-ink hover:bg-surface-2";

export function HeaderLinks() {
  const { chats, notifications } = useUnread();
  return (
    <>
      <Link href="/messages" aria-label={chats ? `Chats, ${chats} unread` : "Chats"} className={`${iconLink} hidden md:grid`}>
        <span className="relative">
          <MessageCircle className="size-5" aria-hidden />
          <CountBadge count={chats} />
        </span>
      </Link>
      <Link
        href="/notifications"
        aria-label={notifications ? `Notifications, ${notifications} new` : "Notifications"}
        className={`${iconLink} grid`}
      >
        <span className="relative">
          <Bell className="size-5" aria-hidden />
          <CountBadge count={notifications} />
        </span>
      </Link>
    </>
  );
}
