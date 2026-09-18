-- ====================================================================
-- 11. PHARMA & VIZAG IVF HIERARCHY MIGRATION
-- VizagIVF HRMS
-- Establishes 3-Tier Hierarchy:
--   1. Regional Manager: Ravikumar Raghupatruni
--   2. Unit Heads: Memidi Kishor (SKLM) & Kottakota Vinay Bhushan (VZM)
--   3. Unit Team Members reporting to respective Unit Heads
-- ====================================================================

-- 1. Remove obsolete placeholder test records from Vizag IVF
DELETE FROM "HRMS_leave_balances" 
WHERE "employee_id" IN ('EMP-2026-008', 'EMP-2026-009', 'EMP-2026-010', 'EMP-2026-013');

DELETE FROM "HRMS_employees" 
WHERE "id" IN ('EMP-2026-008', 'EMP-2026-009', 'EMP-2026-010', 'EMP-2026-013');

-- 2. Upsert Ravikumar Raghupatruni (Regional Head - Marketing)
INSERT INTO "HRMS_employees" (
    "id", "name", "email", "password", "role", "designation", 
    "joining_date", "basic_pay", "status", "phone", "gender", 
    "experience", "hospital", "hierarchy_level", "reporting_to"
) VALUES (
    'EMP-2026-011',
    'Ravikumar Raghupatruni',
    'rkpatnaik5186@gmail.com',
    'rkpatnaik5186@gmail.com',
    'admin',
    'Regional Head (Marketing)',
    '2026-09-01',
    0.00,
    'active',
    '9182068148',
    'male',
    10.0,
    'vizag_ivf',
    'manager',
    NULL
)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "designation" = EXCLUDED."designation",
    "phone" = EXCLUDED."phone",
    "hospital" = EXCLUDED."hospital",
    "hierarchy_level" = EXCLUDED."hierarchy_level",
    "reporting_to" = EXCLUDED."reporting_to";

-- 3. Upsert Unit Heads (Reporting to Ravikumar Raghupatruni)
-- Kottakota Vinay Bhushan (VZM Unit Head)
INSERT INTO "HRMS_employees" (
    "id", "name", "email", "password", "role", "designation", 
    "joining_date", "basic_pay", "status", "phone", "gender", 
    "experience", "hospital", "hierarchy_level", "reporting_to"
) VALUES (
    'EMP-2026-015',
    'Kottakota Vinay Bhushan',
    'vinaybhushan0923@gmail.com',
    'vinaybhushan0923@gmail.com',
    'admin',
    'VZM Unit Head',
    '2026-09-01',
    0.00,
    'active',
    '8897561317',
    'male',
    5.0,
    'vizag_ivf',
    'team_lead',
    'EMP-2026-011'
)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "designation" = EXCLUDED."designation",
    "phone" = EXCLUDED."phone",
    "hospital" = EXCLUDED."hospital",
    "hierarchy_level" = EXCLUDED."hierarchy_level",
    "reporting_to" = EXCLUDED."reporting_to";

-- Memidi Kishor (SKLM Unit Head)
INSERT INTO "HRMS_employees" (
    "id", "name", "email", "password", "role", "designation", 
    "joining_date", "basic_pay", "status", "phone", "gender", 
    "experience", "hospital", "hierarchy_level", "reporting_to"
) VALUES (
    'EMP-2026-016',
    'Memidi Kishor',
    'kishorememidi233@gmail.com',
    'kishorememidi233@gmail.com',
    'admin',
    'SKLM Unit Head',
    '2026-09-01',
    0.00,
    'active',
    '7981374403',
    'male',
    5.0,
    'vizag_ivf',
    'team_lead',
    'EMP-2026-011'
)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "designation" = EXCLUDED."designation",
    "phone" = EXCLUDED."phone",
    "hospital" = EXCLUDED."hospital",
    "hierarchy_level" = EXCLUDED."hierarchy_level",
    "reporting_to" = EXCLUDED."reporting_to";

-- 4. Upsert Team Members reporting to Memidi Kishor (SKLM Unit)
-- Arugula Sasi
INSERT INTO "HRMS_employees" (
    "id", "name", "email", "password", "role", "designation", 
    "joining_date", "basic_pay", "status", "phone", "gender", 
    "experience", "hospital", "hierarchy_level", "reporting_to"
) VALUES (
    'EMP-2026-017',
    'Arugula Sasi',
    'sasiarugula8741@gmail.com',
    'sasiarugula8741@gmail.com',
    'employee',
    'Field Officer',
    '2026-09-01',
    0.00,
    'active',
    '9700678741',
    'male',
    2.0,
    'vizag_ivf',
    'employee',
    'EMP-2026-016'
)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "designation" = EXCLUDED."designation",
    "phone" = EXCLUDED."phone",
    "hospital" = EXCLUDED."hospital",
    "hierarchy_level" = EXCLUDED."hierarchy_level",
    "reporting_to" = EXCLUDED."reporting_to";

