import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Employee, Language } from '../types';

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
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-sm',
    xl: 'w-20 h-20 text-lg'
  };

  return (
    <div className="relative inline-block">
      <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold overflow-hidden bg-slate-100 text-slate-700 shadow-sm ring-4 ring-white`}>
         {(employee as any).photo && !isGhost ? (
           <img src={(employee as any).photo} alt={name} className="w-full h-full object-cover" />
         ) : (
           initials
         )}
      </div>
      {!isGhost && (
        <span className={`absolute bottom-0 right-1 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
      )}
    </div>
  );
};


const getDepartmentInfo = (lead: Employee) => {
  let name = lead.hospital === 'vizag_ivf' ? 'Vizag Operations' : 'Medcy Operations';
  let colorClass = lead.hospital === 'vizag_ivf' ? 'from-blue-500 to-cyan-500' : 'from-[#8a42db] to-purple-500';
  
  if (lead.designation?.toLowerCase().includes('marketing')) { name = 'Marketing'; colorClass = 'from-orange-500 to-amber-500'; }
  else if (lead.designation?.toLowerCase().includes('product')) { name = 'Product'; colorClass = 'from-pink-500 to-rose-500'; }
  else if (lead.designation?.toLowerCase().includes('tech') || lead.designation?.toLowerCase().includes('engineer')) { name = 'Engineering'; colorClass = 'from-indigo-500 to-blue-500'; }
  else if (lead.designation?.toLowerCase().includes('design')) { name = 'Design'; colorClass = 'from-fuchsia-500 to-pink-500'; }

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
      
      const isForcedMedcyLead = nameLower.includes('rambabu') || nameLower.includes('satish') || nameLower.includes('prudhvi') || nameLower.includes('prudhuvi');
      
      if (org === 'medcy_hospitals') {
        if (e.hospital === 'vizag_ivf' && !isForcedMedcyLead) return false;
        if (isForcedMedcyLead) return true;
      } else if (org === 'vizag_ivf') {
        if (e.hospital !== 'vizag_ivf') return false;
        if (isForcedMedcyLead) return false;
      }
      
      return ['senior_manager', 'manager', 'team_lead'].includes(e.hierarchyLevel || '');
    });
    
    const getOrder = (name: string) => {
      const lower = (name || '').toLowerCase();
      if (lower.includes('rambabu')) return 1;
      if (lower.includes('satish')) return 2;
      if (lower.includes('prudhvi') || lower.includes('prudhuvi')) return 3;
      return 4;
    };

    allMidLevel.sort((a, b) => {
      const orderA = getOrder(a.name);
      const orderB = getOrder(b.name);
      
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
      if (nameLower.includes('rambabu') || nameLower.includes('satish') || nameLower.includes('prudhvi') || nameLower.includes('prudhuvi')) return false;
      
      if (org === 'medcy_hospitals' && e.hospital === 'vizag_ivf') return false;
      if (org === 'vizag_ivf' && e.hospital !== 'vizag_ivf') return false;
      
      return e.hierarchyLevel === 'employee';
    });

    const groups: Record<string, Employee[]> = {};
    allMidLevel.forEach(lead => groups[lead.id] = []);

    baseEmployees.forEach(emp => {
      const leadId = emp.reportingTo;
      if (leadId && groups[leadId]) {
        groups[leadId].push(emp);
      } else {
        if (emp.hospital === 'vizag_ivf') {
           const vizagLead = allMidLevel.find(l => l.hospital === 'vizag_ivf');
           if (vizagLead) {
             groups[vizagLead.id].push(emp);
             return;
           }
        } else {
           const medcyLead = allMidLevel.find(l => l.hospital === 'medcy_hospitals');
           if (medcyLead) {
             groups[medcyLead.id].push(emp);
             return;
           }
        }
        
        if (!groups['unassigned']) groups['unassigned'] = [];
        groups['unassigned'].push(emp);
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
      const isExec = e.hierarchyLevel === 'executive' || isBhramhaji;
      
      if (!isExec) return false;
      
      if (org === 'vizag_ivf' && isBhramhaji) {
        return false;
      }

      return applyFilters(e) || finalMidLevel.length > 0;
    });

    return { executives: execs, midLevelLeaders: finalMidLevel, groupsByLead: filteredGroups };
  }, [employees, searchQuery, org]);
};

