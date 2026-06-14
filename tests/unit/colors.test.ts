import { describe, it, expect } from "vitest";
import { LABEL_COLORS, LABEL_VAR, LABEL_BG, LABEL_CLASS, getLabelColor } from "@/lib/colors";

describe("label colors", () => {
  it("every canonical color has a CSS var, bg, and class mapping", () => {
    for (const c of LABEL_COLORS) {
      expect(LABEL_VAR[c]).toBeTruthy();
      expect(LABEL_BG[c]).toBeTruthy();
      expect(LABEL_CLASS[c]).toContain(`var(--label-${c})`);
    }
  });

  it("getLabelColor returns the matching CSS variable", () => {
    expect(getLabelColor("green")).toBe("var(--label-green)");
    expect(getLabelColor("blue")).toBe("var(--label-blue)");
  });

  it("there are 10 canonical colors with no duplicates", () => {
    expect(LABEL_COLORS).toHaveLength(10);
    expect(new Set(LABEL_COLORS).size).toBe(10);
  });
});
