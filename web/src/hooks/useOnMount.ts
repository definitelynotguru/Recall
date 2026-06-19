"use client";

import { useEffect } from "react";

/** Defer mount work to avoid synchronous setState inside effects (React lint). */
export function useOnMount(effect: () => void | (() => void)) {
  useEffect(() => {
    let cleanup: void | (() => void);
    const id = window.setTimeout(() => {
      cleanup = effect();
    }, 0);
    return () => {
      window.clearTimeout(id);
      if (typeof cleanup === "function") cleanup();
    };
  }, [effect]);
}
