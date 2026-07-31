import { describe, it, expect } from "vitest";
import {
  levenshtein,
  tokenize,
  scoreNote,
  makeSnippet,
  searchNotes,
} from "./search-score";

describe("levenshtein", () => {
  it("returns 0 for equal strings", () => {
    expect(levenshtein("hello", "hello")).toBe(0);
  });
  it("returns edit distance", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
  it("handles empty strings", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });
});

describe("tokenize", () => {
  it("splits on non-alphanumeric and lowercases", () => {
    expect(tokenize("Hello, World! 2026")).toEqual(["hello", "world", "2026"]);
  });
  it("returns empty for blank query", () => {
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("scoreNote", () => {
  it("weights title above body", () => {
    const note = {
      id: "1",
      title: "Meeting notes",
      body: "discussed the meeting",
      updated_at: "2026-01-01",
    };
    expect(scoreNote(note, "meeting")).toBeGreaterThan(1);
  });
  it("awards tag weight between title and body", () => {
    const note = {
      id: "1",
      title: "x",
      body: "y",
      tags: ["journal"],
      updated_at: "2026-01-01",
    };
    expect(scoreNote(note, "journal")).toBe(2);
  });
  it("matches with typo tolerance via levenshtein", () => {
    const note = {
      id: "1",
      title: "reciept",
      body: "",
      updated_at: "2026-01-01",
    };
    expect(scoreNote(note, "receipt")).toBeGreaterThan(0);
  });
  it("returns 0 for no match", () => {
    const note = {
      id: "1",
      title: "abc",
      body: "def",
      updated_at: "2026-01-01",
    };
    expect(scoreNote(note, "xyz")).toBe(0);
  });
});

describe("makeSnippet", () => {
  it("extracts a window around the first match", () => {
    const body = "The quick brown fox jumps over the lazy dog.";
    const snip = makeSnippet(body, "fox");
    expect(snip.toLowerCase()).toContain("fox");
    expect(snip.startsWith("…") || snip.startsWith("T")).toBe(true);
  });
  it("returns the start when no match", () => {
    const body = "Hello world this is a note.";
    const snip = makeSnippet(body, "zzz");
    expect(snip.toLowerCase()).toContain("hello");
  });
});

describe("searchNotes", () => {
  it("filters and sorts by score then recency", () => {
    const notes = [
      {
        id: "a",
        title: "journal entry",
        body: "today I wrote",
        updated_at: "2026-01-01",
        tags: [],
      },
      {
        id: "b",
        title: "random",
        body: "my journal log",
        updated_at: "2026-01-02",
        tags: [],
      },
      {
        id: "c",
        title: "nothing",
        body: "here",
        updated_at: "2026-01-03",
        tags: [],
      },
    ];
    const res = searchNotes(notes, "journal");
    expect(res.map((n) => n.id)).toEqual(["a", "b"]);
    expect(res[0].score).toBeGreaterThan(res[1].score);
  });
});
