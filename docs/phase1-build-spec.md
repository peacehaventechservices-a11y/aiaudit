# Phase 1 Build Spec — "Leads on the Board"

**Product:** Self-serve AI opportunity audit for small businesses.
**This phase's goal (definition of done):** A stranger completes an audit on the
website; a provisional **estimate** PDF is emailed to them; a lead notification is
emailed to the founder; the client is pushed to book a discovery call. Nothing in
this phase becomes a final price — the estimate is explicitly provisional until the
founder's discovery call.

**Stack:** Vercel (hosting + serverless functions), Supabase (database, storage),
Claude API (Opus for the audit), Bright Data (research), an email service
(e.g. Resend), a scheduling link (e.g. Cal.com/Calendly) for the discovery call.

**Language rule (applies everywhere, no exceptions):** the word is **"estimate"**,
never "quote".

---

## 0. Competitive positioning (steers all site copy & design)

The market research found three competitor groups and a clear gap we sit in. The
site must position *into the gap* and not accidentally look like group 1.

- **Group 1 — AI-readiness quiz tools** (41 Labs, SmallBizStrategy, Hello Alice,
  ByteFlowAI): fast, free, shallow. A questionnaire or light website scan → a
  "readiness score /10" and generic advice to *go buy third-party tools*. Stops at
  the report.
- **Group 2 — AI automation agencies** (BetterClaw, MannVenture, DigiSmart): deep
  and they *build* — but human-delivered (free call + hand-written report in 48h),
  slow, and priced $3k–$15k for bigger businesses.
- **Group 3 — point tools** (Merchynt GBP audit, review tools, QuoteIQ): narrow,
  audit one thing only.

**Our position: the automated version of a Group 2 agency.** Deep, per-business,
reviews-reading audit like the agencies do by hand — but instant and scalable — that
ends in an **estimate to build it for you**, not "buy this tool", feeding a
productised delivery pipeline. Nobody was found at this exact intersection.

**Three positioning rules the site must follow:**
1. **Never feel like a readiness quiz.** No "score out of 10", no generic tips. The
   audit must feel bespoke — the reviews-reading, "how did you know that?" moment is
   the whole differentiator. If it feels like Group 1, we're commoditised.
2. **Lead hard on "we build it — we don't sell you tools."** Every Group 1
   competitor recommends third-party subscriptions. Being the ones who *build the
   thing* is the sharpest wedge — make it central to the copy.
3. **The instant estimate-to-build is rare — feature it.** Auto-generating a build
   estimate from an audit for micro-businesses wasn't found elsewhere. It's the edge
   (and the hardest part, which is why the estimate logic is so hardened). Show it
   off, don't bury it.

Positioning one-liner to work from: *"Not another AI quiz. We look at your actual
business, find where AI genuinely helps, and build it for you — priced up front."*

---

## 1. Scope

### In scope for Phase 1
- A public web page that runs the audit as a chat (the emotional-arc conversation
  from the `ai-opportunity-audit` skill).
- Live research during the audit via Bright Data (business + niche + evidence).
- A rendered on-screen report with tickable recommendations and a running total.
- Deterministic estimate maths **in server code** (not the AI).
- A provisional estimate PDF, emailed to the client.
- A lead notification emailed to the founder with the full audit detail.
- A clear push to book a discovery call as the primary call-to-action.
- One `audit` record in Supabase per run — the spine everything in later phases
  attaches to.

### Explicitly OUT of scope (later phases)
- Founder dashboard / editing the estimate (Phase 2).
- Proposal generation, build-spec generation, approval chain (Phase 2).
- Service agreements, e-sign, deposits, staged payments, Stripe (Phase 3).
- Client login/portal (Phase 2).

Keeping these out is deliberate — Phase 1 must ship and earn before we build them.

---

## 2. Architecture spine (build this right — later phases depend on it)

Every audit creates one `audit` row in Supabase, keyed by `audit_id`. Every later
artefact (estimate edits, proposal, spec, payments) will attach to this id. Get the
data model right now so Phase 2/3 bolt on rather than rewire.

**Core tables (Phase 1):**

`audits`
- `id` (uuid, pk)
- `created_at`
- `status` (enum: `in_progress`, `completed`, `abandoned`)
- `business_name`, `trade`, `location`, `rough_size`, `website_url`
- `contact_name`, `contact_email`, `contact_phone`
- `research_summary` (jsonb — what Bright Data + Claude found)
- `confirmed_pains` (jsonb)
- `report_markdown` (text — the lean report shown to the client)
- `estimate_total_gbp` (numeric — provisional, computed in code)
- `estimate_monthly_running_cost_gbp` (numeric)
- `pdf_url` (Supabase storage link)
- `discovery_call_booked` (bool)

