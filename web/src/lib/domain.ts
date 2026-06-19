import { z } from "zod";

export const noteStatusSchema = z.enum(["active", "archived"]);
export const reminderStatusSchema = z.enum(["active", "completed", "cancelled"]);
export const reminderIntensitySchema = z.enum(["gentle", "persistent", "escalating"]);
