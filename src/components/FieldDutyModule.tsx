import React, { useState } from 'react';
import { useFieldDuty } from '../hooks/useFieldDuty';
import { useFieldVisits } from '../hooks/useFieldVisits';
import { Language } from '../types';
import { MapPin, Navigation2, CheckCircle2, AlertCircle, Plus, Map } from 'lucide-react';
import RequestVisitModal from './RequestVisitModal';
import VisitDetailSheet from './VisitDetailSheet';
import FieldOpsMap from './FieldOpsMap';

interface FieldDutyModuleProps {
  language: Language;
  employeeId: string;
  isLocalMode: boolean;
}

export default function FieldDutyModule({ language, employeeId, isLocalMode }: FieldDutyModuleProps) {
  const { session, loading: sessionLoading, startDuty, endDuty } = useFieldDuty(employeeId, isLocalMode);
  const { visits, loading: visitsLoading, updateStatus, createVisitRequest } = useFieldVisits(employeeId, session?.id, isLocalMode);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);

  const isActive = session?.status === 'active';

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
          <p className="text-sm text-slate-500 font-medium">
            {session ? (isActive ? 'Duty Active' : 'Duty Completed') : 'Not Started'}
          </p>
        </div>
        
        <div>
          {!session ? (
            <button 
              onClick={startDuty}
              disabled={sessionLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-blue-600/20"
            >
              <Navigation2 className="w-5 h-5" /> Start Field Duty
            </button>
          ) : isActive ? (
            <button 
              onClick={endDuty}
              disabled={sessionLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-rose-600/20"
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
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
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
              <FieldOpsMap visits={visits} employees={[]} />
            </div>
            <div className="grid gap-4">
              {visits.map(visit => (
              <div 
                key={visit.id} 
                onClick={() => setSelectedVisitId(visit.id)}
                className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer flex justify-between items-center"
              >
                <div>
                  <h4 className="font-bold text-slate-800">{visit.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{visit.patientName || visit.visitType.replace('_', ' ')}</p>
                  {visit.assignedAddress && (
                    <p className="text-[10px] font-medium text-slate-400 mt-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {visit.assignedAddress}
                    </p>
                  )}
                </div>
                <div>
                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${getStatusBadge(visit.status)}`}>
                    {visit.status}
                  </span>
                </div>
              </div>
            ))}
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
          onUpdateStatus={updateStatus}
        />
      )}

    </div>
  );
}
