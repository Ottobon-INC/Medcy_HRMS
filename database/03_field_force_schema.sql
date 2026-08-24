-- ====================================================================
-- 03. FIELD FORCE TRACKING SYSTEM SCHEMA (MEDCY HEALTH TECH)
-- Modules: Field Sessions, Field Visits, Field Events, Visit Proofs
-- ====================================================================

-- 1. Field Sessions
CREATE TABLE IF NOT EXISTS "HRMS_field_sessions" (
  "id"               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "employee_id"      VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
  "session_date"     DATE NOT NULL DEFAULT CURRENT_DATE,
  "status"           VARCHAR(50) NOT NULL DEFAULT 'active'
                     CHECK ("status" IN ('active', 'completed', 'cancelled')),
  "started_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ended_at"         TIMESTAMPTZ,
  "start_latitude"   NUMERIC(10, 7),
  "start_longitude"  NUMERIC(10, 7),
  "start_address"    TEXT,
  "end_latitude"     NUMERIC(10, 7),
  "end_longitude"    NUMERIC(10, 7),
  "end_address"      TEXT,
  "notes"            TEXT,
  "created_at"       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_field_session_per_day UNIQUE ("employee_id", "session_date")
);

-- 2. Field Visits
CREATE TABLE IF NOT EXISTS "HRMS_field_visits" (
  "id"                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "session_id"            UUID REFERENCES "HRMS_field_sessions"("id") ON DELETE SET NULL,
  "employee_id"           VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
  "assigned_by"           VARCHAR(255) REFERENCES "HRMS_employees"("id"),
  "visit_type"            VARCHAR(100) NOT NULL DEFAULT 'OTHER',
  "title"                 VARCHAR(255) NOT NULL,
  "description"           TEXT,
  "scheduled_date"        DATE NOT NULL,
  "scheduled_start"       TIME,
  "scheduled_end"         TIME,
  "assigned_latitude"     NUMERIC(10, 7),
  "assigned_longitude"    NUMERIC(10, 7),
  "assigned_address"      TEXT,
  "allowed_radius_meters" INTEGER NOT NULL DEFAULT 150,
  "priority"              VARCHAR(20) DEFAULT 'normal'
                          CHECK ("priority" IN ('low', 'normal', 'high', 'urgent')),
  "status"                VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED'
                          CHECK ("status" IN (
                            'ASSIGNED','EN_ROUTE','ARRIVED',
                            'IN_PROGRESS','COMPLETED','MISSED','CANCELLED','FAILED'
                          )),
  "started_at"            TIMESTAMPTZ,
  "arrived_at"            TIMESTAMPTZ,
  "completed_at"          TIMESTAMPTZ,
  "actual_latitude"       NUMERIC(10, 7),
  "actual_longitude"      NUMERIC(10, 7),
  "actual_address"        TEXT,
  "arrival_distance_m"    INTEGER,
  "duration_minutes"      INTEGER,
  "proof_photo_url"       TEXT,
  "completion_notes"      TEXT,
  "patient_name"          VARCHAR(255),
  "client_reference"      VARCHAR(255),
  "location_exception"    BOOLEAN DEFAULT FALSE,
  "created_at"            TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Field Visit Events
CREATE TABLE IF NOT EXISTS "HRMS_field_visit_events" (
  "id"             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "visit_id"       UUID REFERENCES "HRMS_field_visits"("id") ON DELETE CASCADE,
  "session_id"     UUID REFERENCES "HRMS_field_sessions"("id") ON DELETE SET NULL,
  "employee_id"    VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
  "event_type"     VARCHAR(100) NOT NULL
                   CHECK ("event_type" IN (
                     'FIELD_DUTY_STARTED','FIELD_DUTY_ENDED',
                     'VISIT_EN_ROUTE','VISIT_ARRIVED',
                     'VISIT_IN_PROGRESS','VISIT_COMPLETED',
                     'VISIT_CANCELLED','VISIT_MISSED',
                     'PROOF_CAPTURED','LOCATION_EXCEPTION'
                   )),
  "occurred_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "latitude"       NUMERIC(10, 7),
  "longitude"      NUMERIC(10, 7),
  "accuracy_m"     NUMERIC(8, 2),
  "address"        TEXT,
  "metadata"       JSONB DEFAULT '{}'::jsonb,
  "synced"         BOOLEAN DEFAULT TRUE,
  "created_at"     TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Field Visit Proofs
CREATE TABLE IF NOT EXISTS "HRMS_field_visit_proofs" (
  "id"          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "visit_id"    UUID NOT NULL REFERENCES "HRMS_field_visits"("id") ON DELETE CASCADE,
  "proof_type"  VARCHAR(50) NOT NULL
                CHECK ("proof_type" IN ('photo', 'note', 'signature', 'otp', 'document')),
  "content"     TEXT NOT NULL,
  "captured_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "latitude"    NUMERIC(10, 7),
  "longitude"   NUMERIC(10, 7),
  "created_at"  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_visits_emp_date ON "HRMS_field_visits"("employee_id", "scheduled_date");
CREATE INDEX IF NOT EXISTS idx_field_events_visit ON "HRMS_field_visit_events"("visit_id");
