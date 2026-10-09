-- Run this in Supabase SQL Editor AFTER running the ALTER TABLE command.
-- This will permanently write the hardcoded hierarchy into the actual database columns.

-- 1. Set Executives
UPDATE "HRMS_employees" 
SET hierarchy_level = 'executive', hospital = 'both', branch = 'visakhapatnam' 
WHERE id IN ('EMP-EXEC-001', 'EMP-EXEC-002', 'EMP-TEST-EXEC');

-- 2. Set Managers
UPDATE "HRMS_employees" 
SET hierarchy_level = 'senior_manager', hospital = 'medcy_hospitals', branch = 'visakhapatnam' 
WHERE id = 'EMP-MEDCY-001';

UPDATE "HRMS_employees" 
SET hierarchy_level = 'manager', hospital = 'vizag_ivf', branch = 'visakhapatnam' 
WHERE id = 'EMP-2026-011';

-- 3. Set Team Leads & Unit Heads
UPDATE "HRMS_employees" 
SET hierarchy_level = 'team_lead', reporting_to = 'EMP-MEDCY-001' 
WHERE id IN ('EMP-2026-004', 'EMP-MEDCY-002', 'EMP-MEDCY-005');

UPDATE "HRMS_employees" 
SET hierarchy_level = 'team_lead', reporting_to = 'EMP-2026-011' 
WHERE id IN ('EMP-2026-015', 'EMP-2026-023', 'EMP-2026-024');

-- 4. Assign Medcy Staff to Team Leads
UPDATE "HRMS_employees" SET reporting_to = 'EMP-2026-004' WHERE id IN ('EMP-2026-005', 'EMP-2026-006');
UPDATE "HRMS_employees" SET reporting_to = 'EMP-MEDCY-002' WHERE id IN ('EMP-2026-002', 'EMP-MEDCY-003', 'EMP-2026-007', 'EMP-MEDCY-004');
UPDATE "HRMS_employees" SET reporting_to = 'EMP-MEDCY-005' WHERE id IN ('EMP-2026-003', 'EMP-2026-001');

-- 5. Assign Vizag IVF Staff to Managers and Unit Heads
UPDATE "HRMS_employees" SET reporting_to = 'EMP-2026-011' WHERE id IN ('EMP-2026-008', 'EMP-2026-009', 'EMP-2026-010', 'EMP-2026-012', 'EMP-2026-013', 'EMP-2026-016', 'EMP-2026-017');
UPDATE "HRMS_employees" SET reporting_to = 'EMP-2026-024' WHERE id = 'EMP-2026-018';
UPDATE "HRMS_employees" SET reporting_to = 'EMP-2026-023' WHERE id IN ('EMP-2026-019', 'EMP-2026-020');
UPDATE "HRMS_employees" SET reporting_to = 'EMP-2026-015' WHERE id = 'EMP-2026-021';
UPDATE "HRMS_employees" SET reporting_to = 'EMP-2026-016' WHERE id = 'EMP-2026-022';

-- 6. Set default levels for anyone missed
UPDATE "HRMS_employees" 
SET hierarchy_level = 'employee' 
WHERE hierarchy_level IS NULL;

UPDATE "HRMS_employees" 
SET hospital = 'vizag_ivf', branch = 'visakhapatnam' 
WHERE hospital IS NULL;
