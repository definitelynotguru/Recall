// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDebouncedNoteSave } from "./useDebouncedNoteSave";

const apiFetch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({ apiFetch }));

afterEach(() => {
  apiFetch.mockReset();
  vi.useRealTimers();
});

describe("useDebouncedNoteSave", () => {
  it("cancels a scheduled save when changes are flushed immediately", async () => {
    vi.useFakeTimers();
    apiFetch.mockResolvedValue({});
    const { result, rerender } = renderHook(
      ({ title }) => useDebouncedNoteSave("note-id", title, "Body"),
      { initialProps: { title: "First" } },
    );
    rerender({ title: "Updated" });

    await act(() => result.current.flush());
    await act(() => vi.advanceTimersByTimeAsync(700));

    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it("waits for an in-flight save before starting another", async () => {
    let finishFirst: (() => void) | undefined;
    apiFetch
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishFirst = () => resolve({});
          }),
      )
      .mockResolvedValueOnce({});
    const { result } = renderHook(() =>
      useDebouncedNoteSave("note-id", "Title", "Body"),
    );

    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    let third!: Promise<boolean>;
    act(() => {
      first = result.current.flush();
      second = result.current.flush();
      third = result.current.flush();
    });
    expect(apiFetch).toHaveBeenCalledTimes(1);

    finishFirst?.();
    await act(async () => {
      await Promise.all([first, second, third]);
    });

    expect(apiFetch).toHaveBeenCalledTimes(3);
  });
});
