"use client";

import { DeviceMobile } from "@phosphor-icons/react";
import { ApiReminder } from "@/lib/api-client";
import { formatRepeatLabel } from "@/lib/repeat-rules";
import { formatFireAt } from "@/lib/reminder-utils";

type Props = {
  reminder: ApiReminder | null;
  scope?: "note" | "global";
};

export function NextNudgeCard({ reminder, scope = "global" }: Props) {
  if (!reminder) return null;

  return (
    <div className="next-nudge-card panel panel-pad">
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <DeviceMobile size={24} weight="duotone" color="var(--accent)" />
        <div>
          <p className="next-nudge-label">
            {scope === "note" ? "Next on this note" : "Next nudge"} (after sync)
          </p>
          <p className="next-nudge-time">{formatFireAt(reminder.fire_at)}</p>
          {reminder.repeat_rule && (
            <span className="chip" style={{ marginTop: 8 }}>
              {formatRepeatLabel(reminder.repeat_rule)}
            </span>
          )}
          <p className="next-nudge-foot">
            Delivered on your Android device after you sync — not in the browser.
          </p>
        </div>
      </div>
    </div>
  );
}
