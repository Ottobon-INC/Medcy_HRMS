import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase-client';
import { fieldOpsConfig } from '../lib/fieldOpsConfig';
import { FieldVisit } from '../types';
import { LivePositionPayload } from './useLiveLocationPublisher';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Admin-side hook to subscribe to Supabase Realtime broadcast channels
 * for all actively EN_ROUTE visits, maintaining a live registry of agent positions.
 */
export function useLivePositionSubscriber(visits: FieldVisit[]) {
  const [livePositions, setLivePositions] = useState<Record<string, LivePositionPayload>>({});
  const activeChannelsRef = useRef<Map<string, RealtimeChannel>>(new Map());

  useEffect(() => {
    if (!fieldOpsConfig.liveTrackingEnabled) {
      return;
    }

    // Find all visits that are currently EN_ROUTE (or active in transit)
    const enRouteVisitIds = new Set(
      visits
        .filter(v => v.status === 'EN_ROUTE')
        .map(v => v.id)
    );

    const currentChannels = activeChannelsRef.current;

    // 1. Remove subscriptions for visits no longer EN_ROUTE
    for (const [visitId, channel] of currentChannels.entries()) {
      if (!enRouteVisitIds.has(visitId)) {
        supabase.removeChannel(channel);
        currentChannels.delete(visitId);
        setLivePositions(prev => {
          const updated = { ...prev };
          delete updated[visitId];
          return updated;
        });
      }
    }

    // 2. Add subscriptions for newly EN_ROUTE visits
    for (const visitId of enRouteVisitIds) {
      if (!currentChannels.has(visitId)) {
        const channel = supabase.channel(`field-live:${visitId}`, {
          config: { broadcast: { self: false } }
        });

        channel
          .on('broadcast', { event: 'position' }, ({ payload }: { payload: LivePositionPayload }) => {
            if (payload && payload.visitId === visitId) {
              setLivePositions(prev => ({
                ...prev,
                [visitId]: payload
              }));
            }
          })
          .subscribe();

        currentChannels.set(visitId, channel);
      }
    }
  }, [visits]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const channel of activeChannelsRef.current.values()) {
        supabase.removeChannel(channel);
      }
      activeChannelsRef.current.clear();
    };
  }, []);

  return {
    livePositions
  };
}
