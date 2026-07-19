# Master Project Spec — AI Opportunity Audit → Build Pipeline

**One-line vision:** A self-serve AI audit that studies a small business, finds
where AI genuinely helps, gives a provisional **estimate to build it**, and feeds a
staged pipeline (discovery call → finalised estimate → proposal → build spec →
build → staged payments) — most of it automated, with the founder approving the
money-critical steps and Claude doing the builds.

**Founder:** non-technical; Claude builds. **Rule everywhere:** the word is
**"estimate"**, never "quote".

---

## 0. Positioning (why this wins)

Three competitor groups exist; none at our intersection:
- **AI-readiness quizzes** (41 Labs, Hello Alice): automated but shallow, sell you
  third-party tools, stop at a report.
- **AI automation agencies** (BetterClaw, MannVenture): deep and they build — but
  human-delivered, slow, $3k–$15k, aimed at bigger firms.
- **Point tools** (Merchynt, QuoteIQ): narrow, one thing only.

**We are the automated version of an automation agency:** deep, per-business,
reviews-reading audit like the agencies do by hand — instant and scalable — ending
in an estimate to *build it for you*, into a productised pipeline. Position one-
liner: *"Not another AI quiz. We look at your actual business, find where AI
genuinely helps, and build it for you — priced up front."*

Non-negotiable positioning: never feel like a quiz; lead on "we build it, not sell
you tools"; feature the instant estimate-to-build.

---

## 1. The whole pipeline, end to end

```
                          ┌─────────────── automated ───────────────┐
Visitor → AUDIT (chat, research, recognition) → ESTIMATE (provisional)
        → book DISCOVERY CALL → [founder finalises estimate]
        → client APPROVES estimate → PROPOSAL generated → client APPROVES
        → BUILD SPEC generated → client APPROVES → [founder hands spec to Claude]
        → BUILD → staged PAYMENTS + SERVICE AGREEMENT throughout → DELIVERY
```

Four stages map to build phases:
1. **Audit → provisional estimate → lead** (self-serve front end).
2. **Deal desk** — founder finalises estimate; client approval chain: estimate →
   proposal → build spec.
3. **Money & contracts** — service agreement/e-sign, deposit, staged payments.
4. **Build & delivery** — the approved spec becomes the thing Claude builds.

**Design principle:** everything hangs off one `audit` record (`audit_id`). Build
that spine first; every later document and payment attaches to it.

---

## 2. Architecture

- **Vercel** — hosts the web app (Next.js) + serverless/edge functions.
- **Supabase** — Postgres database, auth (founder + client logins in Phase 2),
  file storage (PDFs).
- **Claude API** — Opus for the audit brain (research reasoning, recognition,
  report), and for generating proposal/spec drafts in later phases. Cheaper models
  for mechanical text.
- **Bright Data** — research (Google profile, reviews, niche evidence).
- **Stripe** — deposits and staged payments (Phase 3).
- **E-signature** — service agreements (Phase 3; e.g. an e-sign API).
- **Email** (e.g. Resend) — estimate PDF to client, lead to founder, approval
  notifications.
- **Scheduling** (Cal.com/Calendly) — discovery-call booking.

**Golden architecture rule:** the AI produces hours + structured data + document
*drafts*. All money maths and all state transitions live in **server code**, never
the AI. This keeps pricing correct and the pipeline auditable.

---

## 3. Data model (the spine)

Built in Phase 1, extended each phase. Core tables:

**`audits`** — one per run.
id, created_at, status (`in_progress`/`completed`/`abandoned`), business_name,
trade, location, rough_size, website_url, contact_name, contact_email,
contact_phone, research_summary (jsonb), confirmed_pains (jsonb), report_markdown,
estimate_total_gbp (provisional), estimate_monthly_running_cost_gbp, pdf_url,
discovery_call_booked (bool).

**`recommendations`** — one per recommendation.
id, audit_id, title, problem, fix, proof, benefit_text, tasks (jsonb o/l/p),
blended_hours, confidence, price_gbp, price_range_low/high_gbp,
running_cost_gbp_month, running_cost_note, shared_core_components (jsonb),
shared_setup_hours, is_ticked.

**Added in Phase 2:**
**`deals`** — audit_id, stage (`estimate`/`proposal`/`spec`/`won`/`lost`),
finalised_estimate_gbp, founder_notes.
**`documents`** — id, deal_id, type (`estimate`/`proposal`/`spec`), version,
status (`draft`/`sent`/`approved`/`rejected`), content, approved_at, approved_by.
**`clients`** — id, email, name, business_name (for client login/portal).

**Added in Phase 3:**
**`agreements`** — deal_id, esign_status, signed_at, document_url.
**`payments`** — deal_id, type (`deposit`/`stage`), amount_gbp, status, stripe_ref,
due_on, paid_at.

Everything keys back to `audit_id` → `deal_id`. Get this right in Phase 1.

---

## 4. Phase 1 — Audit → estimate → lead  (build & launch first)

