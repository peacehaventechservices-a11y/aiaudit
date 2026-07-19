# START HERE

This is the project folder for the **AI Opportunity Audit → Build Pipeline**.
Open this folder in Claude Code and read this file first.

## What this project is (one line)
A self-serve AI audit that studies a small business, finds where AI genuinely helps,
gives a provisional **estimate to build it**, and feeds a staged pipeline (discovery
call → finalised estimate → proposal → build spec → build → staged payments).

## The documents (all in /docs)
- **full-project-spec.md** — the master blueprint. The whole vision, all phases,
  architecture, data model, build sequence. Read this for the big picture.
- **phase1-build-spec.md** — the detailed spec for Phase 1 (the part we build
  first). Read this to build.
- **ai-opportunity-audit/** — the AI skill that drives the audit conversation
  (already built and heavily tested). `SKILL.md` is the main file; `references/`
  holds the supporting detail (quoting maths, research guide, opportunity lenses,
  question bank). NOTE: ignore `references/interview-bank.md` — it's a dead stub;
  the live file is `references/question-bank.md`.

## The build stack (decided)
Vercel (Next.js app + serverless) · Supabase (Postgres, auth, storage) ·
Claude API, Opus for the audit brain · Bright Data (research) · Stripe (payments,
Phase 3) · an email service (e.g. Resend) · a scheduling link for discovery calls.

## Rules that must never be broken
1. The word is **"estimate"**, never "quote". Everywhere.
2. **Money maths and state transitions live in server code, never the AI.** The AI
   produces hours + structured data + document drafts only.
3. Pricing constants: **£60/hour, +15% contingency, +25% overhead, £750 minimum.**
4. Recommendations must be **buildable, additive, and proven** (see the skill).
   We build solutions — we never resell third-party subscriptions.
5. Ship each phase so it earns before building the next. Don't build it all first.

## What to do first (Phase 1, in order)
1. Build the **Supabase spine**: the `audits` and `recommendations` tables from
   the data model in the specs. Everything hangs off `audit_id`.
2. Build the **estimate-maths module** with unit tests (the £60/+15%/+25%/£750 +
   bundle de-duplication logic). This is the single source of truth for pricing.
3. Then the audit front end (chat → research → recognition → lean report →
   estimate → PDF to client + lead to founder → book discovery call).

## Suggested opening instruction for Claude Code
> "Read docs/full-project-spec.md and docs/phase1-build-spec.md. We're building
> Phase 1. Start with the Supabase schema and the estimate-maths module with unit
> tests, then the audit front end. Follow the rules in START-HERE.md."

## Still to decide (doesn't block starting)
Branding; testimonials (none yet); whether to soften the word "AI" in customer copy;
exact deposit % and payment-stage split; e-sign and email providers. These are
noted in the master spec's "deferred" section.
