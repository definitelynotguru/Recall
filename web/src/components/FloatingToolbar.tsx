"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyPrefixLines,
  applyWrap,
  type EditorState,
} from "@/lib/format-commands";
import {
  MarkdownToolbar,
  ToolbarButtons,
  readState,
  restoreSelection,
} from "./MarkdownToolbar";

type Props = {
  value: string;
  onChange: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

export function FloatingToolbar({ value, onChange, textareaRef }: Props) {
  const isDesktop = useIsDesktop();
  const [hasSelection, setHasSelection] = useState(false);

  const updateSelection = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    setHasSelection(
      el.selectionStart !== el.selectionEnd && document.activeElement === el,
    );
  }, [textareaRef]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const onSelect = () => updateSelection();
    const onSelectionChange = () => {
      if (document.activeElement === el) updateSelection();
    };
    el.addEventListener("select", onSelect);
    el.addEventListener("keyup", onSelect);
    el.addEventListener("mouseup", onSelect);
    document.addEventListener("selectionchange", onSelectionChange);
    el.addEventListener("blur", () => setHasSelection(false));
    return () => {
      el.removeEventListener("select", onSelect);
      el.removeEventListener("keyup", onSelect);
      el.removeEventListener("mouseup", onSelect);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [textareaRef, updateSelection]);

  const apply = useCallback(
    (fn: (s: EditorState) => EditorState) => {
      const el = textareaRef.current;
      if (!el) return;
      const out = fn(readState(el, value));
      onChange(out.value);
      restoreSelection(el, out.selectionStart, out.selectionEnd);
      setHasSelection(false);
    },
    [textareaRef, value, onChange],
  );

  if (!isDesktop || !hasSelection) return null;

  return (
    <div className="md-floating-toolbar" role="toolbar" aria-label="Formatting">
      <ToolbarButtons
        onWrap={(p, s, ph) => apply((st) => applyWrap(st, p, s, ph))}
        onPrefixLines={(p) => apply((st) => applyPrefixLines(st, p))}
      />
    </div>
  );
}

export { MarkdownToolbar };
