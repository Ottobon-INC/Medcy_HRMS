-- ====================================================================
-- 10. MULTI-BRANCH & ORGANIZATIONAL HIERARCHY MIGRATION
-- VizagIVF HRMS
-- Branches: visakhapatnam, vizianagaram
-- Hierarchy: employee (L1) -> manager (L2, Ravi Kumar) -> executive (L3, Indra mam, Anoopama mam)
-- ====================================================================

-- 1. Add Branch column to HRMS_employees
ALTER TABLE "HRMS_employees" 
ADD COLUMN IF NOT EXISTS "branch" VARCHAR(100) DEFAULT 'visakhapatnam' 
CHECK ("branch" IN ('visakhapatnam', 'vizianagaram'));

-- 2. Add Hierarchy Level column to HRMS_employees
ALTER TABLE "HRMS_employees" 
ADD COLUMN IF NOT EXISTS "hierarchy_level" VARCHAR(50) DEFAULT 'employee' 
CHECK ("hierarchy_level" IN ('employee', 'manager', 'executive'));

-- 3. Add Managed Branches JSONB column for Managers & Executives
ALTER TABLE "HRMS_employees" 
ADD COLUMN IF NOT EXISTS "managed_branches" JSONB DEFAULT '["visakhapatnam"]'::jsonb;

-- 4. Add Reporting To column (self-referencing manager employee_id)
ALTER TABLE "HRMS_employees" 
ADD COLUMN IF NOT EXISTS "reporting_to" VARCHAR(255) 
REFERENCES "HRMS_employees"("id") ON DELETE SET NULL;

-- 5. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_employees_branch ON "HRMS_employees"("branch");
CREATE INDEX IF NOT EXISTS idx_employees_hierarchy ON "HRMS_employees"("hierarchy_level");
CREATE INDEX IF NOT EXISTS idx_employees_reporting_to ON "HRMS_employees"("reporting_to");

-- 6. Seed / Upsert Executive Accounts: Indra Mam & Anoopama Mam
INSERT INTO "HRMS_employees" (
    "id",
    "name",
    "email",
    "password",
    "role",
    "designation",
    "joining_date",
    "basic_pay",
    "status",
    "phone",
    "gender",
    "experience",
    "branch",
    "hierarchy_level",
    "managed_branches"
) VALUES 
(
    'EMP-EXEC-001',
    'Indra Mam',
    'indra@vizagivf.com',
    'password',
    'admin',
    'Executive Director',
    '2026-01-01',
    0.00,
    'active',
    '9999999901',
    'female',
    10.0,
    'visakhapatnam',
    'executive',
    '["visakhapatnam", "vizianagaram"]'::jsonb
),
(
    'EMP-EXEC-002',
    'Anoopama Mam',
    'anoopama@vizagivf.com',
    'password',
    'admin',
    'Executive Director',
    '2026-01-01',
    0.00,
    'active',
    '9999999902',
    'female',
    10.0,
    'visakhapatnam',
    'executive',
    '["visakhapatnam", "vizianagaram"]'::jsonb
)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "role" = 'admin',
    "designation" = EXCLUDED."designation",
    "hierarchy_level" = 'executive',
    "managed_branches" = '["visakhapatnam", "vizianagaram"]'::jsonb;

-- 7. Update Ravi Kumar (EMP-2026-011 or by name) as Manager for BOTH branches
UPDATE "HRMS_employees"
SET 
    "role" = 'admin',
    "designation" = 'Branch Operations Manager',
    "hierarchy_level" = 'manager',
    "branch" = 'visakhapatnam',
    "managed_branches" = '["visakhapatnam", "vizianagaram"]'::jsonb
WHERE "id" = 'EMP-2026-011' OR "name" ILIKE '%Ravi Kumar%';

-- 8. Default all base employees to Visakhapatnam, hierarchy_level 'employee', and reporting to Ravi Kumar
UPDATE "HRMS_employees"
SET 
    "branch" = COALESCE("branch", 'visakhapatnam'),
    "hierarchy_level" = CASE 
        WHEN "hierarchy_level" IN ('manager', 'executive') THEN "hierarchy_level" 
        ELSE 'employee' 
    END,
    "reporting_to" = CASE 
        WHEN "id" = 'EMP-2026-011' OR "name" ILIKE '%Ravi Kumar%' OR "hierarchy_level" = 'executive' THEN NULL
        ELSE (SELECT "id" FROM "HRMS_employees" WHERE "id" = 'EMP-2026-011' OR "name" ILIKE '%Ravi Kumar%' LIMIT 1)
    END
WHERE "id" NOT IN ('EMP-EXEC-001', 'EMP-EXEC-002');
