import { supabase } from '../supabase-client';
import { Employee, LeaveBalance, LeaveType, LeaveStatus, AttendanceRecord, AttendanceStatus, CheckInLog, Payslip, MonthlyLeaveQuota } from '../../types';

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

  if (attError) console.error('Error fetching attendance:', attError);
  if (leavesError) console.error('Error fetching leave_requests:', leavesError);
  if (balError) console.error('Error fetching leave_balances:', balError);
  if (payError) console.error('Error fetching payroll:', payError);
  if (advError) console.error('Error fetching advances:', advError);
  if (pinsError) console.error('Error fetching location_pins:', pinsError);

  const { data: quotas, error: quotaError } = await supabase.from('HRMS_monthly_leave_quota').select('*');
  if (quotaError) console.error('Error fetching monthly quotas:', quotaError);
  
  const currentMonth = new Date().toISOString().substring(0, 7);
  const quotaList = quotas || [];

  const attendanceList = att || [];
  const leavesList = leaves || [];
  const balancesList = balances || [];
  const payrollList = payroll || [];
  const advancesList = advances || [];
  const pinsList = pins || [];

  return emps.map(emp => {
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

    return {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      designation: emp.designation,
      joiningDate: emp.joining_date,
      basicSalary: Number(emp.basic_pay),
      role: emp.role as 'employee' | 'admin',
      password: emp.password,
      status: (emp.status || 'active') as 'active' | 'inactive',
      phone: emp.phone,
      gender: emp.gender as 'male' | 'female' | 'other' | undefined,
      experience: Number(emp.experience) || 0,
      bankDetails: emp.bank_details as any,
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
}

export async function createEmployee(emp: Omit<Employee, 'isCheckedIn' | 'leaveBalance' | 'leaveRequests' | 'attendanceRecords' | 'checkInLogs' | 'payslips'>): Promise<void> {
  const { error } = await supabase
    .from('HRMS_employees')
    .insert([{
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
      bank_details: emp.bankDetails || null
    }]);

  if (error) {
    console.error("First insert failed:", error);
    // Fallback if the remote DB has not been migrated with status and phone columns
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

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from('HRMS_employees')
    .delete()
    .eq('id', id);
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
  const employeesToSeed: any[] = [];

  const { count } = await supabase
    .from('HRMS_employees')
    .select('*', { count: 'exact', head: true });

  if (count === 0) {
    const { error: empErr } = await supabase.from('HRMS_employees').insert(employeesToSeed);
    if (empErr) console.error('Error seeding employees:', empErr);

    const leaveBalancesToSeed: any[] = [];
    employeesToSeed.forEach(emp => {
      leaveBalancesToSeed.push(
        { employee_id: emp.id, leave_type: 'sick', total_allotted: 6, used: emp.id === 'EMP-2026-089' ? 2 : emp.id === 'EMP-2026-112' ? 1 : 0 },
        { employee_id: emp.id, leave_type: 'casual', total_allotted: 8, used: emp.id === 'EMP-2026-089' ? 3 : emp.id === 'EMP-2026-112' ? 1 : emp.id === 'EMP-2026-145' ? 2 : 0 }
      );
    });
    await supabase.from('HRMS_leave_balances').insert(leaveBalancesToSeed);

    const leaveRequestsToSeed = [
      { employee_id: 'EMP-2026-089', leave_type: 'sick', from_date: '2026-06-05', to_date: '2026-06-06', reason: 'Suffering from viral fever and cold.', status: 'Approved' },
      { employee_id: 'EMP-2026-089', leave_type: 'casual', from_date: '2026-06-22', to_date: '2026-06-23', reason: 'Attending family function in hometown.', status: 'Approved' },
      { employee_id: 'EMP-2026-112', leave_type: 'sick', from_date: '2026-06-12', to_date: '2026-06-12', reason: 'Severe migraine headache.', status: 'Approved' }
    ];
    await supabase.from('HRMS_leave_requests').insert(leaveRequestsToSeed);

    const attendanceToSeed = [
      { employee_id: 'EMP-2026-089', date: '2026-07-13', status: 'Present', check_in_time: '09:05:22', check_out_time: '18:12:45' },
      { employee_id: 'EMP-2026-112', date: '2026-07-13', status: 'Present', check_in_time: '08:58:34' }
    ];
    await supabase.from('HRMS_attendance').insert(attendanceToSeed);

    const payrollToSeed = [{
      employee_id: 'EMP-2026-089', month: '2026-06', basic_pay: 45000,
      allowances: [{ nameKey: 'hra', amount: 18000 }, { nameKey: 'medicalAllow', amount: 3000 }, { nameKey: 'conveyanceAllow', amount: 1500 }],
      deductions: [{ nameKey: 'providentFund', amount: 5400 }, { nameKey: 'professionalTax', amount: 200 }],
      net_pay: 58200
    }];
    await supabase.from('HRMS_payroll').insert(payrollToSeed);

    const invoicesToSeed = [{
      invoice_number: 'INV-2026-042', client_name: 'Apollo Corporate Health Services',
      client_details: 'Plot No. 10, VIP Road, Visakhapatnam, Andhra Pradesh - 530003\nAttn: Accounts & Payroll Department\nPayment Term: Net 15 Days',
      items: [
        { id: '1', description: 'Consultant Pathologist Professional Services (July 2026)', quantity: 1, rate: 120000 },
        { id: '2', description: 'On-site Medical Officer Charge - Contract Staffing', quantity: 22, rate: 3500 },
        { id: '3', description: 'Administrative Support & Payroll Management Fee', quantity: 1, rate: 15000 }
      ],
      total: 212000, payable_amount: 250160, tax_percent: 18, due_date: '2026-07-25'
    }];
    await supabase.from('HRMS_invoices').insert(invoicesToSeed);
  }
}
