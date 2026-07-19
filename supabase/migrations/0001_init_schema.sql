-- Phase 1 spine: one `audits` row per audit run, `recommendations` hang off it by
-- audit_id. Everything in later phases (estimate edits, proposals, build specs,
-- payments) attaches to audit_id, so this table shape must not need reworking later.
-- See docs/phase1-build-spec.md section 2 for the source spec.

create extension if not exists "pgcrypto";

create table if not exists audits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- status is a plain CHECK constraint, not a native enum, so adding a new status
  -- later (e.g. a Phase 2 state) is a one-line ALTER, not an enum-type migration.
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),

  business_name text,
  trade text,
  location text,
  rough_size text,
  website_url text,

  contact_name text,
  contact_email text,
  contact_phone text,

  research_summary jsonb,
  confirmed_pains jsonb,
  report_markdown text,

  -- Provisional totals only. The authoritative per-recommendation numbers live in
  -- `recommendations`; these are the computed roll-up the client/founder see.
  estimate_total_gbp numeric,
  estimate_monthly_running_cost_gbp numeric,

  pdf_url text,
  discovery_call_booked boolean not null default false
);

create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  created_at timestamptz not null default now(),

  title text not null,
  problem text,
  fix text,
  proof text,
  benefit_text text,

  -- Internal working, never shown to the client (see phase1-build-spec.md section 5/6).
  tasks jsonb,
  blended_hours numeric not null,
  confidence text not null
    check (confidence in ('high', 'medium', 'low')),

  -- Server-computed money fields (see lib/estimate/estimate-maths.ts). The AI never
  -- writes these directly — it supplies blended_hours/confidence, the estimate-maths
  -- module computes price_gbp etc.
  price_gbp numeric,
  price_range_low_gbp numeric,
  price_range_high_gbp numeric,

  running_cost_gbp_month numeric,
  running_cost_note text,

  shared_core_components jsonb,
  shared_setup_hours numeric,

  is_ticked boolean not null default false
);

create index if not exists recommendations_audit_id_idx on recommendations(audit_id);

-- No client ever talks to Supabase directly in Phase 1 — all reads/writes go through
-- Next.js server code using the service-role key (see phase1-build-spec.md: "money
-- maths and state transitions live in server code, never the AI/client"). RLS is
-- enabled with zero policies as defense in depth: the anon/public key can't read or
-- write this data even if it ever leaks into client code by mistake. The service-role
-- key bypasses RLS entirely, which is how the server functions will read/write.
alter table audits enable row level security;
alter table recommendations enable row level security;
