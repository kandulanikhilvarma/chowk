import Link from "next/link";
import { InstallButton } from "./install-button";

const links = [
  { href: "/safety", label: "Safety" },
  { href: "/help", label: "Help" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/grievance", label: "Grievance officer" },
];

// Extra bottom padding on mobile keeps the links above the fixed bottom navigation.
export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 pt-6 pb-24 text-sm text-ink-2 md:pb-6">
        <span>Chowk. Free for everyone.</span>
        <nav aria-label="Help and legal">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-ink hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* In the root layout, so it is mounted before the browser sends its one install event. */}
        <InstallButton className="md:ml-auto" />
      </div>
    </footer>
  );
}
