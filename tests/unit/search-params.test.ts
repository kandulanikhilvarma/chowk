import { describe, expect, it } from "vitest";
import { PAGE_SIZE, toSearchArgs } from "../../lib/search-params";

describe("toSearchArgs", () => {
  it("defaults to newest, page 1, one extra row", () => {
    expect(toSearchArgs({})).toEqual({
      page: 1,
      args: {
        p_q: undefined,
        p_category: undefined,
        p_price_type: undefined,
        p_kind: undefined,
        p_min_paise: undefined,
        p_max_paise: undefined,
        p_sort: "newest",
        p_limit: PAGE_SIZE + 1,
        p_offset: 0,
      },
    });
  });

  it("uses relevance when a query is present and trims it", () => {
    const { args } = toSearchArgs({ q: "  royal enfield  " });
    expect(args.p_q).toBe("royal enfield");
    expect(args.p_sort).toBe("relevance");
  });

  it("drops values outside the allowed sets", () => {
    const { args } = toSearchArgs({ price_type: "stolen", kind: "rent", sort: "drop table" });
    expect(args.p_price_type).toBeUndefined();
    expect(args.p_kind).toBeUndefined();
    expect(args.p_sort).toBe("newest");
  });

  it("converts rupees to paise and ignores bad numbers", () => {
    const { args } = toSearchArgs({ min: "500", max: "-3" });
    expect(args.p_min_paise).toBe(50000);
    expect(args.p_max_paise).toBeUndefined();
  });

  it("pages by offset and clamps bad page numbers", () => {
    expect(toSearchArgs({ page: "3" }).args.p_offset).toBe(2 * PAGE_SIZE);
    expect(toSearchArgs({ page: "-9" }).page).toBe(1);
    expect(toSearchArgs({ page: "abc" }).page).toBe(1);
  });

  it("lets the route category win over the query string", () => {
    expect(toSearchArgs({ category: "books" }, "bikes").args.p_category).toBe("bikes");
    expect(toSearchArgs({ category: ["books", "pets"] }).args.p_category).toBe("books");
  });
});
