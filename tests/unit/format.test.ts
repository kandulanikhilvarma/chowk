import { describe, expect, it } from "vitest";
import { awayLabel, formatDistance, formatPrice, formatPriceShort, priceLabel, timeAgo } from "../../lib/format";

describe("formatPrice", () => {
  it("uses Indian digit grouping", () => {
    expect(formatPrice(1234500)).toBe("₹12,345");
    expect(formatPrice(12_34_567_00)).toBe("₹12,34,567");
  });
});

describe("formatPriceShort", () => {
  it("keeps prices under one lakh in full", () => {
    expect(formatPriceShort(8_500_000)).toBe("₹85,000");
  });
  it("switches to lakh and crore", () => {
    expect(formatPriceShort(4_50_000_00)).toBe("₹4.5 L");
    expect(formatPriceShort(1_23_45_678_00)).toBe("₹1.23 Cr");
  });
  it("truncates instead of rounding up", () => {
    expect(formatPriceShort(99_99_999_00)).toBe("₹99.9 L");
  });
});

describe("priceLabel", () => {
  it("names free and swap listings", () => {
    expect(priceLabel(null, "free")).toBe("Free");
    expect(priceLabel(500000, "swap")).toBe("Swap");
  });
  it("asks for a price when none is set", () => {
    expect(priceLabel(null, "fixed")).toBe("Ask for price");
  });
});

describe("formatDistance", () => {
  it("hides distances under 1 km", () => {
    expect(formatDistance(0.3)).toBe("< 1 km");
  });
  it("rounds to half a kilometre, then whole kilometres", () => {
    expect(formatDistance(2.26)).toBe("2.5 km");
    expect(formatDistance(12.4)).toBe("12 km");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-09-15T12:00:00Z");
  it("reads naturally", () => {
    expect(timeAgo("2026-09-15T11:59:30Z", now)).toBe("Just now");
    expect(timeAgo("2026-09-14T12:00:00Z", now)).toBe("yesterday");
    expect(timeAgo("2026-09-12T12:00:00Z", now)).toBe("3 days ago");
  });
});

describe("awayLabel", () => {
  const now = new Date("2026-09-27T20:00:00+05:30");
  it("shows the date while it is today or later", () => {
    expect(awayLabel("2026-09-27", now)).toBe("Away until 27 Sept");
    expect(awayLabel("2026-10-12", now)).toBe("Away until 12 Oct");
  });
  it("hides a past date and an empty one", () => {
    expect(awayLabel("2026-09-26", now)).toBeNull();
    expect(awayLabel(null, now)).toBeNull();
  });
  it("uses India time, not the server clock", () => {
    // 20:00 UTC on the 26th is already the 27th in India.
    expect(awayLabel("2026-09-26", new Date("2026-09-26T20:00:00Z"))).toBeNull();
  });
});
