import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { timeAgo, formatDate } from "@/lib/time";

describe("timeAgo", () => {
  const NOW = new Date("2026-06-14T12:00:00Z").getTime();
  beforeEach(() => vi.useFakeTimers().setSystemTime(NOW));
  afterEach(() => vi.useRealTimers());

  const ago = (ms: number) => new Date(NOW - ms).toISOString();

  it("under a minute → just now", () => {
    expect(timeAgo(ago(30 * 1000))).toBe("just now");
  });
  it("minutes", () => {
    expect(timeAgo(ago(5 * 60 * 1000))).toBe("5m ago");
  });
  it("hours", () => {
    expect(timeAgo(ago(3 * 60 * 60 * 1000))).toBe("3h ago");
  });
  it("days", () => {
    expect(timeAgo(ago(2 * 24 * 60 * 60 * 1000))).toBe("2d ago");
  });
  it("months", () => {
    expect(timeAgo(ago(75 * 24 * 60 * 60 * 1000))).toBe("2mo ago");
  });
});

describe("formatDate", () => {
  it("defaults to month + day", () => {
    expect(formatDate("2026-06-05T00:00:00Z")).toMatch(/Jun\s+\d/);
  });
  it("respects custom options", () => {
    const out = formatDate("2026-06-05T00:00:00Z", { year: "numeric" });
    expect(out).toBe("2026");
  });
});
