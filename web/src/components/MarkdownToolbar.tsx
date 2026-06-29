"use client";

import { useCallback } from "react";
import {
  Code,
  LinkSimple,
  List,
  TextB,
  TextHOne,
  TextItalic,
} from "@phosphor-icons/react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

export function MarkdownToolbar({ value, onChange, textareaRef }: Props) {
  const restoreSelection = useCallback(
    (el: HTMLTextAreaElement, start: number, end: number) => {
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start, end);
      });
    },
    [],
  );

  const wrapSelection = useCallback(
    (prefix: string, suffix: string, placeholder: string) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = value.slice(start, end) || placeholder;
      const next =
        value.slice(0, start) + prefix + selected + suffix + value.slice(end);
      onChange(next);
      const selStart = start + prefix.length;
      restoreSelection(el, selStart, selStart + selected.length);
    },
    [textareaRef, value, onChange, restoreSelection],
  );

  const prefixLines = useCallback(
    (prefix: string) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const segment = value.slice(lineStart, end);
      const prefixed = segment
        .split("\n")
        .map((line) => (line.startsWith(prefix) ? line : prefix + line))
        .join("\n");
      const next = value.slice(0, lineStart) + prefixed + value.slice(end);
      onChange(next);
      restoreSelection(el, lineStart, lineStart + prefixed.length);
    },
    [textareaRef, value, onChange, restoreSelection],
  );

  return (
    <div className="markdown-toolbar" role="toolbar" aria-label="Formatting">
      <button
        type="button"
        className="md-tool"
        title="Bold"
        aria-label="Bold"
        onClick={() => wrapSelection("**", "**", "bold")}
      >
        <TextB size={18} weight="bold" />
      </button>
      <button
        type="button"
        className="md-tool"
        title="Italic"
        aria-label="Italic"
        onClick={() => wrapSelection("*", "*", "italic")}
      >
        <TextItalic size={18} />
      </button>
      <button
        type="button"
        className="md-tool"
        title="Heading"
        aria-label="Heading"
        onClick={() => prefixLines("# ")}
      >
        <TextHOne size={18} weight="bold" />
      </button>
      <button
        type="button"
        className="md-tool"
        title="Bullet list"
        aria-label="Bullet list"
        onClick={() => prefixLines("- ")}
      >
        <List size={18} />
      </button>
      <button
        type="button"
        className="md-tool"
        title="Inline code"
        aria-label="Inline code"
        onClick={() => wrapSelection("`", "`", "code")}
      >
        <Code size={18} />
      </button>
      <button
        type="button"
        className="md-tool"
        title="Link"
        aria-label="Link"
        onClick={() => wrapSelection("[", "](https://)", "link text")}
      >
        <LinkSimple size={18} />
      </button>
    </div>
  );
}
