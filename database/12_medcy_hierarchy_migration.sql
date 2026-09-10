-- ====================================================================
-- 12. MEDCY HIERARCHY MIGRATION
-- VizagIVF HRMS
-- Adds hospital separation, teams, and team lead hierarchy
-- ====================================================================

-- 1. Create Teams Table
CREATE TABLE IF NOT EXISTS "HRMS_teams" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "hospital" VARCHAR(50) DEFAULT 'medcy_hospitals',
    "lead_employee_id" VARCHAR(255) REFERENCES "HRMS_employees"("id") ON DELETE SET NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add hospital, team_id, and modify hierarchy_level in HRMS_employees
ALTER TABLE "HRMS_employees" 
ADD COLUMN IF NOT EXISTS "hospital" VARCHAR(50) DEFAULT 'vizag_ivf';

-- Remove the old check constraint first if it exists
ALTER TABLE "HRMS_employees" DROP CONSTRAINT IF EXISTS "HRMS_employees_hierarchy_level_check";

-- Add the new constraint with expanded roles
ALTER TABLE "HRMS_employees" 
ADD CONSTRAINT "HRMS_employees_hierarchy_level_check"
CHECK ("hierarchy_level" IN ('employee', 'team_lead', 'manager', 'senior_manager', 'executive'));

ALTER TABLE "HRMS_employees"
ADD COLUMN IF NOT EXISTS "team_id" UUID REFERENCES "HRMS_teams"("id") ON DELETE SET NULL;

-- 3. Add approved_by to Leave Requests for the new approval chain
ALTER TABLE "HRMS_leave_requests"
ADD COLUMN IF NOT EXISTS "approved_by" VARCHAR(255) REFERENCES "HRMS_employees"("id") ON DELETE SET NULL;

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_employees_hospital ON "HRMS_employees"("hospital");
CREATE INDEX IF NOT EXISTS idx_employees_team_id ON "HRMS_employees"("team_id");
CREATE INDEX IF NOT EXISTS idx_leave_requests_approved_by ON "HRMS_leave_requests"("approved_by");
