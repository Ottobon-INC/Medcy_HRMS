import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  HeartHandshake,
  Plus,
  Search,
  Filter,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  User,
  Trash2,
  Edit2,
  FileText,
  Loader2,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Award,
  Radio,
  Download,
  Clock,
  ChevronRight,
  ShieldCheck,
  Building2,
  X,
  Phone,
  Mail,
  ExternalLink
} from 'lucide-react';
import { Language, Employee, ASHAEncounter } from '../types';
import { supabase } from '../lib/supabase-client';
import * as ashaService from '../lib/services/asha-encounter-service';
import LogEncounterModal from './LogEncounterModal';

export interface StaffCoverageSummary {
  employeeId: string;
  employeeName: string;
  branch: string;
  designation: string;
  hospital?: string;
  phone?: string;
  email?: string;
  todayCount: number;
  todayReferrals: number;
  totalCount: number;
  totalReferrals: number;
  uniqueAshaMet: number;
  uniqueVillages: number;
  villagesList: string[];
  hospitalsList: string[];
  latestEncounter?: ASHAEncounter;
  encounters: ASHAEncounter[];
}

interface ASHAEncountersModuleProps {
  language: Language;
  currentUser: Employee;
  employees: Employee[];
}

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    const days = Math.floor(diffSec / 86400);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

