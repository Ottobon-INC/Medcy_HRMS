-- ====================================================================
-- 24. ASHA ENCOUNTERS SCHEMA MIGRATION
-- VizagIVF & Medcy Hospitals HRMS
-- Capture interactions between field representatives and ASHA workers
-- ====================================================================

CREATE TABLE IF NOT EXISTS "HRMS_asha_encounters" (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     VARCHAR(255)  NOT NULL,
  asha_name       TEXT          NOT NULL,
  village         TEXT          NOT NULL,
  encounter_date  DATE          NOT NULL DEFAULT CURRENT_DATE,
  referrals_count INT           DEFAULT 0,
  hospital_name   TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ   DEFAULT now(),
  updated_at      TIMESTAMPTZ   DEFAULT now()
);

-- Ensure column exists if table was already created
ALTER TABLE "HRMS_asha_encounters" ADD COLUMN IF NOT EXISTS "hospital_name" TEXT;

-- Index for fast per-employee queries ordered by date
CREATE INDEX IF NOT EXISTS idx_asha_encounters_employee
  ON "HRMS_asha_encounters" (employee_id, encounter_date DESC);

-- Index for date queries across team/org
CREATE INDEX IF NOT EXISTS idx_asha_encounters_date
  ON "HRMS_asha_encounters" (encounter_date DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE "HRMS_asha_encounters" ENABLE ROW LEVEL SECURITY;

-- Allow complete public/authenticated access with anon key (matching HRMS architecture)
DROP POLICY IF EXISTS "Public access to HRMS_asha_encounters" ON "HRMS_asha_encounters";
CREATE POLICY "Public access to HRMS_asha_encounters" ON "HRMS_asha_encounters"
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable Realtime publication for HRMS_asha_encounters to support live admin tracking
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE "HRMS_asha_encounters";
  END IF;
END $$;
