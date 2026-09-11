import { describe, expect, it } from "vitest";
import { pageCount, pageRangeLabel, paginate } from "./pagination";

describe("pagination", () => {
  it("caps page count at one for an empty or small list", () => {
    expect(pageCount(0, 20)).toBe(1);
    expect(pageCount(5, 20)).toBe(1);
  });

  it("counts full pages plus a remainder page", () => {
    expect(pageCount(84, 20)).toBe(5);
    expect(pageCount(40, 20)).toBe(2);
  });

  it("slices the requested page", () => {
    const rows = Array.from({ length: 25 }, (_, index) => index);
    expect(paginate(rows, 1, 20)).toEqual(rows.slice(0, 20));
    expect(paginate(rows, 2, 20)).toEqual(rows.slice(20, 25));
  });

  it("labels the visible range against the total", () => {
    expect(pageRangeLabel(1, 84, 20)).toBe("Mostrando 1–20 de 84");
    expect(pageRangeLabel(5, 84, 20)).toBe("Mostrando 81–84 de 84");
  });

  it("labels an empty list without a range", () => {
    expect(pageRangeLabel(1, 0, 20)).toBe("Mostrando 0 de 0");
  });
});
