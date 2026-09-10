-- ====================================================================
-- 13. SEED MEDCY HIERARCHY
-- VizagIVF HRMS
-- Seeds ghost records for missing employees and updates hospital flags
-- ====================================================================

-- 1. Seed Ghost Employees (No DB Yet)
INSERT INTO "HRMS_employees" (
    "id", "name", "email", "role", "designation", "joining_date",
    "status", "hospital", "hierarchy_level", "reporting_to"
) VALUES 
('EMP-MEDCY-001', 'Dr. Bhramhaji', 'bhramhaji.ghost@medcy.com', 'admin', 'Senior Manager', '2026-09-01', 'pending', 'medcy_hospitals', 'senior_manager', NULL),
('EMP-MEDCY-002', 'Satish', 'satish.ghost@medcy.com', 'admin', 'Team Lead', '2026-09-01', 'pending', 'medcy_hospitals', 'team_lead', 'EMP-MEDCY-001'),
('EMP-MEDCY-003', 'Santosh', 'santosh.ghost@medcy.com', 'employee', 'Employee', '2026-09-01', 'pending', 'medcy_hospitals', 'employee', 'EMP-MEDCY-002'),
('EMP-MEDCY-004', 'Uday Kumar', 'uday.ghost@medcy.com', 'employee', 'Employee', '2026-09-01', 'pending', 'medcy_hospitals', 'employee', 'EMP-MEDCY-002'),
('EMP-MEDCY-005', 'Prudhvi', 'prudhvi.ghost@medcy.com', 'admin', 'Team Lead', '2026-09-01', 'pending', 'medcy_hospitals', 'team_lead', 'EMP-MEDCY-001')
ON CONFLICT ("id") DO NOTHING;

-- 2. Update Executives to both hospitals
UPDATE "HRMS_employees"
SET "hospital" = 'both'
WHERE "id" IN ('EMP-EXEC-001', 'EMP-EXEC-002');

-- 3. Update existing Medcy Employees (Batch 1)
-- Team Lead Rambabu
UPDATE "HRMS_employees"
SET "hospital" = 'medcy_hospitals',
    "hierarchy_level" = 'team_lead',
    "reporting_to" = 'EMP-MEDCY-001',
    "role" = 'admin'
WHERE "id" = 'EMP-2026-004'; -- G. Rambabu

-- Rambabu's Team
UPDATE "HRMS_employees"
SET "hospital" = 'medcy_hospitals',
    "reporting_to" = 'EMP-2026-004'
WHERE "id" IN ('EMP-2026-005', 'EMP-2026-006'); -- Manoj, AppalNaidu

-- Satish's Team (Existing ones)
UPDATE "HRMS_employees"
SET "hospital" = 'medcy_hospitals',
    "reporting_to" = 'EMP-MEDCY-002'
WHERE "id" IN ('EMP-2026-002', 'EMP-2026-007'); -- Rajesh, Hari Krishna

-- Prudhvi's Team
UPDATE "HRMS_employees"
SET "hospital" = 'medcy_hospitals',
    "reporting_to" = 'EMP-MEDCY-005'
WHERE "id" IN ('EMP-2026-003', 'EMP-2026-001'); -- Mahesh Babu, Karan Kumar

-- 4. Set Vizag IVF explicitly (just to be safe)
UPDATE "HRMS_employees"
SET "hospital" = 'vizag_ivf'
WHERE "id" IN ('EMP-2026-011', 'EMP-2026-008', 'EMP-2026-009', 'EMP-2026-010', 'EMP-2026-012', 'EMP-2026-013', 'EMP-2026-014');
