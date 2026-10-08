import { describe, expect, it } from "vitest";
import { normalizeBusinessSummaryStats, normalizePackageName } from "./BusinessSummary";

describe("normalizeBusinessSummaryStats", () => {
  it("fills missing arrays from older cached summary data", () => {
    const normalized = normalizeBusinessSummaryStats({
      clients: 12,
      income: 2500000,
      packageSummaries: [{ name: "Starter", clients: 2, totalToPay: 1500000, totalPaid: 1000000, balance: 500000, discountAmount: 0, additionalAmount: 0 }],
    });

    expect(normalized.packageClientDetails).toEqual([]);
    expect(normalized.incomeList).toEqual([]);
    expect(normalized.expenditureList).toEqual([]);
    expect(normalized.packageSummaries).toHaveLength(1);
    expect(normalized.clients).toBe(12);
  });

  it("normalizes package names consistently across casing and spacing", () => {
    expect(normalizePackageName("  Premium Package  ")).toBe("premium package");
    expect(normalizePackageName("premium   package")).toBe("premium package");
    expect(normalizePackageName("PREMIUM PACKAGE")).toBe("premium package");
  });
});
