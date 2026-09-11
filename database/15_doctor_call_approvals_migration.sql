-- ====================================================================
-- 15. DOCTOR CALL APPROVALS & TEAM LEAD HIERARCHY MIGRATION
-- VizagIVF & Medcy Hospitals HRMS
-- Enables:
-- 1. Self-service doctor visit planning for employees (pending lead approval)
-- 2. Direct doctor visit logging for Team Leads (auto-approved)
-- 3. Team Lead approval workflow & member task/call assignments
-- ====================================================================

-- 1. Extend HRMS_field_visits with approval workflow & doctor details
ALTER TABLE "HRMS_field_visits"
ADD COLUMN IF NOT EXISTS "approval_status" VARCHAR(50) DEFAULT 'approved';

-- Drop constraint if exists and re-apply
ALTER TABLE "HRMS_field_visits" DROP CONSTRAINT IF EXISTS "HRMS_field_visits_approval_status_check";
ALTER TABLE "HRMS_field_visits"
ADD CONSTRAINT "HRMS_field_visits_approval_status_check"
CHECK ("approval_status" IN ('pending', 'approved', 'rejected'));

ALTER TABLE "HRMS_field_visits"
ADD COLUMN IF NOT EXISTS "approved_by" VARCHAR(255) REFERENCES "HRMS_employees"("id") ON DELETE SET NULL;

ALTER TABLE "HRMS_field_visits"
ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;

ALTER TABLE "HRMS_field_visits"
ADD COLUMN IF NOT EXISTS "doctor_name" VARCHAR(255);

ALTER TABLE "HRMS_field_visits"
ADD COLUMN IF NOT EXISTS "clinic_name" VARCHAR(255);

ALTER TABLE "HRMS_field_visits"
ADD COLUMN IF NOT EXISTS "area" VARCHAR(255);

ALTER TABLE "HRMS_field_visits"
ADD COLUMN IF NOT EXISTS "time_slot" VARCHAR(50);

ALTER TABLE "HRMS_field_visits"
ADD COLUMN IF NOT EXISTS "visit_purpose" VARCHAR(255);

-- 2. Also enhance HRMS_doctor_visits if used in parallel
DO $$ 
BEGIN 
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'HRMS_doctor_visits') THEN
    ALTER TABLE "HRMS_doctor_visits" ADD COLUMN IF NOT EXISTS "approval_status" VARCHAR(50) DEFAULT 'approved';
    ALTER TABLE "HRMS_doctor_visits" ADD COLUMN IF NOT EXISTS "approved_by" VARCHAR(255) REFERENCES "HRMS_employees"("id") ON DELETE SET NULL;
    ALTER TABLE "HRMS_doctor_visits" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;
  END IF;
END $$;

-- 3. Performance Indexes for Team Lead Approvals & Roster Queries
CREATE INDEX IF NOT EXISTS idx_field_visits_emp_date ON "HRMS_field_visits"("employee_id", "scheduled_date");
CREATE INDEX IF NOT EXISTS idx_field_visits_approval ON "HRMS_field_visits"("approval_status");
CREATE INDEX IF NOT EXISTS idx_field_visits_assigned_by ON "HRMS_field_visits"("assigned_by");
CREATE INDEX IF NOT EXISTS idx_field_visits_approved_by ON "HRMS_field_visits"("approved_by");
