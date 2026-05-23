import { z } from "zod";

export const syncNoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});

export const syncReminderSchema = z.object({
  id: z.string().uuid(),
  note_id: z.string().uuid(),
  fire_at: z.string().min(1),
  timezone: z.string(),
  repeat_rule: z.string().nullable(),
  intensity: z.string().min(1),
  status: z.string(),
  completed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});

export const syncSchema = z.object({
  device_id: z.string().min(1),
  last_sync_at: z.string(),
  notes: z.array(syncNoteSchema),
  reminders: z.array(syncReminderSchema),
});

export type SyncRequestBody = z.infer<typeof syncSchema>;
