import { supabase } from '../supabase-client';
import { Employee, LeaveBalance, LeaveType, LeaveStatus, AttendanceRecord, AttendanceStatus, CheckInLog, Payslip, MonthlyLeaveQuota, Branch, HierarchyLevel } from '../../types';

// Known deterministic hierarchy mapping configuration
export const KNOWN_EMPLOYEE_HIERARCHY: Record<string, {
  hospital: 'vizag_ivf' | 'medcy_hospitals' | 'both';
  hierarchyLevel: HierarchyLevel;
  reportingTo?: string;
  role?: 'admin' | 'employee';
  designation?: string;
  branch?: Branch;
}> = {
  // Master Executives
  'EMP-EXEC-001': { hospital: 'both', hierarchyLevel: 'executive', role: 'admin', designation: 'Executive Director' },
  'EMP-EXEC-002': { hospital: 'both', hierarchyLevel: 'executive', role: 'admin', designation: 'Executive Director' },

  // Medcy Hospitals: Senior Manager
  'EMP-MEDCY-001': { hospital: 'medcy_hospitals', hierarchyLevel: 'senior_manager', role: 'admin', designation: 'Senior Manager', branch: 'visakhapatnam' },

  // Medcy Team 1: Rambabu
  'EMP-2026-004': { hospital: 'medcy_hospitals', hierarchyLevel: 'team_lead', reportingTo: 'EMP-MEDCY-001', role: 'admin', designation: 'Team Lead', branch: 'visakhapatnam' },
  'EMP-2026-005': { hospital: 'medcy_hospitals', hierarchyLevel: 'employee', reportingTo: 'EMP-2026-004', designation: 'Employee', branch: 'visakhapatnam' }, // Manoj
  'EMP-2026-006': { hospital: 'medcy_hospitals', hierarchyLevel: 'employee', reportingTo: 'EMP-2026-004', designation: 'Employee', branch: 'visakhapatnam' }, // AppalNaidu

  // Medcy Team 2: Satish
  'EMP-MEDCY-002': { hospital: 'medcy_hospitals', hierarchyLevel: 'team_lead', reportingTo: 'EMP-MEDCY-001', role: 'admin', designation: 'Team Lead', branch: 'visakhapatnam' },
  'EMP-2026-002': { hospital: 'medcy_hospitals', hierarchyLevel: 'employee', reportingTo: 'EMP-MEDCY-002', designation: 'Employee', branch: 'visakhapatnam' }, // Rajesh
  'EMP-MEDCY-003': { hospital: 'medcy_hospitals', hierarchyLevel: 'employee', reportingTo: 'EMP-MEDCY-002', designation: 'Employee', branch: 'visakhapatnam' }, // Santosh
  'EMP-2026-007': { hospital: 'medcy_hospitals', hierarchyLevel: 'employee', reportingTo: 'EMP-MEDCY-002', designation: 'Employee', branch: 'visakhapatnam' }, // Hari Krishna
  'EMP-MEDCY-004': { hospital: 'medcy_hospitals', hierarchyLevel: 'employee', reportingTo: 'EMP-MEDCY-002', designation: 'Employee', branch: 'visakhapatnam' }, // Uday Kumar

  // Medcy Team 3: Prudhvi
  'EMP-MEDCY-005': { hospital: 'medcy_hospitals', hierarchyLevel: 'team_lead', reportingTo: 'EMP-MEDCY-001', role: 'admin', designation: 'Team Lead', branch: 'visakhapatnam' },
  'EMP-2026-003': { hospital: 'medcy_hospitals', hierarchyLevel: 'employee', reportingTo: 'EMP-MEDCY-005', designation: 'Employee', branch: 'visakhapatnam' }, // Mahesh Babu
  'EMP-2026-001': { hospital: 'medcy_hospitals', hierarchyLevel: 'employee', reportingTo: 'EMP-MEDCY-005', designation: 'Employee', branch: 'visakhapatnam' }, // Karan Kumar

  // Vizag IVF Manager & Staff
  'EMP-2026-011': { hospital: 'vizag_ivf', hierarchyLevel: 'manager', role: 'admin', designation: 'Branch Operations Manager', branch: 'visakhapatnam' }, // R. Ravi Kumar
  'EMP-2026-008': { hospital: 'vizag_ivf', hierarchyLevel: 'employee', reportingTo: 'EMP-2026-011', branch: 'visakhapatnam' }, // Shiva Kumar
  'EMP-2026-009': { hospital: 'vizag_ivf', hierarchyLevel: 'employee', reportingTo: 'EMP-2026-011', branch: 'visakhapatnam' }, // Gondu Srinivasa Rao
  'EMP-2026-010': { hospital: 'vizag_ivf', hierarchyLevel: 'employee', reportingTo: 'EMP-2026-011', branch: 'vizianagaram' }, // Dhanusha Dadi
  'EMP-2026-012': { hospital: 'vizag_ivf', hierarchyLevel: 'employee', reportingTo: 'EMP-2026-011', branch: 'visakhapatnam' }, // Gonti Shyam
  'EMP-2026-013': { hospital: 'vizag_ivf', hierarchyLevel: 'employee', reportingTo: 'EMP-2026-011', branch: 'vizianagaram' }, // U. Jayavani
  'EMP-2026-014': { hospital: 'vizag_ivf', hierarchyLevel: 'employee', reportingTo: 'EMP-2026-011', branch: 'visakhapatnam' }, // S. Kishore Reddy
};

