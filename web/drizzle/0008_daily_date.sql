ALTER TABLE "notes" ADD COLUMN "daily_date" text;
CREATE INDEX IF NOT EXISTS "notes_user_daily" ON "notes" ("user_id", "daily_date");
