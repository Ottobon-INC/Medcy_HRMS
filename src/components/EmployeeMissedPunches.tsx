import React, { useState, useEffect } from 'react';
import { History, FileWarning, RefreshCw } from 'lucide-react';
import { Language, Employee, MissedPunchRequest } from '../types';
import { translations } from '../translations';
import { fetchEmployeeMissedPunches, submitMissedPunchRequest } from '../lib/services/missed-punch-service';

interface EmployeeMissedPunchesProps {
  language: Language;
  currentUser: Employee;
}

export default function EmployeeMissedPunches({ language, currentUser }: EmployeeMissedPunchesProps) {
  const t = translations[language];
  const [requests, setRequests] = useState<MissedPunchRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [applyDate, setApplyDate] = useState('');
  const [applyType, setApplyType] = useState<'in' | 'out'>('out');
  const [applyReason, setApplyReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [currentUser.id]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await fetchEmployeeMissedPunches(currentUser.id);
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess(false);

    if (!applyDate) {
      setFormError(language === 'te' ? 'దయచేసి తేదీని ఎంచుకోండి.' : 'Please select a date.');
      return;
    }

    // Check if it's today or future
    const selectedDate = new Date(applyDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate >= today) {
      setFormError(language === 'te' ? 'గత తేదీని మాత్రమే ఎంచుకోగలరు.' : 'You can only apply for past dates.');
      return;
    }

    // Check if a request already exists in state
    const alreadyExists = requests.some(r => r.missedDate === applyDate && r.punchType === applyType);
    if (alreadyExists) {
      setFormError(language === 'te' ? 'మీరు ఇప్పటికే ఈ తేదీ కోసం అభ్యర్థించారు.' : 'You have already submitted a request for this date and punch type.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitMissedPunchRequest(currentUser.id, applyDate, applyType, applyReason);
      setFormSuccess(true);
      setApplyDate('');
      setApplyReason('');
      setApplyType('out');
      await loadRequests();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get yesterday's date formatted for max date picker
  const getYesterdayStr = () => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return y.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
            <History className="w-6 h-6 text-teal-600" />
            {language === 'te' ? 'నా మిస్ అయిన పంచ్ అభ్యర్థనలు' : 'My Missed Punch Requests'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'te' 
              ? 'మీరు సమర్పించిన మిస్ అయిన పంచ్ అవుట్ అభ్యర్థనల స్థితిని చూడండి.' 
              : 'Track the status of your submitted missed punch-out requests.'}
          </p>
        </div>
        <button
          onClick={loadRequests}
          disabled={isLoading}
          className="px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{language === 'te' ? 'రిఫ్రెష్' : 'Refresh'}</span>
        </button>
      </div>

      {/* Apply Form */}
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-4">
          {language === 'te' ? 'కొత్త అభ్యర్థన సమర్పించండి' : 'Apply for Mispunch Correction'}
        </h3>
        
        <form onSubmit={handleApplySubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                {language === 'te' ? 'తేదీ' : 'Missed Date'}
              </label>
              <input 
                type="date"
                required
                max={getYesterdayStr()}
                value={applyDate}
                onChange={e => setApplyDate(e.target.value)}
                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                {language === 'te' ? 'పంచ్ రకం' : 'Punch Type'}
              </label>
              <select
                value={applyType}
                onChange={e => setApplyType(e.target.value as 'in' | 'out')}
                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              >
                <option value="out">{language === 'te' ? 'మిస్ అయిన పంచ్ అవుట్' : 'Missed Punch-Out'}</option>
                <option value="in">{language === 'te' ? 'మిస్ అయిన పంచ్ ఇన్' : 'Missed Punch-In'}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              {language === 'te' ? 'కారణం (ఐచ్ఛికం)' : 'Reason (Optional)'}
            </label>
            <input 
              type="text"
              value={applyReason}
              onChange={e => setApplyReason(e.target.value)}
              placeholder={language === 'te' ? 'ఉదా: మర్చిపోయాను...' : 'e.g., Forgot to punch...'}
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            />
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-bold">
              {language === 'te' ? 'విజయవంతంగా సమర్పించబడింది!' : 'Successfully submitted request!'}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (language === 'te' ? 'పంపుతున్నారు...' : 'Submitting...') : (language === 'te' ? 'సమర్పించండి' : 'Submit Request')}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm">
        {isLoading ? (
          <div className="py-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">
            Loading...
          </div>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <FileWarning className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            {language === 'te' ? 'మీరు ఎలాంటి అభ్యర్థనలు సమర్పించలేదు' : 'You have not submitted any missed punch requests.'}
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => {
              const isPending = req.status === 'pending';
              const isApproved = req.status === 'approved';

              return (
                <div key={req.id} className="p-5 border rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-bold text-slate-800">{req.missedDate}</span>
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
                      <p className="text-xs text-slate-500">
                        {language === 'te' ? 'సమర్పించిన తేదీ:' : 'Submitted on:'} {new Date(req.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {(req.reason || req.adminNote) && (
                      <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100 sm:max-w-xs w-full">
                        {req.reason && (
                          <p className="text-slate-600"><span className="font-bold">Reason:</span> {req.reason}</p>
                        )}
                        {req.adminNote && (
                          <p className="text-slate-600"><span className="font-bold">Admin Note:</span> {req.adminNote}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
