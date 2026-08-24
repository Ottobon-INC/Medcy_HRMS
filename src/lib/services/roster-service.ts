import { supabase } from '../supabase-client';
import { DutyRosterShift } from '../../types';

export async function fetchRoster(weekStartDate: string): Promise<DutyRosterShift[]> {
  const endDate = new Date(weekStartDate);
  endDate.setDate(endDate.getDate() + 6);
  const weekEndDateStr = endDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('HRMS_duty_roster')
    .select('*')
    .gte('shift_date', weekStartDate)
    .lte('shift_date', weekEndDateStr);

  if (error) {
    console.error("Failed to fetch duty roster:", error);
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    employeeId: row.employee_id,
    shiftDate: row.shift_date,
    shiftStart: row.shift_start,
    shiftEnd: row.shift_end,
    shiftLabel: row.shift_label,
    notes: row.notes,
    isPublished: row.is_published
  }));
}

export async function upsertShiftEntry(shift: Omit<DutyRosterShift, 'id'>): Promise<void> {
  const { error } = await supabase
    .from('HRMS_duty_roster')
    .upsert({
      employee_id: shift.employeeId,
      shift_date: shift.shiftDate,
      shift_start: shift.shiftStart,
      shift_end: shift.shiftEnd,
      shift_label: shift.shiftLabel,
      notes: shift.notes,
      is_published: shift.isPublished,
      created_at: new Date().toISOString()
    }, { onConflict: 'employee_id, shift_date' });

  if (error) {
    throw error;
  }
}

export async function deleteShiftEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('HRMS_duty_roster')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function publishRoster(weekStartDate: string): Promise<void> {
  const endDate = new Date(weekStartDate);
  endDate.setDate(endDate.getDate() + 6);
  const weekEndDateStr = endDate.toISOString().split('T')[0];

  const { error } = await supabase
    .from('HRMS_duty_roster')
    .update({ is_published: true })
    .gte('shift_date', weekStartDate)
    .lte('shift_date', weekEndDateStr);

  if (error) {
    throw error;
  }
}
