"use client";

import { Sparkle, NotePencil, DeviceMobile, X } from "@phosphor-icons/react";
import { setOnboardingDone } from "@/lib/user-prefs";

const APK_URL =
  "https://github.com/definitelynotguru/Recall/releases/download/v1.0.4-debug/recall-1.0.4-debug.apk";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function OnboardingDialog({ open, onClose }: Props) {
  if (!open) return null;

  const dismiss = () => {
    setOnboardingDone();
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={dismiss}>
      <div
        className="dialog-sheet panel panel-pad"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              margin: 0,
              fontSize: "1.35rem",
            }}
          >
            Welcome to Recall
          </h2>
          <button type="button" className="btn-ghost" onClick={dismiss} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <ol className="onboarding-steps">
          <li>
            <NotePencil size={22} color="var(--copper)" />
            <div>
              <strong>Write notes</strong>
              <p>Markdown on web or phone. Dates can live in the title or body.</p>
            </div>
          </li>
          <li>
            <Sparkle size={22} color="var(--copper)" />
            <div>
              <strong>Fetch reminders</strong>
              <p>We detect birthdays, meetings, and Day/Month/Year blocks — smart repeats included.</p>
            </div>
          </li>
          <li>
            <DeviceMobile size={22} color="var(--copper)" />
            <div>
              <strong>Sync on Android</strong>
              <p>
                Install the app, sign in, tap <strong>Sync</strong>. Only your phone notifies you.
              </p>
              <a
                href={APK_URL}
                className="btn btn-secondary"
                style={{ marginTop: 10, display: "inline-flex" }}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Android APK
              </a>
            </div>
          </li>
        </ol>

        <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={dismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}
