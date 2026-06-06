import { describe, expect, it } from "vitest";
import { starRating } from "./scoring";

describe("starRating", () => {
  it("maps 100% to 5 stars", () => {
    expect(starRating(100)).toBe(5);
  });

  it("maps 0% to 0 stars", () => {
    expect(starRating(0)).toBe(0);
  });

  it("rounds 84% to 4 stars", () => {
    expect(starRating(84)).toBe(4);
  });

  it("clamps out-of-range input", () => {
    expect(starRating(150)).toBe(5);
    expect(starRating(-20)).toBe(0);
  });
});
