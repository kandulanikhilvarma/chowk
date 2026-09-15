import { describe, expect, it } from "vitest";
import { badgeLabel } from "../../lib/badges";

describe("badgeLabel", () => {
  it("has no badge before the first rating", () => {
    expect(badgeLabel("friendly", 0)).toBeNull();
  });

  it("steps up at 1, 3 and 6 raters", () => {
    expect(badgeLabel("friendly", 1)).toBe("Friendly");
    expect(badgeLabel("reliable", 2)).toBe("Reliable");
    expect(badgeLabel("reliable", 3)).toBe("Very reliable");
    expect(badgeLabel("friendly", 6)).toBe("Extra friendly");
    expect(badgeLabel("friendly", 40)).toBe("Extra friendly");
  });
});
