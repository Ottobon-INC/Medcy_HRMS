import React, { createContext, useContext, useEffect } from 'react';
import { useLiveLocationPublisher, LivePositionPayload } from '../hooks/useLiveLocationPublisher';
import { Employee } from '../types';
import { fieldOpsConfig } from '../lib/fieldOpsConfig';

interface LiveTrackingContextType {
  isPublishing: boolean;
  activeVisitId: string | null;
  lastPosition: { lat: number; lng: number } | null;
  heading: number;
  speedKmh: number;
  accuracyM?: number;
  currentTrail: [number, number][];
  error: string | null;
  startTracking: (visitId?: string | null) => void;
  stopTracking: () => void;
}

const LiveTrackingContext = createContext<LiveTrackingContextType>({
  isPublishing: false,
  activeVisitId: null,
  lastPosition: null,
  heading: 0,
  speedKmh: 0,
  accuracyM: undefined,
  currentTrail: [],
  error: null,
  startTracking: () => {},
  stopTracking: () => {}
});

interface LiveTrackingProviderProps {
  children: React.ReactNode;
  currentUser: Employee | null;
  isClockedIn?: boolean;
}

export const LiveTrackingProvider: React.FC<LiveTrackingProviderProps> = ({ 
  children, 
  currentUser,
  isClockedIn = false
}) => {
  const publisher = useLiveLocationPublisher(currentUser?.id);

  // Handle automatic tracking based on isClockedIn status
  useEffect(() => {
    if (currentUser?.role === 'employee' && fieldOpsConfig.liveTrackingEnabled) {
      if (isClockedIn && !publisher.isPublishing) {
        publisher.startPublishing(null);
      } else if (!isClockedIn && publisher.isPublishing) {
        publisher.stopPublishing();
      }
    }
  }, [isClockedIn, publisher.isPublishing, currentUser?.role, publisher.startPublishing, publisher.stopPublishing]);

  // If user logs out or switches, stop tracking
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'employee' || !fieldOpsConfig.liveTrackingEnabled) {
      if (publisher.isPublishing) {
        publisher.stopPublishing();
      }
    }
  }, [currentUser?.id, currentUser?.role, publisher]);

  return (
    <LiveTrackingContext.Provider
      value={{
        isPublishing: publisher.isPublishing,
        activeVisitId: publisher.activeVisitId,
        lastPosition: publisher.lastPosition,
        heading: publisher.heading,
        speedKmh: publisher.speedKmh,
        accuracyM: publisher.accuracyM,
        currentTrail: publisher.currentTrail,
        error: publisher.error,
        startTracking: publisher.startPublishing,
        stopTracking: publisher.stopPublishing
      }}
    >
      {children}
    </LiveTrackingContext.Provider>
  );
};

export const useLiveTracking = () => useContext(LiveTrackingContext);
export type { LivePositionPayload };
