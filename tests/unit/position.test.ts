import { describe, it, expect } from "vitest";
import { initialPosition, positionBetween, recomputePositions } from "@/lib/position";

const GAP = 65536;

describe("position — fractional indexing", () => {
  it("initialPosition is the gap", () => {
    expect(initialPosition()).toBe(GAP);
  });

  it("empty list (both null) → gap", () => {
    expect(positionBetween(null, null)).toBe(GAP);
  });

  it("insert at the start (before null) → half of the first item", () => {
    expect(positionBetween(null, 100)).toBe(50);
  });

  it("append at the end (after null) → before + gap", () => {
    expect(positionBetween(GAP, null)).toBe(GAP * 2);
  });

  it("insert between two items → midpoint", () => {
    expect(positionBetween(100, 200)).toBe(150);
    expect(positionBetween(0, GAP)).toBe(GAP / 2);
  });

  it("midpoint stays strictly between neighbours", () => {
    const before = GAP;
    const after = GAP * 2;
    const mid = positionBetween(before, after);
    expect(mid).toBeGreaterThan(before);
    expect(mid).toBeLessThan(after);
  });

  it("repeated insertion at the tail of a shrinking gap stays ordered + bounded", () => {
    // Drag repeatedly just before `after`: each midpoint advances toward `after`,
    // strictly increasing and always < after (ordering never breaks).
    let before = 0;
    const after = GAP;
    let prev = before;
    for (let i = 0; i < 20; i++) {
      const mid = positionBetween(before, after);
      expect(mid).toBeGreaterThan(prev); // monotonically increasing
      expect(mid).toBeLessThan(after);
      prev = mid;
      before = mid; // next insert goes after the one we just placed
    }
  });

  it("repeated insertion at the head of a shrinking gap stays strictly between", () => {
    let after = GAP;
    const before = 0;
    for (let i = 0; i < 20; i++) {
      const mid = positionBetween(before, after);
      expect(mid).toBeGreaterThan(before);
      expect(mid).toBeLessThan(after);
      after = mid; // keep inserting at the head; positions shrink toward `before`
    }
  });

  it("recomputePositions spaces items evenly by gap (rebalance)", () => {
    expect(recomputePositions(0)).toEqual([]);
    expect(recomputePositions(3)).toEqual([GAP, GAP * 2, GAP * 3]);
    const r = recomputePositions(5);
    // strictly increasing
    for (let i = 1; i < r.length; i++) expect(r[i]).toBeGreaterThan(r[i - 1]);
  });
});
