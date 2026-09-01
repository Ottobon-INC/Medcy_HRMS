import React, { createContext, useContext, useEffect } from 'react';
import { useLiveLocationPublisher, LivePositionPayload } from '../hooks/useLiveLocationPublisher';
import { Employee } from '../types';
import { fieldOpsConfig } from '../lib/fieldOpsConfig';

interface LiveTrackingContextType {
  isPublishing: boolean;
  isOnBreak: boolean;
  activeVisitId: string | null;
  lastPosition: { lat: number; lng: number } | null;
  heading: number;
  speedKmh: number;
  accuracyM?: number;
  currentTrail: [number, number][];
  error: string | null;
  startTracking: (visitId?: string | null) => void;
  stopTracking: () => void;
  pauseTracking: () => void;
  resumeTracking: () => void;
}

const LiveTrackingContext = createContext<LiveTrackingContextType>({
  isPublishing: false,
  isOnBreak: false,
  activeVisitId: null,
  lastPosition: null,
  heading: 0,
  speedKmh: 0,
  accuracyM: undefined,
  currentTrail: [],
  error: null,
  startTracking: () => {},
  stopTracking: () => {},
  pauseTracking: () => {},
  resumeTracking: () => {}
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
  const [isOnBreak, setIsOnBreak] = React.useState(false);

  // Sync initial break status from active break record
  React.useEffect(() => {
    let isMounted = true;
    if (currentUser?.id && currentUser?.role === 'employee') {
      import('../lib/services/break-service').then(({ getActiveBreak }) => {
        getActiveBreak(currentUser.id).then(active => {
          if (isMounted) {
            setIsOnBreak(Boolean(active));
          }
        });
      });
    } else {
      setIsOnBreak(false);
    }
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, currentUser?.role]);

  // Handle automatic tracking based on isClockedIn status, guarded by isOnBreak
  useEffect(() => {
    if (currentUser?.role === 'employee' && fieldOpsConfig.liveTrackingEnabled) {
      if (isClockedIn && !isOnBreak && !publisher.isPublishing) {
        publisher.startPublishing(null);
      } else if ((!isClockedIn || isOnBreak) && publisher.isPublishing) {
        publisher.stopPublishing();
      }
    }
  }, [isClockedIn, isOnBreak, publisher.isPublishing, currentUser?.role, publisher.startPublishing, publisher.stopPublishing]);

  // If user logs out or switches, stop tracking
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'employee' || !fieldOpsConfig.liveTrackingEnabled) {
      if (publisher.isPublishing) {
        publisher.stopPublishing();
      }
    }
  }, [currentUser?.id, currentUser?.role, publisher]);

  const pauseTracking = React.useCallback(() => {
    setIsOnBreak(true);
    publisher.stopPublishing();
  }, [publisher.stopPublishing]);

  const resumeTracking = React.useCallback(() => {
    setIsOnBreak(false);
    if (isClockedIn && currentUser?.role === 'employee' && fieldOpsConfig.liveTrackingEnabled) {
      publisher.startPublishing(null);
    }
  }, [isClockedIn, currentUser?.role, publisher.startPublishing]);

  return (
    <LiveTrackingContext.Provider
      value={{
        isPublishing: publisher.isPublishing,
        isOnBreak,
        activeVisitId: publisher.activeVisitId,
        lastPosition: publisher.lastPosition,
        heading: publisher.heading,
        speedKmh: publisher.speedKmh,
        accuracyM: publisher.accuracyM,
        currentTrail: publisher.currentTrail,
        error: publisher.error,
        startTracking: publisher.startPublishing,
        stopTracking: publisher.stopPublishing,
        pauseTracking,
        resumeTracking
      }}
    >
      {children}
    </LiveTrackingContext.Provider>
  );
};

export const useLiveTracking = () => useContext(LiveTrackingContext);
export type { LivePositionPayload };
