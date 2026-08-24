-- ====================================================================
-- 05. WORK ASSIGNMENT SYSTEM SCHEMA (MEDCY HEALTH TECH)
-- Modules: Daily Work Assignments, Lifecycle Tracking, Admin Inspection
-- ====================================================================

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

CREATE INDEX IF NOT EXISTS idx_hrms_tasks_assigned_to ON public."HRMS_tasks"(assigned_to);
CREATE INDEX IF NOT EXISTS idx_hrms_tasks_status ON public."HRMS_tasks"(status);
CREATE INDEX IF NOT EXISTS idx_hrms_tasks_priority ON public."HRMS_tasks"(priority);
CREATE INDEX IF NOT EXISTS idx_hrms_tasks_due_date ON public."HRMS_tasks"(due_date);
CREATE INDEX IF NOT EXISTS idx_hrms_tasks_created_at ON public."HRMS_tasks"(created_at DESC);
