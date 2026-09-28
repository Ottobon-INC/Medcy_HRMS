-- ====================================================================
-- 22. ADD KISHORE MAMIDI AS SRIKAKULAM UNIT HEAD (TEAM LEAD)
--     AND ASSIGN CHANDRA KUMAR (EMP-2026-018) AS HIS TEAM MEMBER
-- VizagIVF HRMS
-- ====================================================================

-- 1. Insert core employee record for Kishore Mamidi
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
    'EMP-2026-024',
    'Kishore Mamidi',
    'kishoremamidi233@gmail.com',
    'kishoremamidi233@gmail.com',
    'admin',
    'SKLM Unit Head',
    '2026-09-01',
    0.00,
    'active',
    '7981374403',
    'male',
    0.0,
    '1995-01-01'
)
ON CONFLICT ("id") DO UPDATE SET
    "name"        = EXCLUDED."name",
    "email"       = EXCLUDED."email",
    "password"    = EXCLUDED."password",
    "role"        = 'admin',
    "designation" = EXCLUDED."designation",
    "phone"       = EXCLUDED."phone",
    "gender"      = EXCLUDED."gender",
    "status"      = EXCLUDED."status";

-- 2. Configure hierarchy columns for Kishore Mamidi (Unit Head under Ravi Kumar)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HRMS_employees' AND column_name = 'reporting_to') THEN
        UPDATE "HRMS_employees" SET "reporting_to" = 'EMP-2026-011' WHERE "id" = 'EMP-2026-024';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HRMS_employees' AND column_name = 'branch') THEN
        UPDATE "HRMS_employees" SET "branch" = 'visakhapatnam' WHERE "id" = 'EMP-2026-024';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HRMS_employees' AND column_name = 'hospital') THEN
        UPDATE "HRMS_employees" SET "hospital" = 'vizag_ivf' WHERE "id" = 'EMP-2026-024';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HRMS_employees' AND column_name = 'hierarchy_level') THEN
        UPDATE "HRMS_employees" SET "hierarchy_level" = 'team_lead' WHERE "id" = 'EMP-2026-024';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HRMS_employees' AND column_name = 'managed_branches') THEN
        UPDATE "HRMS_employees" SET "managed_branches" = '["visakhapatnam"]'::jsonb WHERE "id" = 'EMP-2026-024';
    END IF;
END $$;

-- 3. Reassign Team Member: Chandra Kumar (EMP-2026-018 - Pinninti Purna Chandra Kumar) to Kishore Mamidi (EMP-2026-024)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HRMS_employees' AND column_name = 'reporting_to') THEN
        UPDATE "HRMS_employees"
        SET "reporting_to" = 'EMP-2026-024'
        WHERE "id" = 'EMP-2026-018';
    END IF;
END $$;

-- 4. Initial leave balances for Kishore Mamidi (Male: sick 6, casual 8, paternity 7)
INSERT INTO "HRMS_leave_balances" ("employee_id", "leave_type", "total_allotted", "used")
VALUES
    ('EMP-2026-024', 'sick',      6, 0),
    ('EMP-2026-024', 'casual',    8, 0),
    ('EMP-2026-024', 'paternity', 7, 0)
ON CONFLICT ("employee_id", "leave_type") DO NOTHING;
