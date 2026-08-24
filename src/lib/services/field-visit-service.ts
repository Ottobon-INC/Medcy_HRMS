import { supabase } from '../supabase-client';
import { FieldVisit, FieldVisitStatus, FieldEventType, FieldVisitType } from '../../types';
import { logFieldEvent } from './field-event-service';
import { addProof } from './field-proof-service';
import { getDistanceMeters } from '../geofence';

function mapVisit(data: any): FieldVisit {
  return {
    id: data.id,
    sessionId: data.session_id,
    employeeId: data.employee_id,
    assignedBy: data.assigned_by,
    visitType: data.visit_type as FieldVisitType,
    title: data.title,
    description: data.description,
    scheduledDate: data.scheduled_date,
    scheduledStart: data.scheduled_start,
    scheduledEnd: data.scheduled_end,
    assignedLatitude: data.assigned_latitude,
    assignedLongitude: data.assigned_longitude,
    assignedAddress: data.assigned_address,
    allowedRadiusMeters: data.allowed_radius_meters,
    priority: data.priority,
    status: data.status as FieldVisitStatus,
    startedAt: data.started_at,
    arrivedAt: data.arrived_at,
    completedAt: data.completed_at,
    actualLatitude: data.actual_latitude,
    actualLongitude: data.actual_longitude,
    actualAddress: data.actual_address,
    arrivalDistanceM: data.arrival_distance_m,
    durationMinutes: data.duration_minutes,
    proofPhotoUrl: data.proof_photo_url,
    completionNotes: data.completion_notes,
    patientName: data.patient_name,
    clientReference: data.client_reference,
    locationException: data.location_exception
  };
}

export async function getVisitsForDate(employeeId: string, date: string): Promise<FieldVisit[]> {
  const { data, error } = await supabase
    .from('HRMS_field_visits')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('scheduled_date', date)
    .order('scheduled_start', { ascending: true, nullsFirst: true });

  if (error) throw error;
  return (data || []).map(mapVisit);
}

export async function getAllVisitsForDate(date: string): Promise<FieldVisit[]> {
  const { data, error } = await supabase
    .from('HRMS_field_visits')
    .select('*')
    .eq('scheduled_date', date);

  if (error) throw error;
  return (data || []).map(mapVisit);
}

export async function createVisit(visit: Partial<FieldVisit>): Promise<FieldVisit> {
  const { data, error } = await supabase
    .from('HRMS_field_visits')
    .insert([{
      employee_id: visit.employeeId,
      session_id: visit.sessionId,
      assigned_by: visit.assignedBy,
      visit_type: visit.visitType,
      title: visit.title,
      description: visit.description,
      scheduled_date: visit.scheduledDate,
      scheduled_start: visit.scheduledStart,
      scheduled_end: visit.scheduledEnd,
      assigned_latitude: visit.assignedLatitude,
      assigned_longitude: visit.assignedLongitude,
      assigned_address: visit.assignedAddress,
      allowed_radius_meters: visit.allowedRadiusMeters || 150,
      priority: visit.priority || 'normal',
      patient_name: visit.patientName,
      client_reference: visit.clientReference,
      status: visit.status || 'ASSIGNED'
    }])
    .select()
    .single();

  if (error) throw error;
  return mapVisit(data);
}

export async function updateVisitStatus(
  visitId: string,
  employeeId: string,
  sessionId: string,
  status: FieldVisitStatus,
  latitude?: number,
  longitude?: number,
  accuracyM?: number,
  address?: string,
  photoData?: string,
  notes?: string
): Promise<FieldVisit> {
  // Fetch existing visit first
  const { data: existing, error: fetchErr } = await supabase
    .from('HRMS_field_visits')
    .select('*')
    .eq('id', visitId)
    .single();

  if (fetchErr) throw fetchErr;

  let updatePayload: any = { status };
  let eventType: FieldEventType;
  let metadata: Record<string, any> = {};

  const now = new Date().toISOString();

  switch (status) {
    case 'EN_ROUTE':
      updatePayload.started_at = now;
      eventType = 'VISIT_EN_ROUTE';
      break;

    case 'ARRIVED':
      updatePayload.arrived_at = now;
      eventType = 'VISIT_ARRIVED';
      updatePayload.actual_latitude = latitude;
      updatePayload.actual_longitude = longitude;
      updatePayload.actual_address = address;
      
      // Calculate distance if assigned location exists
      if (existing.assigned_latitude && existing.assigned_longitude && latitude && longitude) {
        const dist = getDistanceMeters(
          latitude, longitude,
          existing.assigned_latitude, existing.assigned_longitude
        );
        updatePayload.arrival_distance_m = Math.round(dist);
        metadata.distance_m = Math.round(dist);

        if (dist > (existing.allowed_radius_meters || 150)) {
          updatePayload.location_exception = true;
          metadata.exception = 'LOCATION_MISMATCH';
        }
      }
      break;

    case 'COMPLETED':
      updatePayload.completed_at = now;
      eventType = 'VISIT_COMPLETED';
      if (notes) updatePayload.completion_notes = notes;
      
      // Handle photo proof
      if (photoData) {
        updatePayload.proof_photo_url = photoData; // Store base64 directly for now
        await addProof(visitId, 'photo', photoData, latitude, longitude);
      }
      
      // Calculate duration
      if (existing.arrived_at) {
        const arrTime = new Date(existing.arrived_at).getTime();
        const compTime = new Date(now).getTime();
        updatePayload.duration_minutes = Math.round((compTime - arrTime) / 60000);
      }
      break;

    case 'CANCELLED':
      eventType = 'VISIT_CANCELLED';
      if (notes) metadata.cancel_reason = notes;
      break;

    case 'MISSED':
      eventType = 'VISIT_MISSED';
      break;
      
    case 'IN_PROGRESS':
      eventType = 'VISIT_IN_PROGRESS';
      break;

    default:
      eventType = 'VISIT_EN_ROUTE'; // fallback
  }

  const { data, error } = await supabase
    .from('HRMS_field_visits')
    .update(updatePayload)
    .eq('id', visitId)
    .select()
    .single();

  if (error) throw error;

  // Log event
  await logFieldEvent(employeeId, eventType, visitId, sessionId, latitude, longitude, accuracyM, address, metadata);

  // Additional explicit event for location exception
  if (updatePayload.location_exception) {
     await logFieldEvent(employeeId, 'LOCATION_EXCEPTION', visitId, sessionId, latitude, longitude, accuracyM, address, metadata);
  }

  return mapVisit(data);
}
