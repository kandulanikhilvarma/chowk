import { describe, expect, it } from "vitest";
import { isRcNumber } from "../../lib/vehicle";

describe("isRcNumber", () => {
  it.each(["MH 12 AB 1234", "ka-01-m-9999", "DL1CAB1234", "TS09EA4321", "22 BH 1234 AA", "22BH0001C"])("accepts %j", (rc) => {
    expect(isRcNumber(rc)).toBe(true);
  });

  it.each(["", "ABC123", "MH12AB12345", "12345", "MH 12 ABCD 1234", "22 BH 12 AA"])("rejects %j", (rc) => {
    expect(isRcNumber(rc)).toBe(false);
  });
});
