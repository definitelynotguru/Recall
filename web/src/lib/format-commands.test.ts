import { describe, it, expect } from "vitest";
import { applyWrap, applyPrefixLines } from "./format-commands";

describe("applyWrap", () => {
  it("wraps an existing selection and keeps it selected", () => {
    const out = applyWrap(
      { value: "hello world", selectionStart: 0, selectionEnd: 5 },
      "**",
      "**",
      "bold",
    );
    expect(out.value).toBe("**hello** world");
    expect(out.selectionStart).toBe(2);
    expect(out.selectionEnd).toBe(7);
  });

  it("inserts placeholder when nothing is selected and selects it", () => {
    const out = applyWrap(
      { value: "hello", selectionStart: 5, selectionEnd: 5 },
      "*",
      "*",
      "italic",
    );
    expect(out.value).toBe("hello*italic*");
    expect(out.selectionStart).toBe(6);
    expect(out.selectionEnd).toBe(12);
  });

  it("preserves surrounding text", () => {
    const out = applyWrap(
      { value: "a [b] c", selectionStart: 2, selectionEnd: 5 },
      "`",
      "`",
      "code",
    );
    expect(out.value).toBe("a `[b]` c");
    expect(out.selectionStart).toBe(3);
    expect(out.selectionEnd).toBe(6);
  });
});

describe("applyPrefixLines", () => {
  it("prefixes the current line", () => {
    const out = applyPrefixLines({ value: "one\ntwo\nthree", selectionStart: 4, selectionEnd: 7 }, "- ");
    expect(out.value).toBe("one\n- two\nthree");
    expect(out.selectionStart).toBe(4);
    expect(out.selectionEnd).toBe(9);
  });

  it("prefixes multiple selected lines", () => {
    const out = applyPrefixLines({ value: "a\nb\nc", selectionStart: 0, selectionEnd: 3 }, "# ");
    expect(out.value).toBe("# a\n# b\nc");
  });

  it("does not double-prefix lines already prefixed", () => {
    const out = applyPrefixLines({ value: "- a\nb", selectionStart: 0, selectionEnd: 5 }, "- ");
    expect(out.value).toBe("- a\n- b");
  });
});
