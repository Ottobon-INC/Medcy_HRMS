import React, { useState, useEffect } from 'react';
import { FieldVisitType, Language, Employee } from '../types';
import * as fieldVisitService from '../lib/services/field-visit-service';
import { EmployeeCheckInLocation } from '../lib/services/attendance-service';
import { fieldOpsConfig } from '../lib/fieldOpsConfig';
import { useNominatimSearch, searchNominatimDirect, NominatimPlace } from '../hooks/useNominatimSearch';
import { AddressSuggestionDropdown } from './fieldops/AddressSuggestionDropdown';
import { ModalPreviewMap } from './fieldops/ModalPreviewMap';
import { MapPin, User, FileText, Clock, UserCheck, Search, Navigation2, X, AlertCircle, Loader2 } from 'lucide-react';

interface AssignVisitModalProps {
  language: Language;
  onClose: () => void;
  employees: Employee[];
  adminId: string;
  checkIns?: EmployeeCheckInLocation[];
}

export default function AssignVisitModal({
  language,
  onClose,
  employees,
  adminId,
  checkIns = []
}: AssignVisitModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState('');
  const [title, setTitle] = useState('');
  const [visitType, setVisitType] = useState<FieldVisitType>('PATIENT_VISIT');
  const [patientName, setPatientName] = useState('');
  const [address, setAddress] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');

  // Selected Destination Coordinates from Autocomplete
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLng, setDestLng] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownIndex, setDropdownIndex] = useState<number>(-1);
  const [isDirectSearching, setIsDirectSearching] = useState(false);

  // Address Search Autocomplete
  const { suggestions, loading: searchingAddress, clearSuggestions } = useNominatimSearch(address);

  // Determine Origin Point (Agent's Check-in Location > Fallback to Office/HQ)
  const selectedEmployee = employees.find(e => e.id === employeeId);
  const empCheckIn = checkIns.find(c => c.employeeId === employeeId && c.latitude && c.longitude);

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

  const handleSelectSuggestion = (place: NominatimPlace) => {
    setAddress(place.displayName);
    setDestLat(place.lat);
    setDestLng(place.lng);
    setIsDropdownOpen(false);
    clearSuggestions();
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
      e.preventDefault(); // Prevent accidental modal submission before picking route

      if (isDropdownOpen && dropdownIndex >= 0 && suggestions[dropdownIndex]) {
        handleSelectSuggestion(suggestions[dropdownIndex]);
        return;
      }

      if (suggestions.length > 0) {
        handleSelectSuggestion(suggestions[0]);
        return;
      }

      // If user typed fast and pressed Enter with no suggestions yet:
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

    const today = new Date().toISOString().split('T')[0];

    try {
      await fieldVisitService.createVisit({
        employeeId,
        assignedBy: adminId,
        title,
        visitType,
        patientName,
        scheduledDate: today,
        scheduledStart: scheduledStart || undefined,
        priority: 'normal',
        status: 'ASSIGNED',
        assignedAddress: address,
        assignedLatitude: destLat || undefined,
        assignedLongitude: destLng || undefined
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign visit');
      setLoading(false);
    }
  };

  const activeEmployees = employees.filter(e => e.status === 'active');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-[28px] sm:rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col my-auto overflow-hidden border border-slate-100 animate-scaleUp">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-100 text-teal-700 rounded-xl">
              <Navigation2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800">
                {language === 'te' ? 'ఫీల్డ్ విజిట్ కేటాయించండి' : 'Assign Field Visit'}
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
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2-Column Grid */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold border border-rose-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form id="assign-visit-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Form Fields */}
            <div className="space-y-4">
              {/* Employee Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Select Employee *
                </label>
                <div className="relative">
                  <select
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700 cursor-pointer"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                  >
                    <option value="">-- Choose Active Employee --</option>
                    {activeEmployees.map(emp => {
                      const hasPunch = checkIns.some(c => c.employeeId === emp.id && c.latitude);
                      return (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.designation || 'Staff'}) {hasPunch ? '📍 [Checked In]' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Origin Notice Banner */}
                {employeeId && (
                  <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Route Starts From:</span>
                    <span className={`font-bold flex items-center gap-1 ${
                      isOriginCheckIn ? 'text-emerald-700' : 'text-sky-700'
                    }`}>
                      {isOriginCheckIn ? '📍 Check-in Location' : '🏢 Office / HQ'}
                    </span>
                  </div>
                )}
              </div>

              {/* Visit Title */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Visit Title *
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    required
                    type="text"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                    placeholder="e.g. Home Blood Sample Collection"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Visit Type
                  </label>
                  <select
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value as FieldVisitType)}
                  >
                    <option value="PATIENT_VISIT">Patient Visit</option>
                    <option value="MEDICAL_CAMP">Medical Camp</option>
                    <option value="DELIVERY">Delivery</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Start Time
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="time"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                      value={scheduledStart}
                      onChange={(e) => setScheduledStart(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Patient / Client Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                    placeholder="e.g. Ramesh Kumar"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                  />
                </div>
              </div>

              {/* Destination Address Input with Enter-key and Autocomplete */}
              <div className="relative">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Destination Address *
                  </label>
                  {destLat && destLng ? (
                    <span className="text-[10px] text-teal-600 font-bold flex items-center gap-1">
                      ✓ GPS Route Ready
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-medium">
                      Press <span className="font-mono font-bold text-slate-600">Enter ↵</span> to route
                    </span>
                  )}
                </div>
                <div className="relative">
                  {isDirectSearching ? (
                    <Loader2 className="w-4 h-4 text-teal-600 animate-spin absolute left-3 top-3" />
                  ) : (
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  )}
                  <input
                    required
                    type="text"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                    placeholder="Type landmark & press Enter (e.g. Maddilapalem, Gajuwaka...)"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setIsDropdownOpen(true);
                      // Reset coords if user manually edits text
                      setDestLat(null);
                      setDestLng(null);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onKeyDown={handleAddressKeyDown}
                  />
                </div>

                {/* Live Suggestions Dropdown with Keyboard Navigation */}
                <AddressSuggestionDropdown
                  suggestions={suggestions}
                  loading={searchingAddress}
                  isOpen={isDropdownOpen && address.length >= 3 && !destLat}
                  selectedIndex={dropdownIndex}
                  onSelect={handleSelectSuggestion}
                />
              </div>
            </div>

            {/* Right Column: Live GTA-V Style Route Preview Map */}
            <div className="flex flex-col h-full min-h-[280px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Route & Travel Preview
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
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3 shadow-inner">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700 mb-1">
                    No Destination Marked Yet
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-[240px]">
                    Type any location in the address field and press <span className="font-bold text-slate-600">Enter ↵</span> to generate the road route from the agent's start point.
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
            disabled={loading || !employeeId || !address}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase transition-colors shadow-md shadow-teal-600/20 flex items-center gap-2 cursor-pointer"
          >
            <Navigation2 className="w-4 h-4" />
            {loading ? 'Assigning Visit...' : 'Assign Field Visit'}
          </button>
        </div>
      </div>
    </div>
  );
}
