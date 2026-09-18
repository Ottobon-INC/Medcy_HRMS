import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('./.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const VIZAG_IVF_EMPLOYEES = [
  // 1. Regional Manager
  {
    id: 'EMP-2026-011',
    name: 'Ravikumar Raghupatruni',
    email: 'rkpatnaik5186@gmail.com',
    password: 'rkpatnaik5186@gmail.com',
    role: 'admin',
    designation: 'Regional Head (Marketing)',
    joining_date: '2026-09-01',
    basic_pay: 0.00,
    status: 'active',
    phone: '9182068148',
    gender: 'male',
    experience: 10,
    hospital: 'vizag_ivf',
    hierarchy_level: 'manager',
    reporting_to: null
  },
  // 2. Unit Heads
  {
    id: 'EMP-2026-016',
    name: 'Memidi Kishor',
    email: 'kishorememidi233@gmail.com',
    password: 'kishorememidi233@gmail.com',
    role: 'admin',
    designation: 'SKLM Unit Head',
    joining_date: '2026-09-01',
    basic_pay: 0.00,
    status: 'active',
    phone: '7981374403',
    gender: 'male',
    experience: 5,
    hospital: 'vizag_ivf',
    hierarchy_level: 'team_lead',
    reporting_to: 'EMP-2026-011'
  },
  {
    id: 'EMP-2026-015',
    name: 'Kottakota Vinay Bhushan',
    email: 'vinaybhushan0923@gmail.com',
    password: 'vinaybhushan0923@gmail.com',
    role: 'admin',
    designation: 'VZM Unit Head',
    joining_date: '2026-09-01',
    basic_pay: 0.00,
    status: 'active',
    phone: '8897561317',
    gender: 'male',
    experience: 5,
    hospital: 'vizag_ivf',
    hierarchy_level: 'team_lead',
    reporting_to: 'EMP-2026-011'
  },
  // 3. Team under Memidi Kishor (SKLM)
  {
    id: 'EMP-2026-017',
    name: 'Arugula Sasi',
    email: 'sasiarugula8741@gmail.com',
    password: 'sasiarugula8741@gmail.com',
    role: 'employee',
    designation: 'Field Officer',
    joining_date: '2026-09-01',
    basic_pay: 0.00,
    status: 'active',
    phone: '9700678741',
    gender: 'male',
    experience: 2,
    hospital: 'vizag_ivf',
    hierarchy_level: 'employee',
    reporting_to: 'EMP-2026-016'
  },
  {
    id: 'EMP-2026-018',
    name: 'Pinninti Purna Chandra Kumar',
    email: 'pinnintipurnachandrakumar@gmail.com',
    password: 'pinnintipurnachandrakumar@gmail.com',
    role: 'employee',
    designation: 'Field Officer (HQ: Srikakulam)',
    joining_date: '2026-09-01',
    basic_pay: 0.00,
    status: 'active',
    phone: '9010633295',
    gender: 'male',
    experience: 2,
    hospital: 'vizag_ivf',
    hierarchy_level: 'employee',
    reporting_to: 'EMP-2026-016'
  },
  {
    id: 'EMP-2026-022',
    name: 'U. J. V. V. Kumar',
    email: 'uppu.kumar@gmail.com',
    password: 'uppu.kumar@gmail.com',
    role: 'employee',
    designation: 'Field Officer (Vizag)',
    joining_date: '2026-09-01',
    basic_pay: 0.00,
    status: 'active',
    phone: '7095616161',
    gender: 'male',
    experience: 3,
    hospital: 'vizag_ivf',
    hierarchy_level: 'employee',
    reporting_to: 'EMP-2026-016'
  },
  {
    id: 'EMP-2026-014',
    name: 'S. Kishore Reddy',
    email: 'sathikishore@gmail.com',
    password: 'sathikishore@gmail.com',
    role: 'employee',
    designation: 'Admin (Gajuwaka / Gwk RO)',
    joining_date: '2026-09-01',
    basic_pay: 0.00,
    status: 'active',
    phone: '9959004840',
    gender: 'male',
    experience: 4,
    hospital: 'vizag_ivf',
    hierarchy_level: 'employee',
    reporting_to: 'EMP-2026-016'
  },
  // 4. Team under Kottakota Vinay Bhushan (VZM)
  {
    id: 'EMP-2026-019',
    name: 'Pallanti Bhaskar Rao',
    email: 'pallantibhaskarrao172@gmail.com',
    password: 'pallantibhaskarrao172@gmail.com',
    role: 'employee',
    designation: 'Field Officer (HQ: Bobbili)',
    joining_date: '2026-09-01',
    basic_pay: 0.00,
    status: 'active',
    phone: '6300809148',
    gender: 'male',
    experience: 2,
    hospital: 'vizag_ivf',
    hierarchy_level: 'employee',
    reporting_to: 'EMP-2026-015'
  },
  {
    id: 'EMP-2026-020',
    name: 'Pathivada Sathish',
    email: 'pathivadasathish9@gmail.com',
    password: 'pathivadasathish9@gmail.com',
    role: 'employee',
    designation: 'Field Officer (HQ: Vizianagaram)',
    joining_date: '2026-09-01',
    basic_pay: 0.00,
    status: 'active',
    phone: '9573934676',
    gender: 'male',
    experience: 2,
    hospital: 'vizag_ivf',
    hierarchy_level: 'employee',
    reporting_to: 'EMP-2026-015'
  },
  {
    id: 'EMP-2026-021',
    name: 'G. Hanumanth Rao',
    email: 'hrgammala@gmail.com',
    password: 'hrgammala@gmail.com',
    role: 'employee',
    designation: 'Field Officer (Vizag, VZM)',
    joining_date: '2026-09-01',
    basic_pay: 0.00,
    status: 'active',
    phone: '8143223728',
    gender: 'male',
    experience: 3,
    hospital: 'vizag_ivf',
    hierarchy_level: 'employee',
    reporting_to: 'EMP-2026-015'
  },
  {
    id: 'EMP-2026-012',
    name: 'Ejenti Shyam',
    email: 'sanjushyam7382@gmail.com',
    password: 'sanjushyam7382@gmail.com',
    role: 'employee',
    designation: 'Admin (Vizianagaram - Accountant)',
    joining_date: '2026-09-01',
    basic_pay: 0.00,
    status: 'active',
    phone: '7331140843',
    gender: 'male',
    experience: 3,
    hospital: 'vizag_ivf',
    hierarchy_level: 'employee',
    reporting_to: 'EMP-2026-015'
  }
];

