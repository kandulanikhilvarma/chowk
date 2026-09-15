import { describe, expect, it } from "vitest";
import { safeNext } from "../../lib/safe-next";

describe("safeNext", () => {
  it("keeps same-site paths with query and hash", () => {
    expect(safeNext("/l/abc?x=1#photos")).toBe("/l/abc?x=1#photos");
  });

  it("falls back when next is missing or not a path", () => {
    expect(safeNext(null)).toBe("/me");
    expect(safeNext("")).toBe("/me");
    expect(safeNext("https://evil.com")).toBe("/me");
    expect(safeNext("javascript:alert(1)", "/")).toBe("/");
  });

  it("blocks protocol-relative and backslash tricks", () => {
    expect(safeNext("//evil.com")).toBe("/me");
    expect(safeNext("/\\evil.com")).toBe("/me");
    expect(safeNext("/\t/evil.com")).toBe("/me");
  });
});
