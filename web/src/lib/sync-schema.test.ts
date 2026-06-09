import { describe, expect, it } from "vitest";
import { syncSchema } from "./sync-schema";

const NOTE_ID = "550e8400-e29b-41d4-a716-446655440000";
const REMINDER_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function validPayload() {
  return {
    device_id: "device-abc",
    last_sync_at: "1970-01-01T00:00:00Z",
    notes: [
      {
        id: NOTE_ID,
        title: "Test",
        body: "",
        status: "active",
        created_at: "2026-05-01T12:00:00.000Z",
        updated_at: "2026-05-01T12:00:00.000Z",
        deleted_at: null,
      },
    ],
    reminders: [
      {
        id: REMINDER_ID,
        note_id: NOTE_ID,
        fire_at: "2026-06-01T09:00:00.000Z",
        timezone: "UTC",
        repeat_rule: null,
        intensity: "gentle",
        status: "active",
        completed_at: null,
        created_at: "2026-05-01T12:00:00.000Z",
        updated_at: "2026-05-01T12:00:00.000Z",
        deleted_at: null,
      },
    ],
  };
}

describe("syncSchema", () => {
  it("accepts a valid Android-shaped payload", () => {
    expect(syncSchema.safeParse(validPayload()).success).toBe(true);
  });

  it("accepts omitted deleted_at (Android Gson null omit)", () => {
    const raw = validPayload();
    const noteWithoutDeleted: Omit<(typeof raw.notes)[0], "deleted_at"> = {
      id: raw.notes[0].id,
      title: raw.notes[0].title,
      body: raw.notes[0].body,
      status: raw.notes[0].status,
      created_at: raw.notes[0].created_at,
      updated_at: raw.notes[0].updated_at,
    };
    raw.notes[0] = noteWithoutDeleted as (typeof raw.notes)[0];
    const parsed = syncSchema.parse(raw);
    expect(parsed.notes[0].deleted_at).toBeNull();
  });

  it("strips unknown keys like user_id", () => {
    const raw = {
      ...validPayload(),
      notes: [{ ...validPayload().notes[0], user_id: NOTE_ID }],
    };
    const parsed = syncSchema.parse(raw);
    expect(parsed.notes[0]).not.toHaveProperty("user_id");
  });

  it("rejects invalid note uuid", () => {
    const raw = validPayload();
    raw.notes[0].id = "not-a-uuid";
    const result = syncSchema.safeParse(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("id"))).toBe(true);
    }
  });

  it("rejects invalid note_id on reminder", () => {
    const raw = validPayload();
    raw.reminders[0].note_id = "bad";
    const result = syncSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });

  it("rejects empty fire_at", () => {
    const raw = validPayload();
    raw.reminders[0].fire_at = "";
    const result = syncSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });

  it("rejects invalid note status", () => {
    const raw = validPayload();
    raw.notes[0].status = "deleted";
    expect(syncSchema.safeParse(raw).success).toBe(false);
  });
});
