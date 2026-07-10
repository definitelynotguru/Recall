"use client";

import { useEffect, useRef } from "react";

/** Defer mount work to avoid synchronous setState inside effects (React lint). */
export function useOnMount(effect: () => void | (() => void)) {
  const effectRef = useRef(effect);

  useEffect(() => {
    effectRef.current = effect;
  }, [effect]);

  useEffect(() => {
    let cleanup: void | (() => void);
    const id = window.setTimeout(() => {
      cleanup = effectRef.current();
    }, 0);
    return () => {
      window.clearTimeout(id);
      if (typeof cleanup === "function") cleanup();
    };
  }, []);
}
