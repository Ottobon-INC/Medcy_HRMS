-- ====================================================================
-- 04. LOCATION, EVENTS, LOCATION PINS & ROSTER SCHEMA (MEDCY HEALTH TECH)
-- Modules: Office Geofence Locations, Special Events, Location Pins, Duty Roster, Payroll Config
-- ====================================================================

-- 1. Office Locations
CREATE TABLE IF NOT EXISTS "HRMS_office_locations" (
    "id"            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "name"          VARCHAR(255) NOT NULL,
    "latitude"      NUMERIC(10, 7) NOT NULL,
    "longitude"     NUMERIC(10, 7) NOT NULL,
    "radius_meters" INTEGER NOT NULL DEFAULT 50,
    "is_active"     BOOLEAN DEFAULT TRUE,
    "created_at"    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Special Location Events
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

-- 3. Special Event Assignees
CREATE TABLE IF NOT EXISTS "HRMS_special_event_assignees" (
    "event_id"    UUID REFERENCES "HRMS_special_location_events"("id") ON DELETE CASCADE,
    "employee_id" VARCHAR(255) REFERENCES "HRMS_employees"("id") ON DELETE CASCADE,
    PRIMARY KEY ("event_id", "employee_id")
);

-- 4. Location Pins (Employee Realtime Geo Markers)
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

-- 5. Payroll Config Key-Value Store
CREATE TABLE IF NOT EXISTS "HRMS_payroll_config" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "config_key" VARCHAR(100) UNIQUE NOT NULL,
  "config_value" NUMERIC(12,2) NOT NULL,
  "label" VARCHAR(255),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Duty Roster Shifts
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
