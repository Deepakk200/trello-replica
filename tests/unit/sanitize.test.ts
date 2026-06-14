import { describe, it, expect } from "vitest";
import { sanitizeHtml, sanitizeText } from "@/lib/sanitize";

describe("sanitizeText (plain-text fields)", () => {
  it("strips all HTML, including <script>", () => {
    const out = sanitizeText('<script>alert(1)</script>Hello');
    expect(out).not.toContain("<script>");
    expect(out).not.toContain("alert(1)"); // script contents removed
    expect(out).toContain("Hello");
  });

  it("strips tags but keeps text", () => {
    expect(sanitizeText("<b>bold</b>")).toBe("bold");
  });
});

describe("sanitizeHtml (rich text)", () => {
  it("removes <script> tags (no XSS)", () => {
    const out = sanitizeHtml('<p>ok</p><script>steal()</script>');
    expect(out).toContain("<p>ok</p>");
    expect(out.toLowerCase()).not.toContain("<script");
    expect(out).not.toContain("steal()");
  });

  it("strips event handlers and javascript: URLs", () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)" onclick="alert(2)">x</a>');
    expect(out).not.toContain("onclick");
    expect(out.toLowerCase()).not.toContain("javascript:");
  });

  it("keeps allowed formatting tags", () => {
    const out = sanitizeHtml("<strong>bold</strong> <em>italic</em>");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<em>italic</em>");
  });
});
