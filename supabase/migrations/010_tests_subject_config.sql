-- Add per-subject daily time configuration to tests
ALTER TABLE tests ADD COLUMN IF NOT EXISTS subject_config_json JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tests.subject_config_json IS
  'Array of {subject_id, subject_name, daily_minutes} — daily study budget per subject';
