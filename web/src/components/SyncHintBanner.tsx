"use client";

import { DeviceMobile } from "@phosphor-icons/react";
import { loadUserPrefs } from "@/lib/user-prefs";

export function SyncHintBanner() {
  if (!loadUserPrefs().showSyncHint) return null;

  return (
    <div className="hint-banner" style={{ marginTop: 16 }}>
      <DeviceMobile size={22} weight="duotone" color="var(--accent)" />
      <span>
        <strong>Phone notifications.</strong> Open Recall on Android and tap{" "}
        <strong>Sync</strong> after adding or editing reminders here.
      </span>
    </div>
  );
}
