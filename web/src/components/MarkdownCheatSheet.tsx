"use client";

import { X } from "@phosphor-icons/react";
import { MarkdownView } from "./MarkdownView";

type Props = {
  open: boolean;
  onClose: () => void;
};

const CHEAT_SHEET_SECTIONS: { title: string; syntax: string }[] = [
  {
    title: "Headings",
    syntax: "# Heading 1\n## Heading 2\n### Heading 3",
  },
  {
    title: "Bold & Italic",
    syntax: "**bold text**\n*italic text*\n~~strikethrough~~",
  },
  {
    title: "Lists",
    syntax: "- Bullet item\n- Another item\n\n1. Numbered\n2. Second item",
  },
  {
    title: "Checkboxes",
    syntax: "- [x] Done task\n- [ ] Pending task",
  },
  {
    title: "Links",
    syntax: "[Link text](https://example.com)\n[[Note Title]]",
  },
  {
    title: "Code",
    syntax: "`inline code`\n\n```\ncode block\n```",
  },
  {
    title: "Blockquote",
    syntax: "> This is a quote\n> spanning two lines",
  },
  {
    title: "Divider",
    syntax: "Text above\n\n---\n\nText below",
  },
  {
    title: "Table",
    syntax: "| Col A | Col B |\n|-------|-------|\n| 1 | 2 |",
  },
];

export function MarkdownCheatSheet({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-sheet panel panel-pad"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 720, maxHeight: "85vh", overflow: "auto" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                margin: "0 0 6px",
                fontSize: "1.25rem",
                letterSpacing: "-0.02em",
              }}
            >
              Markdown Cheat Sheet
            </h2>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--parchment-muted)" }}>
              Syntax reference for formatting your notes
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
        >
          {CHEAT_SHEET_SECTIONS.map((section) => (
            <div key={section.title} className="panel panel-pad" style={{ margin: 0 }}>
              <h3
                style={{
                  margin: "0 0 10px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "var(--parchment-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {section.title}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <pre
                  className="mono"
                  style={{
                    margin: 0,
                    padding: 10,
                    background: "var(--surface-2)",
                    borderRadius: 8,
                    fontSize: "0.82rem",
                    overflow: "auto",
                  }}
                >
                  {section.syntax}
                </pre>
                <div style={{ fontSize: "0.85rem" }}>
                  <MarkdownView content={section.syntax} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="dialog-actions" style={{ marginTop: 20 }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
