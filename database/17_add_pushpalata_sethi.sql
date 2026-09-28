-- ====================================================================
-- 17. ADD PUSHPALATA SETHI (UNASSIGNED STAFF)
-- VizagIVF HRMS
-- Targets core HRMS_employees columns matching 01_core_schema & 08_seed_batch2_employees
-- ====================================================================

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
    'EMP-2026-015',
    'Pushpalata sethi',
    'Pushpasethi72@gmail.com',
    'Pushpasethi72@gmail.com',
    'employee',
    'Employee',
    '2026-09-01',
    0.00,
    'active',
    '8897854336',
    'female',
    0.0,
    '1995-05-15'
)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "phone" = EXCLUDED."phone",
    "gender" = EXCLUDED."gender",
    "status" = EXCLUDED."status";

-- Initial leave balances
INSERT INTO "HRMS_leave_balances" ("employee_id", "leave_type", "total_allotted", "used")
VALUES 
    ('EMP-2026-015', 'sick', 6, 0),
    ('EMP-2026-015', 'casual', 8, 0),
    ('EMP-2026-015', 'maternity', 90, 0)
ON CONFLICT ("employee_id", "leave_type") DO NOTHING;
