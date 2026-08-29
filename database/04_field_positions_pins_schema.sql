-- ====================================================================
-- 04. FIELD POSITION TRAIL & CUSTOM PINS SCHEMA (MEDCY HEALTH TECH)
-- Modules: Field Visit Positions (Breadcrumb Trail), Field Visit Pins
-- ====================================================================

-- 1. Field Visit Pins (Custom location markers dropped by field employees)
CREATE TABLE IF NOT EXISTS "HRMS_field_visit_pins" (
  "id"          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "visit_id"    UUID NOT NULL REFERENCES "HRMS_field_visits"("id") ON DELETE CASCADE,
  "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
  "latitude"    NUMERIC(10, 7) NOT NULL,
  "longitude"   NUMERIC(10, 7) NOT NULL,
  "category"    VARCHAR(100) NOT NULL DEFAULT 'Other',
  "label"       VARCHAR(255),
  "note"        TEXT,
  "photo_url"   TEXT,
  "pinned_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_at"  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_pins_visit ON "HRMS_field_visit_pins"("visit_id");
CREATE INDEX IF NOT EXISTS idx_visit_pins_emp ON "HRMS_field_visit_pins"("employee_id");

-- 2. Field Visit Positions (Continuous GPS telemetry breadcrumb trail)
CREATE TABLE IF NOT EXISTS "HRMS_field_visit_positions" (
  "id"          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "visit_id"    UUID REFERENCES "HRMS_field_visits"("id") ON DELETE CASCADE,
  "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
  "latitude"    NUMERIC(10, 7) NOT NULL,
  "longitude"   NUMERIC(10, 7) NOT NULL,
  "heading"     NUMERIC(6, 2),
  "speed_kmh"   NUMERIC(6, 2),
  "accuracy_m"  NUMERIC(8, 2),
  "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_positions_visit_time
  ON "HRMS_field_visit_positions"("visit_id", "recorded_at");

-- ====================================================================
-- Optional: Automated 90-Day Retention Policy Cleanup
-- Execute in Supabase SQL editor if pg_cron is enabled or configure as scheduled edge function:
-- ====================================================================
-- CREATE OR REPLACE FUNCTION cleanup_old_field_positions()
-- RETURNS void AS $$
-- BEGIN
--   DELETE FROM "HRMS_field_visit_positions"
--   WHERE recorded_at < NOW() - INTERVAL '90 days';
-- END;
-- $$ LANGUAGE plpgsql;
--
-- SELECT cron.schedule('0 3 * * *', 'SELECT cleanup_old_field_positions()');
