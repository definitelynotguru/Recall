import { formatRepeatLabel } from "@/lib/repeat-rules";
import { formatFireAt } from "@/lib/reminder-utils";

type Props = {
  fireAt: string;
  repeatRule?: string | null;
  className?: string;
};

export function ReminderMeta({ fireAt, repeatRule, className }: Props) {
  return (
    <div className={className}>
      <span className="timeline-meta">{formatFireAt(fireAt)}</span>
      {repeatRule && (
        <span className="chip" style={{ marginLeft: 8 }}>
          {formatRepeatLabel(repeatRule)}
        </span>
      )}
    </div>
  );
}
