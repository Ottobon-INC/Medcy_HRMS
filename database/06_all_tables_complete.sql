-- ====================================================================
-- MEDCY HEALTH TECH HRMS - COMPLETE TURNKEY DATABASE SCHEMA
-- Run this single script in your Supabase SQL Editor to set up all tables.
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Employees Table
CREATE TABLE IF NOT EXISTS "HRMS_employees" (
    "id" VARCHAR(255) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL CHECK ("role" IN ('employee', 'admin')),
    "designation" VARCHAR(255) NOT NULL,
    "joining_date" DATE NOT NULL,
    "basic_pay" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'inactive')),
    "phone" VARCHAR(50),
    "gender" VARCHAR(10),
    "experience" NUMERIC(4, 1) DEFAULT 0.0,
    "dob" DATE,
    "bank_details" JSONB DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Attendance Table
CREATE TABLE IF NOT EXISTS "HRMS_attendance" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "date" DATE NOT NULL,
    "status" VARCHAR(100) NOT NULL,
    "check_in_time" TIME WITHOUT TIME ZONE,
    "check_out_time" TIME WITHOUT TIME ZONE,
    "check_in_location" TEXT,
    "check_in_lat_lng" VARCHAR(50),
    "check_in_photo_url" TEXT,
    "check_out_photo_url" TEXT,
    "punch_type" VARCHAR(50) DEFAULT 'in_office' CHECK ("punch_type" IN ('in_office', 'out_of_office')),
    "punch_note" TEXT,
    "session_number" INTEGER DEFAULT 1,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_employee_date_session UNIQUE ("employee_id", "date", "session_number")
);

-- 4. Leave Requests Table
CREATE TABLE IF NOT EXISTS "HRMS_leave_requests" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "leave_type" VARCHAR(100) NOT NULL CHECK ("leave_type" IN ('sick', 'casual', 'maternity', 'paternity', 'monthly')),
    "from_date" DATE NOT NULL,
    "to_date" DATE NOT NULL,
    "reason" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK ("status" IN ('Pending', 'Approved', 'Rejected', 'pending', 'approved', 'rejected')),
    "submitted_at" DATE DEFAULT CURRENT_DATE,
    "admin_note" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Leave Balances Table
CREATE TABLE IF NOT EXISTS "HRMS_leave_balances" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "leave_type" VARCHAR(100) NOT NULL CHECK ("leave_type" IN ('sick', 'casual', 'maternity', 'paternity', 'monthly')),
    "total_allotted" INTEGER NOT NULL DEFAULT 0,
    "used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_employee_leave_type UNIQUE ("employee_id", "leave_type")
);

-- 6. Payroll Table
CREATE TABLE IF NOT EXISTS "HRMS_payroll" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "month" VARCHAR(7) NOT NULL,
    "basic_pay" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "allowances" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "deductions" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "net_pay" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "advance_money_taken" BOOLEAN DEFAULT FALSE,
    "advance_money_amount" NUMERIC(12, 2) DEFAULT 0.00,
    "working_days" NUMERIC(5, 2) DEFAULT NULL,
    "days_present" NUMERIC(5, 2) DEFAULT NULL,
    "leaves_taken" NUMERIC(5, 2) DEFAULT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_employee_payroll_month UNIQUE ("employee_id", "month")
);

-- 7. Advance Requests Table
CREATE TABLE IF NOT EXISTS "HRMS_advance_requests" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "amount" NUMERIC(12, 2) NOT NULL,
    "reason" TEXT NOT NULL,
    "advance_type" VARCHAR(50) DEFAULT 'salary' CHECK ("advance_type" IN ('salary', 'medical')),
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'approved', 'rejected', 'deducted')),
    "repayment_months" INTEGER DEFAULT 2 CHECK ("repayment_months" IN (2, 3, 5)),
    "monthly_installment" NUMERIC(12, 2) DEFAULT 0.00,
    "installments_remaining" INTEGER DEFAULT 0,
    "submitted_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP WITH TIME ZONE,
    "deducted_in_month" VARCHAR(7),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Invoices Table
