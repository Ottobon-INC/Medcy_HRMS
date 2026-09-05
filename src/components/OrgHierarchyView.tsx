import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Search, 
  Phone, 
  Mail, 
  ChevronDown
} from 'lucide-react';
import { Employee, Language, Branch } from '../types';

interface OrgHierarchyViewProps {
  language: Language;
  employees: Employee[];
  currentUser: Employee;
}

export const OrgHierarchyView: React.FC<OrgHierarchyViewProps> = ({
  employees,
}) => {
  const [branchFilter, setBranchFilter] = useState<Branch | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Executive Tier: Indra Mam & Anoopama Mam (Cross-Branch Board of Directors)
  const executives = employees.filter(e => {
    const isExec = e.hierarchyLevel === 'executive' || 
      e.name.toLowerCase().includes('indra') || 
      e.name.toLowerCase().includes('anoopama');
    if (!isExec) return false;
    // If a branch is selected, only show executives if they belong to or oversee that branch
    if (branchFilter === 'all') return true;
    const branch = e.branch || 'visakhapatnam';
    const manages = e.managedBranches || [branch];
    return branch === branchFilter || manages.includes(branchFilter);
  });

  // 2. Manager / Branch Lead Tier: e.g. R. Ravi Kumar
  const managers = employees.filter(e => {
    const isMgr = (e.hierarchyLevel === 'manager' || e.id === 'EMP-2026-011' || e.name.toLowerCase().includes('ravi kumar')) &&
      !executives.some(ex => ex.id === e.id);
    if (!isMgr) return false;
    // Bifurcate by selected branch
    if (branchFilter === 'all') return true;
    const branch = e.branch || 'visakhapatnam';
    const manages = e.managedBranches || [branch];
    return branch === branchFilter || manages.includes(branchFilter);
  });

  // 3. Base Employees (Clinical & Field Workforce)
  const baseEmployees = employees.filter(e => 
    !executives.some(ex => ex.id === e.id) &&
    !managers.some(mg => mg.id === e.id)
  );

  // Filter base employees by branch & search
  const filteredBase = baseEmployees.filter(e => {
    const empBranch = e.branch || 'visakhapatnam';
    const matchesBranch = branchFilter === 'all' || empBranch === branchFilter;
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  const getAttendanceStatus = (emp: Employee) => {
    const todayAtt = emp.attendanceRecords?.find(a => a.date === todayStr);
    if (emp.isCheckedIn || (todayAtt && todayAtt.status === 'present')) {
      return { label: 'Present Today', dotClass: 'bg-emerald-500 ring-emerald-300' };
    }
    if (todayAtt && todayAtt.status === 'leave') {
      return { label: 'On Leave', dotClass: 'bg-amber-500 ring-amber-300' };
    }
    return { label: 'Not Clocked In', dotClass: 'bg-slate-300 ring-slate-200' };
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              Corporate Structure
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              VizagIVF Clinical Network
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 mt-1">
            Organizational Hierarchy Tree
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            3-Tier reporting governance: Executives → Operations Manager → Branch Workforce
          </p>
        </div>

        {/* Branch Filter & Search Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input 
              type="text"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 text-slate-700 w-44"
            />
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setBranchFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                branchFilter === 'all'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Branches ({employees.length})
            </button>
            <button
              onClick={() => setBranchFilter('visakhapatnam')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                branchFilter === 'visakhapatnam'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Visakhapatnam ({employees.filter(e => (e.branch || 'visakhapatnam') === 'visakhapatnam').length})
            </button>
            <button
              onClick={() => setBranchFilter('vizianagaram')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                branchFilter === 'vizianagaram'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Vizianagaram ({employees.filter(e => e.branch === 'vizianagaram').length})
            </button>
          </div>
        </div>
      </div>

      {/* Visual Hierarchy Diagram */}
      <div className="flex flex-col items-center space-y-6">

        {/* LEVEL 1: EXECUTIVES */}
        <div className="w-full flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-black uppercase tracking-widest mb-4">
            Level 3 · Executive Leadership {branchFilter === 'all' ? '(Cross-Branch)' : `(${branchFilter === 'visakhapatnam' ? 'Visakhapatnam' : 'Vizianagaram'})`}
          </div>

          <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
            {executives.map(exec => {
              const status = getAttendanceStatus(exec);
              return (
                <div 
                  key={exec.id} 
                  className="w-72 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 border-2 border-amber-300/80 rounded-2xl p-5 shadow-md relative hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-sm border border-amber-200 shadow-sm">
                        {exec.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded">
                          Executive Director
                        </span>
                        <h3 className="text-sm font-black text-slate-900 mt-1">{exec.name}</h3>
                        <p className="text-[10px] text-slate-500 font-medium">Board of Directors</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-amber-100/80 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 flex items-center gap-1 font-medium">
                      <Building2 className="w-3 h-3 text-amber-600" />
                      {branchFilter === 'visakhapatnam' 
                        ? 'Visakhapatnam Operations' 
                        : branchFilter === 'vizianagaram'
                        ? 'Vizianagaram Operations'
                        : 'Visakhapatnam & Vizianagaram'}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                      <span className={`w-2 h-2 rounded-full ring-2 ${status.dotClass}`} />
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Connector to Manager */}
          <div className="flex flex-col items-center my-2">
            <div className="w-0.5 h-8 bg-slate-300" />
            <ChevronDown className="w-4 h-4 text-slate-400 -mt-1" />
          </div>
        </div>

        {/* LEVEL 2: OPERATIONS MANAGER / BRANCH LEAD */}
        <div className="w-full flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-black uppercase tracking-widest mb-4">
            Level 2 · {branchFilter === 'all' ? 'General Management (Both Branches)' : `${branchFilter === 'visakhapatnam' ? 'Visakhapatnam' : 'Vizianagaram'} Operations Lead`}
          </div>

          <div className="flex items-center justify-center gap-4">
            {managers.map(mgr => {
              const status = getAttendanceStatus(mgr);
              return (
                <div 
                  key={mgr.id} 
                  className="w-80 bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30 border-2 border-blue-400 rounded-2xl p-5 shadow-lg relative hover:shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/25">
                        RK
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          {branchFilter === 'all' ? 'Branch Operations Manager' : `${branchFilter === 'visakhapatnam' ? 'Visakhapatnam' : 'Vizianagaram'} Lead`}
                        </span>
                        <h3 className="text-sm font-black text-slate-900 mt-1">{mgr.name}</h3>
                        <p className="text-[10px] text-slate-500 font-medium">{mgr.id}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-2.5 bg-blue-50/80 rounded-xl border border-blue-100 text-[11px] text-blue-900 font-semibold space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Reporting to:</span>
                      <span className="font-bold text-slate-800">Indra Mam & Anoopama Mam</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Authority:</span>
                      <span className="font-bold text-slate-800">Leave Approvals & Duty Roster</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-blue-100 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 flex items-center gap-1 font-bold">
                      <MapPin className="w-3 h-3 text-blue-600" />
                      {branchFilter === 'visakhapatnam' 
                        ? 'Visakhapatnam Branch' 
                        : branchFilter === 'vizianagaram'
                        ? 'Vizianagaram Branch'
                        : 'Visakhapatnam + Vizianagaram'}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                      <span className={`w-2 h-2 rounded-full ring-2 ${status.dotClass}`} />
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Connector to Base Employees */}
          <div className="flex flex-col items-center my-2">
            <div className="w-0.5 h-8 bg-slate-300" />
            <ChevronDown className="w-4 h-4 text-slate-400 -mt-1" />
          </div>
        </div>

        {/* LEVEL 3: CLINICAL & FIELD EMPLOYEES */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-black uppercase tracking-widest">
              Level 1 · {branchFilter === 'visakhapatnam' ? 'Visakhapatnam' : branchFilter === 'vizianagaram' ? 'Vizianagaram' : 'All'} Staff ({filteredBase.length})
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Direct reports to R. Ravi Kumar ({branchFilter === 'visakhapatnam' ? 'Visakhapatnam Lead' : branchFilter === 'vizianagaram' ? 'Vizianagaram Lead' : 'Operations Manager'})
            </span>
          </div>

          {filteredBase.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center text-xs text-slate-400 font-medium">
              No staff members found matching the selected filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredBase.map(emp => {
                const status = getAttendanceStatus(emp);
                const branch = emp.branch || 'visakhapatnam';
                const isVizag = branch === 'visakhapatnam';

                return (
                  <div 
                    key={emp.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-black">
                          {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 leading-tight group-hover:text-teal-600 transition-colors">
                            {emp.name}
                          </h4>
                          <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
                            {emp.id}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isVizag 
                          ? 'bg-teal-50 text-teal-700 border-teal-200' 
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}>
                        {isVizag ? 'Vizag' : 'Vizianagaram'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 font-medium">
                      {emp.designation}
                    </div>

                    <div className="space-y-1 text-[10px] text-slate-400 font-medium">
                      {emp.phone && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{emp.phone}</span>
                        </div>
                      )}
                      {emp.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{emp.email}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Reports to: <strong>Ravi Kumar</strong></span>
                      <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                        <span className={`w-2 h-2 rounded-full ring-2 ${status.dotClass}`} />
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default OrgHierarchyView;
