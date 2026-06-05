CREATE TABLE IF NOT EXISTS "tags" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "tags_user_name" ON "tags" ("user_id", "name");

CREATE TABLE IF NOT EXISTS "note_tags" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "note_id" uuid NOT NULL REFERENCES "notes"("id") ON DELETE cascade,
  "tag_id" uuid NOT NULL REFERENCES "tags"("id") ON DELETE cascade,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "note_tags_user_note" ON "note_tags" ("user_id", "note_id");
CREATE INDEX IF NOT EXISTS "note_tags_user_tag" ON "note_tags" ("user_id", "tag_id");
