import { describe, it, expect } from "vitest";
import { expandTemplate, DEFAULT_TEMPLATES } from "./templates";

describe("expandTemplate", () => {
  it("replaces date, time, and title variables", () => {
    const out = expandTemplate("# {{title}} — {{date}} at {{time}}", {
      title: "Sprint review",
      now: new Date("2026-07-07T09:30:00.000Z"),
    });
    expect(out).toBe("# Sprint review — 2026-07-07 at 09:30");
  });

  it("is case-insensitive and tolerates whitespace in braces", () => {
    const out = expandTemplate("{{  DATE  }} {{Time}}", {
      now: new Date("2026-07-07T09:30:00.000Z"),
    });
    expect(out).toBe("2026-07-07 09:30");
  });

  it("leaves unknown braces untouched", () => {
    const out = expandTemplate("{{author}} {{date}}", {
      now: new Date("2026-07-07T00:00:00.000Z"),
    });
    expect(out).toBe("{{author}} 2026-07-07");
  });

  it("defaults title to empty and uses now when omitted", () => {
    const out = expandTemplate("[{{title}}] {{date}}");
    expect(out.startsWith("[]")).toBe(true);
  });
});

describe("DEFAULT_TEMPLATES", () => {
  it("ships three templates with variable placeholders", () => {
    expect(DEFAULT_TEMPLATES).toHaveLength(3);
    const titles = DEFAULT_TEMPLATES.map((t) => t.title);
    expect(titles).toEqual(["Daily Journal", "Meeting Notes", "Project Brief"]);
    expect(DEFAULT_TEMPLATES.every((t) => t.body.includes("{{"))).toBe(true);
  });
});
