import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('./.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectEmployees() {
  const { data, error } = await supabase
    .from('HRMS_employees')
    .select('*');

  if (error) {
    console.error('Error fetching HRMS_employees:', error);
    return;
  }

  console.log(`Total employees in DB: ${data?.length}`);
  console.log('List of employees:');
  data?.forEach((emp, index) => {
    console.log(`${index + 1}. ID: ${emp.id} | Name: "${emp.name}" | Email: "${emp.email}" | Role: ${emp.role} | Designation: "${emp.designation}" | Hierarchy: ${emp.hierarchy_level} | ReportingTo: ${emp.reporting_to} | Branch: ${emp.branch} | Hospital: ${emp.hospital}`);
  });
}

inspectEmployees();
