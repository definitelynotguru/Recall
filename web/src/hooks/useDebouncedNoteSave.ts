"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export function useDebouncedNoteSave(
  noteId: string,
  title: string,
  body: string,
  enabled = true,
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const latest = useRef({ title, body });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    latest.current = { title, body };
  }, [title, body]);

  const flush = useCallback(async () => {
    if (!noteId || !enabled) return false;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const previous = inFlight.current;
    const request = (async () => {
      if (previous) await previous;
      const { title: t, body: b } = latest.current;
      setStatus("saving");
      try {
        await apiFetch(`/notes/${noteId}`, {
          method: "PATCH",
          body: JSON.stringify({ title: t, body: b }),
        });
        setStatus("saved");
        return true;
      } catch {
        setStatus("error");
        return false;
      }
    })();
    inFlight.current = request;
    const result = await request;
    if (inFlight.current === request) inFlight.current = null;
    return result;
  }, [noteId, enabled]);

  useEffect(() => {
    if (!noteId || !enabled) return;
    if (!loaded.current) {
      loaded.current = true;
      return;
    }

    setStatus("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      flush();
    }, 700);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [noteId, title, body, flush, enabled]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      flush();
    };
  }, [noteId, flush]);

  return { status, flush, retry: flush };
}