const OBSOLETE_IDS = ['EMP-2026-008', 'EMP-2026-009', 'EMP-2026-010', 'EMP-2026-013'];

async function syncVizagIvfHierarchy() {
  console.log('--- Step 1: Cleaning up obsolete test employee records ---');
  for (const obsId of OBSOLETE_IDS) {
    await supabase.from('HRMS_leave_balances').delete().eq('employee_id', obsId);
    const { error: delErr } = await supabase.from('HRMS_employees').delete().eq('id', obsId);
    if (delErr) {
      console.warn(`Could not delete ${obsId}:`, delErr.message);
    } else {
      console.log(`Deleted obsolete record: ${obsId}`);
    }
  }

  console.log('\n--- Step 2: Upserting 11 Vizag IVF Center Employees ---');
  for (const emp of VIZAG_IVF_EMPLOYEES) {
    const { data, error } = await supabase
      .from('HRMS_employees')
      .upsert([emp], { onConflict: 'id' })
      .select('id, name, designation, hierarchy_level, reporting_to');

    if (error) {
      console.error(`Error upserting ${emp.name} (${emp.id}):`, error.message);
    } else {
      console.log(`✓ Upserted: ${emp.id} - ${emp.name} [${emp.designation}] -> Reports to: ${emp.reporting_to || 'None (Manager)'}`);
    }
  }

  console.log('\n--- Step 3: Ensuring leave balances for all 11 employees ---');
  for (const emp of VIZAG_IVF_EMPLOYEES) {
    const balances = [
      { employee_id: emp.id, leave_type: 'sick', total_allotted: 6, used: 0 },
      { employee_id: emp.id, leave_type: 'casual', total_allotted: 8, used: 0 },
      { employee_id: emp.id, leave_type: 'paternity', total_allotted: 7, used: 0 }
    ];
    for (const b of balances) {
      await supabase.from('HRMS_leave_balances').upsert([b], { onConflict: 'employee_id,leave_type' });
    }
  }
  console.log('✓ Leave balances verified.');

  console.log('\n=== Vizag IVF Center Hierarchy Sync Complete! ===');
}

syncVizagIvfHierarchy();
