import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Copy, 
  Save, 
  X, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Check, 
  Stethoscope, 
  Building, 
  ShieldCheck, 
  UserCheck, 
  ArrowRight,
  Filter
} from 'lucide-react';
import { Language, Employee, FieldVisit } from '../types';
import { translations } from '../translations';
import * as fieldVisitService from '../lib/services/field-visit-service';
import AssignVisitModal from './AssignVisitModal';

interface DoctorVisitPlannerProps {
  language: Language;
  currentUser: Employee;
  employees: Employee[];
}

export default function DoctorVisitPlanner({ language, currentUser, employees }: DoctorVisitPlannerProps) {
  const t = translations[language];

  // Hierarchy role checks
  const isTeamLead = currentUser.hierarchyLevel === 'team_lead';
  const isManager = currentUser.hierarchyLevel === 'manager' || currentUser.hierarchyLevel === 'senior_manager';
  const isExecutive = currentUser.hierarchyLevel === 'executive';
  const hasTeam = isTeamLead || isManager || isExecutive;

  // Active top-level tab for leaders
  const [plannerTab, setPlannerTab] = useState<'my_schedule' | 'team_approvals'>('my_schedule');

  // Subordinate Team Members resolution
  const directTeamMembers = useMemo(() => {
    if (isTeamLead) {
      return employees.filter(e => e.reportingTo === currentUser.id);
    }
    if (isManager || currentUser.hierarchyLevel === 'senior_manager') {
      return employees.filter(e => e.hospital === currentUser.hospital && e.id !== currentUser.id);
    }
    if (isExecutive) {
      return employees.filter(e => e.id !== currentUser.id);
    }
    return [];
  }, [employees, currentUser, isTeamLead, isManager, isExecutive]);

  const teamMemberIds = useMemo(() => directTeamMembers.map(e => e.id), [directTeamMembers]);

  // Calendar State
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    return new Date(d.setDate(diff));
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Visits State
  const [myVisits, setMyVisits] = useState<FieldVisit[]>([]);
  const [teamVisits, setTeamVisits] = useState<FieldVisit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'self' | 'assign'>('self');

  // Team Approvals Filter
  const [approvalFilter, setApprovalFilter] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');

  const weekDates = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => { // Mon - Sat
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentWeekStart]);

  const nextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };

  const prevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };

  // Load My Visits and Team Visits
  const loadVisits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch my visits across this week
      const allDates = weekDates.map(d => d.toISOString().split('T')[0]);
      const myVisitsPromises = allDates.map(date => fieldVisitService.getVisitsForDate(currentUser.id, date));
      const myVisitsArrays = await Promise.all(myVisitsPromises);
      const flattenedMyVisits = myVisitsArrays.flat();
      setMyVisits(flattenedMyVisits);

      // 2. If leader, fetch team visits
      if (hasTeam && teamMemberIds.length > 0) {
        const teamData = await fieldVisitService.getTeamVisits(teamMemberIds);
        setTeamVisits(teamData);
      }
    } catch (err: any) {
      console.error("Failed to load doctor visits:", err);
      setError("Failed to load visits. Please check network connection.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id, weekDates, hasTeam, teamMemberIds]);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  // Approvals & Rejections
  const handleApprove = async (visitId: string) => {
    try {
      await fieldVisitService.approveFieldVisit(visitId, currentUser.id);
      await loadVisits();
    } catch (err: any) {
      alert("Failed to approve visit: " + err.message);
    }
  };

  const handleReject = async (visitId: string) => {
    const reason = window.prompt("Enter rejection / reschedule guidance for the representative:");
    if (reason === null) return; // cancelled prompt
    try {
      await fieldVisitService.rejectFieldVisit(visitId, currentUser.id, reason);
      await loadVisits();
    } catch (err: any) {
      alert("Failed to reject visit: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this doctor call?")) {
      try {
        await fieldVisitService.deleteVisit(id);
        await loadVisits();
      } catch (err: any) {
        alert("Failed to delete visit");
      }
    }
  };

  // Filtered views
  const selectedDayVisits = useMemo(() => {
    return myVisits.filter(v => v.scheduledDate === selectedDate);
  }, [myVisits, selectedDate]);

  const pendingApprovalsCount = useMemo(() => {
    return teamVisits.filter(v => v.approvalStatus === 'pending').length;
  }, [teamVisits]);

  const filteredTeamVisits = useMemo(() => {
    return teamVisits.filter(v => {
      const matchesStatus = approvalFilter === 'all' || v.approvalStatus === approvalFilter;
      const matchesEmp = selectedEmployeeFilter === 'all' || v.employeeId === selectedEmployeeFilter;
      return matchesStatus && matchesEmp;
    });
  }, [teamVisits, approvalFilter, selectedEmployeeFilter]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Doctor Visit Planner</h1>
            {isTeamLead && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-[#8a42db]">
                Team Lead
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Plan, track, and verify daily clinic & doctor visits across hospital networks
          </p>
        </div>

        {/* Tab Switcher for Team Leads / Managers */}
        {hasTeam && (
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200">
            <button
              onClick={() => setPlannerTab('my_schedule')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                plannerTab === 'my_schedule'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarIcon size={14} />
              <span>My Doctor Visits</span>
            </button>
            <button
              onClick={() => setPlannerTab('team_approvals')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
                plannerTab === 'team_approvals'
                  ? 'bg-[#8a42db] text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users size={14} />
              <span>Team Approvals & Tasks</span>
              {pendingApprovalsCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                  plannerTab === 'team_approvals' ? 'bg-white text-[#8a42db]' : 'bg-rose-500 text-white animate-pulse'
                }`}>
                  {pendingApprovalsCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* View Mode 1: Personal Schedule (Employees & Team Leads) */}
      {plannerTab === 'my_schedule' ? (
        <div className="space-y-6">
          {/* Week Selector Bar */}
          <div className="flex items-center justify-between bg-white p-3 px-4 rounded-xl border border-slate-100 shadow-xs">
            <div className="flex items-center gap-2">
              <button onClick={prevWeek} className="p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-200">
                <ChevronLeft size={16} className="text-slate-600" />
              </button>
              <div className="text-xs font-bold text-slate-700 px-2">
                {currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} —{' '}
                {weekDates[5].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <button onClick={nextWeek} className="p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-200">
                <ChevronRight size={16} className="text-slate-600" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setModalMode('self');
                  setIsAssignModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#8a42db] hover:bg-[#7e3acb] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm shadow-purple-500/20"
              >
                <Plus size={16} />
                <span>Plan Doctor Visit</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Week Days */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                <h3 className="font-bold text-slate-800 mb-3 px-1 text-xs uppercase tracking-wider">Select Day</h3>
                <div className="space-y-2">
                  {weekDates.map((date) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const isSelected = selectedDate === dateStr;
                    const isToday = new Date().toISOString().split('T')[0] === dateStr;
                    const dayVisits = myVisits.filter(v => v.scheduledDate === dateStr);
                    const pendingDayCount = dayVisits.filter(v => v.approvalStatus === 'pending').length;

                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-[#8a42db] text-white shadow-md shadow-purple-500/20' 
                            : 'hover:bg-slate-50 text-slate-700 border border-slate-100'
                        } ${isToday && !isSelected ? 'border-purple-200 bg-purple-50/40' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 flex flex-col items-center justify-center rounded-lg ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                            <span className="text-[9px] font-bold uppercase">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                            <span className="text-xs font-black leading-tight">{date.getDate()}</span>
                          </div>
                          <div className="text-left flex flex-col">
                            <span className="text-xs font-bold">{isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                            <span className={`text-[10px] font-medium ${isSelected ? 'text-purple-100' : 'text-slate-400'}`}>
                              {dayVisits.length} call{dayVisits.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {pendingDayCount > 0 && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                            {pendingDayCount} pending
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Col: Day Doctor Visits */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[460px] flex flex-col">
                <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-base font-black text-slate-800">
                      {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{selectedDayVisits.length} calls scheduled for this day</p>
                  </div>

                  <button
                    onClick={() => {
                      setModalMode('self');
                      setIsAssignModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#8a42db]/10 hover:bg-[#8a42db]/20 text-[#8a42db] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Add Doctor</span>
                  </button>
                </div>

                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : selectedDayVisits.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#8a42db] flex items-center justify-center mb-3">
                      <Stethoscope size={28} />
                    </div>
                    <h3 className="text-slate-700 font-bold text-sm mb-1">No doctor calls planned for this date</h3>
                    <p className="text-slate-400 text-xs max-w-xs mb-4">
                      {currentUser.hierarchyLevel === 'employee' 
                        ? 'Plan your clinic visits now. They will route to your Team Lead for approval.' 
                        : 'Schedule visits directly. Your calls are ready for instant photo execution.'}
                    </p>
                    <button
                      onClick={() => {
                        setModalMode('self');
                        setIsAssignModalOpen(true);
                      }}
                      className="px-4 py-2 bg-[#8a42db] hover:bg-[#7e3acb] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={14} /> Plan a Doctor Call
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {selectedDayVisits.map((visit) => {
                      const isPending = visit.approvalStatus === 'pending';
                      const isRejected = visit.approvalStatus === 'rejected';
                      const isApproved = visit.approvalStatus === 'approved' || !visit.approvalStatus;

                      return (
                        <div 
                          key={visit.id} 
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200/80 hover:border-purple-200 bg-white hover:bg-slate-50/50 transition-all shadow-xs"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-slate-800">
                                {visit.doctorName || visit.title}
                              </h3>

                              {/* Approval Status Badges */}
                              {isPending && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 flex items-center gap-1">
                                  ⏳ Awaiting Lead Approval
                                </span>
                              )}
                              {isApproved && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                  ✓ Approved
                                </span>
                              )}
                              {isRejected && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 flex items-center gap-1">
                                  ✗ Rejected
                                </span>
                              )}
                            </div>

                            {visit.clinicName && (
                              <p className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                                <Building size={12} className="text-slate-400" />
                                {visit.clinicName}
                              </p>
                            )}

                            {visit.assignedAddress && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate max-w-md">
                                <MapPin size={11} className="text-slate-400 shrink-0" />
                                {visit.assignedAddress}
                              </p>
                            )}

                            {visit.rejectionReason && (
                              <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-lg mt-1 font-medium">
                                <strong>Lead Feedback:</strong> {visit.rejectionReason}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                            {visit.scheduledStart && (
                              <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-700">
                                <Clock size={12} className="text-slate-500" />
                                <span>{visit.scheduledStart}</span>
                              </div>
                            )}

                            <button
                              onClick={() => handleDelete(visit.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Plan"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* View Mode 2: Team Approvals & Roster (Team Leads & Managers) */
        <div className="space-y-6">
          {/* Header Controls & Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Approval Filter Pills */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setApprovalFilter('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    approvalFilter === 'pending' ? 'bg-[#8a42db] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Pending Approvals</span>
                  {pendingApprovalsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setApprovalFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    approvalFilter === 'all' ? 'bg-[#8a42db] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Team Visits
                </button>
                <button
                  onClick={() => setApprovalFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    approvalFilter === 'approved' ? 'bg-[#8a42db] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Approved
                </button>
              </div>

              {/* Employee Filter */}
              <div className="relative">
                <select
                  value={selectedEmployeeFilter}
                  onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer outline-none focus:ring-2 focus:ring-[#8a42db]/30"
                >
                  <option value="all">All Team Members ({directTeamMembers.length})</option>
                  {directTeamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.designation || 'Staff'})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Direct Task Assignment Button */}
            <button
              onClick={() => {
                setModalMode('assign');
                setIsAssignModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#8a42db] hover:bg-[#7e3acb] text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
            >
              <Plus size={16} />
              <span>Assign Call to Member</span>
            </button>
          </div>

          {/* Team Visits Roster */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[460px]">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-800">
                  {approvalFilter === 'pending' ? 'Visits Requiring Lead Approval' : 'Team Field Operations Schedule'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {filteredTeamVisits.length} records matching current filter
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="py-20 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredTeamVisits.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">All caught up!</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  {approvalFilter === 'pending' 
                    ? 'No pending doctor visit approvals from your team members right now.' 
                    : 'No team visit records found for this filter.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredTeamVisits.map((visit) => {
                  const emp = employees.find(e => e.id === visit.employeeId);
                  const isPending = visit.approvalStatus === 'pending';

                  return (
                    <div 
                      key={visit.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        isPending 
                          ? 'border-amber-200 bg-amber-50/20' 
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      {/* Rep & Doctor Details */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            👤 {emp?.name || 'Representative'}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs font-bold text-slate-800">
                            {visit.doctorName || visit.title}
                          </span>
                          {visit.scheduledDate && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
                              📅 {visit.scheduledDate} {visit.scheduledStart && `(${visit.scheduledStart})`}
                            </span>
                          )}
                        </div>

                        {visit.clinicName && (
                          <p className="text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                            <Building size={12} className="text-[#8a42db]" />
                            {visit.clinicName}
                          </p>
                        )}

                        {visit.assignedAddress && (
                          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <MapPin size={11} className="text-slate-400 shrink-0" />
                            {visit.assignedAddress}
                          </p>
                        )}

                        {visit.visitPurpose && (
                          <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg font-medium inline-block">
                            <strong>Agenda:</strong> {visit.visitPurpose}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons for Team Lead */}
                      <div className="flex items-center gap-2 self-end md:self-center">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleApprove(visit.id)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <Check size={14} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleReject(visit.id)}
                              className="px-3.5 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <X size={14} />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              visit.approvalStatus === 'approved' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {visit.approvalStatus === 'approved' ? '✓ Approved' : '✗ Rejected'}
                            </span>
                            <button
                              onClick={() => handleDelete(visit.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                              title="Delete Record"
                            >
                              <Trash2 size={14} />
                            </button>
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
      )}

      {/* Unified Enterprise Add Call Modal */}
      {isAssignModalOpen && (
        <AssignVisitModal
          language={language}
          onClose={() => setIsAssignModalOpen(false)}
          employees={employees}
          adminId={currentUser.id}
          currentUser={currentUser}
          initialDate={selectedDate}
          isSelfSchedule={modalMode === 'self'}
          targetEmployeeId={modalMode === 'self' ? currentUser.id : undefined}
          onVisitCreated={async () => {
            await loadVisits();
          }}
        />
      )}
    </div>
  );
}
