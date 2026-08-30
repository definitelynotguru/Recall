// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

function Harness({
  onNewNote,
  onSearch,
  onSaveAndClose,
  onTogglePreview,
  onTogglePin,
}: Record<string, () => void>) {
  useKeyboardShortcuts({
    onNewNote,
    onSearch,
    onSaveAndClose,
    onTogglePreview,
    onTogglePin,
  });
  return <input aria-label="Editor" />;
}

describe("useKeyboardShortcuts", () => {
  it.each([
    ["n", false, "onNewNote"],
    ["k", false, "onSearch"],
    ["Enter", false, "onSaveAndClose"],
    ["e", false, "onTogglePreview"],
    ["p", true, "onTogglePin"],
  ])("handles the primary-%s shortcut", (key, shiftKey, expected) => {
    const handlers = {
      onNewNote: vi.fn(),
      onSearch: vi.fn(),
      onSaveAndClose: vi.fn(),
      onTogglePreview: vi.fn(),
      onTogglePin: vi.fn(),
    };
    render(<Harness {...handlers} />);

    const event = new KeyboardEvent("keydown", {
      key,
      ctrlKey: true,
      shiftKey,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(handlers[expected as keyof typeof handlers]).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });

  it("ignores shortcuts without a primary modifier", () => {
    const onNewNote = vi.fn();
    render(
      <Harness
        onNewNote={onNewNote}
        onSearch={vi.fn()}
        onSaveAndClose={vi.fn()}
        onTogglePreview={vi.fn()}
        onTogglePin={vi.fn()}
      />,
    );

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "n" }));

    expect(onNewNote).not.toHaveBeenCalled();
  });

  it("ignores repeated keydown events", () => {
    const onNewNote = vi.fn();
    render(
      <Harness
        onNewNote={onNewNote}
        onSearch={vi.fn()}
        onSaveAndClose={vi.fn()}
        onTogglePreview={vi.fn()}
        onTogglePin={vi.fn()}
      />,
    );

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "n",
        ctrlKey: true,
        repeat: true,
      }),
    );

    expect(onNewNote).not.toHaveBeenCalled();
  });
});