const OrgTree = ({ 
  org, 
  searchQuery, 
  employees,
  expandedNodes,
  toggleExpand
}: { 
  org: 'medcy_hospitals' | 'vizag_ivf',
  searchQuery: string,
  employees: Employee[],
  expandedNodes: Record<string, boolean>,
  toggleExpand: (id: string) => void
}) => {
  const { executives, midLevelLeaders, groupsByLead } = useOrgHierarchy(org, searchQuery, employees);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Top Level: Executive */}
      {executives.length > 0 ? (
        <div className="flex justify-center mb-8 relative z-10">
          {executives.map(ceo => {
            const reportCount = midLevelLeaders.length;
            
            return (
              <div key={ceo.id} className="bg-white border border-slate-200 rounded-2xl w-72 shadow-md overflow-hidden flex flex-col z-10 transition-transform hover:-translate-y-1 duration-300">
                <div className="h-1.5 w-full bg-gradient-to-r from-[#8a42db] via-purple-500 to-pink-500"></div>
                
                <div className="p-6 flex flex-col items-center border-b border-slate-100">
                  <Avatar employee={ceo} size="xl" />
                  <h2 className="mt-4 text-xl font-bold text-slate-800 tracking-tight">{ceo.name}</h2>
                  <p className="text-[10px] font-black text-[#8a42db] tracking-widest uppercase mt-1">HEAD</p>
                </div>

                <div className="px-4 py-3 bg-slate-50 flex justify-between items-center mt-auto">
                  <span className="text-xs text-slate-500 font-medium">{reportCount} Direct Reports</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Main Connector from CEO */}
      {executives.length > 0 && midLevelLeaders.length > 0 && (
         <div className="w-px h-10 bg-slate-300 relative z-0"></div>
      )}

      {/* Mid Level: Department Nodes */}
      {midLevelLeaders.length > 0 && (
        <div className="relative w-full flex justify-center">
          {/* Horizontal line connecting departments */}
          {midLevelLeaders.length > 1 && (
            <div className="absolute top-0 h-px bg-slate-300" style={{ left: '10%', right: '10%' }}></div>
          )}

          <div className="flex justify-center gap-8 pt-6">
            {midLevelLeaders.map((lead, index) => {
              const { name: deptName, colorClass } = getDepartmentInfo(lead);
              const directReports = groupsByLead[lead.id] || [];
              const reportCount = directReports.length;
              const isExpanded = true;

              return (
                <div key={lead.id} className="flex flex-col items-center relative">
                  {midLevelLeaders.length > 1 && (
                    <div className="absolute -top-6 w-px h-6 bg-slate-300"></div>
                  )}

                  {lead.name.toLowerCase().includes('ravi kumar') ? (
                    <div className="bg-white border border-slate-200 rounded-2xl w-72 shadow-md overflow-hidden flex flex-col z-10 transition-transform hover:-translate-y-1 duration-300">
                      <div className={`h-1.5 w-full bg-gradient-to-r ${colorClass}`}></div>
                      
                      <div className="p-6 flex flex-col items-center border-b border-slate-100">
                        <Avatar employee={lead} size="xl" />
                        <h2 className="mt-4 text-xl font-bold text-slate-800 tracking-tight">{lead.name}</h2>
                        <p className="text-[10px] font-black text-blue-500 tracking-widest uppercase mt-1">CENTER HEAD</p>
                      </div>

                      <div className="px-4 py-3 bg-slate-50 flex justify-between items-center mt-auto">
                        <span className="text-xs text-slate-500 font-medium">{reportCount} Direct Reports</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl w-64 shadow-md overflow-hidden flex flex-col z-10 transition-transform hover:-translate-y-1 duration-300">
                      <div className={`h-1.5 w-full bg-gradient-to-r ${colorClass}`}></div>
                      
                      <div className="p-4 flex justify-between items-start border-b border-slate-100">
                        <div>
                          <h3 className="text-slate-800 font-bold text-lg">{deptName}</h3>
                          <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Department</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                          <Users className="w-4 h-4" />
                        </div>
                      </div>

                      <div className="p-4 flex items-center gap-3">
                        <Avatar employee={lead} size="md" />
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-[#8a42db] tracking-widest uppercase mb-0.5">Team Lead</span>
                          <span className="text-sm font-semibold text-slate-800 leading-tight">{lead.name}</span>
                        </div>
                      </div>

                      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center mt-auto">
                        <span className="text-xs text-slate-500 font-medium">{reportCount} Direct Reports</span>
                      </div>
                    </div>
                  )}

                  {isExpanded && reportCount > 0 && (
                    <div className="flex flex-col items-center mt-0 w-full relative">
                      <div className="w-px h-8 bg-slate-300"></div>
                      
                      {reportCount > 1 && (
                        <div className="w-full h-px bg-slate-300 relative" style={{ width: `calc(100% - ${100/reportCount}%)` }}></div>
                      )}
                      
                      <div className="flex justify-center gap-4 pt-4 relative w-max">
                        {directReports.map((emp, empIndex) => (
                          <div key={emp.id} className="flex flex-col items-center relative">
                            {reportCount > 1 && (
                              <div className="absolute -top-4 w-px h-4 bg-slate-300"></div>
                            )}
                            
                            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center w-36 shadow-sm hover:shadow-md hover:border-[#8a42db]/30 transition-all cursor-pointer group">
                              <Avatar employee={emp} size="lg" />
                              <h4 className="mt-3 text-sm font-bold text-slate-800 text-center group-hover:text-[#8a42db] transition-colors">{emp.name}</h4>
                              <p className="text-[10px] text-slate-500 font-medium text-center uppercase tracking-wide mt-1 truncate w-full">{emp.designation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const MobileOrgTree = ({ 
  org, 
  searchQuery, 
  employees,
  expandedNodes,
  toggleExpand
}: { 
  org: 'medcy_hospitals' | 'vizag_ivf',
  searchQuery: string,
  employees: Employee[],
  expandedNodes: Record<string, boolean>,
  toggleExpand: (id: string) => void
}) => {
  const { executives, midLevelLeaders, groupsByLead } = useOrgHierarchy(org, searchQuery, employees);

  return (
    <div className="w-full flex flex-col gap-6 px-0 pb-8 max-w-md mx-auto">
      {executives.length > 0 && (
        <div className="flex flex-col gap-6">
          {executives.map(ceo => (
            <div key={ceo.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="h-1.5 w-full bg-gradient-to-r from-[#8a42db] via-purple-500 to-pink-500"></div>
              <div className="p-4 flex items-center gap-4">
                <Avatar employee={ceo} size="lg" />
                <div>
                  <h2 className="text-lg font-bold text-slate-800 tracking-tight">{ceo.name}</h2>
                  <p className="text-[10px] font-black text-[#8a42db] tracking-widest uppercase mt-1">HEAD</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {midLevelLeaders.length > 0 && (
        <div className="flex flex-col gap-4">
          {midLevelLeaders.map(lead => {
            const { name: deptName, colorClass } = getDepartmentInfo(lead);
            const directReports = groupsByLead[lead.id] || [];
            const isCenterHead = lead.name.toLowerCase().includes('ravi kumar');
            
            return (
              <div key={lead.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className={`h-1.5 w-full bg-gradient-to-r ${colorClass}`}></div>
                <div className="p-4 border-b border-slate-50 bg-white">
                  <div className="flex items-center gap-3">
                    <Avatar employee={lead} size="lg" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-[#8a42db] uppercase tracking-widest">{isCenterHead ? 'Center Head' : deptName}</span>
                      <span className="font-bold text-slate-800 text-base">{lead.name}</span>
                    </div>
                  </div>
                </div>
                
                {directReports.length > 0 && (
                  <div className="bg-slate-50/80 p-4 pt-3">
                    <div className="flex flex-col gap-3 relative">
                      <div className="absolute left-5 top-2 bottom-5 w-px bg-slate-300"></div>
                      {directReports.map((emp) => (
                        <div key={emp.id} className="flex items-center gap-3 relative pl-10">
                          <div className="absolute left-5 top-1/2 w-4 h-px bg-slate-300"></div>
                          <Avatar employee={emp} size="sm" />
                          <div className="flex flex-col py-1 overflow-hidden w-full">
                            <span className="text-sm font-semibold text-slate-800 leading-tight truncate">{emp.name}</span>
                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide truncate">{emp.designation}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


export const OrgHierarchyView: React.FC<OrgHierarchyViewProps> = ({
  employees,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<'medcy_hospitals' | 'vizag_ivf'>('medcy_hospitals');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-4 md:p-8 animate-fadeIn overflow-hidden rounded-2xl relative">
      
      {/* Top Bar */}
      <div className="flex flex-col items-center mb-12 relative z-20">
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search employee, lead, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-full bg-white border border-slate-200 text-slate-800 rounded-full py-3.5 pl-12 pr-6 focus:outline-none focus:ring-2 focus:ring-[#8a42db]/50 shadow-sm placeholder:text-slate-400 transition-all"
            />
          </div>
          
          <div className="relative w-full sm:w-64 shrink-0">
            <select 
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value as any)}
              className="w-full bg-white border border-slate-200 text-slate-800 rounded-full px-6 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#8a42db]/50 shadow-sm appearance-none cursor-pointer pr-10 font-medium"
            >
              <option value="medcy_hospitals">Medcy Hospitals</option>
              <option value="vizag_ivf">Vizag IVF Centre</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Tree Canvas - Desktop */}
      <div className="hidden lg:block flex-1 overflow-auto custom-scrollbar relative pb-32">
        <div className="flex flex-col items-center min-w-max mx-auto px-10">
          <OrgTree 
            org={selectedOrg} 
            employees={employees} 
            searchQuery={searchQuery} 
            expandedNodes={expandedNodes} 
            toggleExpand={toggleExpand} 
          />
        </div>
      </div>

      {/* Main Tree Canvas - Mobile */}
      <div className="lg:hidden flex-1 overflow-y-auto custom-scrollbar relative pb-32 pt-2">
        <MobileOrgTree 
          org={selectedOrg} 
          employees={employees} 
          searchQuery={searchQuery} 
          expandedNodes={expandedNodes} 
          toggleExpand={toggleExpand} 
        />
      </div>
    </div>
  );
};

export default OrgHierarchyView;
