-- Migration: Create HRMS_breaks table
-- Allows employees to take breaks during their shift while pausing live GPS tracking.

CREATE TABLE IF NOT EXISTS "HRMS_breaks" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIME NOT NULL,
    end_time TIME,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by employee and date
CREATE INDEX IF NOT EXISTS idx_hrms_breaks_emp_date 
ON "HRMS_breaks" (employee_id, date);

-- Enable RLS
ALTER TABLE "HRMS_breaks" ENABLE ROW LEVEL SECURITY;

-- Allow public read/write if anon key is used (matching other HRMS tables)
DROP POLICY IF EXISTS "Public access to breaks" ON "HRMS_breaks";
CREATE POLICY "Public access to breaks" ON "HRMS_breaks" 
FOR ALL USING (true) WITH CHECK (true);
