import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase-client';
import { fieldOpsConfig } from '../lib/fieldOpsConfig';
import { FieldVisit } from '../types';
import { LivePositionPayload } from './useLiveLocationPublisher';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Admin-side hook to subscribe to Supabase Realtime broadcast channels
 * for actively tracked employees, maintaining a live registry of agent positions.
 */
export function useLivePositionSubscriber(employeeIdsToTrack: string[]) {
  const [livePositions, setLivePositions] = useState<Record<string, LivePositionPayload>>({});
  const activeChannelsRef = useRef<Map<string, RealtimeChannel>>(new Map());

  useEffect(() => {
    if (!fieldOpsConfig.liveTrackingEnabled) {
      return;
    }

    const trackSet = new Set(employeeIdsToTrack);
    const currentChannels = activeChannelsRef.current;

    // 1. Remove subscriptions for employees no longer tracked
    for (const [empId, channel] of currentChannels.entries()) {
      if (!trackSet.has(empId)) {
        supabase.removeChannel(channel);
        currentChannels.delete(empId);
        setLivePositions(prev => {
          const updated = { ...prev };
          delete updated[empId];
          return updated;
        });
      }
    }

    // 2. Add subscriptions for newly tracked employees
    for (const empId of trackSet) {
      if (!currentChannels.has(empId)) {
        const channel = supabase.channel(`field-live:emp:${empId}`, {
          config: { broadcast: { self: false } }
        });

        channel
          .on('broadcast', { event: 'position' }, ({ payload }: { payload: LivePositionPayload }) => {
            if (payload && payload.employeeId === empId) {
              setLivePositions(prev => ({
                ...prev,
                [empId]: payload
              }));
            }
          })
          .subscribe();

        currentChannels.set(empId, channel);
      }
    }
  }, [employeeIdsToTrack]);

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
