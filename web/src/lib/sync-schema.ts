import { z } from "zod";
import {
  noteStatusSchema,
  reminderIntensitySchema,
  reminderStatusSchema,
} from "./domain";

/** Gson on Android omits null keys; treat missing as null. */
const nullableString = z.string().nullish().transform((v) => v ?? null);

const syncNoteSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  status: noteStatusSchema,
  pinned_at: nullableString,
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: nullableString,
});

const syncReminderSchema = z.object({
  id: z.string().uuid(),
  note_id: z.string().uuid(),
  fire_at: z.string().min(1),
  timezone: z.string(),
  repeat_rule: nullableString,
  intensity: reminderIntensitySchema,
  status: reminderStatusSchema,
  completed_at: nullableString,
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: nullableString,
});

const syncTagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(40),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: nullableString,
});

const syncNoteTagSchema = z.object({
  id: z.string().uuid(),
  note_id: z.string().uuid(),
  tag_id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: nullableString,
});

export const syncSchema = z.object({
  device_id: z.string().min(1).max(128),
  last_sync_at: z.string(),
  notes: z.array(syncNoteSchema).max(5000),
  reminders: z.array(syncReminderSchema).max(10000),
  tags: z.array(syncTagSchema).max(500).optional().default([]),
  note_tags: z.array(syncNoteTagSchema).max(10000).optional().default([]),
  limit: z.number().int().min(1).max(5000).optional(),
  cursor: z.string().optional(),
});
