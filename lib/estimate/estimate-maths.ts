/**
 * Single source of truth for turning AI-supplied hours into money. The AI never
 * outputs a price directly — it outputs blended_hours (+ task breakdown for
 * ranges) and this module does the arithmetic. See docs/phase1-build-spec.md
 * section 4 and docs/ai-opportunity-audit/references/quoting-guide.md.
 *
 * Deviation from quoting-guide.md's worked example, flagged rather than silently
 * fixed: that doc's medium/low range drops the +25% overhead on the low end and
 * drops it again (using only contingency) on a "high confidence" figure that
 * contradicts its own worked calculation. phase1-build-spec.md section 4 states
 * the formula unambiguously (contingency AND overhead, always, on every price).
 * This module follows phase1-build-spec.md and applies the exact same formula to
 * both ends of a range, varying only which hours figure goes in — see
 * priceRecommendation() below. Flagged to Jon; confirm or correct if the
 * quoting-guide numbers were intentional.
 */

export const HOURLY_RATE_GBP = 60;
export const CONTINGENCY = 0.15;
export const OVERHEAD = 0.25;
export const MINIMUM_JOB_GBP = 750;

export type Confidence = "high" | "medium" | "low";

export interface TaskEstimate {
  name?: string;
  /** optimistic hours */
  o: number;
  /** likely hours */
  l: number;
  /** pessimistic hours */
  p: number;
}

export interface RecommendationPricingInput {
  blendedHours: number;
  confidence: Confidence;
  /**
   * Required when confidence is "medium" or "low" — used to compute the
   * pessimistic-hours end of the range. Not needed for "high".
   */
  tasks?: TaskEstimate[];
}

export interface RecommendationPricing {
  /** Single price, only set when confidence is "high". */
  priceGbp: number | null;
  /** [low, high], only set when confidence is "medium" or "low". */
  priceRangeGbp: [number, number] | null;
  /** The un-floored price computed from blendedHours alone, before the £750 minimum is applied. Use this to decide whether a recommendation should be bundled instead of offered standalone. */
  rawPriceGbp: number;
  /** True if rawPriceGbp is below MINIMUM_JOB_GBP — the spec's cue to bundle this recommendation rather than raise it to the floor on its own. */
  belowMinimumStandalone: boolean;
}

export function roundToNearestTen(value: number): number {
  return Math.round(value / 10) * 10;
}

/** hours -> hours after +15% contingency and +25% overhead. */
export function applyContingencyAndOverhead(hours: number): number {
  return hours * (1 + CONTINGENCY) * (1 + OVERHEAD);
}

/** hours -> a rounded £ price, with contingency + overhead + rate applied. No minimum-job floor here — that's applied by callers that need it (see priceRecommendation, priceBundle). */
export function priceForHours(hours: number): number {
  return roundToNearestTen(applyContingencyAndOverhead(hours) * HOURLY_RATE_GBP);
}

export function floorToMinimumJob(priceGbp: number): number {
  return Math.max(priceGbp, MINIMUM_JOB_GBP);
}

function sumPessimisticHours(tasks: TaskEstimate[]): number {
  return tasks.reduce((sum, task) => sum + task.p, 0);
}

/**
 * Prices one recommendation. High confidence -> a single floored price.
 * Medium/low confidence -> a floored [low, high] range: low is the same
 * blended-hours price as the high-confidence case, high is that same formula
 * applied to the summed pessimistic hours from the task breakdown.
 */
export function priceRecommendation(
  input: RecommendationPricingInput
): RecommendationPricing {
  const rawPriceGbp = priceForHours(input.blendedHours);
  const belowMinimumStandalone = rawPriceGbp < MINIMUM_JOB_GBP;

  if (input.confidence === "high") {
    return {
      priceGbp: floorToMinimumJob(rawPriceGbp),
      priceRangeGbp: null,
      rawPriceGbp,
      belowMinimumStandalone,
    };
  }

  if (!input.tasks || input.tasks.length === 0) {
    throw new Error(
      "priceRecommendation: tasks (o/l/p breakdown) is required to compute a range for medium/low confidence"
    );
  }

  const pessimisticHours = sumPessimisticHours(input.tasks);
  const low = floorToMinimumJob(rawPriceGbp);
  const high = floorToMinimumJob(priceForHours(pessimisticHours));

  return {
    priceGbp: null,
    priceRangeGbp: [Math.min(low, high), Math.max(low, high)],
    rawPriceGbp,
    belowMinimumStandalone,
  };
}

export interface BundleRecommendationInput {
  id: string;
  blendedHours: number;
  confidence: Confidence;
  tasks?: TaskEstimate[];
  sharedCoreComponents?: string[];
  sharedSetupHours?: number;
}

export interface BundlePricing {
  /** Sum of each recommendation's own standalone price (using the range midpoint for medium/low confidence items). What the client would pay buying each separately. */
  standaloneTotalGbp: number;
  /** Price computed once from the de-duplicated hours across the whole bundle. */
  bundleTotalGbp: number;
  /** standaloneTotalGbp - bundleTotalGbp. Always >= 0. */
  savingGbp: number;
  totalHoursBeforeDedup: number;
  dedupedHours: number;
}

function standalonePriceForMidpoint(rec: BundleRecommendationInput): number {
  const pricing = priceRecommendation({
    blendedHours: rec.blendedHours,
    confidence: rec.confidence,
    tasks: rec.tasks,
  });
  if (pricing.priceGbp !== null) return pricing.priceGbp;
  const [low, high] = pricing.priceRangeGbp!;
  return (low + high) / 2;
}

/**
 * Bundle math per phase1-build-spec.md section 4: sum every ticked
 * recommendation's blended_hours, then for each shared_core_component that
 * appears in more than one ticked recommendation, subtract its duplicated
 * shared_setup_hours so it's counted once. When recs sharing a component
 * disagree on shared_setup_hours (shouldn't normally happen — it's describing
 * the same shared build), the largest reported value is kept and the rest
 * subtracted, so the de-dup never under-provisions the shared work.
 */
export function priceBundle(recs: BundleRecommendationInput[]): BundlePricing {
  const totalHoursBeforeDedup = recs.reduce((sum, r) => sum + r.blendedHours, 0);

  const hoursByComponent = new Map<string, number[]>();
  for (const rec of recs) {
    if (!rec.sharedCoreComponents || rec.sharedSetupHours === undefined) continue;
    for (const component of rec.sharedCoreComponents) {
      const list = hoursByComponent.get(component) ?? [];
      list.push(rec.sharedSetupHours);
      hoursByComponent.set(component, list);
    }
  }

  let dedupAmount = 0;
  for (const hours of hoursByComponent.values()) {
    if (hours.length <= 1) continue;
    const total = hours.reduce((sum, h) => sum + h, 0);
    const keepOnce = Math.max(...hours);
    dedupAmount += total - keepOnce;
  }

  const dedupedHours = Math.max(0, totalHoursBeforeDedup - dedupAmount);

  const standaloneTotalGbp = recs.reduce(
    (sum, rec) => sum + standalonePriceForMidpoint(rec),
    0
  );
  const bundleTotalGbp = floorToMinimumJob(priceForHours(dedupedHours));

  return {
    standaloneTotalGbp,
    bundleTotalGbp,
    savingGbp: Math.max(0, standaloneTotalGbp - bundleTotalGbp),
    totalHoursBeforeDedup,
    dedupedHours,
  };
}

export function sumMonthlyRunningCosts(
  recs: Array<{ runningCostGbpMonth?: number | null }>
): number {
  return recs.reduce((sum, r) => sum + (r.runningCostGbpMonth ?? 0), 0);
}
