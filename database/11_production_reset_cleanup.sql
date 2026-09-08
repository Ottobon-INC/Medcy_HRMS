-- ====================================================================
-- 11. PRODUCTION RESET & CLEANUP SCRIPT
-- VizagIVF HRMS
-- Purpose: Reset all transactional test data accumulated during development/testing
--          while preserving real employee accounts, office locations, and configs.
-- ====================================================================

-- 1. Field Operations & Tracking
DELETE FROM "HRMS_field_visit_proofs";
DELETE FROM "HRMS_field_visit_events";
DELETE FROM "HRMS_field_visit_positions";
DELETE FROM "HRMS_field_visit_pins";
DELETE FROM "HRMS_field_visits";
DELETE FROM "HRMS_field_sessions";
DELETE FROM "HRMS_location_pins";

-- 2. Daily Work Assignments & Tasks
DELETE FROM "HRMS_tasks";

-- 3. Attendance, Breaks & Duty Roster
DELETE FROM "HRMS_breaks";
DELETE FROM "HRMS_attendance";
DELETE FROM "HRMS_duty_roster";

-- 4. Leaves & Salary Advances
DELETE FROM "HRMS_leave_requests";
DELETE FROM "HRMS_advance_requests";

-- 5. Reset Employee Leave Balances (Set used = 0 for all employees)
UPDATE "HRMS_leave_balances"
SET "used" = 0;

-- 6. Verification Queries
SELECT 'HRMS_employees' AS table_name, COUNT(*) AS row_count FROM "HRMS_employees"
UNION ALL
SELECT 'HRMS_office_locations', COUNT(*) FROM "HRMS_office_locations"
UNION ALL
SELECT 'HRMS_leave_balances', COUNT(*) FROM "HRMS_leave_balances"
UNION ALL
SELECT 'HRMS_attendance', COUNT(*) FROM "HRMS_attendance"
UNION ALL
SELECT 'HRMS_breaks', COUNT(*) FROM "HRMS_breaks"
UNION ALL
SELECT 'HRMS_leave_requests', COUNT(*) FROM "HRMS_leave_requests"
UNION ALL
SELECT 'HRMS_tasks', COUNT(*) FROM "HRMS_tasks"
UNION ALL
SELECT 'HRMS_field_sessions', COUNT(*) FROM "HRMS_field_sessions"
UNION ALL
SELECT 'HRMS_field_visits', COUNT(*) FROM "HRMS_field_visits";