export const MEDCY_GHOST_EMPLOYEES: Array<{
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee';
  designation: string;
  joiningDate: string;
  status: 'pending';
  hospital: 'medcy_hospitals';
  hierarchyLevel: HierarchyLevel;
  reportingTo?: string;
  branch: Branch;
}> = [
  {
    id: 'EMP-MEDCY-001',
    name: 'Dr. Bhramhaji',
    email: 'bhramhaji.ghost@medcy.com',
    role: 'admin',
    designation: 'Senior Manager',
    joiningDate: '2026-09-01',
    status: 'pending',
    hospital: 'medcy_hospitals',
    hierarchyLevel: 'senior_manager',
    reportingTo: undefined,
    branch: 'visakhapatnam'
  },
  {
    id: 'EMP-MEDCY-002',
    name: 'Satish',
    email: 'satish.ghost@medcy.com',
    role: 'admin',
    designation: 'Team Lead',
    joiningDate: '2026-09-01',
    status: 'pending',
    hospital: 'medcy_hospitals',
    hierarchyLevel: 'team_lead',
    reportingTo: 'EMP-MEDCY-001',
    branch: 'visakhapatnam'
  },
  {
    id: 'EMP-MEDCY-003',
    name: 'Santosh',
    email: 'santosh.ghost@medcy.com',
    role: 'employee',
    designation: 'Employee',
    joiningDate: '2026-09-01',
    status: 'pending',
    hospital: 'medcy_hospitals',
    hierarchyLevel: 'employee',
    reportingTo: 'EMP-MEDCY-002',
    branch: 'visakhapatnam'
  },
  {
    id: 'EMP-MEDCY-004',
    name: 'Uday Kumar',
    email: 'uday.ghost@medcy.com',
    role: 'employee',
    designation: 'Employee',
    joiningDate: '2026-09-01',
    status: 'pending',
    hospital: 'medcy_hospitals',
    hierarchyLevel: 'employee',
    reportingTo: 'EMP-MEDCY-002',
    branch: 'visakhapatnam'
  },
  {
    id: 'EMP-MEDCY-005',
    name: 'Prudhvi',
    email: 'prudhvi.ghost@medcy.com',
    role: 'admin',
    designation: 'Team Lead',
    joiningDate: '2026-09-01',
    status: 'pending',
    hospital: 'medcy_hospitals',
    hierarchyLevel: 'team_lead',
    reportingTo: 'EMP-MEDCY-001',
    branch: 'visakhapatnam'
  }
];