-- Pinninti Purna Chandra Kumar (HQ: Srikakulam)
INSERT INTO "HRMS_employees" (
    "id", "name", "email", "password", "role", "designation", 
    "joining_date", "basic_pay", "status", "phone", "gender", 
    "experience", "hospital", "hierarchy_level", "reporting_to"
) VALUES (
    'EMP-2026-018',
    'Pinninti Purna Chandra Kumar',
    'pinnintipurnachandrakumar@gmail.com',
    'pinnintipurnachandrakumar@gmail.com',
    'employee',
    'Field Officer (HQ: Srikakulam)',
    '2026-09-01',
    0.00,
    'active',
    '9010633295',
    'male',
    2.0,
    'vizag_ivf',
    'employee',
    'EMP-2026-016'
)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "designation" = EXCLUDED."designation",
    "phone" = EXCLUDED."phone",
    "hospital" = EXCLUDED."hospital",
    "hierarchy_level" = EXCLUDED."hierarchy_level",
    "reporting_to" = EXCLUDED."reporting_to";

-- U. J. V. V. Kumar (Vizag)
INSERT INTO "HRMS_employees" (
    "id", "name", "email", "password", "role", "designation", 
    "joining_date", "basic_pay", "status", "phone", "gender", 
    "experience", "hospital", "hierarchy_level", "reporting_to"
) VALUES (
    'EMP-2026-022',
    'U. J. V. V. Kumar',
    'uppu.kumar@gmail.com',
    'uppu.kumar@gmail.com',
    'employee',
    'Field Officer (Vizag)',
    '2026-09-01',
    0.00,
    'active',
    '7095616161',
    'male',
    3.0,
    'vizag_ivf',
    'employee',
    'EMP-2026-016'
)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "designation" = EXCLUDED."designation",
    "phone" = EXCLUDED."phone",
    "hospital" = EXCLUDED."hospital",
    "hierarchy_level" = EXCLUDED."hierarchy_level",
    "reporting_to" = EXCLUDED."reporting_to";

-- S. Kishore Reddy (Admin - Gajuwaka / Gwk RO)
INSERT INTO "HRMS_employees" (
    "id", "name", "email", "password", "role", "designation", 
    "joining_date", "basic_pay", "status", "phone", "gender", 
    "experience", "hospital", "hierarchy_level", "reporting_to"
) VALUES (
    'EMP-2026-014',
    'S. Kishore Reddy',
    'sathikishore@gmail.com',
    'sathikishore@gmail.com',
    'employee',
    'Admin (Gajuwaka / Gwk RO)',
    '2026-09-01',
    0.00,
    'active',
    '9959004840',
    'male',
    4.0,
    'vizag_ivf',
    'employee',
    'EMP-2026-016'
)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "designation" = EXCLUDED."designation",
    "phone" = EXCLUDED."phone",
    "hospital" = EXCLUDED."hospital",
    "hierarchy_level" = EXCLUDED."hierarchy_level",
    "reporting_to" = EXCLUDED."reporting_to";

-- 5. Upsert Team Members reporting to Kottakota Vinay Bhushan (VZM Unit)
-- Pallanti Bhaskar Rao (HQ: Bobbili)
INSERT INTO "HRMS_employees" (
    "id", "name", "email", "password", "role", "designation", 
    "joining_date", "basic_pay", "status", "phone", "gender", 
    "experience", "hospital", "hierarchy_level", "reporting_to"
) VALUES (
    'EMP-2026-019',
    'Pallanti Bhaskar Rao',
    'pallantibhaskarrao172@gmail.com',
    'pallantibhaskarrao172@gmail.com',
    'employee',
    'Field Officer (HQ: Bobbili)',
    '2026-09-01',
    0.00,
    'active',
    '6300809148',
    'male',
    2.0,
    'vizag_ivf',
    'employee',
    'EMP-2026-015'
)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "designation" = EXCLUDED."designation",
    "phone" = EXCLUDED."phone",
    "hospital" = EXCLUDED."hospital",
    "hierarchy_level" = EXCLUDED."hierarchy_level",
    "reporting_to" = EXCLUDED."reporting_to";

