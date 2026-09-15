import { describe, expect, it } from "vitest";
import { findProhibited } from "../../lib/prohibited";

describe("findProhibited", () => {
  it.each([
    ["Desi katta for sale, cash only", "weapons"],
    ["Air pistol with 200 bullets", "weapons"],
    ["Pure GANJA, home delivery", "drugs"],
    ["Antique ivory statue", "protected wildlife"],
    ["Indian star tortoise, 2 years", "protected wildlife"],
    ["Codeine cough syrup, 10 bottles", "prescription medicine"],
    ["Rolex first copy, 7A quality", "fake or copied goods"],
    ["Nike shoes (replica)", "fake or copied goods"],
  ])("blocks %s", (text, group) => {
    expect(findProhibited(text)?.group).toBe(group);
  });

  it.each([
    "Kids toy gun, battery operated",
    "Hot glue gun for crafts",
    "Honda City in gun metal grey",
    "HP ink cartridges, sealed",
    "Garden weed remover tool",
    "Burgundy leather handbag",
    "Gunny bags, 50 pieces",
    "Samsung Galaxy S21, 128 GB",
  ])("allows %s", (text) => {
    expect(findProhibited(text)).toBeNull();
  });
});
