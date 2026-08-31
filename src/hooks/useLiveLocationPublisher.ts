import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase-client';
import { fieldOpsConfig } from '../lib/fieldOpsConfig';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface LivePositionPayload {
  employeeId: string;
  visitId?: string | null;
  lat: number;
  lng: number;
  heading: number;
  speedKmh?: number;
  accuracyM?: number;
  timestamp: string;
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

/**
 * Agent-side hook to continuously capture geolocation, compute heading,
 * acquire a Screen Wake Lock, broadcast live coordinates to Supabase Realtime,
 * and persist breadcrumb trail to HRMS_field_visit_positions.
 */
export function useLiveLocationPublisher(employeeId?: string) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);
  const [lastPosition, setLastPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [accuracyM, setAccuracyM] = useState<number | undefined>(undefined);
  const [currentTrail, setCurrentTrail] = useState<[number, number][]>([]);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const intervalTimerRef = useRef<any>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const wakeLockRef = useRef<any>(null);

  const latestCoordsRef = useRef<{
    lat: number;
    lng: number;
    heading: number;
    speedKmh: number;
    accuracyM?: number;
  } | null>(null);
  const prevCoordsRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  // Request screen wake lock to mitigate background tab sleep on supported mobile devices
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (e) {
      console.warn('Screen wake lock request failed or not supported:', e);
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
    }
  };

  const stopPublishing = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalTimerRef.current) {
      clearInterval(intervalTimerRef.current);
      intervalTimerRef.current = null;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    releaseWakeLock();

    setIsPublishing(false);
    setActiveVisitId(null);
    prevCoordsRef.current = null;
  }, []);

  const broadcastCurrentLocation = useCallback((visitId?: string | null) => {
    if (!latestCoordsRef.current || !channelRef.current || !employeeId) return;

    const payload: LivePositionPayload = {
      employeeId,
      visitId,
      lat: latestCoordsRef.current.lat,
      lng: latestCoordsRef.current.lng,
      heading: latestCoordsRef.current.heading,
      speedKmh: latestCoordsRef.current.speedKmh,
      accuracyM: latestCoordsRef.current.accuracyM,
      timestamp: new Date().toISOString()
    };

    // 1. Ephemeral Realtime Broadcast
    channelRef.current.send({
      type: 'broadcast',
      event: 'position',
      payload
    }).catch(err => {
      console.warn('Live tracking broadcast error:', err);
    });

    // 2. Persist position breadcrumb to database (trail tracking)
    if (employeeId) {
      supabase
        .from('HRMS_field_visit_positions')
        .insert([
          {
            visit_id: visitId || null,
            employee_id: employeeId,
            latitude: latestCoordsRef.current.lat,
            longitude: latestCoordsRef.current.lng,
            heading: latestCoordsRef.current.heading,
            speed_kmh: latestCoordsRef.current.speedKmh,
            accuracy_m: latestCoordsRef.current.accuracyM,
            recorded_at: new Date().toISOString()
          }
        ])
        .then(({ error }) => {
          if (error) {
            console.warn('Could not save position breadcrumb:', error);
          }
        });
    }
  }, [employeeId]);

  const startPublishing = useCallback(async (visitId?: string | null) => {
    if (!fieldOpsConfig.liveTrackingEnabled) {
      console.log('Live tracking feature flag is OFF. Skipping publisher.');
      return;
    }

    if (!employeeId) {
      setError('Cannot start tracking: No employee ID provided.');
      return;
    }

    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    stopPublishing();
    setError(null);
    setActiveVisitId(visitId || null);
    setIsPublishing(true);
    setCurrentTrail([]);

    await requestWakeLock();

    // Create and subscribe to Supabase Realtime broadcast channel
    const channel = supabase.channel(`field-live:emp:${employeeId}`, {
      config: { broadcast: { self: false } }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        broadcastCurrentLocation(visitId);
      }
    });

    channelRef.current = channel;

    // Immediate first fix
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLastPosition({ lat, lng });
        latestCoordsRef.current = {
          lat,
          lng,
          heading: pos.coords.heading || 0,
          speedKmh: 0,
          accuracyM: pos.coords.accuracy
        };
        prevCoordsRef.current = { lat, lng, time: Date.now() };
      },
      (err) => console.warn('Initial location fix error:', err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    );

    // Start geolocation watcher
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;
          const now = Date.now();

          // Calculate heading
          let calculatedHeading = 0;
          if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
            calculatedHeading = pos.coords.heading;
          } else if (prevCoordsRef.current) {
            calculatedHeading = calculateBearing(
              prevCoordsRef.current.lat,
              prevCoordsRef.current.lng,
              lat,
              lng
            );
          }

          // Calculate speed (m/s -> km/h)
          let calculatedSpeedKmh = 0;
          if (pos.coords.speed !== null && !isNaN(pos.coords.speed) && pos.coords.speed >= 0) {
            calculatedSpeedKmh = Math.round(pos.coords.speed * 3.6);
          } else if (prevCoordsRef.current) {
            const timeDiffSec = (now - prevCoordsRef.current.time) / 1000;
            if (timeDiffSec > 0) {
              // Approximate distance using haversine in meters
              const R = 6371e3;
              const φ1 = (prevCoordsRef.current.lat * Math.PI) / 180;
              const φ2 = (lat * Math.PI) / 180;
              const Δφ = ((lat - prevCoordsRef.current.lat) * Math.PI) / 180;
              const Δλ = ((lng - prevCoordsRef.current.lng) * Math.PI) / 180;
              const a =
                Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const distMeters = R * c;
              calculatedSpeedKmh = Math.round((distMeters / timeDiffSec) * 3.6);
            }
          }

          prevCoordsRef.current = { lat, lng, time: now };
          latestCoordsRef.current = {
            lat,
            lng,
            heading: calculatedHeading,
            speedKmh: calculatedSpeedKmh,
            accuracyM: accuracy
          };

          setLastPosition({ lat, lng });
          setHeading(calculatedHeading);
          setSpeedKmh(calculatedSpeedKmh);
          setAccuracyM(accuracy);
          setCurrentTrail(prev => [...prev, [lat, lng]]);
        },
        (err) => {
          console.warn('Geolocation watch error:', err);
          setError(err.message);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 15000
        }
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to start geolocation watcher');
    }

    // Broadcast position and record breadcrumb at regular interval
    intervalTimerRef.current = setInterval(() => {
      // Use the latest activeVisitId state here? No, startPublishing captures it in closure.
      // But we can just use the parameter passed initially. 
      // If visitId changes, they call startPublishing again anyway.
      broadcastCurrentLocation(visitId);
    }, fieldOpsConfig.broadcastIntervalMs);

  }, [stopPublishing, broadcastCurrentLocation, employeeId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopPublishing();
    };
  }, [stopPublishing]);

  return {
    isPublishing,
    activeVisitId,
    lastPosition,
    heading,
    speedKmh,
    accuracyM,
    currentTrail,
    error,
    startPublishing,
    stopPublishing
  };
}
