import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Check, 
  AlertTriangle, 
  Building2, 
  GitBranch, 
  ShieldCheck, 
  Briefcase, 
  UserCheck, 
  MapPin,
  HelpCircle,
  User,
  Mail,
  Phone
} from 'lucide-react';
import { Employee, HierarchyLevel, Hospital, Branch } from '../types';
import { detectHierarchyCycle } from '../lib/services/hierarchy-service';

interface HierarchyEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  allEmployees: Employee[];
  currentUser: Employee;
  onSave: (
    employee: Employee,
    updates: {
      hierarchyLevel: HierarchyLevel;
      reportingTo: string | null;
      designation?: string;
      hospital?: Hospital;
      branch?: Branch;
      name?: string;
      email?: string;
      phone?: string;
    },
    notes?: string
  ) => Promise<void>;
}

export const HierarchyEditModal: React.FC<HierarchyEditModalProps> = ({
  isOpen,
  onClose,
  employee,
  allEmployees,
  currentUser,
  onSave
}) => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [hierarchyLevel, setHierarchyLevel] = useState<HierarchyLevel>('employee');
  const [reportingTo, setReportingTo] = useState<string>('');
  const [designation, setDesignation] = useState<string>('');
  const [hospital, setHospital] = useState<Hospital>('vizag_ivf');
  const [branch, setBranch] = useState<Branch>('visakhapatnam');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize form state when an employee is selected
  useEffect(() => {
    if (employee) {
      setName(employee.name || '');
      setEmail(employee.email || '');
      setPhone(employee.phone || '');
      setHierarchyLevel(employee.hierarchyLevel || 'employee');
      setReportingTo(employee.reportingTo || '');
      setDesignation(employee.designation || '');
      setHospital(employee.hospital || 'vizag_ivf');
      setBranch(employee.branch || 'visakhapatnam');
      setNotes('');
      setSaveError(null);
    }
  }, [employee]);

  // Cycle check against live form state
  const cycleValidation = useMemo(() => {
    if (!employee) return { hasCycle: false };
    return detectHierarchyCycle(employee.id, reportingTo ? reportingTo : null, allEmployees);
  }, [employee, reportingTo, allEmployees]);

  // Candidate managers: filter out the employee themselves and any invalid entries
  const eligibleManagers = useMemo(() => {
    if (!employee) return [];
    return allEmployees.filter(emp => {
      if (emp.id === employee.id) return false;
      const check = detectHierarchyCycle(employee.id, emp.id, allEmployees);
      return !check.hasCycle;
    });
  }, [employee, allEmployees]);

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setSaveError('Employee full name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setSaveError('Please enter a valid email address.');
      return;
    }

    if (cycleValidation.hasCycle) {
      setSaveError(cycleValidation.error || 'Circular reporting detected.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      await onSave(
        employee,
        {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          hierarchyLevel,
          reportingTo: reportingTo ? reportingTo : null,
          designation: designation.trim() || employee.designation,
          hospital,
          branch
        },
        notes.trim() || undefined
      );
      onClose();
    } catch (err: any) {
      console.error('Error saving hierarchy changes:', err);
      setSaveError(err?.message || 'Failed to update details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const levelLabels: { level: HierarchyLevel; label: string; desc: string; badgeColor: string }[] = [
    { level: 'executive', label: 'Executive Director / Top Head', desc: 'Board / C-Suite, reports to no one or board', badgeColor: 'bg-purple-100 text-purple-700 border-purple-200' },
    { level: 'senior_manager', label: 'Senior Operations Manager', desc: 'Leads multiple departments or entire clinic ops', badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { level: 'manager', label: 'Branch / Regional Manager', desc: 'Manages unit heads and branch operations', badgeColor: 'bg-blue-100 text-blue-700 border-blue-200' },
    { level: 'team_lead', label: 'Unit Head / Team Lead', desc: 'Leads field officers and front-line team members', badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { level: 'employee', label: 'Field Staff / Employee', desc: 'Front-line individual contributor', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8a42db]/10 text-[#8a42db] flex items-center justify-center font-bold">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Edit Member & Hierarchy</h3>
              <p className="text-xs text-slate-500">Update name, contact details, role & reporting lines</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {/* Target Employee Summary Card */}
          <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
              {(name || employee.name).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-800 truncate">{name || employee.name}</h4>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                  ID: {employee.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{designation || employee.designation || 'Staff Member'}</p>
            </div>
          </div>

          {/* Error Alert */}
          {saveError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs animate-shake">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Circular Dependency Warning */}
          {cycleValidation.hasCycle && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Invalid Reporting Structure</p>
                <p>{cycleValidation.error}</p>
              </div>
            </div>
          )}

          {/* 1. Name, Email, and Phone Section */}
          <div className="p-4 bg-purple-50/40 border border-purple-100 rounded-xl space-y-3">
            <h5 className="text-[11px] font-black text-[#8a42db] uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Personal & Contact Information
            </h5>

            <div className="space-y-2.5">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Full Legal / Display Name</span>
                  <span className="text-[10px] text-rose-500">*required</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ravikumar Raghupatruni"
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#8a42db]/40 transition-all font-medium shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Email Address */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Email Address</span>
                    <span className="text-[10px] text-rose-500">*required</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. user@vizagivf.com"
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#8a42db]/40 transition-all font-medium shadow-xs"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#8a42db]/40 transition-all font-medium shadow-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Hierarchy Level Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#8a42db]" />
              Hierarchy Level
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {levelLabels.map(({ level, label, desc, badgeColor }) => {
                const isSelected = hierarchyLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      setHierarchyLevel(level);
                      if (level === 'executive') {
                        setReportingTo('');
                      }
                    }}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-[#8a42db] bg-[#8a42db]/5 shadow-xs ring-1 ring-[#8a42db]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                        {level.replace('_', ' ').toUpperCase()}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#8a42db]" />}
                    </div>
                    <p className="text-xs font-bold text-slate-800 mt-1.5 leading-snug">{label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Direct Reporting Manager */}
          {hierarchyLevel !== 'executive' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#8a42db]" />
                  Reports Directly To
                </label>
                <span className="text-[10px] text-slate-400">Select Manager or Unit Head</span>
              </div>
              
              <div className="relative">
                <select
                  value={reportingTo}
                  onChange={(e) => setReportingTo(e.target.value)}
                  className={`w-full bg-white border rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer font-medium ${
                    cycleValidation.hasCycle 
                      ? 'border-rose-300 focus:ring-rose-400/30' 
                      : 'border-slate-200 focus:ring-[#8a42db]/40'
                  }`}
                >
                  <option value="">-- None / Unassigned (Direct to Organization) --</option>
                  
                  {/* Executives */}
                  <optgroup label="Executives & Directors">
                    {eligibleManagers
                      .filter(m => m.hierarchyLevel === 'executive')
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          👑 {m.name} ({m.designation || 'Executive'})
                        </option>
                      ))}
                  </optgroup>

                  {/* Senior Managers & Branch Managers */}
                  <optgroup label="Operations & Branch Managers">
                    {eligibleManagers
                      .filter(m => m.hierarchyLevel === 'manager' || m.hierarchyLevel === 'senior_manager')
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          🏢 {m.name} ({m.designation || 'Manager'} - {m.hospital === 'vizag_ivf' ? 'Vizag IVF' : 'Medcy'})
                        </option>
                      ))}
                  </optgroup>

                  {/* Unit Heads / Team Leads */}
                  <optgroup label="Unit Heads & Team Leads">
                    {eligibleManagers
                      .filter(m => m.hierarchyLevel === 'team_lead')
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          ⭐ {m.name} ({m.designation || 'Team Lead'} - {m.branch || 'Vizag'})
                        </option>
                      ))}
                  </optgroup>

                  {/* Other eligible colleagues */}
                  <optgroup label="Other Staff">
                    {eligibleManagers
                      .filter(m => !['executive', 'manager', 'senior_manager', 'team_lead'].includes(m.hierarchyLevel || ''))
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.designation || 'Staff'})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </div>
              <p className="text-[11px] text-slate-400">
                Tip: Choosing an executive makes this employee a top-level department lead. Choosing a manager or unit head nests them as a direct report.
              </p>
            </div>
          )}

          {/* 4. Job Designation */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              Role Designation
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="e.g. Regional Head, Unit Head, Field Officer, Accountant"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#8a42db]/40 placeholder:text-slate-400 transition-all font-medium"
            />
          </div>

          {/* 5. Organization Entity & Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Hospital Entity */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                Organization
              </label>
              <select
                value={hospital}
                onChange={(e) => setHospital(e.target.value as Hospital)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#8a42db]/40 font-medium cursor-pointer"
              >
                <option value="vizag_ivf">Vizag IVF Centre</option>
                <option value="medcy_hospitals">Medcy Hospitals</option>
                <option value="both">Both (Shared Cross-Org)</option>
              </select>
            </div>

            {/* Branch */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Primary Branch
              </label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value as Branch)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#8a42db]/40 font-medium cursor-pointer"
              >
                <option value="visakhapatnam">Visakhapatnam (HQ)</option>
                <option value="vizianagaram">Vizianagaram (VZM)</option>
              </select>
            </div>
          </div>

          {/* 6. Audit Reason / Note */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                Reason / Audit Note (Optional)
              </label>
              <span className="text-[10px] text-slate-400">Logged to audit trail</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Profile details updated, promoted to Unit Head, reallocated to Vizianagaram team..."
              rows={2}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#8a42db]/40 placeholder:text-slate-400 transition-all font-medium resize-none"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || cycleValidation.hasCycle}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
              cycleValidation.hasCycle
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-[#8a42db] hover:bg-[#7a32cb] active:scale-98 shadow-[#8a42db]/20'
            }`}
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving Details...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HierarchyEditModal;
