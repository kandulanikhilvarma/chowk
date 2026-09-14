import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" aria-label="Chowk home" className="shrink-0 rounded-field">
          <Logo />
        </Link>

        <form action="/s" role="search" className="ml-4 hidden max-w-xl flex-1 md:block">
          <label className="relative block">
            <span className="sr-only">Search Chowk</span>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-ink-2" />
            <input
              name="q"
              type="search"
              placeholder="Search phones, bikes, sofas and books"
              className="h-11 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-[15px] text-ink placeholder:text-ink-2"
            />
          </label>
        </form>

        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/s"
            aria-label="Search"
            className="pressable grid size-11 place-items-center rounded-full text-ink hover:bg-surface-2 md:hidden"
          >
            <Search className="size-5" aria-hidden />
          </Link>
          <ThemeToggle />
          <ButtonLink href="/post" variant="accent" className="ml-2 hidden md:inline-flex">
            Post an ad
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
