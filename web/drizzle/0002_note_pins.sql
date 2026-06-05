ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "pinned_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "notes_user_pinned_updated"
  ON "notes" ("user_id", "pinned_at", "updated_at");