export const ASHAEncountersModule: React.FC<ASHAEncountersModuleProps> = ({
  language,
  currentUser,
  employees
}) => {
  // Determine if current user is an Admin / Leader or a Base Field Employee
  const userRole = (currentUser.role || '').toLowerCase();
  const userLevel = (currentUser.hierarchyLevel || '').toLowerCase();
  const userDesignation = (currentUser.designation || '').toLowerCase();

  const isExecutive = userLevel === 'executive' || userDesignation.includes('executive') || userDesignation.includes('director');
  const isManager = userLevel === 'manager' || userLevel === 'senior_manager' || userDesignation.includes('manager');
  const isTeamLead = userLevel === 'team_lead' || userDesignation.includes('team lead') || userDesignation.includes('lead');
  const isAdmin = userRole === 'admin' || isExecutive || isManager || isTeamLead || userDesignation.includes('admin') || currentUser.id === 'EMP-ADMIN-001';

  // Common State
  const [encounters, setEncounters] = useState<ASHAEncounter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRepFilter, setSelectedRepFilter] = useState<string>('all');
  const [selectedVillageFilter, setSelectedVillageFilter] = useState<string>('all');
  const [dbError, setDbError] = useState<string | null>(null);

  // Realtime Live State
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [liveAlert, setLiveAlert] = useState<{
    message: string;
    timestamp: Date;
  } | null>(null);

  // Modal State (Used exclusively by non-admin field employees)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingEncounter, setEditingEncounter] = useState<ASHAEncounter | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Detail Card Modals for Admin & Staff Inspection
  const [selectedEncounterDetail, setSelectedEncounterDetail] = useState<ASHAEncounter | null>(null);
  const [selectedRepDetail, setSelectedRepDetail] = useState<StaffCoverageSummary | null>(null);

  // Employee mapping
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach(e => {
      map.set(e.id, e);
    });
    return map;
  }, [employees]);

  // Load Encounters based on role
  const loadEncounters = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      setDbError(null);
      let data: ASHAEncounter[] = [];

      if (isAdmin) {
        // Admin gets all encounters across the organisation
        data = await ashaService.getAllEncounters(1000);
      } else {
        // Employee gets only their personal logged encounters
        data = await ashaService.getMyEncounters(currentUser.id, 500);
      }

      setEncounters(data);
      setLastSyncTime(new Date());
    } catch (err: any) {
      console.error('Failed to load ASHA encounters:', err);
      const msg = err?.message || String(err);
      if (msg.includes('relation') || msg.includes('does not exist') || msg.includes('42P01') || msg.includes('schema cache')) {
        setDbError('Could not find the table "public.HRMS_asha_encounters". Please run the SQL migration in database/24_asha_encounters_schema.sql in your Supabase SQL Editor.');
      } else {
        setDbError(msg);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, currentUser.id]);

  useEffect(() => {
    loadEncounters();
  }, [loadEncounters]);

  // Supabase Realtime WebSocket Subscription for Live Field Tracking
  useEffect(() => {
    const channel = supabase
      .channel('asha-encounters-role-tracker')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'HRMS_asha_encounters' },
        (payload: any) => {
          loadEncounters(true);

          if (isAdmin && payload.eventType === 'INSERT' && payload.new) {
            const row = payload.new;
            const rep = employeeMap.get(row.employee_id);
            const repName = rep ? rep.name : 'Field Representative';

            const hospSnippet = row.hospital_name ? ` → ${row.hospital_name}` : '';
            setLiveAlert({
              message: `⚡ Live: ${repName} recorded encounter with ${row.asha_name} in ${row.village}${hospSnippet} (${row.referrals_count || 0} referrals)`,
              timestamp: new Date()
            });

            setTimeout(() => {
              setLiveAlert(null);
            }, 8000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadEncounters, isAdmin, employeeMap]);

  // Handle Employee Save/Update
  const handleEncounterSaved = (saved: ASHAEncounter) => {
    setEncounters(prev => {
      const idx = prev.findIndex(item => item.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
  };

  // Handle Delete
  const handleDeleteEncounter = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this ASHA encounter record?')) {
      return;
    }

    setDeletingId(id);
    try {
      await ashaService.deleteEncounter(id);
      setEncounters(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete encounter');
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered encounters
  const filteredEncounters = useMemo(() => {
    let result = encounters;

    if (isAdmin && selectedRepFilter !== 'all') {
      result = result.filter(e => e.employeeId === selectedRepFilter);
    }

    if (selectedVillageFilter !== 'all') {
      result = result.filter(e => e.village.toLowerCase() === selectedVillageFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(e => {
        const emp = employeeMap.get(e.employeeId);
        const empName = emp ? emp.name.toLowerCase() : '';
        return (
          e.ashaName.toLowerCase().includes(q) ||
          e.village.toLowerCase().includes(q) ||
          (e.hospitalName && e.hospitalName.toLowerCase().includes(q)) ||
          (e.notes && e.notes.toLowerCase().includes(q)) ||
          empName.includes(q)
        );
      });
    }

    return result;
  }, [encounters, isAdmin, selectedRepFilter, selectedVillageFilter, searchQuery, employeeMap]);

  // Aggregate Metrics for Admin:
  // 1. How many encounters covered
  // 2. Number of ASHA workers
  // 3. Logged today
  // 4. Referrals today by ASHA workers
  const adminMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Encounters covered
    const totalEncountersCovered = encounters.length;
    const uniqueVillagesCovered = new Set(encounters.map(e => e.village.toLowerCase().trim())).size;

    // 2. Number of ASHA workers met
    const uniqueAshaWorkers = new Set(encounters.map(e => e.ashaName.toLowerCase().trim())).size;

    // 3. Logged today
    const todayEncountersList = encounters.filter(e => e.encounterDate === todayStr);
    const loggedToday = todayEncountersList.length;

    // 4. Referrals today by ASHA workers
    const referralsToday = todayEncountersList.reduce((sum, curr) => sum + (curr.referralsCount || 0), 0);
    const totalReferralsAllTime = encounters.reduce((sum, curr) => sum + (curr.referralsCount || 0), 0);

    return {
      totalEncountersCovered,
      uniqueVillagesCovered,
      uniqueAshaWorkers,
      loggedToday,
      referralsToday,
      totalReferralsAllTime
    };
  }, [encounters]);

  // Field Staff Breakdown (for Admin Tracking)
  const staffBreakdown = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Group encounters by rep
    const repMap = new Map<string, ASHAEncounter[]>();
    encounters.forEach(e => {
      const list = repMap.get(e.employeeId) || [];
      list.push(e);
      repMap.set(e.employeeId, list);
    });

    const results: Array<StaffCoverageSummary> = [];

    repMap.forEach((repEncounters, empId) => {
      const emp = employeeMap.get(empId);
      const todayList = repEncounters.filter(e => e.encounterDate === todayStr);
      const todayCount = todayList.length;
      const todayReferrals = todayList.reduce((sum, curr) => sum + (curr.referralsCount || 0), 0);
      const totalCount = repEncounters.length;
      const totalReferrals = repEncounters.reduce((sum, curr) => sum + (curr.referralsCount || 0), 0);
      const uniqueAshaMet = new Set(repEncounters.map(e => e.ashaName.toLowerCase().trim())).size;
      const villagesList = Array.from(new Set(repEncounters.map(e => e.village.trim()).filter(Boolean)));
      const hospitalsList = Array.from(new Set(repEncounters.map(e => e.hospitalName?.trim()).filter(Boolean))) as string[];
      const latestEncounter = repEncounters[0];

      results.push({
        employeeId: empId,
        employeeName: emp ? emp.name : 'Representative',
        branch: emp ? (emp.branch === 'visakhapatnam' ? 'Vizag' : 'VZM') : 'Field',
        designation: emp ? (emp.designation || 'Staff') : 'Field Staff',
        hospital: emp?.hospital,
        phone: emp?.phone,
        email: emp?.email,
        todayCount,
        todayReferrals,
        totalCount,
        totalReferrals,
        uniqueAshaMet,
        uniqueVillages: villagesList.length,
        villagesList,
        hospitalsList,
        latestEncounter,
        encounters: repEncounters
      });
    });

    // Sort active today first, then total count desc
    return results.sort((a, b) => {
      if (a.todayCount !== b.todayCount) return b.todayCount - a.todayCount;
      return b.totalCount - a.totalCount;
    });
  }, [encounters, employeeMap]);

  // Unique village list for dropdown
  const villageList = useMemo(() => {
    const list = Array.from(new Set(encounters.map(e => e.village.trim()).filter(Boolean)));
    return list.sort();
  }, [encounters]);

  // Employee personal stats (when not admin)
  const employeeMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const myToday = encounters.filter(e => e.encounterDate === todayStr);
    return {
      todayCount: myToday.length,
      totalCount: encounters.length,
      todayReferrals: myToday.reduce((sum, e) => sum + (e.referralsCount || 0), 0),
      totalReferrals: encounters.reduce((sum, e) => sum + (e.referralsCount || 0), 0),
      villagesCovered: new Set(encounters.map(e => e.village.toLowerCase().trim())).size
    };
  }, [encounters]);

  // Export to CSV for Admin
  const exportToCSV = () => {
    if (!encounters || encounters.length === 0) {
      alert('No encounter records available to export.');
      return;
    }

    const headers = ['Encounter Date', 'Field Representative', 'Branch', 'ASHA Worker Name', 'Village / Area', 'Hospital Referred', 'Referrals Count', 'Notes', 'Recorded At'];
    const rows = encounters.map(e => {
      const emp = employeeMap.get(e.employeeId);
      return [
        `"${e.encounterDate}"`,
        `"${emp ? emp.name : 'Unknown'}"`,
        `"${emp ? (emp.branch || '') : ''}"`,
        `"${e.ashaName.replace(/"/g, '""')}"`,
        `"${e.village.replace(/"/g, '""')}"`,
        `"${(e.hospitalName || '').replace(/"/g, '""')}"`,
        e.referralsCount || 0,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
        `"${e.createdAt || ''}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ASHA_Field_Encounters_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group by date for timeline
  const groupedByDate = useMemo(() => {
    const groups: { [date: string]: ASHAEncounter[] } = {};
    filteredEncounters.forEach(e => {
      const d = e.encounterDate || 'Undated';
      if (!groups[d]) groups[d] = [];
      groups[d].push(e);
    });
    return groups;
  }, [filteredEncounters]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedByDate).sort((a, b) => (a > b ? -1 : 1));
  }, [groupedByDate]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Live Push Notification Alert */}
      {liveAlert && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between animate-fadeIn border border-purple-400/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 animate-pulse">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs sm:text-sm font-semibold truncate text-white">
              {liveAlert.message}
            </p>
          </div>
          <span className="text-[10px] bg-white/20 px-2.5 py-0.5 rounded-full font-mono text-purple-100 shrink-0 ml-2">
            Just now
          </span>
        </div>
      )}

      {/* Supabase Migration Notice Banner if table not yet created */}
      {dbError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-amber-900 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-xs uppercase tracking-wider text-amber-800">
              Supabase Migration Required
            </h4>
            <p className="text-xs text-amber-700 leading-relaxed font-medium">
              {dbError}
            </p>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ADMIN INTERFACE: LIVE TRACKING & OVERSIGHT DASHBOARD           */}
      {/* (NO "+ Log Encounter" button, NO "My Encounters" tab)          */}
      {/* ============================================================== */}
      {isAdmin ? (
        <div className="space-y-6">

          {/* Admin Header */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-purple-50/60 to-transparent pointer-events-none" />

            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#7e3acb] to-[#a259ff] text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                    ASHA Field Operations Live Track
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="w-2 h-2 rounded-full bg-emerald-500 -ml-3" />
                    <span>Live Tracking</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-[#8a42db] border border-purple-100">
                    Admin Command
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium max-w-2xl">
                  Real-time monitoring of rural ASHA worker interactions, area coverage, and patient referrals logged by field representatives.
                </p>
              </div>
            </div>

            {/* Admin Header Controls */}
            <div className="flex items-center gap-2.5 relative z-10 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 font-medium">
                <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                <span>Synced: {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>

              <button
                onClick={exportToCSV}
                title="Download CSV Report"
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer flex items-center gap-2 text-xs font-bold shadow-xs"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => loadEncounters(true)}
                disabled={refreshing}
                title="Refresh Live Data"
                className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#8a42db]' : ''}`} />
              </button>
            </div>
          </div>

          {/* ========================================================== */}
          {/* THE 4 PRIMARY METRIC CARDS REQUESTED BY ADMIN:             */}
          {/* 1. Encounters & Areas Covered                             */}
          {/* 2. Number of ASHA Workers                                 */}
          {/* 3. Logged Today                                           */}
          {/* 4. Referrals Today by ASHA Workers                        */}
          {/* ========================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. How Many Encounters Covered */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#8a42db] flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Encounters Covered
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h3 className="text-2xl font-black text-slate-800">
                    {adminMetrics.totalEncountersCovered}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    visits
                  </span>
                </div>
                <p className="text-[10px] text-purple-700 font-bold mt-0.5">
                  Across {adminMetrics.uniqueVillagesCovered} rural villages
                </p>
              </div>
            </div>

            {/* 2. Number of ASHA Workers */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Number of ASHA Workers
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h3 className="text-2xl font-black text-blue-600">
                    {adminMetrics.uniqueAshaWorkers}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    activists
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Accredited workers engaged
                </p>
              </div>
            </div>

            {/* 3. Logged Today */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Radio className="w-6 h-6 text-amber-600 animate-pulse" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Logged Today
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h3 className="text-2xl font-black text-slate-800">
                    {adminMetrics.loggedToday}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    interactions
                  </span>
                </div>
                <p className="text-[10px] text-amber-700 font-bold mt-0.5">
                  Active field operations today
                </p>
              </div>
            </div>

            {/* 4. Referrals Today by ASHA Workers */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Referrals Today by ASHA
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <h3 className="text-2xl font-black text-emerald-600">
                    +{adminMetrics.referralsToday}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    patients
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
                  {adminMetrics.totalReferralsAllTime} total referrals all-time
                </p>
              </div>
            </div>

          </div>

          {/* Field Staff Breakdown Board */}
          {staffBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#8a42db]" />
                  <h3 className="font-bold text-sm text-slate-800">
                    Field Representatives Coverage Radar
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {staffBreakdown.length} field staff actively engaging ASHA workers
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {staffBreakdown.map(staff => {
                  const isSelected = selectedRepFilter === staff.employeeId;
                  const isActiveToday = staff.todayCount > 0;

                  return (
                    <div
                      key={staff.employeeId}
                      onClick={() => setSelectedRepDetail(staff)}
                      className={`rounded-2xl p-4.5 border transition-all cursor-pointer flex flex-col justify-between group ${
                        isSelected
                          ? 'border-[#8a42db] bg-purple-50/50 shadow-sm ring-2 ring-purple-400/20'
                          : isActiveToday
                          ? 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-300 hover:shadow-xs'
                          : 'border-slate-100 bg-white hover:border-purple-200 hover:shadow-xs'
                      }`}
                    >
                      <div>
                        {/* Rep Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isActiveToday ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {staff.employeeName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-xs text-slate-800 truncate group-hover:text-[#8a42db] transition-colors">
                                {staff.employeeName}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-medium truncate">
                                {staff.designation} · {staff.branch}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isActiveToday ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                                Active Today
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-400">
                                Idle Today
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stat Pills */}
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                          <div className="p-2 rounded-xl bg-slate-50/80">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">ASHA Encounters</span>
                            <span className="font-bold text-slate-800 text-sm">{staff.todayCount}</span>
                            <span className="text-[10px] text-slate-400 ml-1">today ({staff.totalCount} total)</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-50/80">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Referrals Today</span>
                            <span className="font-bold text-emerald-600 text-sm">+{staff.todayReferrals}</span>
                            <span className="text-[10px] text-slate-400 ml-1">({staff.totalReferrals} total)</span>
                          </div>
                        </div>

                        {/* Latest Encounter info */}
                        {staff.latestEncounter && (
                          <div className="mt-2.5 text-[11px] text-slate-500 font-medium flex items-center gap-1.5 truncate">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">
                              Last: <b>{staff.latestEncounter.ashaName}</b> in {staff.latestEncounter.village} · {formatTimeAgo(staff.latestEncounter.createdAt)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100/60 flex items-center justify-between text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRepFilter(isSelected ? 'all' : staff.employeeId);
                          }}
                          className={`hover:underline cursor-pointer ${isSelected ? 'text-[#8a42db]' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {isSelected ? '✓ Filter Applied' : 'Filter by Rep'}
                        </button>
                        <span className="text-[#8a42db] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          <span>View Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Admin Live Logs Filter & Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                  Live Field Encounters Log
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Showing {filteredEncounters.length} field interactions
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Rep Filter */}
                <select
                  value={selectedRepFilter}
                  onChange={(e) => setSelectedRepFilter(e.target.value)}
                  className="pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8a42db]"
                >
                  <option value="all">All Field Representatives</option>
                  {Array.from(new Set(encounters.map(e => e.employeeId))).map(empId => {
                    const emp = employeeMap.get(empId);
                    return (
                      <option key={empId} value={empId}>
                        {emp ? emp.name : empId}
                      </option>
                    );
                  })}
                </select>

                {/* Village Filter */}
                {villageList.length > 0 && (
                  <select
                    value={selectedVillageFilter}
                    onChange={(e) => setSelectedVillageFilter(e.target.value)}
                    className="pl-3 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8a42db]"
                  >
                    <option value="all">All Villages ({villageList.length})</option>
                    {villageList.map(v => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                )}

                {/* Search Input */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ASHA, village..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8a42db]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table or Empty */}
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-[#8a42db] animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Loading field records...</p>
              </div>
            ) : filteredEncounters.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                No ASHA encounter records found matching filters.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEncounters.map((encounter, idx) => {
                  const rep = employeeMap.get(encounter.employeeId);
                  const isToday = encounter.encounterDate === new Date().toISOString().split('T')[0];

                  return (
                    <div
                      key={encounter.id}
                      onClick={() => setSelectedEncounterDetail(encounter)}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group ${
                        idx === 0 && isToday
                          ? 'border-purple-200 bg-purple-50/30 hover:border-purple-300 hover:shadow-xs'
                          : 'border-slate-100 bg-white hover:border-[#8a42db]/40 hover:bg-purple-50/10 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#8a42db] flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-purple-100 transition-colors">
                          {encounter.ashaName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-800 group-hover:text-[#8a42db] transition-colors">
                              {encounter.ashaName}
                            </h4>
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {encounter.village}
                            </span>
                            {encounter.hospitalName && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                                <Building2 className="w-3 h-3 text-[#8a42db]" />
                                <span>{encounter.hospitalName}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              {rep ? rep.name : 'Representative'} ({rep?.branch === 'visakhapatnam' ? 'Vizag' : 'VZM'})
                            </span>
                            <span className="text-slate-300">•</span>
                            <span>{encounter.encounterDate}</span>
                            {encounter.createdAt && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-400">{formatTimeAgo(encounter.createdAt)}</span>
                              </>
                            )}
                          </div>

                          {encounter.notes && (
                            <p className="text-xs text-slate-600 mt-1.5 italic line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              "{encounter.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Meta & Actions */}
                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        {encounter.referralsCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Award className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{encounter.referralsCount} Referrals</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium px-2 py-0.5 bg-slate-50 rounded-full">
                            0 Referrals
                          </span>
                        )}

                        <span className="text-xs font-semibold text-[#8a42db] hidden sm:flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          <span>View Card</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEncounter(encounter.id);
                          }}
                          disabled={deletingId === encounter.id}
                          title="Delete invalid record"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                        >
                          {deletingId === encounter.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ============================================================== */
        /* FIELD EMPLOYEE INTERFACE: LOG CALLS & PERSONAL HISTORY          */
        /* (Has "+ Log Encounter", Form Modal, Personal My Encounters list)*/
        /* ============================================================== */
        <div className="space-y-6">
          
          {/* Employee Header */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-purple-50/70 to-transparent pointer-events-none" />

            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#7e3acb] to-[#a259ff] text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                  My ASHA Encounters
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium max-w-xl">
                  Log and track your meetings with rural ASHA health workers, patient referrals, and village discussions.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 relative z-10 shrink-0">
              <button
                onClick={() => loadEncounters(true)}
                disabled={refreshing}
                title="Refresh My Calls"
                className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#8a42db]' : ''}`} />
              </button>

              <button
                onClick={() => {
                  setEditingEncounter(null);
                  setIsModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-[#8a42db] hover:bg-[#7e3acb] transition-all flex items-center gap-2 shadow-sm shadow-purple-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Log Encounter</span>
              </button>
            </div>
          </div>

          {/* Employee Personal Metric Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#8a42db] flex items-center justify-center shrink-0">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Logged Today
                </p>
                <h3 className="text-2xl font-black text-slate-800 mt-0.5">
                  {employeeMetrics.todayCount}
                </h3>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Encounters
                </p>
                <h3 className="text-2xl font-black text-slate-800 mt-0.5">
                  {employeeMetrics.totalCount}
                </h3>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Referrals Collected
                </p>
                <h3 className="text-2xl font-black text-emerald-600 mt-0.5">
                  {employeeMetrics.totalReferrals}
                </h3>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Villages Visited
                </p>
                <h3 className="text-2xl font-black text-slate-800 mt-0.5">
                  {employeeMetrics.villagesCovered}
                </h3>
              </div>
            </div>
          </div>

          {/* Employee's Encounters Timeline */}
          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-[#8a42db] animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Loading your ASHA encounters...</p>
            </div>
          ) : filteredEncounters.length === 0 ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-12 text-center border border-slate-100 shadow-xs flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#8a42db] flex items-center justify-center mb-4">
                <HeartHandshake className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No ASHA encounters logged yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                You haven't logged any ASHA encounters yet. Tap below to record your first field conversation.
              </p>

              <button
                onClick={() => {
                  setEditingEncounter(null);
                  setIsModalOpen(true);
                }}
                className="mt-5 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#8a42db] hover:bg-[#7e3acb] transition-all flex items-center gap-2 shadow-sm shadow-purple-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Log First Encounter</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDates.map(dateKey => {
                const encountersOnDate = groupedByDate[dateKey];
                return (
                  <div key={dateKey} className="space-y-3">
                    <div className="flex items-center gap-3 px-1">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-[#8a42db]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                          {dateKey}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          ({encountersOnDate.length} {encountersOnDate.length === 1 ? 'interaction' : 'interactions'})
                        </span>
                      </div>
                      <div className="h-px flex-1 bg-slate-100" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {encountersOnDate.map(encounter => (
                        <div
                          key={encounter.id}
                          onClick={() => setSelectedEncounterDetail(encounter)}
                          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:border-purple-200 hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer group"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#8a42db] flex items-center justify-center font-black text-sm shrink-0 group-hover:bg-purple-100 transition-colors">
                                  {encounter.ashaName.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-slate-800 group-hover:text-[#8a42db] transition-colors">
                                    {encounter.ashaName}
                                  </h4>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5 font-medium">
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <span>{encounter.village}</span>
                                    </span>
                                    {encounter.hospitalName && (
                                      <>
                                        <span className="text-slate-300">•</span>
                                        <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-semibold border border-purple-100">
                                          <Building2 className="w-3 h-3 text-[#8a42db] shrink-0" />
                                          <span>Referred to: {encounter.hospitalName}</span>
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0">
                                {encounter.referralsCount > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <Award className="w-3 h-3 text-emerald-600" />
                                    <span>{encounter.referralsCount} {encounter.referralsCount === 1 ? 'Referral' : 'Referrals'}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-400">
                                    0 Referrals
                                  </span>
                                )}
                              </div>
                            </div>

                            {encounter.notes && (
                              <div className="mt-3.5 p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs text-slate-600 font-medium">
                                <p className="italic">"{encounter.notes}"</p>
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                            <span>{encounter.encounterDate}</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingEncounter(encounter);
                                  setIsModalOpen(true);
                                }}
                                title="Edit"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#8a42db] hover:bg-purple-50 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteEncounter(encounter.id);
                                }}
                                disabled={deletingId === encounter.id}
                                title="Delete"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                              >
                                {deletingId === encounter.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal for Field Employee */}
          <LogEncounterModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingEncounter(null);
            }}
            currentUser={currentUser}
            onEncounterLogged={handleEncounterSaved}
            initialData={editingEncounter}
          />

        </div>
      )}

      {/* ============================================================== */}
      {/* 1. ENCOUNTER DETAIL CARD MODAL (Opened from Live Log or Rep)    */}
      {/* ============================================================== */}
      {selectedEncounterDetail && (() => {
        const enc = selectedEncounterDetail;
        const rep = employeeMap.get(enc.employeeId);
        const isToday = enc.encounterDate === new Date().toISOString().split('T')[0];

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg my-auto overflow-hidden border border-slate-100 animate-scaleUp">
              
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/70 to-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#8a42db] flex items-center justify-center font-bold text-sm shrink-0">
                    {enc.ashaName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-slate-800">
                        {enc.ashaName}
                      </h3>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-[#8a42db]">
                        ASHA Worker
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {enc.village}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEncounterDetail(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 max-h-[calc(85vh-140px)] overflow-y-auto">
                
                {/* Highlight Banner: Referrals & Hospital */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Referrals Card */}
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Patient Referrals
                      </p>
                      <h4 className="text-lg font-black text-emerald-700">
                        {enc.referralsCount > 0 ? `+${enc.referralsCount} Patients` : '0 Referrals'}
                      </h4>
                    </div>
                  </div>

                  {/* Hospital Referred Card */}
                  <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/70 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#8a42db] flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8a42db]">
                        Referred Hospital
                      </p>
                      <h4 className="text-sm font-bold text-slate-800 truncate" title={enc.hospitalName || 'General Referral'}>
                        {enc.hospitalName || 'General Referral'}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Encounter Timing & Date */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Encounter Timeline
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="font-semibold">{enc.encounterDate}</p>
                        <p className="text-[10px] text-slate-400">{isToday ? 'Today' : 'Past Date'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="font-semibold">{enc.createdAt ? formatTimeAgo(enc.createdAt) : 'Recorded'}</p>
                        <p className="text-[10px] text-slate-400">
                          {enc.createdAt ? new Date(enc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Field Representative Card */}
                <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-2xs space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Logging Field Representative
                  </span>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs shrink-0">
                        {(rep ? rep.name : 'FR').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">
                          {rep ? rep.name : 'Field Representative'}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {rep?.designation || 'Staff'} · {rep?.branch === 'visakhapatnam' ? 'Vizag Branch' : 'Vizianagaram Branch'}
                        </p>
                      </div>
                    </div>

                    {rep?.phone && (
                      <a
                        href={`tel:${rep.phone}`}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-[#8a42db] text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Notes & Clinical / Discussion Feedback */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Encounter Notes & Discussion Summary
                  </span>
                  <div className="p-4 rounded-2xl bg-purple-50/30 border border-purple-100/70 text-xs text-slate-700 font-medium leading-relaxed">
                    {enc.notes ? (
                      <p className="italic">"{enc.notes}"</p>
                    ) : (
                      <p className="text-slate-400 italic">No additional notes provided for this encounter.</p>
                    )}
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete encounter with ${enc.ashaName}?`)) {
                        handleDeleteEncounter(enc.id);
                        setSelectedEncounterDetail(null);
                      }
                    }}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Record</span>
                  </button>
                )}

                <div className="ml-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedEncounterDetail(null)}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#8a42db] hover:bg-[#7e3acb] transition-all cursor-pointer shadow-xs shadow-purple-500/20"
                  >
                    Done
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* 2. REPRESENTATIVE COVERAGE MODAL (Opened from Coverage Radar)  */}
      {/* ============================================================== */}
      {selectedRepDetail && (() => {
        const staff = selectedRepDetail;
        const isSelectedFilter = selectedRepFilter === staff.employeeId;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-auto overflow-hidden border border-slate-100 animate-scaleUp">
              
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/80 via-white to-slate-50">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7e3acb] to-[#a259ff] text-white flex items-center justify-center font-black text-base shadow-md shadow-purple-500/20 shrink-0">
                    {staff.employeeName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-base sm:text-lg text-slate-800">
                        {staff.employeeName}
                      </h3>
                      {staff.todayCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                          Active Today
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-400">
                          Idle Today
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {staff.designation} · {staff.branch} Branch
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRepDetail(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 max-h-[calc(85vh-140px)] overflow-y-auto">
                
                {/* KPI Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100/70">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">ASHA Encounters</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-black text-slate-800">{staff.todayCount}</span>
                      <span className="text-[10px] text-slate-400">today</span>
                    </div>
                    <p className="text-[10px] text-purple-700 font-semibold mt-0.5">
                      {staff.totalCount} all-time
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/70">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Referrals Generated</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-black text-emerald-700">+{staff.todayReferrals}</span>
                      <span className="text-[10px] text-slate-400">today</span>
                    </div>
                    <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                      {staff.totalReferrals} total referrals
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100/70">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">ASHA Workers</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-black text-blue-700">{staff.uniqueAshaMet}</span>
                      <span className="text-[10px] text-slate-400">met</span>
                    </div>
                    <p className="text-[10px] text-blue-700 font-semibold mt-0.5">
                      Unique workers
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100/70">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Villages Covered</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-xl font-black text-amber-800">{staff.uniqueVillages}</span>
                      <span className="text-[10px] text-slate-400">villages</span>
                    </div>
                    <p className="text-[10px] text-amber-700 font-semibold mt-0.5">
                      Field footprint
                    </p>
                  </div>
                </div>

                {/* Hospitals Referred To */}
                {staff.hospitalsList && staff.hospitalsList.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Hospitals Referred To by {staff.employeeName}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {staff.hospitalsList.map((hosp) => (
                        <span
                          key={hosp}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-white text-[#8a42db] border border-purple-200 shadow-2xs"
                        >
                          <Building2 className="w-3.5 h-3.5 text-[#8a42db]" />
                          <span>{hosp}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Villages Covered Cloud */}
                {staff.villagesList && staff.villagesList.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Villages & Sub-centres Covered
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {staff.villagesList.map((v) => (
                        <span
                          key={v}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200"
                        >
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{v}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* List of Encounters Logged by this Representative */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <HeartHandshake className="w-4 h-4 text-[#8a42db]" />
                      Encounter History ({staff.encounters.length})
                    </h4>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Tap any record to inspect full card
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {staff.encounters.map((enc) => (
                      <div
                        key={enc.id}
                        onClick={() => {
                          setSelectedRepDetail(null);
                          setSelectedEncounterDetail(enc);
                        }}
                        className="p-3.5 rounded-xl border border-slate-100 bg-white hover:border-[#8a42db]/40 hover:bg-purple-50/20 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-800 truncate">
                              {enc.ashaName}
                            </span>
                            <span className="text-slate-400 text-[11px] flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" />
                              {enc.village}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
                            <span>{enc.encounterDate}</span>
                            {enc.hospitalName && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="inline-flex items-center gap-1 text-[#8a42db] font-semibold">
                                  <Building2 className="w-3 h-3" />
                                  {enc.hospitalName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {enc.referralsCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              +{enc.referralsCount} Referrals
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] text-slate-400 bg-slate-50">
                              0
                            </span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRepFilter(isSelectedFilter ? 'all' : staff.employeeId);
                    setSelectedRepDetail(null);
                  }}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                    isSelectedFilter
                      ? 'bg-purple-100 border-[#8a42db] text-[#8a42db]'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-[#8a42db] hover:text-[#8a42db]'
                  }`}
                >
                  {isSelectedFilter ? '✓ Filter Active on Main Page' : 'Filter Main Page to This Rep'}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRepDetail(null)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#8a42db] hover:bg-[#7e3acb] transition-all cursor-pointer shadow-xs shadow-purple-500/20"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default ASHAEncountersModule;
