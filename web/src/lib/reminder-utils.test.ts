import { describe, expect, it } from "vitest";
import { groupRemindersByDay } from "./reminder-utils";
import type { ApiReminder } from "./api-client";

function reminder(fireAt: string, id = "1"): ApiReminder {
  return {
    id,
    note_id: "n1",
    note_title: "Note",
    fire_at: fireAt,
    timezone: "UTC",
    repeat_rule: null,
    intensity: "gentle",
    status: "active",
    completed_at: null,
    created_at: fireAt,
    updated_at: fireAt,
    deleted_at: null,
  };
}

describe("groupRemindersByDay", () => {
  it("puts past reminders in overdue", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);
    const groups = groupRemindersByDay([reminder(yesterday.toISOString())]);
    expect(groups.overdue.length).toBe(1);
    expect(groups.today.length).toBe(0);
  });
});
