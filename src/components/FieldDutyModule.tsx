import React, { useState, useEffect } from 'react';
import { useFieldDuty } from '../hooks/useFieldDuty';
import { useFieldVisits } from '../hooks/useFieldVisits';
import { Language, FieldVisitStatus, FieldVisit, PinCategory } from '../types';
import { MapPin, Navigation2, CheckCircle2, Plus, Map, Radio, Compass } from 'lucide-react';
import RequestVisitModal from './RequestVisitModal';
import VisitDetailSheet from './VisitDetailSheet';
import FieldOpsMap from './FieldOpsMap';
import { useLiveTracking } from '../contexts/LiveTrackingContext';
import { fieldOpsConfig } from '../lib/fieldOpsConfig';
import { AgentNavigationView } from './fieldops/AgentNavigationView';
import { DropPinModal } from './fieldops/DropPinModal';
import { useFieldPins } from '../hooks/useFieldPins';
import * as fieldPinService from '../lib/services/field-pin-service';

interface FieldDutyModuleProps {
  language: Language;
  employeeId: string;
  isLocalMode: boolean;
}

export default function FieldDutyModule({ language, employeeId, isLocalMode }: FieldDutyModuleProps) {
  const { session, loading: sessionLoading, startDuty, endDuty } = useFieldDuty(employeeId, isLocalMode);
  const { visits, loading: visitsLoading, updateStatus: baseUpdateStatus, createVisitRequest } = useFieldVisits(employeeId, session?.id, isLocalMode);
  const { isPublishing, activeVisitId, lastPosition, startTracking, stopTracking } = useLiveTracking();

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);

  // Phase 2 Navigation & Pin Dropping state
  const [navVisit, setNavVisit] = useState<FieldVisit | null>(null);
  const [dropPinVisit, setDropPinVisit] = useState<FieldVisit | null>(null);

  // Hook for pins for the current active/navigating visit
  const activeVisitForPins = navVisit?.id || selectedVisitId || (visits.find(v => v.status === 'EN_ROUTE')?.id);
  const { pins: currentVisitPins, refreshPins } = useFieldPins(activeVisitForPins);

  const isActive = session?.status === 'active';
  const isLiveEnabled = fieldOpsConfig.liveTrackingEnabled;

  // Auto-sync live publisher on mount if an EN_ROUTE visit is already active
  useEffect(() => {
    if (isLiveEnabled && isActive && !isPublishing) {
      const activeEnRouteVisit = visits.find(v => v.status === 'EN_ROUTE');
      if (activeEnRouteVisit) {
        startTracking(activeEnRouteVisit.id);
      }
    }
  }, [isLiveEnabled, isActive, visits, isPublishing, startTracking]);

  // Wrapper around updateStatus to manage live tracking state
  const handleUpdateStatus = async (
    visitId: string,
    status: FieldVisitStatus,
    photoData?: string,
    notes?: string
  ) => {
    const result = await baseUpdateStatus(visitId, status, photoData, notes);

    if (result.success && isLiveEnabled) {
      if (status === 'EN_ROUTE') {
        startTracking(visitId);
      } else if (['ARRIVED', 'COMPLETED', 'CANCELLED', 'MISSED'].includes(status)) {
        if (activeVisitId === visitId) {
          stopTracking();
        }
      }
    }

    return result;
  };

  const handleEndDuty = async () => {
    if (isLiveEnabled) {
      stopTracking();
    }
    return endDuty();
  };

  const handleSavePin = async (
    category: PinCategory | string,
    label?: string,
    note?: string
  ): Promise<boolean> => {
    const visitTarget = dropPinVisit || navVisit || visits.find(v => v.id === selectedVisitId);
    if (!visitTarget) return false;

    const lat = lastPosition?.lat ?? visitTarget.actualLatitude ?? visitTarget.assignedLatitude;
    const lng = lastPosition?.lng ?? visitTarget.actualLongitude ?? visitTarget.assignedLongitude;

    if (!lat || !lng) {
      alert('Could not determine current location to drop pin.');
      return false;
    }

    const created = await fieldPinService.createPin(
      visitTarget.id,
      employeeId,
      lat,
      lng,
      category,
      label,
      note
    );

    if (created) {
      refreshPins();
      return true;
    }
    return false;
  };

  // Status Badge Helper
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

  return (
    <div className="space-y-6 max-w-3xl mx-auto w-full">
      {/* Header Card */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">
            {language === 'te' ? 'ఫీల్డ్ డ్యూటీ' : 'Field Duty'}
          </h2>
          <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
            {session ? (isActive ? 'Duty Active' : 'Duty Completed') : 'Not Started'}
            {isLiveEnabled && isPublishing && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <Radio className="w-3 h-3 animate-pulse" /> Live Telemetry On
              </span>
            )}
          </p>
        </div>

        <div>
          {!session ? (
            <button
              onClick={startDuty}
              disabled={sessionLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              <Navigation2 className="w-5 h-5" /> Start Field Duty
            </button>
          ) : isActive ? (
            <button
              onClick={handleEndDuty}
              disabled={sessionLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-rose-600/20 cursor-pointer"
            >
              End Duty
            </button>
          ) : (
            <div className="bg-teal-50 text-teal-600 px-6 py-3 rounded-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Duty Completed
            </div>
          )}
        </div>
      </div>

      {/* Visits List */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-slate-800">Today's Visits</h3>
          {isActive && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Request Visit
            </button>
          )}
        </div>

        {!isActive ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100/50">
            <Map className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Start your field duty to manage visits.</p>
          </div>
        ) : visitsLoading && visits.length === 0 ? (
          <div className="text-center py-10">Loading visits...</div>
        ) : visits.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100/50">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No visits scheduled for today.</p>
          </div>
        ) : (
          <>
            <div className="h-64 mb-6 rounded-2xl overflow-hidden border border-slate-200">
              <FieldOpsMap visits={visits} employees={[]} pins={currentVisitPins} />
            </div>
            <div className="grid gap-4">
              {visits.map(visit => {
                const isCurrentEnRoute = visit.status === 'EN_ROUTE';
                const canDropPin = isLiveEnabled && ['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(visit.status);

                return (
                  <div
                    key={visit.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-teal-500 hover:shadow-md transition-all space-y-3"
                  >
                    {/* Top Row: Title + Status */}
                    <div
                      onClick={() => setSelectedVisitId(visit.id)}
                      className="flex justify-between items-start cursor-pointer"
                    >
                      <div>
                        <h4 className="font-bold text-slate-800">{visit.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">{visit.patientName || visit.visitType.replace('_', ' ')}</p>
                        {visit.assignedAddress && (
                          <p className="text-[10px] font-medium text-slate-400 mt-1.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" /> {visit.assignedAddress}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isLiveEnabled && isCurrentEnRoute && activeVisitId === visit.id && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                            <Radio className="w-2.5 h-2.5 animate-pulse" /> Live
                          </span>
                        )}
                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${getStatusBadge(visit.status)}`}>
                          {visit.status}
                        </span>
                      </div>
                    </div>

                    {/* Phase 2: Action Buttons (Navigate / Drop Pin / Details) */}
                    {isLiveEnabled && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        {/* Live Navigation HUD Button (Uber/Rapido style) */}
                        {isCurrentEnRoute && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNavVisit(visit);
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
                          >
                            <Compass className="w-3.5 h-3.5" /> Navigate
                          </button>
                        )}

                        {/* Drop Location Pin Button */}
                        {canDropPin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDropPinVisit(visit);
                            }}
                            className="py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-purple-200 cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5 text-purple-600" /> Drop Pin
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedVisitId(visit.id)}
                          className="py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors border border-slate-200 cursor-pointer ml-auto"
                        >
                          Details
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showRequestModal && (
        <RequestVisitModal
          language={language}
          onClose={() => setShowRequestModal(false)}
          onSubmit={createVisitRequest}
        />
      )}

      {selectedVisitId && (
        <VisitDetailSheet
          language={language}
          visit={visits.find(v => v.id === selectedVisitId)!}
          onClose={() => setSelectedVisitId(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* Full-Screen Agent Navigation View (Rapido/Uber HUD) */}
      {navVisit && (
        <AgentNavigationView
          visit={navVisit}
          pins={currentVisitPins}
          onClose={() => setNavVisit(null)}
          onArrived={async () => {
            await handleUpdateStatus(navVisit.id, 'ARRIVED');
            setNavVisit(null);
          }}
          onSavePin={handleSavePin}
        />
      )}

      {/* Standalone Drop Pin Modal */}
      {dropPinVisit && (
        <DropPinModal
          currentLat={lastPosition?.lat ?? dropPinVisit.assignedLatitude ?? fieldOpsConfig.defaultCenter[0]}
          currentLng={lastPosition?.lng ?? dropPinVisit.assignedLongitude ?? fieldOpsConfig.defaultCenter[1]}
          visitTitle={dropPinVisit.title}
          onClose={() => setDropPinVisit(null)}
          onSavePin={handleSavePin}
        />
      )}
    </div>
  );
}
