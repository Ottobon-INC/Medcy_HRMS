-- ====================================================================
-- 16. HIERARCHY ADMIN CONTROLS & AUDIT TRAIL
-- VizagIVF HRMS
-- Dynamic multi-organization reporting structure with audit logging
-- ====================================================================

-- 1. Create Hierarchy Audit Trail Table
CREATE TABLE IF NOT EXISTS "HRMS_hierarchy_audit" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "changed_by_id" VARCHAR(255) REFERENCES "HRMS_employees"("id") ON DELETE SET NULL,
    "changed_by_name" VARCHAR(255),
    "employee_id" VARCHAR(255) REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "employee_name" VARCHAR(255),
    "action_type" VARCHAR(50) NOT NULL, -- 'reassign', 'promote', 'demote', 'unassign', 'update'
    "old_values" JSONB DEFAULT '{}'::jsonb,
    "new_values" JSONB DEFAULT '{}'::jsonb,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure indexes on HRMS_hierarchy_audit
CREATE INDEX IF NOT EXISTS idx_hierarchy_audit_employee_id ON "HRMS_hierarchy_audit"("employee_id");
CREATE INDEX IF NOT EXISTS idx_hierarchy_audit_changed_by ON "HRMS_hierarchy_audit"("changed_by_id");
CREATE INDEX IF NOT EXISTS idx_hierarchy_audit_created_at ON "HRMS_hierarchy_audit"("created_at" DESC);

-- 3. Ensure foreign key on reporting_to allows null and doesn't restrict
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'HRMS_employees' AND column_name = 'reporting_to'
    ) THEN
        ALTER TABLE "HRMS_employees" ADD COLUMN "reporting_to" VARCHAR(255) REFERENCES "HRMS_employees"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Ensure hierarchy_level constraint permits all standard levels
ALTER TABLE "HRMS_employees" DROP CONSTRAINT IF EXISTS "HRMS_employees_hierarchy_level_check";
ALTER TABLE "HRMS_employees" ADD CONSTRAINT "HRMS_employees_hierarchy_level_check"
    CHECK ("hierarchy_level" IN ('employee', 'team_lead', 'manager', 'senior_manager', 'executive'));

-- 5. Performance index on reporting_to and hierarchy_level
CREATE INDEX IF NOT EXISTS idx_employees_reporting_to_tree ON "HRMS_employees"("reporting_to");
CREATE INDEX IF NOT EXISTS idx_employees_hierarchy_level ON "HRMS_employees"("hierarchy_level");
