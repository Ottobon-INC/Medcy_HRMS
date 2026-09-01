-- ====================================================================
-- 08. SEED BATCH 2 EMPLOYEES (EMP-2026-008 to EMP-2026-014)
-- VizagIVF HRMS
-- ====================================================================

-- 1. Insert 7 new employees (Password = Email)
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
    'EMP-2026-008',
    'Shiva Kumar',
    'balivada.shiva@gmail.com',
    'balivada.shiva@gmail.com',
    'employee',
    'Employee',
    '2026-09-01',
    0.00,
    'active',
    '846018424',
    'male',
    0.0,
    '1989-08-06'
),
(
    'EMP-2026-009',
    'Gondu Srinivasa Rao',
    'gondusrinivaskrishna@gmail.com',
    'gondusrinivaskrishna@gmail.com',
    'employee',
    'Employee',
    '2026-09-01',
    0.00,
    'active',
    '9705686880',
    'male',
    0.0,
    '1988-06-20'
),
(
    'EMP-2026-010',
    'Dhanusha Dadi',
    'dhanushadadi88@gmail.com',
    'dhanushadadi88@gmail.com',
    'employee',
    'Employee',
    '2026-09-01',
    0.00,
    'active',
    '8008668844',
    'female',
    0.0,
    '1993-09-03'
),
(
    'EMP-2026-011',
    'R. Ravi Kumar',
    'ravildm09@gmail.com',
    'ravildm09@gmail.com',
    'employee',
    'Employee',
    '2026-09-01',
    0.00,
    'active',
    '9182068148',
    'male',
    0.0,
    '1978-06-01'
),
(
    'EMP-2026-012',
    'Gonti Shyam',
    'sanjushyam7382@gmail.com',
    'sanjushyam7382@gmail.com',
    'employee',
    'Employee',
    '2026-09-01',
    0.00,
    'active',
    '7331140843',
    'male',
    0.0,
    '2001-03-06'
),
(
    'EMP-2026-013',
    'U. Jayavani',
    'ugrangijaya@gmail.com',
    'ugrangijaya@gmail.com',
    'employee',
    'Employee',
    '2026-09-01',
    0.00,
    'active',
    '8500880441',
    'female',
    0.0,
    '1990-02-23'
),
(
    'EMP-2026-014',
    'S. Kishore Reddy',
    'sattikishorereddy@gmail.com',
    'sattikishorereddy@gmail.com',
    'employee',
    'Employee',
    '2026-09-01',
    0.00,
    'active',
    '9959004840',
    'male',
    0.0,
    '1988-06-28'
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

-- 2. Insert standard leave balances for all 7 employees
INSERT INTO "HRMS_leave_balances" ("employee_id", "leave_type", "total_allotted", "used") VALUES
-- EMP-2026-008 (Shiva Kumar - Male)
('EMP-2026-008', 'sick', 6, 0),
('EMP-2026-008', 'casual', 8, 0),
('EMP-2026-008', 'paternity', 7, 0),

-- EMP-2026-009 (Gondu Srinivasa Rao - Male)
('EMP-2026-009', 'sick', 6, 0),
('EMP-2026-009', 'casual', 8, 0),
('EMP-2026-009', 'paternity', 7, 0),

-- EMP-2026-010 (Dhanusha Dadi - Female)
('EMP-2026-010', 'sick', 6, 0),
('EMP-2026-010', 'casual', 8, 0),
('EMP-2026-010', 'maternity', 90, 0),

-- EMP-2026-011 (R. Ravi Kumar - Male)
('EMP-2026-011', 'sick', 6, 0),
('EMP-2026-011', 'casual', 8, 0),
('EMP-2026-011', 'paternity', 7, 0),

-- EMP-2026-012 (Gonti Shyam - Male)
('EMP-2026-012', 'sick', 6, 0),
('EMP-2026-012', 'casual', 8, 0),
('EMP-2026-012', 'paternity', 7, 0),

-- EMP-2026-013 (U. Jayavani - Female)
('EMP-2026-013', 'sick', 6, 0),
('EMP-2026-013', 'casual', 8, 0),
('EMP-2026-013', 'maternity', 90, 0),

-- EMP-2026-014 (S. Kishore Reddy - Male)
('EMP-2026-014', 'sick', 6, 0),
('EMP-2026-014', 'casual', 8, 0),
('EMP-2026-014', 'paternity', 7, 0)
ON CONFLICT ("employee_id", "leave_type") DO UPDATE SET
    "total_allotted" = EXCLUDED."total_allotted",
    "used" = EXCLUDED."used";
