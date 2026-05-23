CREATE TABLE IF NOT EXISTS debug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL DEFAULT '',
  app_version TEXT NOT NULL DEFAULT '',
  api_base_url TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS debug_reports_user_created ON debug_reports (user_id, created_at DESC);