export async function fetchAllEmployeesData(): Promise<Employee[]> {
  const { data: emps, error: empError } = await supabase
    .from('HRMS_employees')
    .select('*')
    .order('id', { ascending: true });

  if (empError) throw empError;
  if (!emps) return [];

  const { data: att, error: attError } = await supabase.from('HRMS_attendance').select('*');
  const { data: leaves, error: leavesError } = await supabase.from('HRMS_leave_requests').select('*');
  const { data: balances, error: balError } = await supabase.from('HRMS_leave_balances').select('*');
  const { data: payroll, error: payError } = await supabase.from('HRMS_payroll').select('*');
  const { data: advances, error: advError } = await supabase.from('HRMS_advance_requests').select('*');
  const { data: pins, error: pinsError } = await supabase.from('HRMS_location_pins').select('*');

  if (attError) console.warn('Attendance sync notice:', attError.message);
  if (leavesError) console.warn('Leave requests sync notice:', leavesError.message);
  if (balError) console.warn('Leave balances sync notice:', balError.message);
  if (payError && payError.code !== 'PGRST205') console.warn('Payroll sync notice:', payError.message);
  if (advError && advError.code !== 'PGRST205') console.warn('Advances sync notice:', advError.message);
  if (pinsError && pinsError.code !== 'PGRST205') console.warn('Location pins sync notice:', pinsError.message);

  const { data: quotas, error: quotaError } = await supabase.from('HRMS_monthly_leave_quota').select('*');
  if (quotaError && quotaError.code !== 'PGRST205') console.warn('Monthly quotas sync notice:', quotaError.message);
  
  const currentMonth = new Date().toISOString().substring(0, 7);
  const quotaList = quotas || [];

  const attendanceList = att || [];
  const leavesList = leaves || [];
  const balancesList = balances || [];
  const payrollList = payroll || [];
  const advancesList = advances || [];
  const pinsList = pins || [];

  const mappedEmployees: Employee[] = emps.map(emp => {
    // Map leave balances
    const empBalances = balancesList.filter(b => b.employee_id === emp.id);
    const leaveBalance: LeaveBalance = {
      sick: { allowed: 6, taken: 0 },
      casual: { allowed: 8, taken: 0 }
    };
    if (emp.gender === 'female') {
      leaveBalance.maternity = { allowed: 90, taken: 0 };
    } else if (emp.gender === 'male') {
      leaveBalance.paternity = { allowed: 7, taken: 0 };
    }
    empBalances.forEach(b => {
      const type = b.leave_type as LeaveType;
      if (leaveBalance[type]) {
        leaveBalance[type] = { allowed: b.total_allotted, taken: b.used };
      }
    });

    // Map leave requests
    const empLeaves = leavesList
      .filter(l => l.employee_id === emp.id)
      .map(l => ({
        id: l.id,
        type: l.leave_type as LeaveType,
        fromDate: l.from_date,
        toDate: l.to_date,
        reason: l.reason,
        status: (l.status as string).toLowerCase() as LeaveStatus,
        submittedAt: l.submitted_at || l.from_date
      }));

    // Map attendance records and check-in logs
    const empAtt = attendanceList.filter(a => a.employee_id === emp.id);
    const attendanceRecords: AttendanceRecord[] = empAtt.map(a => ({
      date: a.date,
      status: (a.status || 'present').toLowerCase() as AttendanceStatus,
      note: a.check_in_time ? `Checked In: ${a.check_in_time}` : undefined,
      photoUrl: a.check_in_photo_url || undefined
    }));

    const checkInLogs: CheckInLog[] = empAtt
      .filter(a => a.check_in_time)
      .map(a => {
        let totalHours: number | null = null;
        if (a.check_in_time && a.check_out_time) {
          try {
            const [h1, m1, s1] = a.check_in_time.split(':').map(Number);
            const [h2, m2, s2] = a.check_out_time.split(':').map(Number);
            const diffMs = (h2 * 3600 + m2 * 60 + s2) - (h1 * 3600 + m1 * 60 + s1);
            totalHours = diffMs > 0 ? parseFloat((diffMs / 3600).toFixed(2)) : 0;
          } catch (e) {
            totalHours = null;
          }
        }
        return {
          id: a.id,
          date: a.date,
          checkInTime: a.check_in_time,
          checkOutTime: a.check_out_time,
          totalHours,
          checkInLocation: a.check_in_location || undefined,
          checkInLatLng: a.check_in_lat_lng || undefined,
          photoUrl: a.check_in_photo_url || undefined,
          checkOutLocation: a.check_out_location || undefined,
          checkOutLatLng: a.check_out_lat_lng || undefined,
          checkOutPhotoUrl: a.check_out_photo_url || undefined,
          punchType: (a.punch_type || 'in_office') as import('../../types').PunchType,
          punchNote: a.punch_note || undefined,
          sessionNumber: a.session_number || 1
        };

      });

    const locationPins = pinsList
      .filter(p => p.employee_id === emp.id)
      .map(p => ({
        id: p.id,
        date: p.date,
        pinnedAt: p.pinned_at,
        label: p.label || undefined,
        latitude: p.latitude ? Number(p.latitude) : undefined,
        longitude: p.longitude ? Number(p.longitude) : undefined,
        locationName: p.location_name || undefined,
        photoUrl: p.photo_url || undefined,
        pinType: (p.pin_type || 'other') as import('../../types').PinType
      }));

    // Determine check-in status for today
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecord = empAtt.find(a => a.date === todayStr);
    const isCheckedIn = !!(todayRecord && todayRecord.check_in_time && !todayRecord.check_out_time);

    // Map payslips
      const empPayslips: Payslip[] = payrollList
      .filter(p => p.employee_id === emp.id)
      .map(p => ({
        id: p.id,
        month: p.month,
        basicPay: Number(p.basic_pay),
        allowances: Array.isArray(p.allowances) ? p.allowances : [],
        deductions: Array.isArray(p.deductions) ? p.deductions : [],
        advanceMoneyTaken: p.advance_money_taken,
        advanceMoneyAmount: Number(p.advance_money_amount),
        workingDays: p.working_days ? Number(p.working_days) : undefined,
        daysPresent: p.days_present ? Number(p.days_present) : undefined,
        leavesTaken: p.leaves_taken ? Number(p.leaves_taken) : undefined
      }));

    // Map monthly quota
    const empQuota = quotaList.find(q => q.employee_id === emp.id && q.month === currentMonth);
    let monthlyQuota: MonthlyLeaveQuota | undefined = undefined;
    if (empQuota) {
      monthlyQuota = {
        id: empQuota.id,
        month: empQuota.month,
        allotted: empQuota.allotted,
        used: empQuota.used,
        remaining: empQuota.allotted - empQuota.used
      };
    } else {
      // Create an empty virtual one for the UI if not fetched/initialized yet
      monthlyQuota = {
        id: 'virtual',
        month: currentMonth,
        allotted: 3,
        used: 0,
        remaining: 3
      };
    }

    // Known hierarchy mapping fallback
    const knownConfig = KNOWN_EMPLOYEE_HIERARCHY[emp.id];

    // Branch & Hierarchy Resolution with robust backward compatibility
    const branch: Branch = (emp.branch as Branch) || knownConfig?.branch || 'visakhapatnam';
    let hierarchyLevel: HierarchyLevel = (emp.hierarchy_level as HierarchyLevel) || knownConfig?.hierarchyLevel;
    if (!hierarchyLevel) {
      if (emp.id === 'EMP-2026-011' || (emp.name && emp.name.toLowerCase().includes('ravi kumar'))) {
        hierarchyLevel = 'manager';
      } else if (emp.id === 'EMP-EXEC-001' || emp.id === 'EMP-EXEC-002' || (emp.name && (emp.name.toLowerCase().includes('indra') || emp.name.toLowerCase().includes('anoopama')))) {
        hierarchyLevel = 'executive';
      } else {
        hierarchyLevel = emp.role === 'admin' ? 'manager' : 'employee';
      }
    }
    const isExecOrManager = hierarchyLevel === 'executive' || hierarchyLevel === 'manager' || hierarchyLevel === 'senior_manager';
    const managedBranches: Branch[] = Array.isArray(emp.managed_branches)
      ? emp.managed_branches
      : (isExecOrManager ? ['visakhapatnam', 'vizianagaram'] : [branch]);

    // Determine reportingTo: prioritize explicit DB field, then known config, then default for Vizag IVF
    let reportingTo: string | undefined = emp.reporting_to;
    if (!reportingTo && knownConfig?.reportingTo) {
      reportingTo = knownConfig.reportingTo;
    } else if (!reportingTo && hierarchyLevel === 'employee' && (emp.hospital || knownConfig?.hospital) !== 'medcy_hospitals') {
      reportingTo = 'EMP-2026-011';
    }

    const resolvedRole = (isExecOrManager || emp.role === 'admin' || knownConfig?.role === 'admin') ? 'admin' : 'employee';
    const hospital = (emp.hospital as import('../../types').Hospital) || knownConfig?.hospital || 'vizag_ivf';
    const designation = emp.designation || knownConfig?.designation || (hierarchyLevel === 'team_lead' ? 'Team Lead' : hierarchyLevel === 'senior_manager' ? 'Senior Manager' : 'Employee');

    return {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      designation,
      joiningDate: emp.joining_date,
      basicSalary: Number(emp.basic_pay),
      role: resolvedRole as 'employee' | 'admin',
      password: emp.password,
      status: (emp.status || 'active') as 'active' | 'inactive' | 'pending',
      phone: emp.phone,
      gender: emp.gender as 'male' | 'female' | 'other' | undefined,
      experience: Number(emp.experience) || 0,
      bankDetails: emp.bank_details as any,
      hospital,
      branch,
      teamId: emp.team_id || undefined,
      hierarchyLevel,
      managedBranches,
      reportingTo,
      isCheckedIn,
      leaveBalance,
      monthlyQuota,
      leaveRequests: empLeaves,
      attendanceRecords,
      checkInLogs,
      payslips: empPayslips,
      locationPins,
      advanceRequests: advancesList
        .filter(a => a.employee_id === emp.id)
        .map(a => {
          return {
            id: a.id,
            advanceType: (a.advance_type || 'salary') as 'salary' | 'medical',
            amount: Number(a.amount),
            reason: a.reason,
            status: a.status as any,
            submittedAt: a.submitted_at,
            approvedAt: a.approved_at,
            deductedInMonth: a.deducted_in_month,
            repaymentMonths: a.repayment_months as (2 | 3 | 5) | undefined,
            monthlyInstallment: a.monthly_installment ? Number(a.monthly_installment) : undefined,
            installmentsRemaining: a.installments_remaining ?? undefined
          };
        })
    };

  });

  // Ensure Executive accounts (Indra Mam & Anoopama Mam) exist for immediate login/testing
  if (!mappedEmployees.some(e => e.id === 'EMP-EXEC-001' || e.name.toLowerCase().includes('indra'))) {
    mappedEmployees.unshift({
      id: 'EMP-EXEC-001',
      name: 'Indra Mam',
      email: 'indra@vizagivf.com',
      password: 'password',
      role: 'admin',
      designation: 'Executive Director',
      joiningDate: '2026-01-01',
      basicSalary: 0,
      status: 'active',
      phone: '9999999901',
      gender: 'female',
      experience: 10,
      hospital: 'both',
      branch: 'visakhapatnam',
      hierarchyLevel: 'executive',
      managedBranches: ['visakhapatnam', 'vizianagaram'],
      isCheckedIn: false,
      leaveBalance: { sick: { allowed: 12, taken: 0 }, casual: { allowed: 12, taken: 0 } },
      monthlyQuota: { id: 'exec1', month: currentMonth, allotted: 5, used: 0, remaining: 5 },
      leaveRequests: [],
      attendanceRecords: [],
      checkInLogs: [],
      payslips: [],
      advanceRequests: []
    });
  }

  if (!mappedEmployees.some(e => e.id === 'EMP-EXEC-002' || e.name.toLowerCase().includes('anoopama'))) {
    mappedEmployees.unshift({
      id: 'EMP-EXEC-002',
      name: 'Anoopama Mam',
      email: 'anoopama@vizagivf.com',
      password: 'password',
      role: 'admin',
      designation: 'Executive Director',
      joiningDate: '2026-01-01',
      basicSalary: 0,
      status: 'active',
      phone: '9999999902',
      gender: 'female',
      experience: 10,
      hospital: 'both',
      branch: 'visakhapatnam',
      hierarchyLevel: 'executive',
      managedBranches: ['visakhapatnam', 'vizianagaram'],
      isCheckedIn: false,
      leaveBalance: { sick: { allowed: 12, taken: 0 }, casual: { allowed: 12, taken: 0 } },
      monthlyQuota: { id: 'exec2', month: currentMonth, allotted: 5, used: 0, remaining: 5 },
      leaveRequests: [],
      attendanceRecords: [],
      checkInLogs: [],
      payslips: [],
      advanceRequests: []
    });
  }

  // Ensure Medcy Ghost employees exist for visualization and pending staff tracking
  MEDCY_GHOST_EMPLOYEES.forEach(ghost => {
    if (!mappedEmployees.some(e => e.id === ghost.id)) {
      mappedEmployees.push({
        id: ghost.id,
        name: ghost.name,
        email: ghost.email,
        password: 'password',
        role: ghost.role,
        designation: ghost.designation,
        joiningDate: ghost.joiningDate,
        basicSalary: 0,
        status: ghost.status,
        phone: '0000000000',
        gender: 'male',
        experience: 0,
        hospital: ghost.hospital,
        branch: ghost.branch,
        hierarchyLevel: ghost.hierarchyLevel,
        managedBranches: [ghost.branch],
        reportingTo: ghost.reportingTo,
        isCheckedIn: false,
        leaveBalance: { sick: { allowed: 6, taken: 0 }, casual: { allowed: 8, taken: 0 } },
        monthlyQuota: { id: `ghost-${ghost.id}`, month: currentMonth, allotted: 3, used: 0, remaining: 3 },
        leaveRequests: [],
        attendanceRecords: [],
        checkInLogs: [],
        payslips: [],
        advanceRequests: []
      });
    }
  });

  return mappedEmployees;
}

