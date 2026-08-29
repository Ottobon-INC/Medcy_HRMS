# Medcy Health Tech HRMS Database Schemas & Migrations

This folder contains all the relational schemas and SQL migrations for the Medcy Health Tech HRMS system running on Supabase (PostgreSQL).

## File Directory

| File | Purpose | Modules Included |
| :--- | :--- | :--- |
| `06_all_tables_complete.sql` | **Turnkey All-in-One Setup** | Complete system schema + Realtime + RLS rules in a single copy-paste run |
| `01_core_schema.sql` | Core HRMS domain | Employees, Attendance, Leave Requests, Leave Balances, Payroll, Advances, Invoices, Monthly Quota, Missed Punches |
| `02_messaging_schema.sql` | Internal Chat & Channels | Chat Channels, Direct/Group Messages, Attachments |
| `03_field_force_schema.sql` | Field Force Ops | Field Sessions, Field Visits, Tracking Events, Visit Proofs |
| `04_location_roster_schema.sql` | Locations & Rostering | Office Locations, Special Location Events, Assignees, Live Location Pins, Payroll Config, Duty Roster Shifts |
| `05_work_assignment_schema.sql` | Daily Work Assignment | Work Assignments (`HRMS_tasks`), Status check constraints (`in_progress`, `completed`, `incomplete`), Realtime sync |

## How to Execute in Supabase

1. Open your **Supabase Dashboard** -> Select your VizagIVF project -> Go to the **SQL Editor**.
2. To set up the whole system fresh: Copy the contents of `06_all_tables_complete.sql` and click **Run**.
3. To update individual modules, execute the corresponding numbered `.sql` file.