`recommendations` (one row per recommendation in an audit)
- `id`, `audit_id` (fk)
- `title`, `problem`, `fix`, `proof`, `benefit_text`
- `tasks` (jsonb — the o/l/p task breakdown; behind the scenes)
- `blended_hours`, `confidence` (enum high/medium/low)
- `price_gbp`, `price_range_low_gbp`, `price_range_high_gbp`
- `running_cost_gbp_month`, `running_cost_note`
- `shared_core_components` (jsonb array), `shared_setup_hours`
- `is_ticked` (bool — client's selection)

This mirrors the skill's machine-readable fields exactly, so the audit output drops
straight into these tables.

---

## 3. The audit flow (what happens, step by step)

1. **Landing → start audit.** Client lands, clicks start, the chat opens. Create an
   `audits` row (`status = in_progress`).
2. **Warm-up.** The Claude/Opus conversation follows the skill: 2–3 questions to get
   business name, trade, location, rough size, website. Save to the `audits` row.
3. **Research.** Server calls Bright Data to study the actual business (Google
   profile, reviews, site) and the niche (real pains, evidence a solution works).
   Store in `research_summary`. This is the step that must be good — it powers
   everything.
4. **Recognition check.** Reflect 3–5 niche-specific pains back; client confirms and
   adds anything missed. Light quantify step for numbers. Save to `confirmed_pains`.
5. **Report generation.** Claude produces the lean report + the structured
   recommendation data (per the skill). Save `report_markdown` and one
   `recommendations` row per recommendation.
6. **Estimate maths (SERVER CODE, not AI).** For each recommendation, the server
   computes the price from the AI's hours using the fixed rules (section 4). Compute
   the bundle total with shared-core de-duplication.
7. **On-screen report.** Render the report; each recommendation is tickable; show a
   live running total (build £ and monthly running cost) as they tick.
8. **Capture contact + push to call.** Capture name/email/phone. Generate the
   estimate PDF, store it, email it to the client, email the lead to the founder,
   and present the discovery-call booking link as the primary CTA. Mark
   `status = completed`.

---

## 4. Estimate maths — the single source of truth (server module)

**This lives in code, never in the AI.** The AI outputs hours + structured data;
this module turns hours into money. One module, one place, unit-tested.

Constants (from the skill):
- `HOURLY_RATE_GBP = 60`
- `CONTINGENCY = 0.15`
- `OVERHEAD = 0.25`
- `MINIMUM_JOB_GBP = 750`

Per recommendation:
```
hours_after_contingency = blended_hours * (1 + CONTINGENCY)
hours_after_overhead    = hours_after_contingency * (1 + OVERHEAD)
raw_price               = hours_after_overhead * HOURLY_RATE_GBP
price                   = round to nearest £10
```
Apply the minimum: if a single recommendation's `price < 750`, either raise to 750
or bundle it (the skill prefers bundling). Confidence `medium`/`low` → produce a
range, not a single number.

Bundle total (when several are ticked):
```
sum all ticked blended_hours
for each shared_core_component appearing in >1 ticked rec:
    subtract its duplicated shared_setup_hours (count it once)
apply contingency, overhead, ×£60 to the de-duplicated hours
```
Show both the summed-standalone total and the lower bundle total (the saving).

**Running costs** are passed through from the recommendation data and shown
separately, with the note that the client pays these directly in their own name.

---

## 5. The estimate PDF (client-facing)

- Branded (founder branding — placeholder until section 8 assets exist).
- Uses the lean report: per recommendation → problem, fix, proof, benefit, and the
  value-next-to-price line. No task breakdowns or hours (those stay internal).
- States clearly it is a **provisional estimate**, to be confirmed on the discovery
  call. Never the word "quote".
- Ends with the discovery-call booking link.

## 6. The founder lead email

- Everything the founder needs to prep the discovery call: business, contact,
  confirmed pains, the recommendations with their **internal** detail (hours, task
  breakdown, confidence, running costs, bundle maths) — i.e. the working the client
  didn't see.
- The estimate total and which recommendations the client ticked.

---

## 7. Non-functional requirements
- **Research reliability:** if Bright Data fails, the audit degrades honestly (fewer,
  more tentative pains) rather than inventing — mirror the skill's rule. Never hard-
  fail silently into a generic audit.
- **Cost:** Opus per audit is fine (one run per lead, trivial vs a £750+ job). Only
  the audit brain needs Opus; PDF text etc. can use a cheaper model later.
- **State:** model the audit as a stateful session (research can take time); don't
  build it as one giant function call.
- **Safety net:** the estimate is provisional and the founder sees every lead, so a
  weak AI estimate is caught at the discovery call, not billed.

## 8. Deferred assets (stub in Phase 1, decide later)
Branding, testimonials/social proof, payment terms, service agreement, the "who's
behind this" trust content, and whether to soften the "AI" framing. Stub with
placeholders; these are site-owned, not audit-owned.

---

## 9. Definition of done (Phase 1 acceptance)
- [ ] A stranger can complete an audit end-to-end on the live site.
- [ ] Research genuinely studies the real business (not just the niche).
- [ ] The report is lean, the recommendations tickable, the running total live.
- [ ] Estimate maths run in code and pass unit tests on fixed inputs.
- [ ] The client receives a provisional **estimate** PDF by email.
- [ ] The founder receives a full lead email.
- [ ] The client is pushed to book a discovery call.
- [ ] One clean `audit` record per run, with the spine ready for Phase 2.
- [ ] The word "quote" appears nowhere.