**Definition of done:** a stranger completes the audit; a provisional estimate PDF
is emailed to them; a lead lands in the founder's inbox; the client is pushed to
book a discovery call.

**Flow:** landing → start (create audit) → warm-up (2–3 Qs) → Bright Data research
→ recognition check → lean tickable report → **server computes estimate** → capture
contact → estimate PDF to client + lead to founder → book discovery call.

**Estimate maths (server module, single source of truth):**
Constants: rate £60/h, +15% contingency, +25% overhead, £750 minimum.
```
per rec:  h = blended_hours × 1.15 × 1.25;  price = round(h × 60, £10)
          if price < 750 → raise to 750 or bundle
bundle:   sum ticked blended_hours; for each shared component in >1 ticked rec,
          subtract duplicated shared_setup_hours; then ×1.15 ×1.25 ×60
```
Running costs passed through, shown separately, paid by client directly. Unit-test
this module on fixed inputs.

**Client PDF:** lean report (problem, fix, proof, value-next-to-price). Marked
**provisional estimate**, ends with the call booking link. No hours/task detail.

**Founder email:** full internal detail — hours, task breakdown, confidence,
running costs, bundle maths, what the client ticked.

The audit conversation is driven by the `ai-opportunity-audit` skill (already built
and hardened). Model it as a **stateful session** (research takes time).

---

## 5. Phase 2 — The deal desk (approval chain)

**Goal:** turn a lead into an approved build spec, with the founder in control of
the money-critical step and the client approving at each gate.

**Founder dashboard** (simple — founder is non-technical):
- List of leads/audits, newest first.
- Open an audit → see everything, **edit the estimate** (add/remove recs, adjust
  hours/scope), finalise a real figure after the discovery call.
- One-click "send finalised estimate to client for approval".

**Client portal** (light login):
- View finalised **estimate** → Approve / query.
- On approval → system generates a **proposal** (scope, deliverables, timeline,
  terms) from the estimate + audit, as a draft the founder can tweak, then sent →
  client Approve.
- On approval → system generates a **build spec** (what will actually be built) →
  client Approve.
- On spec approval → founder is notified and hands the spec to Claude to build.

**State machine (server code):** each `document` moves draft → sent → approved;
each approval unlocks generating the next document. Never skip gates. Everything
logged with timestamps (this is also the audit trail for disputes).

**AI's role here:** drafts the proposal and spec from existing structured data; the
founder edits; code manages state and money. AI never sets the final price.

---

## 6. Phase 3 — Money & contracts

Wired into the Phase 2 gates:
- **Service agreement** e-signed before build starts (e-sign API).
- **Deposit** taken on estimate/proposal approval (Stripe) before work begins —
  protects against ghosting after the work.
- **Staged payments** tied to milestones (e.g. deposit → mid-build → on delivery),
  each a Stripe payment with due dates and status tracked in `payments`.
- Payment status gates delivery: no final handover until final stage is paid.

Terms, deposit %, and stage split are founder policy (same for every client) — set
once, applied by the system.

---

## 7. Phase 4 — Build & delivery

The approved build spec is the input to the actual build (Claude + founder). This
is where the `ai-opportunity-audit` promise is fulfilled: bounded, additive,
proven, hand-over-able builds per the skill's rules. Delivery + training + the
client setting up their own running-cost accounts (they pay third parties directly).

Not a software feature to build so much as the operating procedure the pipeline
feeds — but the spec that drives it is generated in Phase 2 and must be complete
enough to build from.

---

## 8. Cross-cutting requirements

- **AI safety net:** estimates are provisional until the founder's call; the founder
  sees every lead — a weak AI estimate is caught, never auto-billed.
- **Research reliability:** if Bright Data fails, degrade honestly (fewer, tentative
  pains), never invent or silently fall back to generic.
- **Money in code, not AI.** Non-negotiable.
- **Audit trail:** every document version and approval timestamped for disputes.
- **Data protection (UK GDPR):** the audit and builds handle business + customer
  contact data. Privacy policy, lawful basis, and consent handling required before
  processing real customer data at scale — flagged now, actioned in Phase 2/3.
- **Founder-operable:** every back-office screen must be usable without technical
  skill, or it won't get used.

---

## 9. Build sequence (recommended)

1. **Spine + estimate maths** (Supabase tables, the pricing module + its unit
   tests). Everything stands on this.
2. **Phase 1** audit front end → launch → start pulling real leads and learning.
3. **Phase 2** deal desk once leads justify it.
4. **Phase 3** money/contracts once deals are closing and manual invoicing hurts.
5. **Phase 4** is continuous — the builds themselves.

Ship each phase so it earns before the next is built. Don't build it all before
launching anything.

---

## 10. Deferred / to decide
Branding & visual identity; testimonials/social proof (none yet — new business);
softening the "AI" word in customer-facing copy if it spooks the audience; exact
deposit % and payment-stage split; choice of e-sign and email providers; whether
the audit chat streams live in-browser or the founder-side runs server-batched.
None block Phase 1.
