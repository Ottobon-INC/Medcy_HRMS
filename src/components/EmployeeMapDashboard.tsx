import React from 'react';
import { Employee } from '../types';
import FieldOpsMap from './FieldOpsMap';
import { useLivePositionSubscriber } from '../hooks/useLivePositionSubscriber';
import { useVisitTrail } from '../hooks/useVisitTrail';
import { useFieldVisits } from '../hooks/useFieldVisits';

interface EmployeeMapDashboardProps {
  currentUser: Employee;
  employees: Employee[];
  isLocalMode: boolean;
}

export default function EmployeeMapDashboard({
  currentUser,
  employees,
  isLocalMode
}: EmployeeMapDashboardProps) {
  // Subscribe to ONLY this employee's live position channel
  const trackedEmployeeIds = [currentUser.id];
  const { livePositions } = useLivePositionSubscriber(trackedEmployeeIds);
  const { trails } = useVisitTrail(trackedEmployeeIds, livePositions);

  // Fetch only their own assigned visits
  const { visits } = useFieldVisits(currentUser.id, undefined, isLocalMode);
  const pins = currentUser.locationPins || [];

  return (
    <div className="relative w-full h-[calc(100vh-8rem)] rounded-2xl overflow-hidden shadow-2xl border border-slate-200/60 bg-slate-100">
      {/* MAP BACKGROUND (FULL WIDTH/HEIGHT) */}
      <div className="absolute inset-0 z-0">
        <FieldOpsMap
          visits={visits}
          employees={employees}
          livePositions={livePositions}
          trails={trails}
          pins={pins as any}
          checkIns={[]} // Hide checkin markers on personal map
        />
      </div>
    </div>
  );
}
