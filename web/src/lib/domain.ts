import { z } from "zod";

export const noteStatusSchema = z.enum(["active", "archived"]);
export const reminderStatusSchema = z.enum(["active", "completed", "cancelled"]);
export const reminderIntensitySchema = z.enum(["gentle", "persistent", "escalating"]);

export type NoteStatus = z.infer<typeof noteStatusSchema>;
export type ReminderStatus = z.infer<typeof reminderStatusSchema>;
export type ReminderIntensity = z.infer<typeof reminderIntensitySchema>;
