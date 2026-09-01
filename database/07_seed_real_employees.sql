-- ====================================================================
-- 07. SEED 7 REAL EMPLOYEES & CLEAN UP OLD NON-ADMIN EMPLOYEES
-- VizagIVF HRMS
-- ====================================================================

-- 1. Remove all old employees except administrators
DELETE FROM "HRMS_employees"
WHERE "role" = 'employee';

-- 2. Insert 7 confirmed employees (Password = Email)
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
) VALUES
(
    'EMP-2026-001',
    'M. Karan',
    'karanking035@gmail.com',
    'karanking035@gmail.com',
    'employee',
    'Employee',
    '2026-09-01',
    0.00,
    'active',
    '9704945077',
    'male',
    0.0,
    '2000-12-19'
),
(
    'EMP-2026-002',
    'Rajesh',
    'inkallurajesh9@gmail.com',
    'inkallurajesh9@gmail.com',
    'employee',
    'Employee',
    '2026-09-01',
    0.00,
    'active',
    '9494477778',
    'male',
    0.0,
    '1983-01-11'
),
(
    'EMP-2026-003',
    'P. Mahesh Babu',
    'purrimaheshbabu@gmail.com',
    'purrimaheshbabu@gmail.com',
    'employee',
    'Employee',
    '2026-09-01',
    0.00,
    'active',
    '9494906392',
    'male',
    0.0,
    '1995-06-20'
),
(
    'EMP-2026-004',
    'G. Rambabu',
    'rambabu@gmail.com',
    'rambabu@gmail.com',
    'employee',
    'Employee',
    '2026-09-01',
    0.00,
    'active',
    '9493940820',
    'male',
    0.0,
    NULL
),
(
    'EMP-2026-005',
    'S. Manoj Kumar',
    'mrmandy222@gmail.com',
    'mrmandy222@gmail.com',
    'employee',
    'Employee',
    '2026-09-01',
    0.00,
    'active',
    '9182867219',
    'male',
    0.0,
    '2000-07-16'
),
(
    'EMP-2026-006',
    'T. Appalanaidu',
    'appunaiduterli2345@gmail.com',
    'appunaiduterli2345@gmail.com',
    'employee',
    'Employee',
    '2026-09-01',
    0.00,
    'active',
    '9951839088',
    'male',
    0.0,
    '1995-06-15'
),
(
    'EMP-2026-007',
    'A. Hari Krishna',
    'hemnathharry81@gmail.com',
    'hemnathharry81@gmail.com',
    'employee',
    'Employee',
    '2026-09-01',
    0.00,
    'active',
    '9885728580',
    'male',
    0.0,
    '1999-11-30'
)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "designation" = EXCLUDED."designation",
    "joining_date" = EXCLUDED."joining_date",
    "basic_pay" = EXCLUDED."basic_pay",
    "status" = EXCLUDED."status",
    "phone" = EXCLUDED."phone",
    "gender" = EXCLUDED."gender",
    "experience" = EXCLUDED."experience",
    "dob" = EXCLUDED."dob";

-- 3. Insert standard leave balances for all 7 employees
INSERT INTO "HRMS_leave_balances" ("employee_id", "leave_type", "total_allotted", "used") VALUES
('EMP-2026-001', 'sick', 6, 0),
('EMP-2026-001', 'casual', 8, 0),
('EMP-2026-001', 'paternity', 7, 0),

('EMP-2026-002', 'sick', 6, 0),
('EMP-2026-002', 'casual', 8, 0),
('EMP-2026-002', 'paternity', 7, 0),

('EMP-2026-003', 'sick', 6, 0),
('EMP-2026-003', 'casual', 8, 0),
('EMP-2026-003', 'paternity', 7, 0),

('EMP-2026-004', 'sick', 6, 0),
('EMP-2026-004', 'casual', 8, 0),
('EMP-2026-004', 'paternity', 7, 0),

('EMP-2026-005', 'sick', 6, 0),
('EMP-2026-005', 'casual', 8, 0),
('EMP-2026-005', 'paternity', 7, 0),

('EMP-2026-006', 'sick', 6, 0),
('EMP-2026-006', 'casual', 8, 0),
('EMP-2026-006', 'paternity', 7, 0),

('EMP-2026-007', 'sick', 6, 0),
('EMP-2026-007', 'casual', 8, 0),
('EMP-2026-007', 'paternity', 7, 0)
ON CONFLICT ("employee_id", "leave_type") DO UPDATE SET
    "total_allotted" = EXCLUDED."total_allotted",
    "used" = EXCLUDED."used";
