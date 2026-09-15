import { describe, expect, it } from "vitest";
import { FULL_PX, THUMB_PX, fitWithin } from "../../lib/images";

describe("fitWithin", () => {
  it("scales the long side of a landscape photo", () => {
    expect(fitWithin(4000, 3000, FULL_PX)).toEqual({ width: 1600, height: 1200 });
  });

  it("scales the long side of a portrait photo", () => {
    expect(fitWithin(3024, 4032, THUMB_PX)).toEqual({ width: 360, height: 480 });
  });

  it("never scales a small photo up", () => {
    expect(fitWithin(800, 600, FULL_PX)).toEqual({ width: 800, height: 600 });
  });
});
