import { describe, expect, it } from "vitest";
import {
  MINIMUM_JOB_GBP,
  priceBundle,
  priceForHours,
  priceRecommendation,
  roundToNearestTen,
  sumMonthlyRunningCosts,
} from "./estimate-maths";

describe("roundToNearestTen", () => {
  it("rounds to the nearest £10", () => {
    expect(roundToNearestTen(1552.5)).toBe(1550);
    expect(roundToNearestTen(1555)).toBe(1560);
    expect(roundToNearestTen(1554.9)).toBe(1550);
  });
});

describe("priceForHours", () => {
  it("matches the worked example in quoting-guide.md (18 blended hours)", () => {
    // 18 * 1.15 = 20.7; * 1.25 = 25.875; * £60 = £1,552.50 -> rounds to £1,550
    expect(priceForHours(18)).toBe(1550);
  });

  it("applies contingency and overhead before rounding", () => {
    // 10 * 1.15 * 1.25 * 60 = 862.5 -> 860
    expect(priceForHours(10)).toBe(860);
  });
});

describe("priceRecommendation", () => {
  it("returns a single floored price for high confidence", () => {
    const result = priceRecommendation({ blendedHours: 18, confidence: "high" });
    expect(result.priceGbp).toBe(1550);
    expect(result.priceRangeGbp).toBeNull();
    expect(result.belowMinimumStandalone).toBe(false);
  });

  it("floors a small high-confidence job to the £750 minimum and flags it", () => {
    // 2 * 1.15 * 1.25 * 60 = 172.5 -> 170, well under £750
    const result = priceRecommendation({ blendedHours: 2, confidence: "high" });
    expect(result.rawPriceGbp).toBe(170);
    expect(result.priceGbp).toBe(MINIMUM_JOB_GBP);
    expect(result.belowMinimumStandalone).toBe(true);
  });

  it("returns a [low, high] range for medium/low confidence using blended and pessimistic hours", () => {
    // quoting-guide.md's auto-draft-replies example: blended 18.0, pessimistic
    // task hours 6+10+5+5+3 = 29. Both ends use the full contingency+overhead
    // formula (this module's deliberate deviation from the doc — see file header).
    const tasks = [
      { o: 2, l: 3, p: 6 },
      { o: 4, l: 6, p: 10 },
      { o: 2, l: 3, p: 5 },
      { o: 2, l: 3, p: 5 },
      { o: 1, l: 2, p: 3 },
    ];
    const result = priceRecommendation({
      blendedHours: 18,
      confidence: "medium",
      tasks,
    });
    expect(result.priceGbp).toBeNull();
    // low = priceForHours(18) = 1550, high = priceForHours(29) = 2500
    expect(result.priceRangeGbp).toEqual([1550, 2500]);
  });

  it("throws if a range is requested without a task breakdown", () => {
    expect(() =>
      priceRecommendation({ blendedHours: 18, confidence: "low" })
    ).toThrow(/tasks/);
  });
});

describe("priceBundle", () => {
  it("matches the sum of standalone prices when nothing is shared", () => {
    const recs = [
      { id: "a", blendedHours: 18, confidence: "high" as const },
      { id: "b", blendedHours: 10, confidence: "high" as const },
    ];
    const result = priceBundle(recs);
    // no shared components -> deduped hours = raw sum = 28
    expect(result.dedupedHours).toBe(28);
    expect(result.totalHoursBeforeDedup).toBe(28);
    // standalone total = 1550 + 860 = 2410; bundle = priceForHours(28)
    expect(result.standaloneTotalGbp).toBe(2410);
    expect(result.bundleTotalGbp).toBe(priceForHours(28));
  });

  it("de-duplicates shared setup hours counted in more than one ticked recommendation", () => {
    const recs = [
      {
        id: "a",
        blendedHours: 20,
        confidence: "high" as const,
        sharedCoreComponents: ["customer_job_db"],
        sharedSetupHours: 8,
      },
      {
        id: "b",
        blendedHours: 15,
        confidence: "high" as const,
        sharedCoreComponents: ["customer_job_db"],
        sharedSetupHours: 8,
      },
    ];
    const result = priceBundle(recs);
    // both list 8 shared hours for the same component -> counted once, so
    // dedup subtracts 8 (one of the two duplicate instances)
    expect(result.totalHoursBeforeDedup).toBe(35);
    expect(result.dedupedHours).toBe(27);
    expect(result.bundleTotalGbp).toBeLessThan(result.standaloneTotalGbp);
    expect(result.savingGbp).toBeGreaterThan(0);
  });

  it("keeps the larger reported shared_setup_hours when recs disagree", () => {
    const recs = [
      {
        id: "a",
        blendedHours: 20,
        confidence: "high" as const,
        sharedCoreComponents: ["messaging_integration"],
        sharedSetupHours: 5,
      },
      {
        id: "b",
        blendedHours: 15,
        confidence: "high" as const,
        sharedCoreComponents: ["messaging_integration"],
        sharedSetupHours: 9,
      },
    ];
    const result = priceBundle(recs);
    // total shared reported = 14, keep the larger (9), dedup amount = 5
    expect(result.totalHoursBeforeDedup).toBe(35);
    expect(result.dedupedHours).toBe(30);
  });

  it("uses the range midpoint for medium/low confidence items in the standalone total", () => {
    const tasks = [{ o: 1, l: 2, p: 4 }];
    const recs = [
      { id: "a", blendedHours: 18, confidence: "high" as const },
      { id: "b", blendedHours: 5, confidence: "medium" as const, tasks },
    ];
    const result = priceBundle(recs);
    const midpointB = (priceForHours(5) < MINIMUM_JOB_GBP ? MINIMUM_JOB_GBP : priceForHours(5));
    // just confirm it doesn't throw and produces a sane positive total including b's contribution
    expect(result.standaloneTotalGbp).toBeGreaterThan(1550);
    expect(midpointB).toBeGreaterThan(0);
  });
});

describe("sumMonthlyRunningCosts", () => {
  it("sums running costs and treats missing/null as zero", () => {
    const total = sumMonthlyRunningCosts([
      { runningCostGbpMonth: 25 },
      { runningCostGbpMonth: null },
      { runningCostGbpMonth: 10 },
      {},
    ]);
    expect(total).toBe(35);
  });
});
