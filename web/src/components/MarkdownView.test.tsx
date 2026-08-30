import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarkdownView } from "./MarkdownView";

describe("MarkdownView callouts", () => {
  it("renders supported callouts with their default title", () => {
    const html = renderToStaticMarkup(
      <MarkdownView content={"> [!WARNING]\n> Check the deadline."} />,
    );

    expect(html).toContain('class="markdown-callout markdown-callout-warning"');
    expect(html).toContain("<strong>Warning</strong>");
    expect(html).toContain("Check the deadline.");
  });

  it("renders a custom title and nested markdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownView
        content={
          "> [!TIP] Faster capture\n>\n> - Press **Ctrl+N**\n> - Start writing"
        }
      />,
    );

    expect(html).toContain("<strong>Faster capture</strong>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<strong>Ctrl+N</strong>");
  });

  it("keeps ordinary blockquotes unchanged", () => {
    const html = renderToStaticMarkup(
      <MarkdownView content="> A regular quotation." />,
    );

    expect(html).toContain("<blockquote>");
    expect(html).not.toContain("markdown-callout");
  });
});
