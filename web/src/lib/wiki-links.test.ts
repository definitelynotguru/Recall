import { describe, expect, it } from "vitest";
import { findUnlinkedMentions, linkFirstUnlinkedMention } from "./wiki-links";

describe("unlinked mentions", () => {
  const notes = [
    { id: "current", title: "Project Atlas", body: "" },
    {
      id: "plain",
      title: "Planning",
      body: "Project Atlas needs a launch checklist.",
    },
    {
      id: "linked",
      title: "References",
      body: "See [[Project Atlas]] for details.",
    },
    {
      id: "mixed",
      title: "Retrospective",
      body: "[[Project Atlas]] shipped. Project Atlas was successful.",
    },
    { id: "other", title: "Other", body: "No related text." },
  ];

  it("finds plain mentions outside the current note and existing links", () => {
    expect(findUnlinkedMentions(notes, "current", "Project Atlas")).toEqual([
      notes[1],
      notes[3],
    ]);
  });

  it("converts the first plain mention without nesting existing links", () => {
    expect(
      linkFirstUnlinkedMention(
        "[[Project Atlas]] and project atlas again",
        "Project Atlas",
      ),
    ).toBe("[[Project Atlas]] and [[project atlas]] again");
  });

  it("leaves content unchanged when no plain mention exists", () => {
    expect(linkFirstUnlinkedMention("[[Project Atlas]]", "Project Atlas")).toBe(
      "[[Project Atlas]]",
    );
    expect(
      linkFirstUnlinkedMention(
        "[Project Atlas](https://example.com)",
        "Project Atlas",
      ),
    ).toBe("[Project Atlas](https://example.com)");
    expect(
      linkFirstUnlinkedMention(
        "[Project Atlas][atlas]\n\n[atlas]: https://example.com",
        "Project Atlas",
      ),
    ).toBe("[Project Atlas][atlas]\n\n[atlas]: https://example.com");
  });
});
