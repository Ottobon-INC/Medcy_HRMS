-- ====================================================================
-- 14. DOCTOR VISITS SCHEMA
-- VizagIVF HRMS
-- Table for field reps to plan weekly doctor visits
-- ====================================================================

CREATE TABLE IF NOT EXISTS "HRMS_doctor_visits" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "employee_id" VARCHAR(255) REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "visit_date" DATE NOT NULL,
    "doctor_name" VARCHAR(255) NOT NULL,
    "clinic_name" VARCHAR(255),
    "area" VARCHAR(255),
    "time_slot" VARCHAR(50),
    "visit_purpose" VARCHAR(255),
    "status" VARCHAR(50) DEFAULT 'planned' CHECK ("status" IN ('planned', 'completed', 'missed', 'rescheduled')),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_doctor_visits_emp_date ON "HRMS_doctor_visits"("employee_id", "visit_date");
CREATE INDEX IF NOT EXISTS idx_doctor_visits_date ON "HRMS_doctor_visits"("visit_date");
