import { ApiReminder } from "./api-client";

export function groupRemindersByDay(reminders: ApiReminder[]) {
  const active = reminders.filter(
    (r) => r.status === "active" && !r.deleted_at,
  );
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfWeek = new Date(startOfTomorrow);
  startOfWeek.setDate(startOfWeek.getDate() + 6);

  const today: ApiReminder[] = [];
  const tomorrow: ApiReminder[] = [];
  const thisWeek: ApiReminder[] = [];
  const later: ApiReminder[] = [];

  const endOfTomorrow = new Date(startOfTomorrow);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);

  for (const r of active.sort(
    (a, b) => new Date(a.fire_at).getTime() - new Date(b.fire_at).getTime(),
  )) {
    const fire = new Date(r.fire_at);
    if (fire >= startOfToday && fire < startOfTomorrow) today.push(r);
    else if (fire >= startOfTomorrow && fire < endOfTomorrow) tomorrow.push(r);
    else if (fire < startOfWeek) thisWeek.push(r);
    else later.push(r);
  }

  return { today, tomorrow, thisWeek, later };
}

export function formatFireAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
