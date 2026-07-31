export type TemplateContext = {
  title?: string;
  now?: Date;
};

export function expandTemplate(
  text: string,
  ctx: TemplateContext = {},
): string {
  const now = ctx.now ?? new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toISOString().slice(11, 16);
  const title = ctx.title ?? "";
  return text
    .replace(/\{\{\s*date\s*\}\}/gi, date)
    .replace(/\{\{\s*time\s*\}\}/gi, time)
    .replace(/\{\{\s*title\s*\}\}/gi, title);
}

export type DefaultTemplate = {
  title: string;
  body: string;
};

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    title: "Daily Journal",
    body: [
      "# {{date}}",
      "",
      "**Mood:** ",
      "",
      "## What I did today",
      "- ",
      "",
      "## Tomorrow",
      "- ",
      "",
    ].join("\n"),
  },
  {
    title: "Meeting Notes",
    body: [
      "# {{title}} — {{date}}",
      "",
      "**Attendees:** ",
      "",
      "## Agenda",
      "- ",
      "",
      "## Notes",
      "- ",
      "",
      "## Action items",
      "- [ ] ",
      "",
    ].join("\n"),
  },
  {
    title: "Project Brief",
    body: [
      "# {{title}}",
      "",
      "## Goal",
      "What does success look like?",
      "",
      "## Scope",
      "- In: ",
      "- Out: ",
      "",
      "## Milestones",
      "- [ ] ",
      "",
      "## Notes",
      "- ",
      "",
    ].join("\n"),
  },
];