/**
 * Scopes the visible list of employees based on the current user's hierarchy level and branch responsibilities.
 * - Executive (Indra mam, Anoopama mam): Full cross-org visibility (all branches)
 * - Senior Manager (Bhramhaji): All Medcy Hospitals employees
 * - Manager (Ravi Kumar): Full access across assigned branches (both Visakhapatnam and Vizianagaram) for Vizag IVF
 * - Team Lead: Restricted to their direct team members (reportingTo)
 * - Employee: Restricted to self only
 */
export function filterEmployeesByScope(
  currentUser: Employee | null | undefined,
  allEmployees: Employee[]
): Employee[] {
  if (!currentUser) return allEmployees;

  // Executive tier: Complete visibility across all branches and levels
  if (currentUser.hierarchyLevel === 'executive') {
    return allEmployees;
  }
  
  // Senior Manager: Complete visibility across their hospital
  if (currentUser.hierarchyLevel === 'senior_manager') {
    return allEmployees.filter(emp => emp.hospital === currentUser.hospital || emp.hierarchyLevel === 'executive');
  }
  
  // Team Lead: Access to their team members
  if (currentUser.hierarchyLevel === 'team_lead') {
    return allEmployees.filter(emp => emp.reportingTo === currentUser.id || emp.id === currentUser.id || emp.hierarchyLevel === 'executive' || emp.hierarchyLevel === 'senior_manager');
  }

  // Manager tier: Access to all employees within their managed branches and hospital
  if (currentUser.hierarchyLevel === 'manager' || currentUser.role === 'admin') {
    const branches = currentUser.managedBranches && currentUser.managedBranches.length > 0
      ? currentUser.managedBranches
      : (currentUser.branch ? [currentUser.branch] : ['visakhapatnam', 'vizianagaram']);

    return allEmployees.filter(emp => {
      // Always include executives or other managers for org structure/reporting views
      if (emp.hierarchyLevel === 'executive' || emp.id === currentUser.id) return true;
      if (emp.hospital !== currentUser.hospital && currentUser.hospital !== 'both') return false;
      const empBranch = emp.branch || 'visakhapatnam';
      return branches.includes(empBranch);
    });
  }

  // Employee tier: Only personal record
  return allEmployees.filter(emp => emp.id === currentUser.id);
}