CREATE TABLE IF NOT EXISTS "HRMS_invoices" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "invoice_number" VARCHAR(255) UNIQUE NOT NULL,
    "client_name" VARCHAR(255) NOT NULL,
    "client_details" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "total" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "payable_amount" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "created_by" VARCHAR(255),
    "due_date" DATE,
    "tax_percent" NUMERIC(5, 2) DEFAULT 18.00,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Monthly Leave Quota Table
CREATE TABLE IF NOT EXISTS "HRMS_monthly_leave_quota" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "month" VARCHAR(7) NOT NULL,
    "allotted" INTEGER NOT NULL DEFAULT 3,
    "used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_emp_month UNIQUE ("employee_id", "month")
);

-- 10. Missed Punch Correction Requests Table
CREATE TABLE IF NOT EXISTS "HRMS_missed_punches" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "missed_date" DATE NOT NULL,
    "punch_type" VARCHAR(10) NOT NULL CHECK ("punch_type" IN ('in', 'out')),
    "reason" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'approved', 'rejected')),
    "admin_note" TEXT,
    "resolved_at" TIMESTAMPTZ,
    "resolved_by" VARCHAR(255) REFERENCES "HRMS_employees"("id"),
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Office Locations Table
CREATE TABLE IF NOT EXISTS "HRMS_office_locations" (
    "id"            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "name"          VARCHAR(255) NOT NULL,
    "latitude"      NUMERIC(10, 7) NOT NULL,
    "longitude"     NUMERIC(10, 7) NOT NULL,
    "radius_meters" INTEGER NOT NULL DEFAULT 50,
    "is_active"     BOOLEAN DEFAULT TRUE,
    "created_at"    TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Special Location Events Table
CREATE TABLE IF NOT EXISTS "HRMS_special_location_events" (
    "id"            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "name"          VARCHAR(255) NOT NULL,
    "event_type"    VARCHAR(50) DEFAULT 'medical_camp',
    "latitude"      NUMERIC(10, 7) NOT NULL,
    "longitude"     NUMERIC(10, 7) NOT NULL,
    "radius_meters" INTEGER NOT NULL DEFAULT 50,
    "from_date"     DATE NOT NULL,
    "to_date"       DATE NOT NULL,
    "created_by"    VARCHAR(255) REFERENCES "HRMS_employees"("id"),
    "created_at"    TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Special Event Assignees Table
CREATE TABLE IF NOT EXISTS "HRMS_special_event_assignees" (
    "event_id"    UUID REFERENCES "HRMS_special_location_events"("id") ON DELETE CASCADE,
    "employee_id" VARCHAR(255) REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    PRIMARY KEY ("event_id", "employee_id")
);

-- 14. Location Pins Table
CREATE TABLE IF NOT EXISTS "HRMS_location_pins" (
    "id"            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id"   VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "date"          DATE NOT NULL DEFAULT CURRENT_DATE,
    "pinned_at"     TIME WITHOUT TIME ZONE NOT NULL,
    "label"         TEXT,
    "latitude"      NUMERIC(10, 7),
    "longitude"     NUMERIC(10, 7),
    "location_name" TEXT,
    "photo_url"     TEXT,
    "pin_type"      VARCHAR(50) DEFAULT 'field_visit'
                    CHECK ("pin_type" IN ('field_visit', 'medical_camp', 'client_site', 'delivery', 'other')),
    "created_at"    TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Payroll Config Table
CREATE TABLE IF NOT EXISTS "HRMS_payroll_config" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "config_key" VARCHAR(100) UNIQUE NOT NULL,
  "config_value" NUMERIC(12,2) NOT NULL,
  "label" VARCHAR(255),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Duty Roster Table
CREATE TABLE IF NOT EXISTS "HRMS_duty_roster" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
  "shift_date" DATE NOT NULL,
  "shift_start" TIME NOT NULL,
  "shift_end" TIME NOT NULL,
  "shift_label" VARCHAR(255),
  "notes" TEXT,
  "is_published" BOOLEAN DEFAULT FALSE,
  "created_by" VARCHAR(255) REFERENCES "HRMS_employees"("id"),
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_roster_entry UNIQUE ("employee_id", "shift_date")
);

-- 17. Chat Channels Table
CREATE TABLE IF NOT EXISTS "HRMS_chat_channels" (
    "id"            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "name"          VARCHAR(255),
    "type"          VARCHAR(50) DEFAULT 'direct' CHECK ("type" IN ('direct', 'group')),
    "created_at"    TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Chat Messages Table
CREATE TABLE IF NOT EXISTS "HRMS_chat_messages" (
    "id"            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "channel_id"    UUID NOT NULL REFERENCES "HRMS_chat_channels"("id") ON DELETE CASCADE,
    "sender_id"     VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "text"          TEXT,
    "attachment_url" VARCHAR(255),
    "attachment_type" VARCHAR(50),
    "attachment_name" VARCHAR(255),
    "created_at"    TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Field Sessions Table
CREATE TABLE IF NOT EXISTS "HRMS_field_sessions" (
  "id"               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "employee_id"      VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
  "session_date"     DATE NOT NULL DEFAULT CURRENT_DATE,
  "status"           VARCHAR(50) NOT NULL DEFAULT 'active'
                     CHECK ("status" IN ('active', 'completed', 'cancelled')),
  "started_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ended_at"         TIMESTAMPTZ,
  "start_latitude"   NUMERIC(10, 7),
  "start_longitude"  NUMERIC(10, 7),
  "start_address"    TEXT,
  "end_latitude"     NUMERIC(10, 7),
  "end_longitude"    NUMERIC(10, 7),
  "end_address"      TEXT,
  "notes"            TEXT,
  "created_at"       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_field_session_per_day UNIQUE ("employee_id", "session_date")
);

-- 20. Field Visits Table
CREATE TABLE IF NOT EXISTS "HRMS_field_visits" (
  "id"                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "session_id"            UUID REFERENCES "HRMS_field_sessions"("id") ON DELETE SET NULL,
  "employee_id"           VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
  "assigned_by"           VARCHAR(255) REFERENCES "HRMS_employees"("id"),
  "visit_type"            VARCHAR(100) NOT NULL DEFAULT 'OTHER',
  "title"                 VARCHAR(255) NOT NULL,
  "description"           TEXT,
  "scheduled_date"        DATE NOT NULL,
  "scheduled_start"       TIME,
  "scheduled_end"         TIME,
  "assigned_latitude"     NUMERIC(10, 7),
  "assigned_longitude"    NUMERIC(10, 7),
  "assigned_address"      TEXT,
  "allowed_radius_meters" INTEGER NOT NULL DEFAULT 150,
  "priority"              VARCHAR(20) DEFAULT 'normal'
                          CHECK ("priority" IN ('low', 'normal', 'high', 'urgent')),
  "status"                VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED'
                          CHECK ("status" IN (
                            'ASSIGNED','EN_ROUTE','ARRIVED',
                            'IN_PROGRESS','COMPLETED','MISSED','CANCELLED','FAILED'
                          )),
  "started_at"            TIMESTAMPTZ,
  "arrived_at"            TIMESTAMPTZ,
  "completed_at"          TIMESTAMPTZ,
  "actual_latitude"       NUMERIC(10, 7),
  "actual_longitude"      NUMERIC(10, 7),
  "actual_address"        TEXT,
  "arrival_distance_m"    INTEGER,
  "duration_minutes"      INTEGER,
  "proof_photo_url"       TEXT,
  "completion_notes"      TEXT,
  "patient_name"          VARCHAR(255),
  "client_reference"      VARCHAR(255),
  "location_exception"    BOOLEAN DEFAULT FALSE,
  "created_at"            TIMESTAMPTZ DEFAULT NOW()
);

-- 21. Field Visit Events Table
CREATE TABLE IF NOT EXISTS "HRMS_field_visit_events" (
  "id"             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "visit_id"       UUID REFERENCES "HRMS_field_visits"("id") ON DELETE CASCADE,
  "session_id"     UUID REFERENCES "HRMS_field_sessions"("id") ON DELETE SET NULL,
  "employee_id"    VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
  "event_type"     VARCHAR(100) NOT NULL
                   CHECK ("event_type" IN (
                     'FIELD_DUTY_STARTED','FIELD_DUTY_ENDED',
                     'VISIT_EN_ROUTE','VISIT_ARRIVED',
                     'VISIT_IN_PROGRESS','VISIT_COMPLETED',
                     'VISIT_CANCELLED','VISIT_MISSED',
                     'PROOF_CAPTURED','LOCATION_EXCEPTION'
                   )),
  "occurred_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "latitude"       NUMERIC(10, 7),
  "longitude"      NUMERIC(10, 7),
  "accuracy_m"     NUMERIC(8, 2),
  "address"        TEXT,
  "metadata"       JSONB DEFAULT '{}'::jsonb,
  "synced"         BOOLEAN DEFAULT TRUE,
  "created_at"     TIMESTAMPTZ DEFAULT NOW()
);

-- 22. Field Visit Proofs Table
CREATE TABLE IF NOT EXISTS "HRMS_field_visit_proofs" (
  "id"          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "visit_id"    UUID NOT NULL REFERENCES "HRMS_field_visits"("id") ON DELETE CASCADE,
  "proof_type"  VARCHAR(50) NOT NULL
                CHECK ("proof_type" IN ('photo', 'note', 'signature', 'otp', 'document')),
  "content"     TEXT NOT NULL,
  "captured_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "latitude"    NUMERIC(10, 7),
  "longitude"   NUMERIC(10, 7),
  "created_at"  TIMESTAMPTZ DEFAULT NOW()
);

-- 23. Work Assignment (Tasks) Table
CREATE TABLE IF NOT EXISTS public."HRMS_tasks" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'incomplete')),
    assigned_to TEXT REFERENCES public."HRMS_employees"(id) ON DELETE SET NULL,
    created_by TEXT REFERENCES public."HRMS_employees"(id) ON DELETE SET NULL,
    due_date DATE DEFAULT CURRENT_DATE,
    completed_at TIMESTAMPTZ,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 24. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_hrms_tasks_assigned_to ON public."HRMS_tasks"(assigned_to);
CREATE INDEX IF NOT EXISTS idx_hrms_tasks_status ON public."HRMS_tasks"(status);
CREATE INDEX IF NOT EXISTS idx_hrms_tasks_priority ON public."HRMS_tasks"(priority);
CREATE INDEX IF NOT EXISTS idx_hrms_tasks_due_date ON public."HRMS_tasks"(due_date);
CREATE INDEX IF NOT EXISTS idx_hrms_tasks_created_at ON public."HRMS_tasks"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON "HRMS_chat_messages"("channel_id");
CREATE INDEX IF NOT EXISTS idx_field_visits_emp_date ON "HRMS_field_visits"("employee_id", "scheduled_date");

-- 25. Row Level Security Configuration (Open Public Access for Client HRMS)
ALTER TABLE "HRMS_employees" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_attendance" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_leave_requests" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_leave_balances" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_payroll" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_advance_requests" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_invoices" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_monthly_leave_quota" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_missed_punches" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_office_locations" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_special_location_events" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_special_event_assignees" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_chat_channels" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_chat_messages" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_location_pins" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_payroll_config" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_duty_roster" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_field_sessions" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_field_visits" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_field_visit_events" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "HRMS_field_visit_proofs" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."HRMS_tasks" DISABLE ROW LEVEL SECURITY;

-- 26. Realtime Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'HRMS_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."HRMS_tasks";
  END IF;
END $$;

-- 27. Refresh Supabase Schema Cache
NOTIFY pgrst, 'reload schema';
