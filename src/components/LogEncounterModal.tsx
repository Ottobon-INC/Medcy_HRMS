import React, { useState, useEffect } from 'react';
import { X, HeartHandshake, MapPin, User, Calendar, Users, FileText, Loader2, AlertCircle, Building2 } from 'lucide-react';
import { Employee, ASHAEncounter } from '../types';
import * as ashaService from '../lib/services/asha-encounter-service';

interface LogEncounterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Employee;
  onEncounterLogged: (encounter: ASHAEncounter) => void;
  initialData?: ASHAEncounter | null;
}

export const LogEncounterModal: React.FC<LogEncounterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onEncounterLogged,
  initialData
}) => {
  const [ashaName, setAshaName] = useState('');
  const [village, setVillage] = useState('');
  const [encounterDate, setEncounterDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [referralsCount, setReferralsCount] = useState<number>(0);
  const [hospitalName, setHospitalName] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if editing or opening
  useEffect(() => {
    if (initialData) {
      setAshaName(initialData.ashaName);
      setVillage(initialData.village);
      setEncounterDate(initialData.encounterDate);
      setReferralsCount(initialData.referralsCount || 0);
      setHospitalName(initialData.hospitalName || '');
      setNotes(initialData.notes || '');
    } else {
      setAshaName('');
      setVillage('');
      setEncounterDate(new Date().toISOString().split('T')[0]);
      setReferralsCount(0);
      setHospitalName('');
      setNotes('');
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ashaName.trim()) {
      setError('Please enter the ASHA worker\'s name.');
      return;
    }
    if (!village.trim()) {
      setError('Please specify the village or area.');
      return;
    }
    if (!encounterDate) {
      setError('Please select an encounter date.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (initialData?.id) {
        const updated = await ashaService.updateEncounter(initialData.id, {
          ashaName,
          village,
          encounterDate,
          referralsCount,
          hospitalName,
          notes
        });
        onEncounterLogged(updated);
      } else {
        const created = await ashaService.createEncounter({
          employeeId: currentUser.id,
          ashaName,
          village,
          encounterDate,
          referralsCount,
          hospitalName,
          notes
        });
        onEncounterLogged(created);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to save ASHA encounter:', err);
      setError(err.message || 'Failed to save encounter. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl w-full max-w-lg my-auto overflow-hidden border border-slate-100 animate-scaleUp">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#8a42db] flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800">
                {initialData ? 'Edit ASHA Encounter' : 'Log ASHA Encounter'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Record your interaction with a rural ASHA worker
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[calc(85vh-140px)] overflow-y-auto">
            
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* ASHA Worker Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                ASHA Worker Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={ashaName}
                  onChange={(e) => setAshaName(e.target.value)}
                  placeholder="e.g. Kamala Devi"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#8a42db] focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Village / Area */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Village / Area / PHC <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="e.g. Koyyuru / Atchutapuram Sub-centre"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#8a42db] focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Two column row: Encounter Date & Referrals Count */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Encounter Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={encounterDate}
                    onChange={(e) => setEncounterDate(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#8a42db] focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Referrals Collected
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={referralsCount}
                    onChange={(e) => setReferralsCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    placeholder="0"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#8a42db] focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Hospital Name Referred */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Hospital Name Referred
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Which hospital ASHA referred patients to</span>
              </div>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="e.g. Vizag IVF Centre, Medcy Hospitals..."
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#8a42db] focus:bg-white transition-all font-medium"
                />
              </div>

              {/* Quick Select Hospital Pills */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-0.5">Quick pick:</span>
                {[
                  'Vizag IVF Centre',
                  'Medcy Hospitals',
                  'King George Hospital (KGH)',
                  'Govt Area Hospital / CHC'
                ].map((hosp) => {
                  const isSelected = hospitalName.trim().toLowerCase() === hosp.toLowerCase();
                  return (
                    <button
                      key={hosp}
                      type="button"
                      onClick={() => setHospitalName(isSelected ? '' : hosp)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-100 border-[#8a42db] text-[#8a42db] shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-purple-50 hover:border-purple-200 hover:text-[#8a42db]'
                      }`}
                    >
                      {hosp}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes / Discussion Summary */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Encounter Notes & Feedback
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Discussed maternal health schemes, nutrition kits distribution, patient referrals received..."
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#8a42db] focus:bg-white transition-all font-medium resize-none"
                />
              </div>
            </div>

            {/* Rep Identity Confirmation */}
            <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold text-slate-500">Logging Rep:</span>
              <span className="font-bold text-[#8a42db]">{currentUser.name}</span>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end items-center gap-3 bg-slate-50/50">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-[#8a42db] hover:bg-[#7e3acb] transition-all flex items-center gap-2 shadow-sm shadow-purple-500/20 disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{initialData ? 'Save Changes' : 'Log Encounter'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default LogEncounterModal;
