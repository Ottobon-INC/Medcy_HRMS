import { supabase } from '../supabase-client';
import { MissedPunchRequest, MissedPunchStatus } from '../../types';

/** Employee submits a missed punch request */
export async function submitMissedPunchRequest(
  empId: string,
  missedDate: string,
  punchType: 'in' | 'out',
  reason?: string
): Promise<void> {
  // Prevent duplicate: if a pending request already exists for that date and type, skip
  const { data: existing } = await supabase
    .from('HRMS_missed_punch_requests')
    .select('id')
    .eq('employee_id', empId)
    .eq('missed_date', missedDate)
    .eq('punch_type', punchType)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) return; // Already requested, don't duplicate

  const { error } = await supabase
    .from('HRMS_missed_punch_requests')
    .insert([{
      employee_id: empId,
      missed_date: missedDate,
      punch_type: punchType,
      reason: reason || null,
      status: 'pending'
    }]);

  if (error) throw error;
}

/** Admin fetches all pending (or all) missed punch requests */
export async function fetchMissedPunchRequests(
  statusFilter?: MissedPunchStatus
): Promise<MissedPunchRequest[]> {
  let query = supabase
    .from('HRMS_missed_punch_requests')
    .select(`
      id,
      employee_id,
      missed_date,
      punch_type,
      reason,
      status,
      admin_note,
      resolved_at,
      resolved_by,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data) return [];

  return data.map((r: any) => ({
    id: r.id,
    employeeId: r.employee_id,
    employeeName: r.employee_id, // We will map the real name in the UI
    missedDate: r.missed_date,
    punchType: (r.punch_type || 'out') as 'in' | 'out',
    reason: r.reason,
    status: r.status as MissedPunchStatus,
    adminNote: r.admin_note,
    resolvedAt: r.resolved_at,
    resolvedBy: r.resolved_by,
    createdAt: r.created_at
  }));
}

/** Employee fetches their own missed punch requests */
export async function fetchEmployeeMissedPunches(
  empId: string
): Promise<MissedPunchRequest[]> {
  const { data, error } = await supabase
    .from('HRMS_missed_punch_requests')
    .select(`
      id,
      employee_id,
      missed_date,
      punch_type,
      reason,
      status,
      admin_note,
      resolved_at,
      resolved_by,
      created_at
    `)
    .eq('employee_id', empId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  return data.map((r: any) => ({
    id: r.id,
    employeeId: r.employee_id,
    employeeName: r.employee_id,
    missedDate: r.missed_date,
    punchType: (r.punch_type || 'out') as 'in' | 'out',
    reason: r.reason,
    status: r.status as MissedPunchStatus,
    adminNote: r.admin_note,
    resolvedAt: r.resolved_at,
    resolvedBy: r.resolved_by,
    createdAt: r.created_at
  }));
}

/** Admin approves request → auto-closes the open attendance session */
export async function approveMissedPunchRequest(
  requestId: string,
  empId: string,
  missedDate: string,
  punchType: 'in' | 'out',
  correctionTime: string,    // e.g. '18:00:00'
  checkInTime: string | undefined, // Only used when punchType === 'in', e.g. '09:00:00'
  adminId: string,
  adminNote?: string
): Promise<void> {
  if (punchType === 'out') {
    // 1. Close the open attendance session
    const { data: openSessions, error: fetchErr } = await supabase
      .from('HRMS_attendance')
      .select('id')
      .eq('employee_id', empId)
      .eq('date', missedDate)
      .is('check_out_time', null);

    if (fetchErr) throw fetchErr;

    if (openSessions && openSessions.length > 0) {
      for (const session of openSessions) {
        const { error: updateErr } = await supabase
          .from('HRMS_attendance')
          .update({
            check_out_time: correctionTime,
            punch_note: adminNote || 'Closed by Admin — Missed Punch-Out Approved'
          })
          .eq('id', session.id);
        if (updateErr) throw updateErr;
      }
    }
  } else if (punchType === 'in') {
    // Check if session exists
    const { data: existingSessions, error: fetchErr } = await supabase
      .from('HRMS_attendance')
      .select('id')
      .eq('employee_id', empId)
      .eq('date', missedDate)
      .limit(1);

    if (fetchErr) throw fetchErr;

    if (existingSessions && existingSessions.length > 0) {
      const { error: updateErr } = await supabase
        .from('HRMS_attendance')
        .update({
          check_in_time: correctionTime,
          check_out_time: checkInTime || '18:00:00',
          punch_note: adminNote || 'Corrected by Admin — Missed Punch-In Approved'
        })
        .eq('id', existingSessions[0].id);
      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabase
        .from('HRMS_attendance')
        .insert([{
          employee_id: empId,
          date: missedDate,
          status: 'Present',
          check_in_time: correctionTime,
          check_out_time: checkInTime || '18:00:00',
          punch_note: adminNote || 'Corrected by Admin — Missed Punch-In Approved',
          session_number: 1
        }]);
      if (insertErr) throw insertErr;
    }
  }

  // 2. Update request status
  const { error } = await supabase
    .from('HRMS_missed_punch_requests')
    .update({
      status: 'approved',
      admin_note: adminNote || null,
      resolved_at: new Date().toISOString(),
      resolved_by: adminId
    })
    .eq('id', requestId);

  if (error) throw error;
}

/** Admin rejects request (employee must explain further or live with it) */
export async function rejectMissedPunchRequest(
  requestId: string,
  adminId: string,
  adminNote?: string
): Promise<void> {
  const { error } = await supabase
    .from('HRMS_missed_punch_requests')
    .update({
      status: 'rejected',
      admin_note: adminNote || null,
      resolved_at: new Date().toISOString(),
      resolved_by: adminId
    })
    .eq('id', requestId);

  if (error) throw error;
}

/** Count pending requests — used for admin badge */
export async function countPendingMissedPunches(): Promise<number> {
  const { count, error } = await supabase
    .from('HRMS_missed_punch_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) return 0;
  return count ?? 0;
}
