-- ====================================================================
-- 19. FIX GADELA RAJASEKHAR ROLE → EMPLOYEE DASHBOARD
-- VizagIVF HRMS
-- Forces role = 'employee' and hierarchy_level = 'employee'
-- so he gets the Employee dashboard, not the Admin dashboard.
-- ====================================================================

UPDATE "HRMS_employees"
SET
    "role"            = 'employee',
    "hierarchy_level" = 'employee',
    "reporting_to"    = 'EMP-2026-011'
WHERE "id" = 'EMP-2026-016'
   OR "email" ILIKE 'rajasekharbpharm345@gmail.com';
