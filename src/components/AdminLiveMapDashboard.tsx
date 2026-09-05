import React, { useState } from 'react';
import { Employee } from '../types';
import FieldOpsMap from './FieldOpsMap';
import { useLivePositionSubscriber } from '../hooks/useLivePositionSubscriber';
import { useVisitTrail } from '../hooks/useVisitTrail';
import { useVisitPins } from '../hooks/useVisitPins';
import { fieldOpsConfig } from '../lib/fieldOpsConfig';
import { Users, Radio, Navigation2, CheckCircle2, Phone } from 'lucide-react';
import * as fieldVisitService from '../lib/services/field-visit-service';
import { getTodayCheckInLocations, EmployeeCheckInLocation } from '../lib/services/attendance-service';

interface AdminLiveMapDashboardProps {
  employees: Employee[];
  isLocalMode: boolean;
}

export default function AdminLiveMapDashboard({
  employees,
  isLocalMode
}: AdminLiveMapDashboardProps) {
  // Filter for field employees
  const fieldEmployees = employees.filter(
    e =>
      e.hierarchyLevel !== 'executive' &&
      e.id !== 'EMP-EXEC-001' &&
      e.id !== 'EMP-EXEC-002' &&
      !e.designation?.toLowerCase().includes('executive director') &&
      !e.name?.toLowerCase().includes('anoopama') &&
      !e.name?.toLowerCase().includes('indra')
  );

  const trackedEmployeeIds = fieldEmployees.map(e => e.id);

  // Subscriptions
  const { livePositions } = useLivePositionSubscriber(trackedEmployeeIds);
  const { trails } = useVisitTrail(trackedEmployeeIds, livePositions);

  const [visits, setVisits] = useState<any[]>([]);
  const [checkIns, setCheckIns] = useState<EmployeeCheckInLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Focused state for "Fly To"
  const [focusedLocation, setFocusedLocation] = useState<{ lat: number; lng: number; zoom?: number; id?: string } | null>(null);

  React.useEffect(() => {
    const loadData = async () => {
      if (isLocalMode) {
        setLoading(false);
        return;
      }
      try {
        const today = new Date().toISOString().split('T')[0];
        const [allVisits, todayCheckIns] = await Promise.all([
          fieldVisitService.getAllVisitsForDate(today),
          getTodayCheckInLocations(today)
        ]);
        setVisits(allVisits);
        setCheckIns(todayCheckIns);
      } catch (err) {
        console.error('Error loading admin live map data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isLocalMode]);

  const { pins } = useVisitPins(visits);

  const handleFlyTo = (lat: number, lng: number, empId: string) => {
    setFocusedLocation({ lat, lng, zoom: 17, id: empId });
  };

  return (
    <div className="relative w-full h-[calc(100vh-8rem)] rounded-2xl overflow-hidden shadow-2xl border border-slate-200/60 bg-slate-100 flex">
      
      {/* 1. MAP BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <FieldOpsMap
          visits={visits}
          employees={employees}
          livePositions={livePositions}
          trails={trails}
          pins={pins as any}
          checkIns={checkIns}
          focusedLocation={focusedLocation}
        />
      </div>

      {/* 2. FLOATING ROSTER PANEL (Desktop: Left side, Mobile: hidden or toggled) */}
      <div className="relative z-10 w-80 h-full max-h-full bg-white/90 backdrop-blur-md shadow-2xl border-r border-slate-200/60 flex flex-col hidden md:flex">
        
        {/* Panel Header */}
        <div className="p-5 border-b border-slate-200/70 bg-white/80">
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-5 h-5 text-teal-600 animate-pulse" />
            <h3 className="font-black text-slate-800 text-lg">Staff Live Map</h3>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Real-time GPS telemetry for all field officers</p>
        </div>

        {/* Panel List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {fieldEmployees.map(emp => {
            const livePos = livePositions[emp.id];
            const checkIn = checkIns.find(c => c.employeeId === emp.id);
            const empVisits = visits.filter(v => v.employeeId === emp.id);
            const completedVisits = empVisits.filter(v => v.status === 'COMPLETED').length;
            
            // Determine best available coordinates
            const lat = livePos?.lat ?? checkIn?.latitude ?? (emp.branch?.toLowerCase().includes('vizianagaram') ? 18.1067 : 17.7231);
            const lng = livePos?.lng ?? checkIn?.longitude ?? (emp.branch?.toLowerCase().includes('vizianagaram') ? 83.3956 : 83.3013);

            return (
              <div 
                key={emp.id} 
                className={`p-3 rounded-xl border transition-all cursor-pointer shadow-sm group ${
                  focusedLocation?.id === emp.id 
                    ? 'bg-teal-50 border-teal-300 ring-2 ring-teal-500/20' 
                    : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-md'
                }`}
                onClick={() => handleFlyTo(lat, lng, emp.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{emp.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{emp.designation}</p>
                  </div>
                  
                  {livePos ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-md shrink-0">
                      <Radio className="w-2.5 h-2.5 animate-pulse text-amber-600" /> Live
                    </span>
                  ) : checkIn ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md shrink-0">
                      On Duty
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold text-slate-500 bg-slate-100 rounded-md border border-slate-200 shrink-0">
                      Offline
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {completedVisits} / {empVisits.length} visits
                  </div>
                  
                  <button className="text-[10px] font-bold text-teal-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Fly to <Navigation2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
