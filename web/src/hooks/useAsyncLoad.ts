"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useAsyncLoad(loadFn: () => Promise<void>, deps: unknown[]) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadRef = useRef(loadFn);

  useEffect(() => {
    loadRef.current = loadFn;
  }, [loadFn]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      await loadRef.current();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        await loadRef.current();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Something went wrong");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies deps
  }, [reload, ...deps]);

  return { loading, error, reload };
}
