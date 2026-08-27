import React, { useState, useEffect, useRef } from 'react';
import { Language, Employee, FieldVisit } from '../types';
import AssignVisitModal from './AssignVisitModal';
import * as fieldVisitService from '../lib/services/field-visit-service';
import { getTodayCheckInLocations, EmployeeCheckInLocation } from '../lib/services/attendance-service';
import { Navigation2, UserCheck, Calendar } from 'lucide-react';
import FieldOpsMap from './FieldOpsMap';
import { fieldOpsConfig } from '../lib/fieldOpsConfig';
import { useLivePositionSubscriber } from '../hooks/useLivePositionSubscriber';
import { useVisitPins } from '../hooks/useVisitPins';
import { useVisitTrail } from '../hooks/useVisitTrail';
import { LiveStatusPanel } from './fieldops/LiveStatusPanel';
import { fetchRoute, OsrmRoute } from '../lib/osrm';

interface FieldOpsModuleProps {
  language: Language;
  isLocalMode: boolean;
  employees: Employee[];
  adminId: string;
}

export default function FieldOpsModule({ language, isLocalMode, employees, adminId }: FieldOpsModuleProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [checkIns, setCheckIns] = useState<EmployeeCheckInLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<Record<string, OsrmRoute>>({});
  const [activeListTab, setActiveListTab] = useState<'visits' | 'checkIns'>('visits');

  const isLiveEnabled = fieldOpsConfig.liveTrackingEnabled;

  // 1. Subscribe to live broadcast channels for EN_ROUTE visits
  const { livePositions } = useLivePositionSubscriber(visits);

  // 2. Fetch all custom dropped location pins for today's visits
  const { pins } = useVisitPins(visits);

  // 3. Fetch historical breadcrumb trails and merge with live incoming coordinates
  const { trails } = useVisitTrail(visits, livePositions);

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
      console.error('Error loading field ops data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isLocalMode]);

  // Fetch or update OSRM road routes when live positions or visits change
  const lastFetchedCoordsRef = useRef<Record<string, { fromLat: number; fromLng: number }>>({});

  useEffect(() => {
    if (!isLiveEnabled) return;

    const updateRoutes = async () => {
      const enRouteVisits = visits.filter(v => v.status === 'EN_ROUTE');

      for (const visit of enRouteVisits) {
        const livePos = livePositions[visit.id];
        const fromLat = livePos?.lat ?? visit.actualLatitude;
        const fromLng = livePos?.lng ?? visit.actualLongitude;
        const toLat = visit.assignedLatitude;
        const toLng = visit.assignedLongitude;

        if (fromLat && fromLng && toLat && toLng) {
          const last = lastFetchedCoordsRef.current[visit.id];
          // Skip if coords haven't shifted by more than ~15 meters to prevent excessive OSRM hits
          if (
            last &&
            Math.abs(last.fromLat - fromLat) < 0.00015 &&
            Math.abs(last.fromLng - fromLng) < 0.00015
          ) {
            continue;
          }

          lastFetchedCoordsRef.current[visit.id] = { fromLat, fromLng };
          const route = await fetchRoute(fromLat, fromLng, toLat, toLng);
          if (route) {
            setRoutes(prev => ({
              ...prev,
              [visit.id]: route
            }));
          }
        }
      }
    };

    updateRoutes();
  }, [isLiveEnabled, visits, livePositions]);

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      'ASSIGNED': 'bg-slate-100 text-slate-600',
      'EN_ROUTE': 'bg-blue-50 text-blue-600',
      'ARRIVED': 'bg-orange-50 text-orange-600',
      'IN_PROGRESS': 'bg-amber-50 text-amber-600',
      'COMPLETED': 'bg-teal-50 text-teal-600',
    };
    return map[status] || 'bg-slate-100 text-slate-600';
  };

  const getEmployee = (id: string) => employees.find(e => e.id === id);
  const getEmployeeName = (id: string) => getEmployee(id)?.name || id;

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">
            {language === 'te' ? 'ఫీల్డ్ ఆపరేషన్స్' : 'Field Operations & Live Tracking'}
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            {isLiveEnabled ? 'Real-time telemetry, check-in locations & field visits' : 'Staff locations & visit assignments'}
          </p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-teal-600/20 cursor-pointer"
        >
          <Navigation2 className="w-5 h-5" /> Assign New Visit
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Telemetry & List Selector */}
        <div className="lg:col-span-1 space-y-6">
          {/* Live Status Telemetry Panel (adjacent to map) */}
          {isLiveEnabled && (
            <LiveStatusPanel
              visits={visits}
              employees={employees}
              livePositions={livePositions}
              routes={routes}
            />
          )}

          {/* List Card with Tabs (Visits / Staff Check-Ins) */}
          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
            {/* Tab Selector */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveListTab('visits')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeListTab === 'visits'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Visits ({visits.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveListTab('checkIns')}
                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeListTab === 'checkIns'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Staff Check-Ins ({checkIns.length})</span>
              </button>
            </div>

            {loading ? (
              <p className="text-slate-500 text-sm">Loading...</p>
            ) : activeListTab === 'visits' ? (
              /* Visits List */
              visits.length === 0 ? (
                <p className="text-slate-500 text-sm">No visits assigned today.</p>
              ) : (
                <div className="space-y-4">
                  {visits.map(visit => (
                    <div key={visit.id} className="border-l-4 border-teal-500 pl-3 py-1">
                      <p className="text-xs font-bold text-slate-800">{getEmployeeName(visit.employeeId)}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{visit.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded ${getStatusBadge(visit.status)}`}>
                          {visit.status}
                        </span>
                        {isLiveEnabled && visit.status === 'EN_ROUTE' && livePositions[visit.id] && (
                          <span className="inline-flex items-center text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                            ● Broadcast active
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Staff Check-Ins List */
              checkIns.length === 0 ? (
                <p className="text-slate-500 text-sm">No staff check-in locations recorded today.</p>
              ) : (
                <div className="space-y-3.5">
                  {checkIns.map(checkIn => {
                    const emp = getEmployee(checkIn.employeeId);
                    const isActive = checkIn.checkOutTime === null;

                    return (
                      <div key={checkIn.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5">
                        <div className="flex justify-between items-start">
                          <p className="text-xs font-bold text-slate-800">{emp?.name || checkIn.employeeId}</p>
                          <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded ${
                            isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {isActive ? 'On Shift' : 'Clocked Out'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex justify-between font-mono">
                          <span>In: {checkIn.checkInTime}</span>
                          {checkIn.checkOutTime && <span>Out: {checkIn.checkOutTime}</span>}
                        </div>
                        {checkIn.locationName && (
                          <p className="text-[10px] text-slate-600 truncate">
                            📍 {checkIn.locationName}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>

        {/* Right Column: Map */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[24px] p-2 shadow-sm border border-slate-100 h-[600px] flex flex-col relative overflow-hidden">
            <FieldOpsMap
              visits={visits}
              employees={employees}
              livePositions={livePositions}
              routes={routes}
              trails={trails}
              pins={pins}
              checkIns={checkIns}
            />
          </div>
        </div>
      </div>

      {showAssignModal && (
        <AssignVisitModal
          language={language}
          onClose={() => {
            setShowAssignModal(false);
            loadData();
          }}
          employees={employees}
          adminId={adminId}
        />
      )}
    </div>
  );
}
