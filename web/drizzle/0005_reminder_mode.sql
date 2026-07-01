ALTER TABLE "reminders" ADD COLUMN "reminder_mode" text NOT NULL DEFAULT 'once';
ALTER TABLE "reminders" ADD COLUMN "nag_interval_minutes" integer;
