-- ====================================================================
-- 21. ADD VINAY BHUSHAN AS TEAM LEAD (REPORTING TO RAVI KUMAR)
--     AND ASSIGN BHASKAR & SATISH AS HIS TEAM MEMBERS
-- VizagIVF HRMS
-- ====================================================================

-- 1. Insert core employee record for Vinay Bushan
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
    "dob"
) VALUES (
    'EMP-2026-023',
    'Vinay Bushan',
    'vinaybhushan0925@gmail.com',
    'vinaybhushan0925@gmail.com',
    'admin',
    'Team Lead',
    '2026-09-01',
    0.00,
    'active',
    '8897561317',
    'male',
    0.0,
    '1995-01-01'
)
ON CONFLICT ("id") DO UPDATE SET
    "name"     = EXCLUDED."name",
    "email"    = EXCLUDED."email",
    "password" = EXCLUDED."password",
    "role"     = 'admin',
    "designation" = EXCLUDED."designation",
    "phone"    = EXCLUDED."phone",
    "gender"   = EXCLUDED."gender",
    "status"   = EXCLUDED."status";

-- 2. Configure hierarchy columns for Vinay Bushan (Team Lead under Ravi Kumar)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HRMS_employees' AND column_name = 'reporting_to') THEN
        UPDATE "HRMS_employees" SET "reporting_to" = 'EMP-2026-011' WHERE "id" = 'EMP-2026-023';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HRMS_employees' AND column_name = 'branch') THEN
        UPDATE "HRMS_employees" SET "branch" = 'visakhapatnam' WHERE "id" = 'EMP-2026-023';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HRMS_employees' AND column_name = 'hospital') THEN
        UPDATE "HRMS_employees" SET "hospital" = 'vizag_ivf' WHERE "id" = 'EMP-2026-023';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HRMS_employees' AND column_name = 'hierarchy_level') THEN
        UPDATE "HRMS_employees" SET "hierarchy_level" = 'team_lead' WHERE "id" = 'EMP-2026-023';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HRMS_employees' AND column_name = 'managed_branches') THEN
        UPDATE "HRMS_employees" SET "managed_branches" = '["visakhapatnam"]'::jsonb WHERE "id" = 'EMP-2026-023';
    END IF;
END $$;

-- 3. Reassign Team Members: Bhaskar (EMP-2026-019) and Satish (EMP-2026-020) to Vinay Bushan (EMP-2026-023)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HRMS_employees' AND column_name = 'reporting_to') THEN
        UPDATE "HRMS_employees"
        SET "reporting_to" = 'EMP-2026-023'
        WHERE "id" IN ('EMP-2026-019', 'EMP-2026-020');
    END IF;
END $$;

-- 4. Initial leave balances for Vinay Bushan (Male: sick 6, casual 8, paternity 7)
INSERT INTO "HRMS_leave_balances" ("employee_id", "leave_type", "total_allotted", "used")
VALUES
    ('EMP-2026-023', 'sick',      6, 0),
    ('EMP-2026-023', 'casual',    8, 0),
    ('EMP-2026-023', 'paternity', 7, 0)
ON CONFLICT ("employee_id", "leave_type") DO NOTHING;
