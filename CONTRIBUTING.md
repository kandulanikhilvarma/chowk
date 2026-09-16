# Contributing to Chowk

Thank you for helping. These rules keep Chowk simple, safe and free.

## Before you start

- Open an issue first for a new feature, so that we can agree on it before you write code.
- Small fixes (a typo, a broken link, a failing test) can go straight to a pull request.
- Chowk stays free. Pull requests that add fees, paid boosts or escrow are closed.

## Set up

Follow **Run it yourself** in the [README](README.md). Use your own Supabase project, never the production one.

## Make a change

1. Create a branch from `main`.
2. Keep the change small. One pull request does one thing.
3. Read the guide in `node_modules/next/dist/docs/` before you change routing, caching or data loading. Next.js 16 differs from older versions.
4. Put every database change in a new file in `supabase/migrations`. Never edit an old migration.
5. Every new table gets row level security, and clients get only the column grants they need.
6. Validate every server action input with Zod.

## Check your work

```bash
npm run check
```

```bash
npx playwright test
```

If you change the database, also run `supabase/tests/rls.sql` and add a check for the new rule.

## Style

- Text in the app and in the docs uses short sentences in simple English (ASD-STE100 style) and active voice.
- Do not use em dashes or en dashes.
- Commit messages use the Conventional Commits form, for example `fix: keep chat messages after a reconnect`. The subject is 60 characters or fewer. The body says why.
- Match the code around your change. Add a comment only when it tells the reader something that the code does not.

## Pull requests

- Describe what changes and how you tested it.
- Add screenshots at phone width for changes to the interface.
- A pull request merges after the checks pass and a maintainer approves it.
