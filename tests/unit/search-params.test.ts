import { describe, expect, it } from "vitest";
import { PAGE_SIZE, toSearchArgs } from "../../lib/search-params";

const hyderabad = { lat: 17.385, lng: 78.4867 };

describe("toSearchArgs", () => {
  it("defaults to newest, page 1, no origin, one extra row", () => {
    expect(toSearchArgs({})).toEqual({
      page: 1,
      args: {
        p_q: undefined,
        p_category: undefined,
        p_price_type: undefined,
        p_kind: undefined,
        p_min_paise: undefined,
        p_max_paise: undefined,
        p_lat: undefined,
        p_lng: undefined,
        p_radius_km: undefined,
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

  it("uses a city origin with the default 25 km radius", () => {
    const { args } = toSearchArgs({}, undefined, hyderabad);
    expect([args.p_lat, args.p_lng, args.p_radius_km]).toEqual([17.385, 78.4867, 25]);
  });

  it("takes a browser location from lat and lng when no city is chosen", () => {
    const { args } = toSearchArgs({ lat: "12.97", lng: "77.59", radius: "10", sort: "nearest" });
    expect([args.p_lat, args.p_lng, args.p_radius_km, args.p_sort]).toEqual([12.97, 77.59, 10, "nearest"]);
  });

  it("prefers the chosen city over lat and lng", () => {
    const { args } = toSearchArgs({ lat: "12.97", lng: "77.59" }, undefined, hyderabad);
    expect(args.p_lat).toBe(17.385);
  });

  it("ignores out-of-range coordinates and radii outside the list", () => {
    expect(toSearchArgs({ lat: "200", lng: "77" }).args.p_lat).toBeUndefined();
    expect(toSearchArgs({ radius: "7" }, undefined, hyderabad).args.p_radius_km).toBe(25);
    expect(toSearchArgs({ radius: "10" }).args.p_radius_km).toBeUndefined();
  });

  it("falls back from nearest to newest without an origin", () => {
    expect(toSearchArgs({ sort: "nearest" }).args.p_sort).toBe("newest");
  });
});
