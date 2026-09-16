# Supabase advisors and reviews

Last run: 16 September 2026, after migration `20260916083639`.

## Security advisor: 0 errors, warnings all accepted

| Lint | Function | Why it stays |
|---|---|---|
| Anon can run SECURITY DEFINER | `profile_public_stats` | Returns aggregates only (deal count, distinct raters, reply rate). It never returns rows, names of raters or messages. Public profiles need it. |
| Signed-in users can run SECURITY DEFINER | `bump_listing`, `renew_listing`, `mark_sold` | Each one checks `user_id = auth.uid()` on the listing. They change columns that clients cannot write directly (`bumped_at`, `expires_at`, `status` with a deal). |
| | `respond_offer`, `mark_read`, `mark_met`, `confirm_deal`, `submit_review` | Each one checks that the caller is the buyer or the seller of the chat or deal. Each sets only the caller's own flag. |
| | `handoff_upi` | Returns the seller's UPI ID only to the buyer, and only after both people mark "met in person". |
| | `delete_account` | Deletes only the caller's own auth user. Rows cascade. |
| | `is_blocked_between` | Used by the message insert policy. Since `20260915120049` it answers only when the caller is one of the two people. |
| | `profile_public_stats` | Same as above. |
| Anon and signed-in users can run SECURITY DEFINER | `is_admin` | Returns only whether the caller is an admin. It runs as definer because clients cannot read `profiles.role` since `20260916083639`. `listings_read` calls it for anon visitors, so anon keeps EXECUTE. |
| Signed-in users can run SECURITY DEFINER | `moderate_report` | Raises 42501 unless `is_admin()` is true. |
| Anonymous access policies | Tables used by guest accounts | Guest accounts are signed-in users with `is_anonymous`. Every policy still limits rows to `auth.uid()`. Guest reports and ratings do not count toward hides and badges. |
| Leaked password protection disabled | Auth | Chowk has no password sign-in. Guests use anonymous sign-in and accounts use Google. |

All SECURITY DEFINER functions set `search_path = ''`. Trigger functions have EXECUTE revoked from `public`, `anon` and `authenticated`.

## Performance advisor: 0 errors, 0 warnings

13 INFO "unused index" findings. The database is new and has no traffic yet. Search, feed, radius and chat queries use these indexes. Check again after launch.

## Reviewer findings (Phase 2)

| Finding | Result |
|---|---|
| Three free guest accounts could report a listing and hide it | Fixed in `20260915125015`. Guest reports are stored but do not count toward the hide at 3. |
| `respond_offer` had no row lock, so a double tap could answer twice | Fixed in `20260915125212` with `for update`. |
| Parallel requests could pass the 10 ads or 20 chats per day limit | Fixed in `20260915125212` with a per-user transaction lock. |
| Photos of hidden or removed listings stay readable | Not a defect. The `listing_images` policy reads `listings` through its own RLS, so hidden listings hide their photos. `rls.sql` proves it. |
| Deleted listings leave files in the public bucket | Accepted with a plan. Supabase blocks deleting `storage.objects` rows from SQL. The app removes files through the Storage API before it deletes a listing or an account (Phases 4 and 6). |
| Deleting an account removes the ratings that person gave | Accepted for release 1. It matches the DPDP "delete my data" promise, and the person gives up their own account to do it. Revisit if abuse appears. |
| A person with three real Google accounts can still hide a listing | Accepted. Hidden listings go to the admin report queue (Phase 6), and the owner still sees the listing. |

## RLS checks

`supabase/tests/rls.sql` runs 40 checks inside one rolled-back block: self-promotion to admin, protected columns, forged notifications and system messages, reading or writing other people's chats, offers answered once, the UPI handoff, deals, reviews, blocks and block privacy, guest reports, moderation by non-admins, reading `profiles.role`, admin dismiss, photos of removed listings, storage folders, anonymous access, and keyword, radius and category search. Result on the last run: `RLS OK: 40 checks passed`.
