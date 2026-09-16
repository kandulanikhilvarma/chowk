import type { ReactNode } from "react";

export const GRIEVANCE = { name: "Nikhilvarma Kandula", email: "kandulanikhilvarma@gmail.com" };

// Long-form text pages (terms, privacy, grievance, safety, help). Styles plain child elements so pages stay plain JSX.
export function Doc({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl space-y-4 px-4 pt-6 md:pt-10 [&_a]:text-primary [&_a]:underline [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-bold [&_li]:text-ink [&_p]:text-ink [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{title}</h1>
        {updated && <p className="text-sm text-ink-2">Last updated {updated}</p>}
      </header>
      {children}
    </article>
  );
}
