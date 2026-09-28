-- ====================================================================
-- 20. ADD RAVI UNDRASAPU (REPORTING TO RAVI KUMAR)
-- VizagIVF HRMS
-- ====================================================================

-- 1. Insert core employee record
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
    'EMP-2026-017',
    'Ravi Undrasapu',
    'raviundrasapu2@gmail.com',
    'raviundrasapu2@gmail.com',
    'employee',
    'Employee',
    '2026-09-01',
    0.00,
    'active',
    '9110565573',
    'male',
    0.0,
    '1995-01-01'
)
ON CONFLICT ("id") DO UPDATE SET
    "name"     = EXCLUDED."name",
    "email"    = EXCLUDED."email",
    "password" = EXCLUDED."password",
    "role"     = 'employee',
    "phone"    = EXCLUDED."phone",
    "gender"   = EXCLUDED."gender",
    "status"   = EXCLUDED."status";

-- 2. Set hierarchy columns if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HRMS_employees' AND column_name = 'reporting_to') THEN
        UPDATE "HRMS_employees" SET "reporting_to" = 'EMP-2026-011' WHERE "id" = 'EMP-2026-017';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HRMS_employees' AND column_name = 'branch') THEN
        UPDATE "HRMS_employees" SET "branch" = 'visakhapatnam' WHERE "id" = 'EMP-2026-017';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HRMS_employees' AND column_name = 'hospital') THEN
        UPDATE "HRMS_employees" SET "hospital" = 'vizag_ivf' WHERE "id" = 'EMP-2026-017';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HRMS_employees' AND column_name = 'hierarchy_level') THEN
        UPDATE "HRMS_employees" SET "hierarchy_level" = 'employee' WHERE "id" = 'EMP-2026-017';
    END IF;
END $$;

-- 3. Initial leave balances
INSERT INTO "HRMS_leave_balances" ("employee_id", "leave_type", "total_allotted", "used")
VALUES
    ('EMP-2026-017', 'sick',      6, 0),
    ('EMP-2026-017', 'casual',    8, 0),
    ('EMP-2026-017', 'paternity', 7, 0)
ON CONFLICT ("employee_id", "leave_type") DO NOTHING;
