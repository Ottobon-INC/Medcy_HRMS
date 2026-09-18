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

// Avatar Component
const Avatar = ({ employee, size = 'md' }: { employee: Employee, size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  const name = employee?.name || 'Unknown';
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const isGhost = employee?.status === 'pending';
  const isOnline = employee?.isCheckedIn;

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-base'
  };

  return (
    <div className="relative inline-block shrink-0">
      <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold overflow-hidden bg-slate-100 text-slate-700 shadow-sm ring-2 ring-white`}>
        {(employee as any).photo && !isGhost ? (
          <img src={(employee as any).photo} alt={name} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>
      {!isGhost && (
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
      )}
    </div>
  );
};


const getDepartmentInfo = (lead: Employee) => {
  let name = lead.hospital === 'vizag_ivf' ? 'Vizag Operations' : 'Medcy Operations';
  let colorClass = lead.hospital === 'vizag_ivf' ? 'from-blue-500 to-cyan-500' : 'from-[#8a42db] to-purple-500';

  const desig = (lead.designation || '').toLowerCase();
  const nameLower = (lead.name || '').toLowerCase();

  if (desig.includes('sklm') || desig.includes('srikakulam') || nameLower.includes('kishor')) {
    name = 'SKLM Unit (Srikakulam)';
    colorClass = 'from-emerald-500 to-teal-500';
  } else if (desig.includes('vzm') || desig.includes('vizianagaram') || nameLower.includes('vinay')) {
    name = 'VZM Unit (Vizianagaram)';
    colorClass = 'from-blue-600 to-indigo-600';
  } else if (desig.includes('marketing')) {
    name = 'Marketing';
    colorClass = 'from-orange-500 to-amber-500';
  } else if (desig.includes('product')) {
    name = 'Product';
    colorClass = 'from-pink-500 to-rose-500';
  } else if (desig.includes('tech') || desig.includes('engineer')) {
    name = 'Engineering';
    colorClass = 'from-indigo-500 to-blue-500';
  } else if (desig.includes('design')) {
    name = 'Design';
    colorClass = 'from-fuchsia-500 to-pink-500';
  }

  return { name, colorClass };
};

const useOrgHierarchy = (org: 'medcy_hospitals' | 'vizag_ivf', searchQuery: string, employees: Employee[]) => {
  return useMemo(() => {
    const search = searchQuery.toLowerCase();
    const applyFilters = (e: Employee) => {
      if (!search) return true;
      return (e.name || '').toLowerCase().includes(search) ||
        (e.designation || '').toLowerCase().includes(search) ||
        (e.id || '').toLowerCase().includes(search);
    };

    const allMidLevel = employees.filter(e => {
      const nameLower = (e.name || '').toLowerCase();
      if (nameLower.includes('bhramhaji') || nameLower.includes('bramhaji')) return false;
      if (nameLower.includes('ravi kumar') || nameLower.includes('ravikumar') || e.id === 'EMP-2026-011') return false;

      const isMedcyLead = nameLower.includes('rambabu') || (nameLower.includes('satish') && !nameLower.includes('pathivada')) || nameLower.includes('prudhvi') || nameLower.includes('prudhuvi');

      const isMemidiKishor = e.id === 'EMP-2026-016' || nameLower.includes('memidi') || (nameLower.includes('kishor') && !nameLower.includes('reddy') && (e.designation || '').toLowerCase().includes('unit head'));
      const isVinayBhushan = e.id === 'EMP-2026-015' || nameLower.includes('vinay') || ((e.designation || '').toLowerCase().includes('vzm') && (e.designation || '').toLowerCase().includes('unit head'));
      const isVizagLead = isMemidiKishor || isVinayBhushan;

      if (org === 'medcy_hospitals') {
        if (e.hospital === 'vizag_ivf' && !isMedcyLead) return false;
        if (isMedcyLead) return true;
        return e.hospital === 'medcy_hospitals' && ['senior_manager', 'manager', 'team_lead'].includes(e.hierarchyLevel || '');
      } else if (org === 'vizag_ivf') {
        if (e.hospital !== 'vizag_ivf') return false;
        if (isMedcyLead) return false;
        return isVizagLead;
      }
      return false;
    });

    const getOrder = (lead: Employee) => {
      const lower = (lead.name || '').toLowerCase();
      if (org === 'medcy_hospitals') {
        if (lower.includes('rambabu')) return 1;
        if (lower.includes('satish')) return 2;
        if (lower.includes('prudhvi') || lower.includes('prudhuvi')) return 3;
        return 4;
      } else {
        if (lower.includes('memidi') || (lower.includes('kishor') && !lower.includes('reddy')) || (lead.designation || '').toLowerCase().includes('sklm') || lead.id === 'EMP-2026-016') return 1;
        if (lower.includes('vinay') || (lead.designation || '').toLowerCase().includes('vzm') || lead.id === 'EMP-2026-015') return 2;
        return 3;
      }
    };

    allMidLevel.sort((a, b) => {
      const orderA = getOrder(a);
      const orderB = getOrder(b);

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      if (a.hospital === 'medcy_hospitals' && b.hospital !== 'medcy_hospitals') return -1;
      if (b.hospital === 'medcy_hospitals' && a.hospital !== 'medcy_hospitals') return 1;
      return 0;
    });

    const baseEmployees = employees.filter(e => {
      const nameLower = (e.name || '').toLowerCase();
      if (nameLower.includes('bhramhaji') || nameLower.includes('bramhaji')) return false;
      if (nameLower.includes('ravi kumar') || nameLower.includes('ravikumar') || e.id === 'EMP-2026-011') return false;
      if (nameLower.includes('rambabu') || (nameLower.includes('satish') && !nameLower.includes('pathivada')) || nameLower.includes('prudhvi') || nameLower.includes('prudhuvi')) return false;
      if (nameLower.includes('memidi') || (nameLower.includes('kishor') && !nameLower.includes('reddy') && (e.designation || '').toLowerCase().includes('unit head')) || nameLower.includes('vinay') || e.id === 'EMP-2026-015' || e.id === 'EMP-2026-016') return false;

      if (org === 'medcy_hospitals' && e.hospital === 'vizag_ivf') return false;
      if (org === 'vizag_ivf' && e.hospital !== 'vizag_ivf') return false;

      return e.hierarchyLevel === 'employee' || nameLower.includes('reddy') || nameLower.includes('shyam');
    });

    const groups: Record<string, Employee[]> = {};
    allMidLevel.forEach(lead => groups[lead.id] = []);

    baseEmployees.forEach(emp => {
      const leadId = emp.reportingTo;
      const memidiLead = allMidLevel.find(l => l.id === 'EMP-2026-016' || (l.name || '').toLowerCase().includes('memidi') || ((l.name || '').toLowerCase().includes('kishor') && !(l.name || '').toLowerCase().includes('reddy')));
      const vinayLead = allMidLevel.find(l => l.id === 'EMP-2026-015' || (l.name || '').toLowerCase().includes('vinay'));

      if (leadId && groups[leadId]) {
        groups[leadId].push(emp);
      } else {
        if (emp.hospital === 'vizag_ivf') {
          const text = `${emp.name} ${emp.designation || ''} ${emp.email || ''}`.toLowerCase();
          const isVzm = text.includes('bobbili') || text.includes('vizianagaram') || text.includes('vzm') || text.includes('shyam') || text.includes('bhaskar') || text.includes('hanumanth') || text.includes('sathish') || emp.id === 'EMP-2026-012' || emp.id === 'EMP-2026-019' || emp.id === 'EMP-2026-020' || emp.id === 'EMP-2026-021';

          if (isVzm && vinayLead && groups[vinayLead.id]) {
            groups[vinayLead.id].push(emp);
          } else if (memidiLead && groups[memidiLead.id]) {
            groups[memidiLead.id].push(emp);
          } else if (vinayLead && groups[vinayLead.id]) {
            groups[vinayLead.id].push(emp);
          } else {
            if (!groups['unassigned']) groups['unassigned'] = [];
            groups['unassigned'].push(emp);
          }
        } else {
          const medcyLead = allMidLevel.find(l => l.hospital === 'medcy_hospitals');
          if (medcyLead && groups[medcyLead.id]) {
            groups[medcyLead.id].push(emp);
          } else {
            if (!groups['unassigned']) groups['unassigned'] = [];
            groups['unassigned'].push(emp);
          }
        }
      }
    });

    const filteredGroups: Record<string, Employee[]> = {};
    Object.keys(groups).forEach(key => {
      filteredGroups[key] = groups[key].filter(applyFilters);
    });

    const finalMidLevel = allMidLevel.filter(lead => {
      if (applyFilters(lead)) return true;
      if (filteredGroups[lead.id] && filteredGroups[lead.id].length > 0) return true;
      return false;
    });

    const execs = employees.filter(e => {
      const nameLower = (e.name || '').toLowerCase();
      if (nameLower.includes('indira') || nameLower.includes('anoopama')) return false;

      const isBhramhaji = nameLower.includes('bhramhaji') || nameLower.includes('bramhaji');
      const isRaviKumar = nameLower.includes('ravi kumar') || nameLower.includes('ravikumar') || e.id === 'EMP-2026-011';

      if (org === 'medcy_hospitals') {
        if (!isBhramhaji && e.hierarchyLevel !== 'executive') return false;
        return applyFilters(e) || finalMidLevel.length > 0;
      } else if (org === 'vizag_ivf') {
        // ONLY Ravi Kumar on top for Vizag IVF Centre
        if (!isRaviKumar && e.id !== 'EMP-2026-011') return false;
        return applyFilters(e) || finalMidLevel.length > 0;
      }
      return false;
    });

    return { executives: execs, midLevelLeaders: finalMidLevel, groupsByLead: filteredGroups };
  }, [employees, searchQuery, org]);
};

const OrgTree = ({
  org,
  searchQuery,
  employees
}: {
  org: 'medcy_hospitals' | 'vizag_ivf',
  searchQuery: string,
  employees: Employee[]
}) => {
  const { executives, midLevelLeaders, groupsByLead } = useOrgHierarchy(org, searchQuery, employees);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Top Level: Executive */}
      {executives.length > 0 ? (
        <div className="flex justify-center mb-3 relative z-10">
          {executives.map(ceo => {
            const reportCount = midLevelLeaders.length;

            return (
              <div key={ceo.id} className="bg-white border border-slate-200/90 rounded-xl w-60 shadow-sm overflow-hidden flex flex-col z-10 transition-all hover:shadow-md">
                <div className="h-1.5 w-full bg-gradient-to-r from-[#8a42db] via-purple-500 to-pink-500"></div>

                <div className="p-3.5 flex flex-col items-center border-b border-slate-100">
                  <Avatar employee={ceo} size="lg" />
                  <h2 className="mt-2 text-base font-bold text-slate-800 tracking-tight text-center">{ceo.name}</h2>
                  <p className="text-[9px] font-black text-[#8a42db] tracking-widest uppercase mt-0.5">
                    {ceo.designation || (org === 'vizag_ivf' ? 'REGIONAL MANAGER' : 'HEAD')}
                  </p>
                </div>

                <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                  <button
                    onClick={() => setBranchFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${branchFilter === 'all'
                        ? 'bg-white text-teal-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    All Branches ({employees.length})
                  </button>
                  <button
                    onClick={() => setBranchFilter('visakhapatnam')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${branchFilter === 'visakhapatnam'
                        ? 'bg-white text-teal-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    Visakhapatnam ({employees.filter(e => (e.branch || 'visakhapatnam') === 'visakhapatnam').length})
                  </button>
                  <button
                    onClick={() => setBranchFilter('vizianagaram')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${branchFilter === 'vizianagaram'
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
                <div key={lead.id} className="flex flex-col items-center relative">
                  {midLevelLeaders.length > 1 && (
                    <div className="absolute -top-3.5 w-px h-3.5 bg-slate-300"></div>
                  )}

                    <div className="bg-white border border-slate-200/90 rounded-xl w-52 shadow-sm overflow-hidden flex flex-col z-10 hover:shadow-md transition-all">
                      <div className={`h-1.5 w-full bg-gradient-to-r ${colorClass}`}></div>
                      
                      <div className="p-3 flex justify-between items-start border-b border-slate-100">
                        <div>
                          <h3 className="text-slate-800 font-bold text-sm leading-snug">{deptName}</h3>
                          <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Department</p>
                        </div>
                        <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      <div className="p-3 flex items-center gap-2.5">
                        <Avatar employee={lead} size="sm" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-[8px] font-black text-[#8a42db] tracking-widest uppercase">{lead.designation || 'Team Lead'}</span>
                          <span className="text-xs font-semibold text-slate-800 truncate">{lead.name}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          {branchFilter === 'all' ? 'Branch Operations Manager' : `${branchFilter === 'visakhapatnam' ? 'Visakhapatnam' : 'Vizianagaram'} Lead`}
                        </span>
                        <h3 className="text-sm font-black text-slate-900 mt-1">{mgr.name}</h3>
                        <p className="text-[10px] text-slate-500 font-medium">{mgr.id}</p>
                      </div>
                    </div>

                  {reportCount > 0 && (
                    <div className="flex flex-col items-center mt-0 w-full relative">
                      <div className="w-px h-5 bg-slate-300"></div>
                      
                      {reportCount > 1 && (
                        <div 
                          className="w-full h-px bg-slate-300 relative" 
                          style={{ width: `calc(100% - ${100 / reportCount}%)` }}
                        ></div>
                      )}
                      
                      <div className="flex justify-center gap-2 pt-2.5 relative w-max">
                        {directReports.map((emp) => (
                          <div key={emp.id} className="flex flex-col items-center relative">
                            {reportCount > 1 && (
                              <div className="absolute -top-2.5 w-px h-2.5 bg-slate-300"></div>
                            )}
                            
                            <div className="bg-white border border-slate-200/90 rounded-lg p-2 flex flex-col items-center w-26 sm:w-28 shadow-xs hover:shadow-md hover:border-[#8a42db]/40 transition-all cursor-pointer group">
                              <Avatar employee={emp} size="md" />
                              <h4 className="mt-1.5 text-xs font-bold text-slate-800 text-center group-hover:text-[#8a42db] transition-colors line-clamp-1 w-full" title={emp.name}>
                                {emp.name}
                              </h4>
                              <p className="text-[9px] text-slate-500 font-medium text-center uppercase tracking-wide truncate w-full" title={emp.designation}>
                                {emp.designation}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
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
      )}
    </div>
  );
};

const MobileOrgTree = ({
  org,
  searchQuery,
  employees
}: {
  org: 'medcy_hospitals' | 'vizag_ivf',
  searchQuery: string,
  employees: Employee[]
}) => {
  const { executives, midLevelLeaders, groupsByLead } = useOrgHierarchy(org, searchQuery, employees);

  return (
    <div className="w-full flex flex-col gap-5 px-1 pb-16 max-w-md mx-auto">
      {executives.length > 0 && (
        <div className="flex flex-col gap-4">
          {executives.map(ceo => (
            <div key={ceo.id} className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="h-1.5 w-full bg-gradient-to-r from-[#8a42db] via-purple-500 to-pink-500"></div>
              <div className="p-3.5 flex items-center gap-3">
                <Avatar employee={ceo} size="lg" />
                <div>
                  <h2 className="text-base font-bold text-slate-800 tracking-tight">{ceo.name}</h2>
                  <p className="text-[9px] font-black text-[#8a42db] tracking-widest uppercase mt-0.5">
                    {ceo.designation || (org === 'vizag_ivf' ? 'REGIONAL MANAGER' : 'HEAD')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {midLevelLeaders.length > 0 && (
        <div className="flex flex-col gap-3.5">
          {midLevelLeaders.map(lead => {
            const { name: deptName, colorClass } = getDepartmentInfo(lead);
            const directReports = groupsByLead[lead.id] || [];

            return (
              <div key={lead.id} className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                <div className={`h-1.5 w-full bg-gradient-to-r ${colorClass}`}></div>
                <div className="p-3 border-b border-slate-50 bg-white">
                  <div className="flex items-center gap-3">
                    <Avatar employee={lead} size="md" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-[#8a42db] uppercase tracking-widest">{lead.designation || deptName}</span>
                      <span className="font-bold text-slate-800 text-sm">{lead.name}</span>
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
