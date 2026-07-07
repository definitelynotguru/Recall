CREATE TABLE IF NOT EXISTS "note_revisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "note_id" uuid NOT NULL REFERENCES "notes"("id") ON DELETE CASCADE,
  "title" text NOT NULL DEFAULT '',
  "body" text NOT NULL DEFAULT '',
  "source" text NOT NULL DEFAULT 'edit',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "note_revisions_note_created"
  ON "note_revisions" ("note_id", "created_at");
