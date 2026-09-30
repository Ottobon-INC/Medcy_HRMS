import { supabase } from '../supabase-client';
import { ASHAEncounter, CreateASHAEncounterInput } from '../../types';

function mapEncounter(row: any): ASHAEncounter {
  let hospitalName: string | undefined = row.hospital_name || undefined;
  let notes: string | undefined = row.notes || undefined;

  // Extract hospital name if it was stored in notes during fallback mode
  if (!hospitalName && notes && notes.includes('[Hospital: ')) {
    const match = notes.match(/\[Hospital:\s*([^\]]+)\]\s*/);
    if (match) {
      hospitalName = match[1].trim();
      notes = notes.replace(/\[Hospital:\s*([^\]]+)\]\s*/, '').trim() || undefined;
    }
  }

  return {
    id: row.id,
    employeeId: row.employee_id,
    ashaName: row.asha_name,
    village: row.village,
    encounterDate: row.encounter_date,
    referralsCount: typeof row.referrals_count === 'number' ? row.referrals_count : 0,
    hospitalName,
    notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Fetch ASHA encounters logged by a specific employee
 */
export async function getMyEncounters(employeeId: string, limit: number = 100): Promise<ASHAEncounter[]> {
  const { data, error } = await supabase
    .from('HRMS_asha_encounters')
    .select('*')
    .eq('employee_id', employeeId)
    .order('encounter_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching employee ASHA encounters:', error);
    throw error;
  }

  return (data || []).map(mapEncounter);
}

/**
 * Fetch ASHA encounters for a list of employee IDs (team subordinates)
 */
export async function getTeamEncounters(employeeIds: string[], limit: number = 200): Promise<ASHAEncounter[]> {
  if (!employeeIds || employeeIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('HRMS_asha_encounters')
    .select('*')
    .in('employee_id', employeeIds)
    .order('encounter_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching team ASHA encounters:', error);
    throw error;
  }

  return (data || []).map(mapEncounter);
}

/**
 * Fetch all ASHA encounters across the organisation (for Admin / Executive / Operations)
 */
export async function getAllEncounters(limit: number = 300): Promise<ASHAEncounter[]> {
  const { data, error } = await supabase
    .from('HRMS_asha_encounters')
    .select('*')
    .order('encounter_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching all ASHA encounters:', error);
    throw error;
  }

  return (data || []).map(mapEncounter);
}

/**
 * Create a new ASHA encounter entry
 */
export async function createEncounter(input: CreateASHAEncounterInput): Promise<ASHAEncounter> {
  const hospitalName = input.hospitalName ? input.hospitalName.trim() : null;
  const payloadWithCol: any = {
    employee_id: input.employeeId,
    asha_name: input.ashaName.trim(),
    village: input.village.trim(),
    encounter_date: input.encounterDate,
    referrals_count: input.referralsCount !== undefined ? Number(input.referralsCount) : 0,
    hospital_name: hospitalName,
    notes: input.notes ? input.notes.trim() : null
  };

  let res = await supabase
    .from('HRMS_asha_encounters')
    .insert([payloadWithCol])
    .select()
    .single();

  // Graceful fallback if the column hospital_name has not yet been added to Supabase
  if (res.error && (res.error.message?.includes('hospital_name') || res.error.code === '42703')) {
    const fallbackNotes = hospitalName
      ? `[Hospital: ${hospitalName}] ${input.notes ? input.notes.trim() : ''}`.trim()
      : (input.notes ? input.notes.trim() : null);

    const fallbackPayload = {
      employee_id: input.employeeId,
      asha_name: input.ashaName.trim(),
      village: input.village.trim(),
      encounter_date: input.encounterDate,
      referrals_count: input.referralsCount !== undefined ? Number(input.referralsCount) : 0,
      notes: fallbackNotes
    };

    res = await supabase
      .from('HRMS_asha_encounters')
      .insert([fallbackPayload])
      .select()
      .single();
  }

  if (res.error) {
    console.error('Error creating ASHA encounter:', res.error);
    throw res.error;
  }

  const created = mapEncounter(res.data);
  if (!created.hospitalName && hospitalName) {
    created.hospitalName = hospitalName;
  }
  return created;
}

/**
 * Update an existing ASHA encounter entry
 */
export async function updateEncounter(
  id: string,
  updates: Partial<CreateASHAEncounterInput>
): Promise<ASHAEncounter> {
  const hospitalName = updates.hospitalName !== undefined ? (updates.hospitalName ? updates.hospitalName.trim() : null) : undefined;
  const payload: any = {
    updated_at: new Date().toISOString()
  };

  if (updates.ashaName !== undefined) payload.asha_name = updates.ashaName.trim();
  if (updates.village !== undefined) payload.village = updates.village.trim();
  if (updates.encounterDate !== undefined) payload.encounter_date = updates.encounterDate;
  if (updates.referralsCount !== undefined) payload.referrals_count = Number(updates.referralsCount);
  if (hospitalName !== undefined) payload.hospital_name = hospitalName;
  if (updates.notes !== undefined) payload.notes = updates.notes ? updates.notes.trim() : null;

  let res = await supabase
    .from('HRMS_asha_encounters')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (res.error && (res.error.message?.includes('hospital_name') || res.error.code === '42703')) {
    delete payload.hospital_name;
    if (hospitalName) {
      const existingNotes = updates.notes ? updates.notes.trim() : '';
      payload.notes = `[Hospital: ${hospitalName}] ${existingNotes}`.trim();
    }
    res = await supabase
      .from('HRMS_asha_encounters')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
  }

  if (res.error) {
    console.error('Error updating ASHA encounter:', res.error);
    throw res.error;
  }

  const updated = mapEncounter(res.data);
  if (!updated.hospitalName && hospitalName) {
    updated.hospitalName = hospitalName;
  }
  return updated;
}

/**
 * Delete an ASHA encounter by ID
 */
export async function deleteEncounter(id: string): Promise<void> {
  const { error } = await supabase
    .from('HRMS_asha_encounters')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting ASHA encounter:', error);
    throw error;
  }
}
