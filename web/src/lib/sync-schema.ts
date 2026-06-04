import { z } from "zod";

/** Gson on Android omits null keys; treat missing as null. */
const nullableString = z.string().nullish().transform((v) => v ?? null);

export const syncNoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: nullableString,
});

export const syncReminderSchema = z.object({
  id: z.string().uuid(),
  note_id: z.string().uuid(),
  fire_at: z.string().min(1),
  timezone: z.string(),
  repeat_rule: nullableString,
  intensity: z.string().min(1),
  status: z.string(),
  completed_at: nullableString,
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: nullableString,
});

export const syncSchema = z.object({
  device_id: z.string().min(1),
  last_sync_at: z.string(),
  notes: z.array(syncNoteSchema),
  reminders: z.array(syncReminderSchema),
});

export type SyncRequestBody = z.infer<typeof syncSchema>;
