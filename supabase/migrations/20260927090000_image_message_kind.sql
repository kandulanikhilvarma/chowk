-- Photos in chat. On its own because a new enum value cannot be used in the transaction that adds it,
-- and the next migration's policies refer to it.
alter type public.message_kind add value if not exists 'image';
