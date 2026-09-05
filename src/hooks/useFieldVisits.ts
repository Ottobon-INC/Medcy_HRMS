import { useState, useCallback, useEffect } from 'react';
import { FieldVisit, FieldVisitStatus } from '../types';
import * as fieldVisitService from '../lib/services/field-visit-service';
import { getCurrentLocationSafe } from '../lib/utils/location-utils';

export function useFieldVisits(employeeId: string | undefined, sessionId: string | undefined, isLocalMode: boolean) {
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [loading, setLoading] = useState(false);

  const loadVisits = useCallback(async () => {
    if (isLocalMode || !employeeId) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const v = await fieldVisitService.getVisitsForDate(employeeId, today);
      setVisits(v);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [employeeId, isLocalMode]);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  const updateStatus = async (
    visitId: string, 
    status: FieldVisitStatus, 
    photoData?: string, 
    notes?: string
  ): Promise<{ success: boolean; error?: string; visit?: FieldVisit }> => {
    if (isLocalMode || !employeeId || !sessionId) return { success: false, error: 'Offline or missing session' };
    
    setLoading(true);
    try {
      const loc = await getCurrentLocationSafe();
      if (loc.error && status === 'ARRIVED') {
        // Enforce GPS on arrival
        return { success: false, error: loc.error };
      }

      const updated = await fieldVisitService.updateVisitStatus(
        visitId,
        employeeId,
        status,
        sessionId,
        loc.latitude,
        loc.longitude,
        undefined,
        loc.address,
        photoData,
        notes
      );
      
      setVisits(prev => prev.map(v => v.id === visitId ? updated : v));
      return { success: true, visit: updated };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message || 'Failed to update visit status.' };
    } finally {
      setLoading(false);
    }
  };

  const createVisitRequest = async (visit: Partial<FieldVisit>): Promise<{ success: boolean; error?: string }> => {
    if (isLocalMode || !employeeId) return { success: false, error: 'Offline' };
    setLoading(true);
    try {
      await fieldVisitService.createVisit({
        ...visit,
        employeeId,
        sessionId
      });
      await loadVisits();
      return { success: true };
    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message || 'Failed to create visit.' };
    } finally {
      setLoading(false);
    }
  };

  return { visits, loading, updateStatus, createVisitRequest, loadVisits };
}
