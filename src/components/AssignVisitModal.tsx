import React, { useState, useEffect } from 'react';
import { FieldVisitType, Language, Employee, FieldVisit } from '../types';
import * as fieldVisitService from '../lib/services/field-visit-service';
import { EmployeeCheckInLocation } from '../lib/services/attendance-service';
import { fieldOpsConfig } from '../lib/fieldOpsConfig';
import { useNominatimSearch, searchNominatimDirect, resolveGooglePlaceCoords, NominatimPlace } from '../hooks/useNominatimSearch';
import { AddressSuggestionDropdown } from './fieldops/AddressSuggestionDropdown';
import { ModalPreviewMap } from './fieldops/ModalPreviewMap';
import { MapPin, User, FileText, Clock, UserCheck, Search, Navigation2, X, AlertCircle, Loader2, Calendar, Building, Stethoscope } from 'lucide-react';

interface AssignVisitModalProps {
  language: Language;
  onClose: () => void;
  employees: Employee[];
  adminId: string;
  checkIns?: EmployeeCheckInLocation[];
  targetEmployeeId?: string;
  isSelfSchedule?: boolean;
  initialDate?: string;
  currentUser?: Employee;
  onVisitCreated?: (visit: FieldVisit) => void;
}

export default function AssignVisitModal({
  language,
  onClose,
  employees,
  adminId,
  checkIns = [],
  targetEmployeeId,
  isSelfSchedule = false,
  initialDate,
  currentUser,
  onVisitCreated
}: AssignVisitModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialEmpId = targetEmployeeId || (isSelfSchedule ? currentUser?.id : '') || '';
  const [employeeId, setEmployeeId] = useState(initialEmpId);
  const [scheduledDate, setScheduledDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [visitType, setVisitType] = useState<FieldVisitType>('DOCTOR_VISIT');
  const [doctorName, setDoctorName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [address, setAddress] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [visitPurpose, setVisitPurpose] = useState('');
  const [notes, setNotes] = useState('');

  // Selected Destination Coordinates from Autocomplete
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLng, setDestLng] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownIndex, setDropdownIndex] = useState<number>(-1);
  const [isDirectSearching, setIsDirectSearching] = useState(false);

  // Address Search Autocomplete
  const { suggestions, loading: searchingAddress, clearSuggestions } = useNominatimSearch(address);

  // Hierarchy calculations
  const isTeamLead = currentUser?.hierarchyLevel === 'team_lead';
  const isBaseEmployee = currentUser?.hierarchyLevel === 'employee';
  const isBaseEmployeeSelfScheduling = isSelfSchedule && isBaseEmployee;

  // Scoped employee list for Team Leads assigning tasks
  let selectableEmployees = employees.filter(e => e.status === 'active');
  if (isTeamLead && !isSelfSchedule) {
    selectableEmployees = employees.filter(e => e.reportingTo === currentUser?.id || e.id === currentUser?.id);
  }

  // Determine Origin Point (Agent's Check-in Location > Fallback to Office/HQ)
  const activeEmpId = isSelfSchedule ? (currentUser?.id || initialEmpId) : employeeId;
  const selectedEmployee = employees.find(e => e.id === activeEmpId);
  const empCheckIn = checkIns.find(c => c.employeeId === activeEmpId && c.latitude && c.longitude);

  const originLat = empCheckIn?.latitude ?? fieldOpsConfig.defaultCenter[0];
  const originLng = empCheckIn?.longitude ?? fieldOpsConfig.defaultCenter[1];
  const isOriginCheckIn = !!empCheckIn;
  const originLabel = empCheckIn
    ? `${selectedEmployee?.name || 'Agent'}'s Check-in (${empCheckIn.locationName ? empCheckIn.locationName.split(',')[0] : 'GPS Location'})`
    : 'Office / HQ';

  // Reset dropdown index when suggestions change
  useEffect(() => {
    setDropdownIndex(-1);
  }, [suggestions]);

  // Keep employeeId synced if self-scheduling
  useEffect(() => {
    if (isSelfSchedule && currentUser?.id) {
      setEmployeeId(currentUser.id);
    }
  }, [isSelfSchedule, currentUser]);

  const handleSelectSuggestion = async (place: NominatimPlace) => {
    setAddress(place.displayName);
    setIsDropdownOpen(false);
    clearSuggestions();

    if (place.googlePlaceId) {
      setIsDirectSearching(true);
      try {
        const coords = await resolveGooglePlaceCoords(place.googlePlaceId);
        if (coords) {
          setDestLat(coords.lat);
          setDestLng(coords.lng);
        } else {
          setError('Could not get coordinates for this location. Please try another.');
        }
      } catch {
        setError('Failed to resolve location coordinates.');
      } finally {
        setIsDirectSearching(false);
      }
    } else {
      setDestLat(place.lat);
      setDestLng(place.lng);
    }
  };

  const handleAddressKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setIsDropdownOpen(true);
        setDropdownIndex(prev => (prev + 1) % suggestions.length);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setIsDropdownOpen(true);
        setDropdownIndex(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1));
      }
      return;
    }

    if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();

      if (isDropdownOpen && dropdownIndex >= 0 && suggestions[dropdownIndex]) {
        handleSelectSuggestion(suggestions[dropdownIndex]);
        return;
      }

      if (suggestions.length > 0) {
        handleSelectSuggestion(suggestions[0]);
        return;
      }

      if (address.trim().length >= 2) {
        setIsDirectSearching(true);
        setError(null);
        try {
          const directPlace = await searchNominatimDirect(address);
          if (directPlace) {
            handleSelectSuggestion(directPlace);
          } else {
            setError('Could not locate address on map. Please try typing a broader landmark or area name.');
          }
        } catch (err: any) {
          setError(err.message || 'Geocoding failed');
        } finally {
          setIsDirectSearching(false);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const finalEmpId = isSelfSchedule ? (currentUser?.id || targetEmployeeId || adminId) : employeeId;
    if (!finalEmpId) {
      setError('Please select an employee.');
      setLoading(false);
      return;
    }

    // Auto-determined approval status rule:
    // Base employees self-scheduling require lead approval ('pending')
    // Team Leads, Managers, Admins are auto-approved ('approved')
    // Any visit assigned by a Team Lead to a member is auto-approved ('approved')
    const approvalStatus = isBaseEmployeeSelfScheduling ? 'pending' : 'approved';
    const approvedBy = isBaseEmployeeSelfScheduling ? undefined : (currentUser?.id || adminId);

    const autoTitle = title.trim() || (doctorName ? `${doctorName}${clinicName ? ` - ${clinicName}` : ''}` : 'Doctor Visit');

    try {
      const created = await fieldVisitService.createVisit({
        employeeId: finalEmpId,
        assignedBy: currentUser?.id || adminId,
        title: autoTitle,
        visitType,
        patientName: patientName || doctorName,
        doctorName: doctorName || undefined,
        clinicName: clinicName || undefined,
        visitPurpose: visitPurpose || undefined,
        scheduledDate,
        scheduledStart: scheduledStart || undefined,
        priority: 'normal',
        status: 'ASSIGNED',
        approvalStatus,
        approvedBy,
        assignedAddress: address,
        assignedLatitude: destLat || undefined,
        assignedLongitude: destLng || undefined
      });

      if (onVisitCreated) {
        onVisitCreated(created);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule visit');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-[28px] sm:rounded-[32px] shadow-md w-full max-w-4xl max-h-[92vh] flex flex-col my-auto overflow-hidden border border-slate-100 animate-scaleUp">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 text-[#7e3acb] rounded-xl">
              <Stethoscope className="w-5 h-5"/>
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800">
                {isSelfSchedule 
                  ? (isBaseEmployeeSelfScheduling ? 'Plan Doctor Call (Requires Lead Approval)' : 'Schedule Doctor Call') 
                  : (isTeamLead ? 'Assign Team Doctor Call' : 'Assign Field / Doctor Visit')}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Type destination & press <span className="font-mono font-bold bg-slate-200/80 px-1 py-0.5 rounded text-[10px]">Enter ↵</span> to preview route
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Modal Body: 2-Column Grid */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold border border-rose-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0"/>
              <span>{error}</span>
            </div>
          )}

          {isBaseEmployeeSelfScheduling && (
            <div className="mb-4 p-3 bg-amber-50 text-amber-800 rounded-xl text-xs font-medium border border-amber-200 flex items-center justify-between">
              <span>📋 This planned visit will be submitted to your <strong>Team Lead</strong> for approval before field visit execution.</span>
            </div>
          )}

          <form id="assign-visit-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Form Fields */}
            <div className="space-y-3.5">
              {/* Employee Selector (Hidden or Locked for Self Schedule) */}
              {!isSelfSchedule ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Assign To Team Member *
                  </label>
                  <div className="relative">
                    <select
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#8a42db]/20 text-slate-700 cursor-pointer"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                    >
                      <option value="">-- Choose Team Member --</option>
                      {selectableEmployees.map(emp => {
                        const hasPunch = checkIns.some(c => c.employeeId === emp.id && c.latitude);
                        return (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.designation || 'Staff'}) {hasPunch ? '📍 [Checked In]' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Field Representative:</span>
                  <span className="font-bold text-slate-800">{currentUser?.name || 'Self'} ({currentUser?.designation || 'Staff'})</span>
                </div>
              )}

              {/* Date & Time Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Visit Date *
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3"/>
                    <input
                      required
                      type="date"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#8a42db]/20 text-slate-700"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Time Slot
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3"/>
                    <input
                      type="time"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#8a42db]/20 text-slate-700"
                      value={scheduledStart}
                      onChange={(e) => setScheduledStart(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Doctor Name & Clinic Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Doctor Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3"/>
                    <input
                      required
                      type="text"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#8a42db]/20 text-slate-700"
                      placeholder="e.g. Dr. K. Rao"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Clinic / Hospital
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3"/>
                    <input
                      type="text"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#8a42db]/20 text-slate-700"
                      placeholder="e.g. Care Hospital"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Purpose of Visit */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Visit Purpose / Call Agenda
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3"/>
                  <input
                    type="text"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#8a42db]/20 text-slate-700"
                    placeholder="e.g. Monthly IVF Protocol Discussion / Brochure Handover"
                    value={visitPurpose}
                    onChange={(e) => setVisitPurpose(e.target.value)}
                  />
                </div>
              </div>

              {/* Destination Address Input with Enter-key and Autocomplete */}
              <div className="relative">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Clinic / Destination Address *
                  </label>
                  {destLat && destLng ? (
                    <span className="text-[10px] text-[#8a42db] font-bold flex items-center gap-1">
                      ✓ GPS Coordinates Locked
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-medium">
                      Press <span className="font-mono font-bold text-slate-600">Enter ↵</span> to route
                    </span>
                  )}
                </div>
                <div className="relative">
                  {isDirectSearching ? (
                    <Loader2 className="w-4 h-4 text-[#8a42db] animate-spin absolute left-3 top-3"/>
                  ) : (
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3"/>
                  )}
                  <input
                    required
                    type="text"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#8a42db]/20 text-slate-700"
                    placeholder="Type clinic landmark & press Enter (e.g. Maharani Peta, Gajuwaka...)"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setIsDropdownOpen(true);
                      setDestLat(null);
                      setDestLng(null);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onKeyDown={handleAddressKeyDown}
                  />
                </div>

                {/* Live Suggestions Dropdown */}
                <AddressSuggestionDropdown
                  suggestions={suggestions}
                  loading={searchingAddress}
                  isOpen={isDropdownOpen && address.length >= 3 && !destLat}
                  selectedIndex={dropdownIndex}
                  onSelect={handleSelectSuggestion}
                />
              </div>
            </div>

            {/* Right Column: Live Route Preview Map */}
            <div className="flex flex-col h-full min-h-[280px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Route & Geofence Preview
              </label>

              {destLat && destLng ? (
                <div className="flex-1 w-full h-full rounded-2xl overflow-hidden min-h-[280px]">
                  <ModalPreviewMap
                    originLat={originLat}
                    originLng={originLng}
                    originLabel={originLabel}
                    isOriginCheckIn={isOriginCheckIn}
                    destLat={destLat}
                    destLng={destLng}
                    destLabel={address.split(',')[0]}
                  />
                </div>
              ) : (
                <div className="flex-1 w-full h-full min-h-[280px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-6 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#f3edfb] text-[#8a42db] flex items-center justify-center mb-3 shadow-inner">
                    <MapPin className="w-6 h-6"/>
                  </div>
                  <h4 className="text-xs font-bold text-slate-700 mb-1">
                    No Destination Marked Yet
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-[240px]">
                    Type any clinic or hospital location and press <span className="font-bold text-slate-600">Enter ↵</span> to preview the road route.
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="assign-visit-form"
            disabled={loading || !doctorName || !address}
            className="px-6 py-2.5 bg-[#8a42db] hover:bg-[#7e3acb] disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase transition-colors shadow-md shadow-purple-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Navigation2 className="w-4 h-4"/>
            {loading 
              ? 'Saving...' 
              : (isSelfSchedule 
                  ? (isBaseEmployeeSelfScheduling ? 'Submit for Lead Approval' : 'Schedule Doctor Call') 
                  : (isTeamLead ? 'Assign Team Call' : 'Assign Field Visit'))}
          </button>
        </div>
      </div>
    </div>
  );
}
