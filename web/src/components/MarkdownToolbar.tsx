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
import {
  applyPrefixLines,
  applyWrap,
  type EditorState,
} from "@/lib/format-commands";

type Props = {
  value: string;
  onChange: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

export function readState(el: HTMLTextAreaElement, value: string): EditorState {
  return {
    value,
    selectionStart: el.selectionStart,
    selectionEnd: el.selectionEnd,
  };
}

export function restoreSelection(
  el: HTMLTextAreaElement,
  start: number,
  end: number,
) {
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start, end);
  });
}

export function MarkdownToolbar({ value, onChange, textareaRef }: Props) {
  const apply = useCallback(
    (fn: (s: EditorState) => EditorState) => {
      const el = textareaRef.current;
      if (!el) return;
      const out = fn(readState(el, value));
      onChange(out.value);
      restoreSelection(el, out.selectionStart, out.selectionEnd);
    },
    [textareaRef, value, onChange],
  );

  const onWrap = useCallback(
    (prefix: string, suffix: string, placeholder: string) =>
      apply((s) => applyWrap(s, prefix, suffix, placeholder)),
    [apply],
  );
  const onPrefixLines = useCallback(
    (prefix: string) => apply((s) => applyPrefixLines(s, prefix)),
    [apply],
  );

  return (
    <div className="markdown-toolbar" role="toolbar" aria-label="Formatting">
      <ToolbarButtons onWrap={onWrap} onPrefixLines={onPrefixLines} />
    </div>
  );
}

export type ToolbarButtonsProps = {
  onWrap: (prefix: string, suffix: string, placeholder: string) => void;
  onPrefixLines: (prefix: string) => void;
};

export function ToolbarButtons({ onWrap, onPrefixLines }: ToolbarButtonsProps) {
  return (
    <>
      <button
        type="button"
        className="md-tool"
        title="Bold"
        aria-label="Bold"
        onClick={() => onWrap("**", "**", "bold")}
      >
        <TextB size={18} weight="bold" />
      </button>
      <button
        type="button"
        className="md-tool"
        title="Italic"
        aria-label="Italic"
        onClick={() => onWrap("*", "*", "italic")}
      >
        <TextItalic size={18} />
      </button>
      <button
        type="button"
        className="md-tool"
        title="Heading"
        aria-label="Heading"
        onClick={() => onPrefixLines("# ")}
      >
        <TextHOne size={18} weight="bold" />
      </button>
      <button
        type="button"
        className="md-tool"
        title="Bullet list"
        aria-label="Bullet list"
        onClick={() => onPrefixLines("- ")}
      >
        <List size={18} />
      </button>
      <button
        type="button"
        className="md-tool"
        title="Inline code"
        aria-label="Inline code"
        onClick={() => onWrap("`", "`", "code")}
      >
        <Code size={18} />
      </button>
      <button
        type="button"
        className="md-tool"
        title="Link"
        aria-label="Link"
        onClick={() => onWrap("[", "](https://)", "link text")}
      >
        <LinkSimple size={18} />
      </button>
    </>
  );
}
