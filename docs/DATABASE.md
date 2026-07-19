# Database — process

Supabase (PostgreSQL). Full schema snapshot: `supabase/schema.sql`. Migration
history: `supabase/migrations/`.

## Applying a migration

**No CLI login, no database password, ever.** This matches how Rainbow Ops
(`C:\Users\User\Documents\MEGA\Rainbow\Rainbow`, see its `docs/DATABASE.md`)
does it:

1. Write the SQL in a new file: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Run it in the Supabase Dashboard → SQL Editor
3. Update `supabase/schema.sql` to reflect the new current state
4. Commit both files together

Never modify live data directly outside a migration file — changes must be tracked.

## Access model

No client ever talks to Supabase directly in Phase 1. All reads/writes go
through Next.js server code using the secret key (`SUPABASE_SECRET_KEY`).
Row Level Security is enabled on every table with zero public policies —
defense in depth, so the publishable/anon key can't read or write this data
even if it ever leaks into client code by mistake.
