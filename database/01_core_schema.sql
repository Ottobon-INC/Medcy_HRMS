-- ====================================================================
-- 01. CORE HRMS DATABASE SCHEMA (MEDCY HEALTH TECH)
-- Modules: Employees, Attendance, Leave Management, Payroll, Advances, Invoices, Leave Quota
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Employees Table
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

-- 2. Attendance Table
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

-- 3. Leave Requests Table
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

-- 4. Leave Balances Table
CREATE TABLE IF NOT EXISTS "HRMS_leave_balances" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "leave_type" VARCHAR(100) NOT NULL CHECK ("leave_type" IN ('sick', 'casual', 'maternity', 'paternity', 'monthly')),
    "total_allotted" INTEGER NOT NULL DEFAULT 0,
    "used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_employee_leave_type UNIQUE ("employee_id", "leave_type")
);

-- 5. Payroll Table
CREATE TABLE IF NOT EXISTS "HRMS_payroll" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "month" VARCHAR(7) NOT NULL, -- Format: YYYY-MM
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

-- 6. Advance Requests Table
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

-- 7. Invoices Table
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

-- 8. Monthly Leave Quota Table
CREATE TABLE IF NOT EXISTS "HRMS_monthly_leave_quota" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id" VARCHAR(255) NOT NULL REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    "month" VARCHAR(7) NOT NULL,
    "allotted" INTEGER NOT NULL DEFAULT 3,
    "used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_emp_month UNIQUE ("employee_id", "month")
);

-- 9. Missed Punch Correction Requests
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
