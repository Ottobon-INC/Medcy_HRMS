-- ====================================================================
-- 23. ASYNC DOCTOR CALL APPROVAL MIGRATION
-- VizagIVF & Medcy Hospitals HRMS
-- Transition from synchronous pre-execution approval to asynchronous post-execution review
-- ====================================================================

-- 1. Update check constraint on HRMS_field_visits to allow 'post_review'
ALTER TABLE "HRMS_field_visits" DROP CONSTRAINT IF EXISTS "HRMS_field_visits_approval_status_check";
ALTER TABLE "HRMS_field_visits"
ADD CONSTRAINT "HRMS_field_visits_approval_status_check"
CHECK ("approval_status" IN ('pending', 'approved', 'post_review', 'rejected'));

-- Also update HRMS_doctor_visits if it exists
DO $$ 
BEGIN 
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'HRMS_doctor_visits') THEN
    ALTER TABLE "HRMS_doctor_visits" DROP CONSTRAINT IF EXISTS "HRMS_doctor_visits_approval_status_check";
    ALTER TABLE "HRMS_doctor_visits"
    ADD CONSTRAINT "HRMS_doctor_visits_approval_status_check"
    CHECK ("approval_status" IN ('pending', 'approved', 'post_review', 'rejected'));
  END IF;
END $$;

-- 2. Migrate existing legacy 'pending' calls that are planned/in-progress to 'approved'
-- so field staff are unblocked immediately
UPDATE "HRMS_field_visits"
SET "approval_status" = 'approved'
WHERE "approval_status" = 'pending' AND "status" IN ('ASSIGNED', 'IN_PROGRESS');

-- 3. If any visits were completed while in 'pending', transition them to 'post_review'
UPDATE "HRMS_field_visits"
SET "approval_status" = 'post_review'
WHERE "approval_status" = 'pending' AND "status" = 'COMPLETED';

-- 4. Ensure index on approval_status
CREATE INDEX IF NOT EXISTS idx_field_visits_approval ON "HRMS_field_visits"("approval_status");