export async function createEmployee(emp: Omit<Employee, 'isCheckedIn' | 'leaveBalance' | 'leaveRequests' | 'attendanceRecords' | 'checkInLogs' | 'payslips'>): Promise<void> {
  const payload: any = {
    id: emp.id,
    name: emp.name,
    email: emp.email,
    password: emp.password || 'password',
    role: emp.role,
    designation: emp.designation,
    joining_date: emp.joiningDate,
    basic_pay: emp.basicSalary,
    status: emp.status || 'active',
    phone: emp.phone || null,
    gender: emp.gender || null,
    experience: emp.experience || 0,
    bank_details: emp.bankDetails || null,
    branch: emp.branch || 'visakhapatnam',
    hierarchy_level: emp.hierarchyLevel || 'employee',
    managed_branches: emp.managedBranches || (emp.hierarchyLevel === 'manager' ? ['visakhapatnam', 'vizianagaram'] : [emp.branch || 'visakhapatnam']),
    reporting_to: emp.reportingTo || (emp.hierarchyLevel === 'employee' ? 'EMP-2026-011' : null)
  };

  const { error } = await supabase
    .from('HRMS_employees')
    .insert([payload]);

  if (error) {
    console.error("First insert failed:", error);
    // Fallback if the remote DB has not been migrated with new columns
    const fallbackData = {
      id: emp.id,
      name: emp.name || 'Unknown',
      email: emp.email,
      password: emp.password || 'password',
      role: emp.role || 'employee',
      designation: emp.designation || 'Employee',
      joining_date: emp.joiningDate || new Date().toISOString().split('T')[0],
      basic_pay: Number(emp.basicSalary) || 0,
      gender: emp.gender || null,
      experience: emp.experience || 0
    };
    const { error: retryError } = await supabase
      .from('HRMS_employees')
      .insert([fallbackData]);
    if (retryError) {
      console.error("Retry insert failed:", retryError);
      throw retryError;
    }
  }

  const initialBalances: any[] = [
    { employee_id: emp.id, leave_type: 'sick', total_allotted: 6, used: 0 },
    { employee_id: emp.id, leave_type: 'casual', total_allotted: 8, used: 0 }
  ];
  if (emp.gender === 'female') {
    initialBalances.push({ employee_id: emp.id, leave_type: 'maternity', total_allotted: 90, used: 0 });
  } else if (emp.gender === 'male') {
    initialBalances.push({ employee_id: emp.id, leave_type: 'paternity', total_allotted: 7, used: 0 });
  }
  await supabase.from('HRMS_leave_balances').insert(initialBalances);
}

