"use client";

import { X } from "@phosphor-icons/react";
import { MarkdownView } from "./MarkdownView";
import { useDialogA11y } from "@/hooks/useDialogA11y";

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
    title: "Bold & italic",
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
  const { dialogRef, onDialogKeyDown } = useDialogA11y(onClose, open);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="dialog-sheet dialog-wide panel panel-pad"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onDialogKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="markdown-cheat-sheet-title"
        aria-describedby="markdown-cheat-sheet-description"
        tabIndex={-1}
      >
        <div className="dialog-header">
          <div>
            <h2 id="markdown-cheat-sheet-title" className="dialog-title">
              Markdown cheat sheet
            </h2>
            <p
              id="markdown-cheat-sheet-description"
              className="dialog-subtitle"
            >
              Syntax reference for formatting your notes
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="cheat-sheet-grid">
          {CHEAT_SHEET_SECTIONS.map((section) => (
            <div key={section.title} className="cheat-sheet-item">
              <h3>{section.title}</h3>
              <div className="cheat-sheet-content">
                <pre className="mono cheat-sheet-code">{section.syntax}</pre>
                <div>
                  <MarkdownView content={section.syntax} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
