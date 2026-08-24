import React, { useState, useEffect } from 'react';
import { Language, Employee, FieldVisit } from '../types';
import AssignVisitModal from './AssignVisitModal';
import * as fieldVisitService from '../lib/services/field-visit-service';
import { MapPin, User, Navigation2 } from 'lucide-react';
import FieldOpsMap from './FieldOpsMap';

interface FieldOpsModuleProps {
  language: Language;
  isLocalMode: boolean;
  employees: Employee[];
  adminId: string;
}

export default function FieldOpsModule({ language, isLocalMode, employees, adminId }: FieldOpsModuleProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAllVisits = async () => {
    if (isLocalMode) {
      setLoading(false);
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const allVisits = await fieldVisitService.getAllVisitsForDate(today);
      setVisits(allVisits);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllVisits();
  }, [isLocalMode]);

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

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || id;

  return (
    <div className="space-y-6 w-full">
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">
            {language === 'te' ? 'ఫీల్డ్ ఆపరేషన్స్' : 'Field Operations'}
          </h2>
          <p className="text-sm text-slate-500 font-medium">Live tracking & assignments</p>
        </div>
        <button 
          onClick={() => setShowAssignModal(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-teal-600/20"
        >
          <Navigation2 className="w-5 h-5" /> Assign New Visit
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Employee List & Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
             <h3 className="font-bold text-lg text-slate-800 mb-4">Today's Visits</h3>
             {loading ? (
               <p className="text-slate-500 text-sm">Loading...</p>
             ) : visits.length === 0 ? (
               <p className="text-slate-500 text-sm">No visits assigned today.</p>
             ) : (
               <div className="space-y-4">
                 {visits.map(visit => (
                   <div key={visit.id} className="border-l-4 border-teal-500 pl-3 py-1">
                     <p className="text-xs font-bold text-slate-800">{getEmployeeName(visit.employeeId)}</p>
                     <p className="text-[10px] text-slate-500 font-medium">{visit.title}</p>
                     <div className="mt-1">
                       <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded ${getStatusBadge(visit.status)}`}>
                         {visit.status}
                       </span>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>

        {/* Right Col: Map Placeholder */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[24px] p-2 shadow-sm border border-slate-100 h-[600px] flex flex-col relative overflow-hidden">
             <FieldOpsMap visits={visits} employees={employees} />
          </div>
        </div>
      </div>

      {showAssignModal && (
        <AssignVisitModal 
          language={language}
          onClose={() => {
            setShowAssignModal(false);
            loadAllVisits(); // refresh
          }}
          employees={employees}
          adminId={adminId}
        />
      )}
    </div>
  );
}
