# Supabase advisors

Last run: 15 September 2026, after migration `20260915120049`.

## Security: 0 errors, 14 warnings (all accepted)

| Lint | Function | Why it stays |
|---|---|---|
| Anon can run SECURITY DEFINER | `profile_public_stats` | Returns aggregates only (deal count, distinct raters, reply rate). It never returns rows, names of raters or messages. Public profiles need it. |
| Signed-in users can run SECURITY DEFINER | `bump_listing`, `renew_listing`, `mark_sold` | Each one checks `user_id = auth.uid()` on the listing. They change columns that clients cannot write directly (`bumped_at`, `expires_at`, `status` with a deal). |
| | `respond_offer`, `mark_read`, `mark_met`, `confirm_deal`, `submit_review` | Each one checks that the caller is the buyer or the seller of the chat or deal. Each sets only the caller's own flag. |
| | `handoff_upi` | Returns the seller's UPI ID only to the buyer, and only after both people mark "met in person". |
| | `delete_account` | Deletes only the caller's own auth user. Rows cascade. |
| | `is_blocked_between` | Used by the message insert policy. Since `20260915120049` it answers only when the caller is one of the two people. |
| | `profile_public_stats` | Same as above. |
| Leaked password protection disabled | Auth | Chowk has no password sign-in. Guests use anonymous sign-in and accounts use Google. |

All SECURITY DEFINER functions set `search_path = ''`. Trigger functions have EXECUTE revoked from `public`, `anon` and `authenticated`.

## Performance: 0 errors, 0 warnings

13 INFO "unused index" findings. The database is new and has no traffic yet. Search, feed, radius and chat queries use these indexes. Check again after launch.

## RLS checks

`supabase/tests/rls.sql` runs 33 checks inside one rolled-back block: self-promotion to admin, protected columns, forged notifications and system messages, reading or writing other people's chats, offers, the UPI handoff, deals, reviews, blocks, storage folders, anonymous access, and keyword, radius and category search. Result on the last run: `RLS OK: 33 checks passed`.