export async function updateEmployee(id: string, fields: Partial<Employee>): Promise<void> {
  const updatePayload: any = {};
  if (fields.name !== undefined) updatePayload.name = fields.name;
  if (fields.email !== undefined) updatePayload.email = fields.email;
  if (fields.designation !== undefined) updatePayload.designation = fields.designation;
  if (fields.joiningDate !== undefined) updatePayload.joining_date = fields.joiningDate;
  if (fields.basicSalary !== undefined) updatePayload.basic_pay = fields.basicSalary;
  if (fields.role !== undefined) updatePayload.role = fields.role;
  if (fields.password !== undefined) updatePayload.password = fields.password;
  if (fields.status !== undefined) updatePayload.status = fields.status;
  if (fields.phone !== undefined) updatePayload.phone = fields.phone;
  if (fields.gender !== undefined) updatePayload.gender = fields.gender;
  if (fields.experience !== undefined) updatePayload.experience = fields.experience;
  if (fields.bankDetails !== undefined) updatePayload.bank_details = fields.bankDetails;
  if (fields.branch !== undefined) updatePayload.branch = fields.branch;
  if (fields.hierarchyLevel !== undefined) updatePayload.hierarchy_level = fields.hierarchyLevel;
  if (fields.managedBranches !== undefined) updatePayload.managed_branches = fields.managedBranches;
  if (fields.reportingTo !== undefined) updatePayload.reporting_to = fields.reportingTo;

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await supabase
      .from('HRMS_employees')
      .update(updatePayload)
      .eq('id', id);
    if (error) {
      // Fallback: strip new columns and retry
      delete updatePayload.status;
      delete updatePayload.phone;
      delete updatePayload.gender;
      delete updatePayload.experience;
      delete updatePayload.bank_details;
      delete updatePayload.branch;
      delete updatePayload.hierarchy_level;
      delete updatePayload.managed_branches;
      delete updatePayload.reporting_to;
      if (Object.keys(updatePayload).length > 0) {
        const { error: retryError } = await supabase
          .from('HRMS_employees')
          .update(updatePayload)
          .eq('id', id);
        if (retryError) throw retryError;
      }
    }
  }
}