-- Pathivada Sathish (HQ: Vizianagaram)
INSERT INTO "HRMS_employees" (
    "id", "name", "email", "password", "role", "designation", 
    "joining_date", "basic_pay", "status", "phone", "gender", 
    "experience", "hospital", "hierarchy_level", "reporting_to"
) VALUES (
    'EMP-2026-020',
    'Pathivada Sathish',
    'pathivadasathish9@gmail.com',
    'pathivadasathish9@gmail.com',
    'employee',
    'Field Officer (HQ: Vizianagaram)',
    '2026-09-01',
    0.00,
    'active',
    '9573934676',
    'male',
    2.0,
    'vizag_ivf',
    'employee',
    'EMP-2026-015'
)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "designation" = EXCLUDED."designation",
    "phone" = EXCLUDED."phone",
    "hospital" = EXCLUDED."hospital",
    "hierarchy_level" = EXCLUDED."hierarchy_level",
    "reporting_to" = EXCLUDED."reporting_to";

-- G. Hanumanth Rao (Vizag, VZM)
INSERT INTO "HRMS_employees" (
    "id", "name", "email", "password", "role", "designation", 
    "joining_date", "basic_pay", "status", "phone", "gender", 
    "experience", "hospital", "hierarchy_level", "reporting_to"
) VALUES (
    'EMP-2026-021',
    'G. Hanumanth Rao',
    'hrgammala@gmail.com',
    'hrgammala@gmail.com',
    'employee',
    'Field Officer (Vizag, VZM)',
    '2026-09-01',
    0.00,
    'active',
    '8143223728',
    'male',
    3.0,
    'vizag_ivf',
    'employee',
    'EMP-2026-015'
)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "designation" = EXCLUDED."designation",
    "phone" = EXCLUDED."phone",
    "hospital" = EXCLUDED."hospital",
    "hierarchy_level" = EXCLUDED."hierarchy_level",
    "reporting_to" = EXCLUDED."reporting_to";

-- Ejenti Shyam (Admin - Vizianagaram - Accountant)
INSERT INTO "HRMS_employees" (
    "id", "name", "email", "password", "role", "designation", 
    "joining_date", "basic_pay", "status", "phone", "gender", 
    "experience", "hospital", "hierarchy_level", "reporting_to"
) VALUES (
    'EMP-2026-012',
    'Ejenti Shyam',
    'sanjushyam7382@gmail.com',
    'sanjushyam7382@gmail.com',
    'employee',
    'Admin (Vizianagaram - Accountant)',
    '2026-09-01',
    0.00,
    'active',
    '7331140843',
    'male',
    3.0,
    'vizag_ivf',
    'employee',
    'EMP-2026-015'
)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "password" = EXCLUDED."password",
    "role" = EXCLUDED."role",
    "designation" = EXCLUDED."designation",
    "phone" = EXCLUDED."phone",
    "hospital" = EXCLUDED."hospital",
    "hierarchy_level" = EXCLUDED."hierarchy_level",
    "reporting_to" = EXCLUDED."reporting_to";

-- 6. Seed leave balances for new accounts
INSERT INTO "HRMS_leave_balances" ("employee_id", "leave_type", "total_allotted", "used") VALUES
('EMP-2026-015', 'sick', 6, 0), ('EMP-2026-015', 'casual', 8, 0), ('EMP-2026-015', 'paternity', 7, 0),
('EMP-2026-016', 'sick', 6, 0), ('EMP-2026-016', 'casual', 8, 0), ('EMP-2026-016', 'paternity', 7, 0),
('EMP-2026-017', 'sick', 6, 0), ('EMP-2026-017', 'casual', 8, 0), ('EMP-2026-017', 'paternity', 7, 0),
('EMP-2026-018', 'sick', 6, 0), ('EMP-2026-018', 'casual', 8, 0), ('EMP-2026-018', 'paternity', 7, 0),
('EMP-2026-019', 'sick', 6, 0), ('EMP-2026-019', 'casual', 8, 0), ('EMP-2026-019', 'paternity', 7, 0),
('EMP-2026-020', 'sick', 6, 0), ('EMP-2026-020', 'casual', 8, 0), ('EMP-2026-020', 'paternity', 7, 0),
('EMP-2026-021', 'sick', 6, 0), ('EMP-2026-021', 'casual', 8, 0), ('EMP-2026-021', 'paternity', 7, 0),
('EMP-2026-022', 'sick', 6, 0), ('EMP-2026-022', 'casual', 8, 0), ('EMP-2026-022', 'paternity', 7, 0)
ON CONFLICT ("employee_id", "leave_type") DO NOTHING;
