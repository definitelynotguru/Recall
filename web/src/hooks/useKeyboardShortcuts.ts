"use client";

import { useEffect } from "react";

type ShortcutHandler = () => void | Promise<void>;

type KeyboardShortcuts = {
  onNewNote?: ShortcutHandler;
  onSearch?: ShortcutHandler;
  onSaveAndClose?: ShortcutHandler;
  onTogglePreview?: ShortcutHandler;
  onTogglePin?: ShortcutHandler;
};

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((!event.metaKey && !event.ctrlKey) || event.altKey || event.repeat) {
        return;
      }

      const key = event.key.toLowerCase();
      let handler: ShortcutHandler | undefined;
      if (key === "n" && !event.shiftKey) handler = shortcuts.onNewNote;
      else if (key === "k" && !event.shiftKey) handler = shortcuts.onSearch;
      else if (key === "enter" && !event.shiftKey) {
        handler = shortcuts.onSaveAndClose;
      } else if (key === "e" && !event.shiftKey) {
        handler = shortcuts.onTogglePreview;
      } else if (key === "p" && event.shiftKey) {
        handler = shortcuts.onTogglePin;
      }

      if (!handler) return;
      event.preventDefault();
      void handler();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [shortcuts]);
}