export async function updateEmployeePassword(id: string, newPassword: string): Promise<void> {
  const { error } = await supabase
    .from('HRMS_employees')
    .update({ password: newPassword })
    .eq('id', id);
  if (error) {
    console.error('Error updating employee password:', error);
    throw error;
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from('HRMS_employees')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function deleteAllNonAdminEmployees(): Promise<void> {
  const { error } = await supabase
    .from('HRMS_employees')
    .delete()
    .eq('role', 'employee');
  if (error) throw error;
}

export async function toggleEmployeeStatus(id: string, status: 'active' | 'inactive'): Promise<void> {
  const { error } = await supabase
    .from('HRMS_employees')
    .update({ status })
    .eq('id', id);
  if (error) {
    console.warn("Status toggle failed, likely because 'status' column is missing from remote DB.");
  }
}

export async function seedInitialDatabase() {
  const employeesToSeed = [
    {
      id: 'EMP-2026-001',
      name: 'M. Karan',
      email: 'karanking035@gmail.com',
      password: 'karanking035@gmail.com',
      role: 'employee',
      designation: 'Employee',
      joining_date: '2026-09-01',
      basic_pay: 0.00,
      status: 'active',
      phone: '9704945077',
      gender: 'male',
      experience: 0,
      dob: '2000-12-19'
    },
    {
      id: 'EMP-2026-002',
      name: 'Rajesh',
      email: 'inkallurajesh9@gmail.com',
      password: 'inkallurajesh9@gmail.com',
      role: 'employee',
      designation: 'Employee',
      joining_date: '2026-09-01',
      basic_pay: 0.00,
      status: 'active',
      phone: '9494477778',
      gender: 'male',
      experience: 0,
      dob: '1983-01-11'
    },
    {
      id: 'EMP-2026-003',
      name: 'P. Mahesh Babu',
      email: 'purrimaheshbabu@gmail.com',
      password: 'purrimaheshbabu@gmail.com',
      role: 'employee',
      designation: 'Employee',
      joining_date: '2026-09-01',
      basic_pay: 0.00,
      status: 'active',
      phone: '9494906392',
      gender: 'male',
      experience: 0,
      dob: '1995-06-20'
    },
    {
      id: 'EMP-2026-004',
      name: 'G. Rambabu',
      email: 'rambabu@gmail.com',
      password: 'rambabu@gmail.com',
      role: 'employee',
      designation: 'Employee',
      joining_date: '2026-09-01',
      basic_pay: 0.00,
      status: 'active',
      phone: '9493940820',
      gender: 'male',
      experience: 0,
      dob: null
    },
    {
      id: 'EMP-2026-005',
      name: 'S. Manoj Kumar',
      email: 'mrmandy222@gmail.com',
      password: 'mrmandy222@gmail.com',
      role: 'employee',
      designation: 'Employee',
      joining_date: '2026-09-01',
      basic_pay: 0.00,
      status: 'active',
      phone: '9182867219',
      gender: 'male',
      experience: 0,
      dob: '2000-07-16'
    },
    {
      id: 'EMP-2026-006',
      name: 'T. Appalanaidu',
      email: 'appunaiduterli2345@gmail.com',
      password: 'appunaiduterli2345@gmail.com',
      role: 'employee',
      designation: 'Employee',
      joining_date: '2026-09-01',
      basic_pay: 0.00,
      status: 'active',
      phone: '9951839088',
      gender: 'male',
      experience: 0,
      dob: '1995-06-15'
    },
    {
      id: 'EMP-2026-007',
      name: 'A. Hari Krishna',
      email: 'hemnathharry81@gmail.com',
      password: 'hemnathharry81@gmail.com',
      role: 'employee',
      designation: 'Employee',
      joining_date: '2026-09-01',
      basic_pay: 0.00,
      status: 'active',
      phone: '9885728580',
      gender: 'male',
      experience: 0,
      dob: '1999-11-30'
    },
    {
      id: 'EMP-2026-008',
      name: 'Shiva Kumar',
      email: 'balivada.shiva@gmail.com',
      password: 'balivada.shiva@gmail.com',
      role: 'employee',
      designation: 'Employee',
      joining_date: '2026-09-01',
      basic_pay: 0.00,
      status: 'active',
      phone: '846018424',
      gender: 'male',
      experience: 0,
      dob: '1989-08-06'
    },
    {
      id: 'EMP-2026-009',
      name: 'Gondu Srinivasa Rao',
      email: 'gondusrinivaskrishna@gmail.com',
      password: 'gondusrinivaskrishna@gmail.com',
      role: 'employee',
      designation: 'Employee',
      joining_date: '2026-09-01',
      basic_pay: 0.00,
      status: 'active',
      phone: '9705686880',
      gender: 'male',
      experience: 0,
      dob: '1988-06-20'
    },
    {
      id: 'EMP-2026-010',
      name: 'Dhanusha Dadi',
      email: 'dhanushadadi88@gmail.com',
      password: 'dhanushadadi88@gmail.com',
      role: 'employee',
      designation: 'Employee',
      joining_date: '2026-09-01',
      basic_pay: 0.00,
      status: 'active',
      phone: '8008668844',
      gender: 'female',
      experience: 0,
      dob: '1993-09-03'
    },
    {
      id: 'EMP-2026-011',
      name: 'R. Ravi Kumar',
      email: 'ravildm09@gmail.com',
      password: 'ravildm09@gmail.com',
      role: 'admin',
      designation: 'Branch Operations Manager',
      joining_date: '2026-09-01',
      basic_pay: 0.00,
      status: 'active',
      phone: '9182068148',
      gender: 'male',
      experience: 0,
      dob: '1978-06-01'
    },
    {
      id: 'EMP-EXEC-001',
      name: 'Indra Mam',
      email: 'indra@vizagivf.com',
      password: 'password',
      role: 'admin',
      designation: 'Executive Director',
      joining_date: '2026-01-01',
      basic_pay: 0.00,
      status: 'active',
      phone: '9999999901',
      gender: 'female',
      experience: 10,
      dob: '1980-01-01'
    },
    {
      id: 'EMP-EXEC-002',
      name: 'Anoopama Mam',
      email: 'anoopama@vizagivf.com',
      password: 'password',
      role: 'admin',
      designation: 'Executive Director',
      joining_date: '2026-01-01',
      basic_pay: 0.00,
      status: 'active',
      phone: '9999999902',
      gender: 'female',
      experience: 10,
      dob: '1982-01-01'
    },
    {
      id: 'EMP-2026-012',
      name: 'Gonti Shyam',
      email: 'sanjushyam7382@gmail.com',
      password: 'sanjushyam7382@gmail.com',
      role: 'employee',
      designation: 'Employee',
      joining_date: '2026-09-01',
      basic_pay: 0.00,
      status: 'active',
      phone: '7331140843',
      gender: 'male',
      experience: 0,
      dob: '2001-03-06'
    },
    {
      id: 'EMP-2026-013',
      name: 'U. Jayavani',
      email: 'ugrangijaya@gmail.com',
      password: 'ugrangijaya@gmail.com',
      role: 'employee',
      designation: 'Employee',
      joining_date: '2026-09-01',
      basic_pay: 0.00,
      status: 'active',
      phone: '8500880441',
      gender: 'female',
      experience: 0,
      dob: '1990-02-23'
    },
    {
      id: 'EMP-2026-014',
      name: 'S. Kishore Reddy',
      email: 'sattikishorereddy@gmail.com',
      password: 'sattikishorereddy@gmail.com',
      role: 'employee',
      designation: 'Employee',
      joining_date: '2026-09-01',
      basic_pay: 0.00,
      status: 'active',
      phone: '9959004840',
      gender: 'male',
      experience: 0,
      dob: '1988-06-28'
    }
  ];

  const { count } = await supabase
    .from('HRMS_employees')
    .select('*', { count: 'exact', head: true });

  if (count === 0) {
    const { error: empErr } = await supabase.from('HRMS_employees').insert(employeesToSeed);
    if (empErr) console.error('Error seeding employees:', empErr);

    const leaveBalancesToSeed: any[] = [];
    employeesToSeed.forEach(emp => {
      leaveBalancesToSeed.push(
        { employee_id: emp.id, leave_type: 'sick', total_allotted: 6, used: 0 },
        { employee_id: emp.id, leave_type: 'casual', total_allotted: 8, used: 0 }
      );
      if (emp.gender === 'female') {
        leaveBalancesToSeed.push({ employee_id: emp.id, leave_type: 'maternity', total_allotted: 90, used: 0 });
      } else {
        leaveBalancesToSeed.push({ employee_id: emp.id, leave_type: 'paternity', total_allotted: 7, used: 0 });
      }
    });
    await supabase.from('HRMS_leave_balances').insert(leaveBalancesToSeed);
  }

  // Supabase table does not yet have hospital, hierarchy_level, and reporting_to columns.
  // The app merges these locally via KNOWN_EMPLOYEE_HIERARCHY on the client side.
  // Attempting to patch them causes 400 Bad Request spam in the console.
}


