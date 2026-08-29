import React from 'react';
import { FieldVisit, Employee } from '../../types';
import { OsrmRoute } from '../../lib/osrm';
import { LivePositionPayload } from '../../hooks/useLiveLocationPublisher';
import { Navigation2, Clock, MapPin, Radio } from 'lucide-react';

interface LiveStatusPanelProps {
  visits: FieldVisit[];
  employees: Employee[];
  livePositions: Record<string, LivePositionPayload>;
  routes: Record<string, OsrmRoute>;
}

export const LiveStatusPanel: React.FC<LiveStatusPanelProps> = ({
  visits,
  employees,
  livePositions,
  routes
}) => {
  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || id;

  const liveAgentIds = Object.keys(livePositions).filter(id => {
    const pos = livePositions[id];
    // Check if the signal is fresh (within last 5 minutes)
    if (!pos || !pos.timestamp) return false;
    const diff = Date.now() - new Date(pos.timestamp).getTime();
    return diff < 5 * 60 * 1000;
  });

  const activeVisitsByEmp = visits.reduce((acc, visit) => {
    if (visit.status === 'EN_ROUTE' || visit.status === 'IN_PROGRESS') {
      acc[visit.employeeId] = visit;
    }
    return acc;
  }, {} as Record<string, FieldVisit>);

  const formatDistance = (meters?: number) => {
    if (meters === undefined || isNaN(meters)) return '–';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds?: number) => {
    if (seconds === undefined || isNaN(seconds)) return '–';
    const minutes = Math.round(seconds / 60);
    if (minutes < 1) return '< 1 min';
    if (minutes >= 60) {
      const hrs = Math.floor(minutes / 60);
      const remainingMins = minutes % 60;
      return `${hrs}h ${remainingMins}m`;
    }
    return `${minutes} mins`;
  };

  if (liveAgentIds.length === 0) {
    return (
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
          <h3 className="font-bold text-base text-slate-800">Live Agent Tracking</h3>
        </div>
        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          No field agents are currently broadcasting their live location. When an agent goes on duty, live telemetry will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
          <h3 className="font-bold text-base text-slate-800">Active Live Tracking</h3>
        </div>
        <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-amber-50 text-amber-700">
          {liveAgentIds.length} {liveAgentIds.length === 1 ? 'Agent Live' : 'Agents Live'}
        </span>
      </div>

      <div className="space-y-3">
        {liveAgentIds.map(empId => {
          const livePos = livePositions[empId];
          const visit = activeVisitsByEmp[empId];
          const route = visit ? routes[visit.id] : null;
          const employeeName = getEmployeeName(empId);

          return (
            <div
              key={empId}
              className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-amber-400 transition-all space-y-3"
            >
              {/* Header: Agent + Visit Name */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    {employeeName}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium line-clamp-1">
                    {visit ? visit.title : 'On Duty (No Active Visit)'}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md shrink-0">
                  <Radio className="w-3 h-3 animate-pulse" /> Live
                </div>
              </div>

              {/* Destination Address */}
              {visit && visit.assignedAddress && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white/70 px-2.5 py-1.5 rounded-xl border border-slate-100">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{visit.assignedAddress}</span>
                </div>
              )}

              {/* Telemetry Stats: Distance & ETA */}
              {visit && (
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                  <div className="bg-white p-2 rounded-xl border border-slate-100 text-center">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
                      <Navigation2 className="w-2.5 h-2.5" /> Distance
                    </span>
                    <span className="font-bold text-sm text-slate-800">
                      {route ? formatDistance(route.distanceMeters) : (livePos ? 'Calculating...' : '–')}
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-100 text-center">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> Est. Time
                    </span>
                    <span className="font-bold text-sm text-teal-700">
                      {route ? formatDuration(route.durationSeconds) : (livePos ? 'Calculating...' : '–')}
                    </span>
                  </div>
                </div>
              )}

              {/* Timestamp if live signal present */}
              {livePos?.timestamp && (
                <div className="text-[10px] text-slate-400 text-right">
                  Last signal: {new Date(livePos.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
