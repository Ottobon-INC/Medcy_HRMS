import React, { useState, useEffect, useRef } from 'react';
import { Language, Employee, FieldVisit } from '../types';
import AssignVisitModal from './AssignVisitModal';
import * as fieldVisitService from '../lib/services/field-visit-service';
import { getTodayCheckInLocations, EmployeeCheckInLocation } from '../lib/services/attendance-service';
import { Navigation2, UserCheck, Calendar, MapPin, LocateFixed, Users, Phone, Clock, CheckCircle2, ChevronRight, PhoneIncoming, Radio, Camera, ZoomIn, Maximize2 } from 'lucide-react';
import FieldOpsMap from './FieldOpsMap';
import { fieldOpsConfig } from '../lib/fieldOpsConfig';
import { useLivePositionSubscriber } from '../hooks/useLivePositionSubscriber';
import { useVisitPins } from '../hooks/useVisitPins';
import { useVisitTrail } from '../hooks/useVisitTrail';
import { LiveStatusPanel } from './fieldops/LiveStatusPanel';
import { fetchRoute, OsrmRoute } from '../lib/osrm';
import { ImageDraggableLightboxModal, ImageLightboxData } from './fieldops/ImageDraggableLightboxModal';
import { EmployeeLocationModal, EmployeeLocationData } from './fieldops/EmployeeLocationModal';

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
  const [activeListTab, setActiveListTab] = useState<'employees' | 'visits' | 'checkIns'>('employees');
  const [focusedLocation, setFocusedLocation] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    id?: string;
  } | null>(null);

  // Modals for image zoom/drag and location map inspection
  const [selectedPhotoData, setSelectedPhotoData] = useState<ImageLightboxData | null>(null);
  const [selectedLocationData, setSelectedLocationData] = useState<EmployeeLocationData | null>(null);

  const isLiveEnabled = fieldOpsConfig.liveTrackingEnabled;

  // Filter out Executive Directors / Management who do not participate in field operations & calls
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

  // 1. Subscribe to live broadcast channels for all employees
  const { livePositions } = useLivePositionSubscriber(trackedEmployeeIds);

  // 2. Fetch all custom dropped location pins for today's visits
  const { pins } = useVisitPins(visits);

  // 3. Fetch historical breadcrumb trails and merge with live incoming coordinates
  const { trails } = useVisitTrail(trackedEmployeeIds, livePositions);

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

  // Fetch or update OSRM road routes when visits, check-ins, or live positions change
  const lastFetchedCoordsRef = useRef<Record<string, { fromLat: number; fromLng: number; toLat: number; toLng: number }>>({});

  useEffect(() => {
    if (!isLiveEnabled) return;

    const updateRoutes = async () => {
      // Calculate routes for all active/assigned/en-route visits
      const activeVisits = visits.filter(
        v => v.status === 'ASSIGNED' || v.status === 'EN_ROUTE' || v.status === 'IN_PROGRESS'
      );

      for (const visit of activeVisits) {
        const livePos = livePositions[visit.employeeId];
        const empCheckIn = checkIns.find(
          c => c.employeeId === visit.employeeId && c.latitude && c.longitude
        );

        // Origin Point Priority:
        // 1. Live broadcast coordinate (if en-route)
        // 2. Agent's today check-in GPS coordinate
        // 3. Visit actual recorded coordinate
        // 4. Default Office / HQ center
        const fromLat =
          livePos?.lat ??
          empCheckIn?.latitude ??
          visit.actualLatitude ??
          fieldOpsConfig.defaultCenter[0];

        const fromLng =
          livePos?.lng ??
          empCheckIn?.longitude ??
          visit.actualLongitude ??
          fieldOpsConfig.defaultCenter[1];

        const toLat = visit.assignedLatitude;
        const toLng = visit.assignedLongitude;

        if (fromLat && fromLng && toLat && toLng) {
          const last = lastFetchedCoordsRef.current[visit.id];
          // Skip if coords haven't shifted significantly
          if (
            last &&
            Math.abs(last.fromLat - fromLat) < 0.00015 &&
            Math.abs(last.fromLng - fromLng) < 0.00015 &&
            Math.abs(last.toLat - toLat) < 0.00015 &&
            Math.abs(last.toLng - toLng) < 0.00015
          ) {
            continue;
          }

          lastFetchedCoordsRef.current[visit.id] = { fromLat, fromLng, toLat, toLng };
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
  }, [isLiveEnabled, visits, checkIns, livePositions]);

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

      <div className="w-full space-y-6">
        {/* Live Status Telemetry Panel (if live tracking enabled) */}
        {isLiveEnabled && (
          <LiveStatusPanel
            visits={visits}
            employees={fieldEmployees}
            livePositions={livePositions}
            routes={routes}
          />
        )}

        {/* Elaborated Full Screen Card with Tabs (Staff Calls / Visits / Staff Check-Ins) */}
        <div className="bg-white rounded-[24px] p-6 sm:p-8 shadow-sm border border-slate-100 space-y-6">
          {/* Header & Tab Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                Field Visit Register
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Daily visit register with GPS-verified proof photos per field employee
              </p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveListTab('employees')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeListTab === 'employees'
                    ? 'bg-white text-teal-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-teal-600" />
                <span>Visit Register ({fieldEmployees.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveListTab('visits')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeListTab === 'checkIns'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Check-Ins ({checkIns.length})</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Operations...</p>
            </div>
          ) : activeListTab === 'employees' ? (
            /* Elaborated Full Screen Employee Details & Calls Cards Grid */
            fieldEmployees.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                No staff members found matching this view.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {fieldEmployees.map(emp => {
                  const empVisits = visits.filter(v => v.employeeId === emp.id);
                  const totalCalls = empVisits.length;
                  const callsTaken = empVisits.filter(v => v.status === 'COMPLETED' || v.status === 'IN_PROGRESS' || v.status === 'ARRIVED').length;
                  
                  const today = new Date().toISOString().split('T')[0];
                  const todayLog = emp.checkInLogs?.find(l => l.date === today) || emp.checkInLogs?.[0];
                  const empCheckIn = checkIns.find(c => c.employeeId === emp.id);
                  const livePos = livePositions[emp.id];

                  // Starting and Ending Photos uploaded by employee
                  const firstVisitWithStartPhoto = empVisits.find(v => v.startPhotoUrl);
                  const firstVisitWithProofPhoto = empVisits.find(v => v.proofPhotoUrl);
                  const lastVisitWithProofPhoto = [...empVisits].reverse().find(v => v.proofPhotoUrl);
                  const startPhoto = firstVisitWithStartPhoto?.startPhotoUrl || todayLog?.photoUrl || empCheckIn?.photoUrl || firstVisitWithProofPhoto?.proofPhotoUrl;
                  const endPhoto = lastVisitWithProofPhoto?.proofPhotoUrl || todayLog?.checkOutPhotoUrl || (empCheckIn as any)?.checkOutPhotoUrl;

                  // Earliest scheduled/started time and latest completion time
                  const scheduledTimes = empVisits.map(v => v.scheduledStart || v.startedAt?.split('T')[1]?.slice(0, 5)).filter(Boolean) as string[];
                  const completedTimes = empVisits.map(v => v.scheduledEnd || v.completedAt?.split('T')[1]?.slice(0, 5)).filter(Boolean) as string[];
                  
                  const startTime = scheduledTimes.length > 0 ? scheduledTimes.sort()[0] : (empCheckIn?.checkInTime || todayLog?.checkInTime || '--:--');
                  const endTime = completedTimes.length > 0 ? completedTimes.sort().reverse()[0] : (empCheckIn?.checkOutTime || todayLog?.checkOutTime || '--:--');
                  
                  // Duration calculation
                  const totalDurationMinutes = empVisits.reduce((acc, v) => acc + (v.durationMinutes || 0), 0);
                  const formattedDuration = totalDurationMinutes > 0
                    ? `${Math.floor(totalDurationMinutes / 60)}h ${totalDurationMinutes % 60}m`
                    : (startTime !== '--:--' && endTime !== '--:--' ? 'Active Shift' : '0 mins');

                  // Employee Location resolution
                  const empLat = livePos?.lat ?? empCheckIn?.latitude ?? (todayLog?.checkInLatLng ? parseFloat(todayLog.checkInLatLng.split(',')[0]) : null) ?? (emp.branch?.toLowerCase().includes('vizianagaram') ? 18.1067 : 17.7231);
                  const empLng = livePos?.lng ?? empCheckIn?.longitude ?? (todayLog?.checkInLatLng ? parseFloat(todayLog.checkInLatLng.split(',')[1]) : null) ?? (emp.branch?.toLowerCase().includes('vizianagaram') ? 83.3956 : 83.3013);
                  const empLocationName = empCheckIn?.locationName || todayLog?.checkInLocation || (livePos ? 'Live GPS Location' : `${emp.branch ? emp.branch.charAt(0).toUpperCase() + emp.branch.slice(1) : 'Visakhapatnam'} HQ`);

                  return (
                    <div
                      key={emp.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all hover:border-teal-400 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6"
                    >
                      {/* 1. Employee Name, Location & Contact */}
                      <div className="flex gap-3 flex-1 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100/60 text-teal-700 flex items-center justify-center text-sm font-black border border-teal-200/60 shadow-xs shrink-0">
                          {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-slate-800 leading-tight truncate">
                              {emp.name}
                            </h4>
                            
                            {/* Top right corner straight to the name: Location button & Status badge */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setSelectedLocationData({
                                  employee: emp,
                                  lat: empLat,
                                  lng: empLng,
                                  locationName: empLocationName,
                                  isLive: Boolean(livePos),
                                  isCheckedIn: emp.isCheckedIn || Boolean(empCheckIn),
                                  lastTime: livePos ? 'Live GPS' : (empCheckIn?.checkInTime || todayLog?.checkInTime || 'Today')
                                })}
                                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-xl transition-all shadow-2xs cursor-pointer group"
                                title="Click to view employee location on map"
                              >
                                <MapPin className="w-3 h-3 text-teal-600 group-hover:scale-125 transition-transform shrink-0" />
                                <span className="max-w-[75px] sm:max-w-[105px] truncate">{empLocationName}</span>
                              </button>

                              {livePos ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full">
                                  <Radio className="w-2.5 h-2.5 animate-pulse text-amber-600" /> Live
                                </span>
                              ) : emp.isCheckedIn ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> On Duty
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-[9px] font-bold text-slate-500 bg-slate-100 rounded-full">
                                  Offline
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-400 font-semibold truncate">
                            {emp.designation || 'Field Officer'} • <span className="font-mono">{emp.id}</span>
                          </p>
                          
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span className="capitalize">{emp.branch || 'Visakhapatnam'}</span>
                            </span>
                            <span>{emp.phone || emp.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* 2. Columns: Total Calls & No. of Calls Taken */}
                      <div className="bg-slate-50/90 rounded-xl px-4 py-2 border border-slate-100 flex items-center gap-6 text-center shrink-0">
                        <div className="border-r border-slate-200/70 pr-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block flex items-center justify-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" /> Total Visits
                          </span>
                          <span className="text-xl font-black text-slate-800 mt-1 block">
                            {totalCalls}
                          </span>
                        </div>

                        <div className="pl-6 border-l border-slate-200/70">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Visits Completed
                          </span>
                          <span className="text-xl font-black text-emerald-700 mt-1 block">
                            {callsTaken}
                          </span>
                        </div>
                      </div>

                      {/* 3. Duration between & Start / End Photos and Timings */}
                      <div className="flex items-center gap-4 text-xs shrink-0 min-w-0 overflow-x-auto pb-2 xl:pb-0">
                        <div className="flex flex-col items-start text-slate-500 border-r border-slate-200 pr-4">
                          <span className="flex items-center gap-1.5 font-medium mb-1">
                            <Clock className="w-3.5 h-3.5 text-teal-600" /> Duration
                          </span>
                          <span className="font-bold text-slate-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100/50">
                            {formattedDuration}
                          </span>
                        </div>

                        {/* Starting and Ending Uploaded Images Preview with Drag & Zoom */}
                        <div className="flex items-center gap-3 shrink-0">
                          {/* Starting Photo */}
                          <div
                            onClick={() => setSelectedPhotoData({
                              url: startPhoto,
                              title: 'Shift Start Punch Photo',
                              employeeName: emp.name,
                              employeeId: emp.id,
                              time: startTime,
                              locationName: empLocationName,
                              type: 'start'
                            })}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-teal-50/60 border border-slate-200/80 hover:border-teal-300 transition-all cursor-pointer group flex items-center gap-2"
                            title="Click to view & drag larger starting photo"
                          >
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-200 border border-slate-200 shadow-2xs">
                              {startPhoto ? (
                                <img src={startPhoto} alt="Start punch" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-teal-100/50 text-teal-700">
                                  <Camera className="w-4 h-4" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <ZoomIn className="w-3.5 h-3.5 text-white" />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] font-black uppercase text-teal-700 tracking-wider block">Start Photo</span>
                              <span className="text-[11px] font-black text-slate-800 font-mono block truncate">{startTime}</span>
                              {startPhoto ? (
                                <span className="text-[9px] text-teal-600 font-bold group-hover:underline flex items-center gap-0.5 mt-0.5">
                                  <Maximize2 className="w-2.5 h-2.5" /> Enlarge Photo
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">
                                  No photo uploaded
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Ending Photo */}
                          <div
                            onClick={() => setSelectedPhotoData({
                              url: endPhoto,
                              title: 'Shift End Punch Photo',
                              employeeName: emp.name,
                              employeeId: emp.id,
                              time: endTime,
                              locationName: empLocationName,
                              type: 'end'
                            })}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-teal-50/60 border border-slate-200/80 hover:border-teal-300 transition-all cursor-pointer group flex items-center gap-2"
                            title={endPhoto ? "Click to view & drag larger ending photo" : "No ending photo uploaded"}
                          >
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-200 border border-slate-200 shadow-2xs">
                              {endPhoto ? (
                                <img src={endPhoto} alt="End punch" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200 text-slate-500">
                                  <Camera className="w-4 h-4" />
                                </div>
                              )}
                              {endPhoto && (
                                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <ZoomIn className="w-3.5 h-3.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">End Photo</span>
                              <span className="text-[11px] font-black text-slate-800 font-mono block truncate">{endTime}</span>
                              {endPhoto ? (
                                <span className="text-[9px] text-teal-600 font-bold group-hover:underline flex items-center gap-0.5 mt-0.5">
                                  <Maximize2 className="w-2.5 h-2.5" /> Enlarge Photo
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">
                                  No photo uploaded
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : activeListTab === 'visits' ? (
            /* Elaborated Visits List */
            visits.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                No field visits scheduled today.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {visits.map(visit => {
                  return (
                    <div
                      key={visit.id}
                      className="border p-4 rounded-2xl border-slate-200 hover:border-teal-400 bg-white hover:bg-slate-50/50 transition-all space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-black text-slate-800">{getEmployeeName(visit.employeeId)}</p>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">{visit.title}</p>
                        </div>
                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg ${getStatusBadge(visit.status)}`}>
                          {visit.status}
                        </span>
                      </div>

                      {visit.assignedAddress && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1.5 bg-slate-50 p-2 rounded-xl">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{visit.assignedAddress}</span>
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 font-mono">
                        <span>Sched: {visit.scheduledStart || '--:--'} - {visit.scheduledEnd || '--:--'}</span>
                        <span>Duration: {visit.durationMinutes ? `${visit.durationMinutes}m` : '--'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* Elaborated Staff Check-Ins List */
            checkIns.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                No staff check-in locations recorded today.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {checkIns.map(checkIn => {
                  const emp = getEmployee(checkIn.employeeId);
                  const isActive = checkIn.checkOutTime === null;

                  return (
                    <div
                      key={checkIn.id}
                      className="p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-300 bg-white space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-black text-slate-800">{emp?.name || checkIn.employeeId}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{emp?.designation || 'Staff Member'}</p>
                        </div>
                        <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg ${
                          isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {isActive ? 'On Shift' : 'Clocked Out'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 flex justify-between font-mono bg-slate-50 p-2 rounded-xl">
                        <span>In: <strong>{checkIn.checkInTime}</strong></span>
                        <span>Out: <strong>{checkIn.checkOutTime || 'Active'}</strong></span>
                      </div>

                      {checkIn.locationName && (
                        <p className="text-[11px] text-slate-600 truncate flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                          <span className="truncate">{checkIn.locationName}</span>
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

      {showAssignModal && (
        <AssignVisitModal
          language={language}
          onClose={() => {
            setShowAssignModal(false);
            loadData();
          }}
          employees={fieldEmployees}
          adminId={adminId}
          checkIns={checkIns}
        />
      )}

      {/* Lightbox Modal for Dragging and Enlarging Uploaded Start/End Photos */}
      {selectedPhotoData && (
        <ImageDraggableLightboxModal
          data={selectedPhotoData}
          onClose={() => setSelectedPhotoData(null)}
        />
      )}

      {/* Location Modal for Employee Map View straight from card top right */}
      {selectedLocationData && (
        <EmployeeLocationModal
          data={selectedLocationData}
          onClose={() => setSelectedLocationData(null)}
        />
      )}
    </div>
  );
}
