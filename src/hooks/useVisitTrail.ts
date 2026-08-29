import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase-client';
import { FieldVisit } from '../types';
import { LivePositionPayload } from './useLiveLocationPublisher';
import { fieldOpsConfig } from '../lib/fieldOpsConfig';

/**
 * Admin-side hook to fetch historical GPS trails for visits and seamlessly
 * append live Realtime broadcast coordinates as they arrive.
 */
export function useVisitTrail(
  employeeIds: string[],
  livePositions: Record<string, LivePositionPayload>
) {
  const [trails, setTrails] = useState<Record<string, [number, number][]>>({});
  const initialLoadedRef = useRef<Set<string>>(new Set());

  // 1. Initial fetch of historical breadcrumbs from DB for all tracked employees
  useEffect(() => {
    if (!fieldOpsConfig.liveTrackingEnabled || employeeIds.length === 0) {
      setTrails({});
      return;
    }

    const empIdsToFetch = employeeIds.filter(id => !initialLoadedRef.current.has(id));

    if (empIdsToFetch.length === 0) return;

    const fetchHistoricalTrails = async () => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('HRMS_field_visit_positions')
          .select('employee_id, latitude, longitude, recorded_at')
          .in('employee_id', empIdsToFetch)
          .gte('recorded_at', `${todayStr}T00:00:00Z`)
          .order('recorded_at', { ascending: true });

        if (error) {
          console.warn('Could not fetch historical employee trails:', error);
          return;
        }

        const trailMap: Record<string, [number, number][]> = {};
        for (const row of data || []) {
          if (!trailMap[row.employee_id]) {
            trailMap[row.employee_id] = [];
          }
          trailMap[row.employee_id].push([Number(row.latitude), Number(row.longitude)]);
        }

        setTrails(prev => {
          const merged = { ...prev };
          for (const [eId, coords] of Object.entries(trailMap)) {
            merged[eId] = coords;
          }
          return merged;
        });

        empIdsToFetch.forEach(id => initialLoadedRef.current.add(id));
      } catch (err) {
        console.warn('Unexpected error fetching employee trails:', err);
      }
    };

    fetchHistoricalTrails();
  }, [employeeIds]);

  // 2. Append incoming live telemetry pings to trails
  useEffect(() => {
    if (!fieldOpsConfig.liveTrackingEnabled) return;

    for (const [empId, livePos] of Object.entries(livePositions)) {
      if (!livePos || !livePos.lat || !livePos.lng) continue;

      setTrails(prev => {
        const currentTrail = prev[empId] || [];
        const lastPoint = currentTrail[currentTrail.length - 1];

        // Only append if the position moved noticeably (> ~5 meters)
        if (
          lastPoint &&
          Math.abs(lastPoint[0] - livePos.lat) < 0.00005 &&
          Math.abs(lastPoint[1] - livePos.lng) < 0.00005
        ) {
          return prev;
        }

        return {
          ...prev,
          [empId]: [...currentTrail, [livePos.lat, livePos.lng]]
        };
      });
    }
  }, [livePositions]);

  return {
    trails
  };
}
