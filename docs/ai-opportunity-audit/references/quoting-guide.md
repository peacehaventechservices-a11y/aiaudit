# Quoting guide

The AI estimates **hours**. Price is arithmetic. This keeps quotes accurate,
competitive, and safe enough to show a client. Fixed rules on every quote: rate
**£60/hour**, **+15% contingency**, **+25% overhead** (unbillable sales/support/
tweak time), and a **£750 minimum job size**.

## The method, worked

Recommendation: "Auto-draft replies to inbound enquiries from the website form
and route them to the owner to approve and send."

Task breakdown with three-point estimates (optimistic / likely / pessimistic),
blended as `(o + 4×l + p) / 6`:

| Task | O | L | P | Blended |
|------|---|---|---|---------|
| Connect to website form + email | 2 | 3 | 6 | 3.3 |
| Build + tune reply-drafting logic | 4 | 6 | 10 | 6.3 |
| Approve-before-send workflow | 2 | 3 | 5 | 3.2 |
| Test with real enquiries | 2 | 3 | 5 | 3.2 |
| Handover + training | 1 | 2 | 3 | 2.0 |

- Blended hours = 18.0
- +15% contingency = 20.7 hours
- +25% overhead = 25.9 hours
- × £60 = **£1,552 → round to £1,550** (well above the £750 floor)

If confidence is **high**, quote **£1,240**.
If confidence is **medium/low**, quote a **range**: low end = blended-hours price
(18.0 × £60 = £1,080), high end = pessimistic-hours + contingency
((6+10+5+5+3) × 1.15 × £60 = £2,001) → **"£1,080–£2,000, indicative until we
confirm scope."**

## Competitive / proportionality check

The business builds solutions rather than reselling subscriptions, so the point
here is not to punt the client to a tool — it's to keep the build's price
proportionate. Compare your quoted build against the value it delivers and any
obvious market alternative. If the build costs far more than the benefit is worth,
the estimate is probably wrong or the solution is over-engineered — trim the scope
to what actually earns its keep. A right-sized build that beats a subscription on
fit and ownership is exactly what you're selling; an over-priced one just doesn't
convert.

Also apply the buildability ceiling: if the solution can't be built as a bounded,
hand-over-able job without constant babysitting (or it's safety/money-critical or
unproven), don't quote it — flag it as needing a specialist partner instead.

## Machine-readable fields (for the landing page)

So a page can sum ticked recommendations into one quote, emit these fields per
recommendation alongside the prose. When running the skill in chat you don't have
to print raw JSON, but keep the values consistent and derivable:

```json
{
  "id": "auto-draft-enquiry-replies",
  "title": "Auto-draft replies to inbound enquiries",
  "tasks": [
    {"name": "Connect to website form + email", "o": 2, "l": 3, "p": 6},
    {"name": "Build + tune reply-drafting logic", "o": 4, "l": 6, "p": 10}
  ],
  "blended_hours": 18.0,
  "contingency_pct": 15,
  "hourly_rate_gbp": 60,
  "confidence": "high",
  "price_gbp": 1240,
  "price_range_gbp": null,
  "market_alternative": {"tool": "n/a", "monthly_cost_gbp": null},
  "running_cost_gbp_month": 25,
  "running_cost_note": "Twilio number + ~120 texts/month at ~15 jobs/week; client pays Twilio directly",
  "running_cost_paid_by": "client_direct"
}
```

For medium/low confidence, set `price_gbp` to null and fill `price_range_gbp`
as `[low, high]`. The page totals the ticked items: sum `price_gbp` for hard
numbers, and sum the range endpoints separately to show an overall range when any
ticked item is uncertain.

### Shared-core fields (for honest bundle pricing)

So the site can avoid double-charging shared infrastructure when several
recommendations are ticked, add these to each recommendation:

```json
{
  "shared_core_components": ["customer_job_db", "messaging_integration"],
  "shared_setup_hours": 8,
  "standalone_setup_hours": 8
}
```

- `shared_core_components`: named pieces this build reuses. Two recommendations that
  list the same component share that setup.
- `shared_setup_hours`: hours within this quote that build a shared component (would
  be built once across a bundle).
- `standalone_setup_hours`: the same setup hours as counted in the standalone quote.

**Bundle math the site runs when multiple are ticked:** sum every ticked item's
`blended_hours`; then for each shared component that appears in more than one ticked
item, subtract its duplicated `shared_setup_hours` so it's counted once; then apply
+15% and ×£60 to the de-duplicated hours. Show both the summed-standalone total and
the lower bundle total, so the owner sees the saving.

Keep it simple: if you can't cleanly separate shared from standalone hours for a
given build, set `shared_setup_hours` to 0 for it — better to under-claim the saving
than to produce a confusing total.

## Guardrails

- Never let the AI output a price it didn't derive from hours × rate.
- Keep the task breakdown in the quote *data*, not in the report — the owner sees a
  clean price line; the working is there for the site and your follow-up. (A price
  you couldn't break down into tasks isn't quotable — you just don't show the tasks.)
- When in doubt on scope, widen to a range rather than committing.
- A quote is only as good as the information behind it; if a build's scope was never
  really uncovered, say so and route to a call instead of guessing.
