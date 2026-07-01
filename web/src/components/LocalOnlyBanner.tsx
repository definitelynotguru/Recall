"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DISMISS_KEY = "recall_local_banner_dismissed";

type Props = {
  onSignUp?: () => void;
};

export function LocalOnlyBanner({ onSignUp }: Props) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setTimeout(() => {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="hint-banner">
      <span>
        You&apos;re writing locally. Sign up to sync across devices.
      </span>
      <Link
        href="/register"
        className="btn btn-primary"
        onClick={onSignUp}
      >
        Sign up
      </Link>
      <Link href="/login" className="btn btn-secondary">
        Sign in
      </Link>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ marginLeft: "auto" }}
      >
        ✕
      </button>
    </div>
  );
}
