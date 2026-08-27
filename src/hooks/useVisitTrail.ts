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
  visits: FieldVisit[],
  livePositions: Record<string, LivePositionPayload>
) {
  const [trails, setTrails] = useState<Record<string, [number, number][]>>({});
  const initialLoadedRef = useRef<Set<string>>(new Set());

  // 1. Initial fetch of historical breadcrumbs from DB for all visits
  useEffect(() => {
    if (!fieldOpsConfig.liveTrackingEnabled || visits.length === 0) {
      setTrails({});
      return;
    }

    const visitIdsToFetch = visits
      .map(v => v.id)
      .filter(id => !initialLoadedRef.current.has(id));

    if (visitIdsToFetch.length === 0) return;

    const fetchHistoricalTrails = async () => {
      try {
        const { data, error } = await supabase
          .from('HRMS_field_visit_positions')
          .select('visit_id, latitude, longitude, recorded_at')
          .in('visit_id', visitIdsToFetch)
          .order('recorded_at', { ascending: true });

        if (error) {
          console.warn('Could not fetch historical visit trails:', error);
          return;
        }

        const trailMap: Record<string, [number, number][]> = {};
        for (const row of data || []) {
          if (!trailMap[row.visit_id]) {
            trailMap[row.visit_id] = [];
          }
          trailMap[row.visit_id].push([Number(row.latitude), Number(row.longitude)]);
        }

        setTrails(prev => {
          const merged = { ...prev };
          for (const [vId, coords] of Object.entries(trailMap)) {
            merged[vId] = coords;
          }
          return merged;
        });

        visitIdsToFetch.forEach(id => initialLoadedRef.current.add(id));
      } catch (err) {
        console.warn('Unexpected error fetching visit trails:', err);
      }
    };

    fetchHistoricalTrails();
  }, [visits]);

  // 2. Append incoming live telemetry pings to trails
  useEffect(() => {
    if (!fieldOpsConfig.liveTrackingEnabled) return;

    for (const [visitId, livePos] of Object.entries(livePositions)) {
      if (!livePos || !livePos.lat || !livePos.lng) continue;

      setTrails(prev => {
        const currentTrail = prev[visitId] || [];
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
          [visitId]: [...currentTrail, [livePos.lat, livePos.lng]]
        };
      });
    }
  }, [livePositions]);

  return {
    trails
  };
}
