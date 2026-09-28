-- ====================================================================
-- 18. ADD GADELA RAJASEKHAR (REPORTING TO RAVI KUMAR)
-- VizagIVF HRMS
-- Targets core HRMS_employees columns & hierarchy linkage
-- ====================================================================

-- 1. Insert or update core employee record
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
    'EMP-2026-016',
    'Gadela Rajasekhar',
    'rajasekharbpharm345@gmail.com',
    'rajasekharbpharm345@gmail.com',
    'employee',
    'Employee',
    '2026-09-01',
    0.00,
    'active',
    '9490505590',
    'male',
    0.0,
    '1995-01-01'
)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "password" = EXCLUDED."password",
    "phone" = EXCLUDED."phone",
    "gender" = EXCLUDED."gender",
    "status" = EXCLUDED."status";

-- 2. Link team lead / manager (Ravi Kumar - EMP-2026-011) and branch/hospital if columns exist
DO $$
BEGIN
    -- Set team lead / reporting_to
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'HRMS_employees' AND column_name = 'reporting_to'
    ) THEN
        UPDATE "HRMS_employees"
        SET "reporting_to" = COALESCE(
            (SELECT "id" FROM "HRMS_employees" WHERE "id" = 'EMP-2026-011' OR "name" ILIKE '%Ravi Kumar%' LIMIT 1),
            'EMP-2026-011'
        )
        WHERE "id" = 'EMP-2026-016';
    END IF;

    -- Set branch to Visakhapatnam
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'HRMS_employees' AND column_name = 'branch'
    ) THEN
        UPDATE "HRMS_employees"
        SET "branch" = 'visakhapatnam'
        WHERE "id" = 'EMP-2026-016';
    END IF;

    -- Set hospital to vizag_ivf
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'HRMS_employees' AND column_name = 'hospital'
    ) THEN
        UPDATE "HRMS_employees"
        SET "hospital" = 'vizag_ivf'
        WHERE "id" = 'EMP-2026-016';
    END IF;

    -- Set hierarchy level to employee
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'HRMS_employees' AND column_name = 'hierarchy_level'
    ) THEN
        UPDATE "HRMS_employees"
        SET "hierarchy_level" = 'employee'
        WHERE "id" = 'EMP-2026-016';
    END IF;
END $$;

-- 3. Initial leave balances (Sick, Casual, Paternity)
INSERT INTO "HRMS_leave_balances" ("employee_id", "leave_type", "total_allotted", "used")
VALUES 
    ('EMP-2026-016', 'sick', 6, 0),
    ('EMP-2026-016', 'casual', 8, 0),
    ('EMP-2026-016', 'paternity', 7, 0)
ON CONFLICT ("employee_id", "leave_type") DO NOTHING;
