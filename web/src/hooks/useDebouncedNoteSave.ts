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
  const loaded = useRef(false);

  useEffect(() => {
    latest.current = { title, body };
  }, [title, body]);

  const flush = useCallback(async () => {
    if (!noteId || !enabled) return false;
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
