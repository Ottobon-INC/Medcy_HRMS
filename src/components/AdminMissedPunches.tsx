import React, { useState, useEffect } from 'react';
import { FileWarning, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Language, Employee, MissedPunchRequest } from '../types';
import { translations } from '../translations';
import { fetchMissedPunchRequests, approveMissedPunchRequest, rejectMissedPunchRequest } from '../lib/services/missed-punch-service';

interface AdminMissedPunchesProps {
  language: Language;
  employees: Employee[];
  adminId: string;
}

export default function AdminMissedPunches({ language, employees, adminId }: AdminMissedPunchesProps) {
  const t = translations[language];
  const [missedRequests, setMissedRequests] = useState<MissedPunchRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  useEffect(() => {
    loadMissedRequests();
  }, []);

  const loadMissedRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const data = await fetchMissedPunchRequests();
      setMissedRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const [selectedRequest, setSelectedRequest] = useState<MissedPunchRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  
  const [inTime, setInTime] = useState('09:00');
  const [outTime, setOutTime] = useState('18:00');
  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const openApproveModal = (req: MissedPunchRequest) => {
    setSelectedRequest(req);
    setActionType('approve');
    setInTime('09:00');
    setOutTime('18:00');
    setAdminNote('');
  };

  const openRejectModal = (req: MissedPunchRequest) => {
    setSelectedRequest(req);
    setActionType('reject');
    setAdminNote('');
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setActionType(null);
  };

  const handleConfirmAction = async () => {
    if (!selectedRequest || !actionType) return;
    setIsProcessing(true);
    try {
      if (actionType === 'approve') {
        const checkOutWithSecs = outTime.length === 5 ? `${outTime}:00` : outTime;
        const checkInWithSecs = inTime.length === 5 ? `${inTime}:00` : inTime;
        
        await approveMissedPunchRequest(
          selectedRequest.id, 
          selectedRequest.employeeId, 
          selectedRequest.missedDate, 
          selectedRequest.punchType,
          selectedRequest.punchType === 'out' ? checkOutWithSecs : checkInWithSecs,
          selectedRequest.punchType === 'in' ? checkOutWithSecs : undefined,
          adminId, 
          adminNote || (language === 'te' ? 'అడ్మిన్ ఆమోదించారు' : 'Approved by admin')
        );
      } else {
        await rejectMissedPunchRequest(
          selectedRequest.id, 
          adminId, 
          adminNote || (language === 'te' ? 'అడ్మిన్ తిరస్కరించారు' : 'Rejected by admin')
        );
      }
      closeModal();
      await loadMissedRequests();
    } catch (err: any) {
      alert(err.message || "Action failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getEmployeeName = (empId: string) => {
    return employees.find(e => e.id === empId)?.name || empId;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
            <FileWarning className="w-6 h-6 text-amber-500" />
            {language === 'te' ? 'మిస్ అయిన పంచ్ అవుట్స్' : 'Missed Punch Requests'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'te' 
              ? 'ఉద్యోగులు సమర్పించిన పెండింగ్ అభ్యర్థనలను సమీక్షించండి.' 
              : 'Review and approve missed punch-out requests submitted by employees.'}
          </p>
        </div>
        <button
          onClick={loadMissedRequests}
          className="px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
        >
          {language === 'te' ? 'రిఫ్రెష్' : 'Refresh'}
        </button>
      </div>

      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
        {isLoadingRequests ? (
          <div className="py-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">
            Loading...
          </div>
        ) : missedRequests.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <CheckCircle className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
            {language === 'te' ? 'పెండింగ్ అభ్యర్థనలు లేవు' : 'No missed punch requests'}
          </div>
        ) : (
          <div className="space-y-4">
            {missedRequests.map(req => {
              const empName = getEmployeeName(req.employeeId);
              const isPending = req.status === 'pending';
              const isApproved = req.status === 'approved';

              return (
                <div key={req.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border rounded-2xl gap-4 transition-all ${
                  isPending ? 'bg-amber-50/30 border-amber-200' : 
                  isApproved ? 'bg-emerald-50/20 border-emerald-100' : 'bg-rose-50/20 border-rose-100'
                }`}>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="text-sm font-bold text-slate-800">{empName}</h4>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        req.punchType === 'in' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {req.punchType === 'in' ? 'PUNCH-IN' : 'PUNCH-OUT'}
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isPending ? 'bg-amber-100 text-amber-700' : 
                        isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Missed Date: <span className="font-bold text-slate-700">{req.missedDate}</span></p>
                    {req.reason && (
                      <p className="text-[10px] mt-2 text-slate-600 bg-white/50 p-2 rounded-lg border border-slate-100/50">
                        <span className="font-bold">Reason:</span> {req.reason}
                      </p>
                    )}
                  </div>
                  
                  {isPending && (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => openRejectModal(req)}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors"
                      >
                        <XCircle className="w-4 h-4" /> {language === 'te' ? 'తిరస్కరించు' : 'Reject'}
                      </button>
                      <button
                        onClick={() => openApproveModal(req)}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4" /> {language === 'te' ? 'ఆమోదించు' : 'Approve'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {selectedRequest && actionType && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl p-6">
            <h3 className="font-bold text-slate-800 text-lg mb-1">
              {actionType === 'approve' 
                ? (language === 'te' ? 'అభ్యర్థన ఆమోదించండి' : 'Approve Request')
                : (language === 'te' ? 'అభ్యర్థన తిరస్కరించండి' : 'Reject Request')}
            </h3>
            <p className="text-xs text-slate-500 mb-6 flex items-center gap-2">
              {getEmployeeName(selectedRequest.employeeId)} — {selectedRequest.missedDate}
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                selectedRequest.punchType === 'in' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {selectedRequest.punchType === 'in' ? 'PUNCH-IN' : 'PUNCH-OUT'}
              </span>
            </p>

            <div className="space-y-4">
              {actionType === 'approve' && selectedRequest.punchType === 'in' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {language === 'te' ? 'పంచ్ ఇన్ సమయం' : 'Punch-In Time'}
                  </label>
                  <input
                    type="time"
                    value={inTime}
                    onChange={e => setInTime(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>
              )}

              {actionType === 'approve' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {language === 'te' ? 'పంచ్ అవుట్ సమయం' : 'Punch-Out Time'}
                  </label>
                  <input
                    type="time"
                    value={outTime}
                    onChange={e => setOutTime(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  {language === 'te' ? 'అడ్మిన్ నోట్ (ఐచ్ఛికం)' : 'Admin Note (Optional)'}
                </label>
                <textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder="..."
                  rows={2}
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={closeModal}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors text-xs uppercase tracking-wider"
                >
                  {language === 'te' ? 'రద్దు' : 'Cancel'}
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={isProcessing}
                  className={`flex-1 py-3 text-white font-bold rounded-xl transition-colors text-xs uppercase tracking-wider shadow-md disabled:opacity-50 ${
                    actionType === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'
                  }`}
                >
                  {isProcessing ? '...' : (language === 'te' ? 'నిర్ధారించు' : 'Confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
