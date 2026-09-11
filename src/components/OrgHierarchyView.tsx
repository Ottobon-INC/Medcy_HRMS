import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Search, 
  Users,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw
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
                  <p className="text-[9px] font-black text-[#8a42db] tracking-widest uppercase mt-0.5">HEAD</p>
                </div>

                <div className="px-3.5 py-1.5 bg-slate-50 flex justify-between items-center mt-auto">
                  <span className="text-[11px] text-slate-500 font-medium">{reportCount} Direct Reports</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Main Connector from CEO */}
      {executives.length > 0 && midLevelLeaders.length > 0 && (
         <div className="w-px h-5 bg-slate-300 relative z-0"></div>
      )}

      {/* Mid Level: Department Nodes */}
      {midLevelLeaders.length > 0 && (
        <div className="relative w-full flex justify-center">
          {/* Horizontal line connecting departments */}
          {midLevelLeaders.length > 1 && (
            <div 
              className="absolute top-0 h-px bg-slate-300" 
              style={{ 
                left: midLevelLeaders.length === 2 ? '25%' : '14%', 
                right: midLevelLeaders.length === 2 ? '25%' : '14%' 
              }}
            ></div>
          )}

          <div className="flex justify-center gap-5 pt-3.5">
            {midLevelLeaders.map((lead) => {
              const { name: deptName, colorClass } = getDepartmentInfo(lead);
              const directReports = groupsByLead[lead.id] || [];
              const reportCount = directReports.length;

              return (
                <div key={lead.id} className="flex flex-col items-center relative">
                  {midLevelLeaders.length > 1 && (
                    <div className="absolute -top-3.5 w-px h-3.5 bg-slate-300"></div>
                  )}

                  {lead.name.toLowerCase().includes('ravi kumar') ? (
                    <div className="bg-white border border-slate-200/90 rounded-xl w-60 shadow-sm overflow-hidden flex flex-col z-10 hover:shadow-md transition-all">
                      <div className={`h-1.5 w-full bg-gradient-to-r ${colorClass}`}></div>
                      
                      <div className="p-3.5 flex flex-col items-center border-b border-slate-100">
                        <Avatar employee={lead} size="lg" />
                        <h2 className="mt-2 text-base font-bold text-slate-800 tracking-tight text-center">{lead.name}</h2>
                        <p className="text-[9px] font-black text-blue-500 tracking-widest uppercase mt-0.5">CENTER HEAD</p>
                      </div>

                      <div className="px-3.5 py-1.5 bg-slate-50 flex justify-between items-center mt-auto">
                        <span className="text-[11px] text-slate-500 font-medium">{reportCount} Direct Reports</span>
                      </div>
                    </div>
                  ) : (
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
                          <span className="text-[8px] font-black text-[#8a42db] tracking-widest uppercase">Team Lead</span>
                          <span className="text-xs font-semibold text-slate-800 truncate">{lead.name}</span>
                        </div>
                      </div>

                      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center mt-auto">
                        <span className="text-[10px] text-slate-500 font-medium">{reportCount} Direct Reports</span>
                      </div>
                    </div>
                  )}

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
                  <p className="text-[9px] font-black text-[#8a42db] tracking-widest uppercase mt-0.5">HEAD</p>
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
            const isCenterHead = lead.name.toLowerCase().includes('ravi kumar');
            
            return (
              <div key={lead.id} className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                <div className={`h-1.5 w-full bg-gradient-to-r ${colorClass}`}></div>
                <div className="p-3 border-b border-slate-50 bg-white">
                  <div className="flex items-center gap-3">
                    <Avatar employee={lead} size="md" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-[#8a42db] uppercase tracking-widest">{isCenterHead ? 'Center Head' : deptName}</span>
                      <span className="font-bold text-slate-800 text-sm">{lead.name}</span>
                    </div>
                  </div>
                </div>
                
                {directReports.length > 0 && (
                  <div className="bg-slate-50/80 p-3 pt-2">
                    <div className="flex flex-col gap-2 relative">
                      <div className="absolute left-4 top-2 bottom-4 w-px bg-slate-300"></div>
                      {directReports.map((emp) => (
                        <div key={emp.id} className="flex items-center gap-2.5 relative pl-8">
                          <div className="absolute left-4 top-1/2 w-3 h-px bg-slate-300"></div>
                          <Avatar employee={emp} size="sm" />
                          <div className="flex flex-col py-0.5 overflow-hidden w-full">
                            <span className="text-xs font-semibold text-slate-800 leading-tight truncate">{emp.name}</span>
                            <span className="text-[9px] text-slate-500 font-medium uppercase tracking-wide truncate">{emp.designation}</span>
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
  
  // Interactive Viewport Scaling & Pan
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Intelligent Auto-Fit Calculation
  const handleFitToScreen = useCallback(() => {
    if (!viewportRef.current || !contentRef.current) return;
    const vp = viewportRef.current.getBoundingClientRect();
    
    // Measure natural unscaled content size
    const contentW = contentRef.current.scrollWidth || contentRef.current.offsetWidth;
    const contentH = contentRef.current.scrollHeight || contentRef.current.offsetHeight;
    
    if (contentW <= 0 || contentH <= 0 || vp.width <= 0 || vp.height <= 0) return;
    
    const paddingX = 36;
    const paddingY = 28;
    const availableW = vp.width - paddingX;
    const availableH = vp.height - paddingY;
    
    const scaleX = availableW / contentW;
    const scaleY = availableH / contentH;
    
    // Find optimal scale so entire tree fits both width & height
    const fitScale = Math.min(scaleX, scaleY);
    const clampedScale = Math.max(0.38, Math.min(1.05, parseFloat(fitScale.toFixed(2))));
    
    setScale(clampedScale);
    setPan({ x: 0, y: 0 });
  }, []);

  // Recalculate auto-fit when org changes or window resizes
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitToScreen();
    }, 120);

    const onResize = () => handleFitToScreen();
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, [selectedOrg, handleFitToScreen, employees]);

  // Mouse Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select')) return;
    
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({
      x: panStart.current.x + dx,
      y: panStart.current.y + dy
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.06 : 0.06;
      setScale(s => Math.max(0.35, Math.min(1.5, parseFloat((s + delta).toFixed(2)))));
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] lg:h-[calc(100vh-100px)] bg-slate-50/50 p-2 sm:p-3 animate-fadeIn overflow-hidden rounded-2xl relative select-none">
      
      {/* Top Compact Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 mb-2 relative z-20 shrink-0 px-2 pt-1">
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/80 rounded-xl shadow-xs">
            <Users className="w-4 h-4 text-[#8a42db]" />
            <span className="text-xs font-bold text-slate-800 tracking-tight">Organization Hierarchy</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search employee, lead, or dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl py-1.5 pl-8 pr-3 focus:outline-none focus:ring-2 focus:ring-[#8a42db]/40 shadow-xs placeholder:text-slate-400 transition-all"
            />
          </div>
          
          <div className="relative shrink-0 w-44">
            <select 
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value as any)}
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#8a42db]/40 shadow-xs appearance-none cursor-pointer pr-7 font-semibold"
            >
              <option value="medcy_hospitals">Medcy Hospitals</option>
              <option value="vizag_ivf">Vizag IVF Centre</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Main Tree Canvas - Desktop with Auto-Fit & Drag-to-Pan */}
      <div 
        ref={viewportRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`hidden lg:flex flex-1 items-center justify-center overflow-hidden relative rounded-xl bg-gradient-to-b from-slate-50/70 to-slate-100/40 border border-slate-200/50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div 
          ref={contentRef}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'top center',
            transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          className="w-max mx-auto pt-2 pb-6"
        >
          <OrgTree 
            org={selectedOrg} 
            employees={employees} 
            searchQuery={searchQuery}
          />
        </div>

        {/* Floating Glassmorphic Zoom Controls */}
        <div className="flex items-center gap-1 absolute bottom-3 right-4 z-30 bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-md px-2 py-1 rounded-full text-slate-700 text-xs font-medium">
          <button 
            onClick={() => setScale(s => Math.max(0.35, parseFloat((s - 0.08).toFixed(2))))}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          
          <button 
            onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
            className="px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-700 font-bold text-[10px] min-w-[36px] text-center"
            title="Reset to 100%"
          >
            {Math.round(scale * 100)}%
          </button>
          
          <button 
            onClick={() => setScale(s => Math.min(1.4, parseFloat((s + 0.08).toFixed(2))))}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-slate-200 mx-0.5"></div>

          <button 
            onClick={handleFitToScreen}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#8a42db]/10 hover:bg-[#8a42db]/20 text-[#8a42db] font-bold text-[10px] transition-colors"
            title="Fit Entire Chart to Screen"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Fit Screen</span>
          </button>

          <button 
            onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
            title="Reset Position"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Tree Canvas - Mobile */}
      <div className="lg:hidden flex-1 overflow-y-auto custom-scrollbar relative pb-20 pt-1">
        <MobileOrgTree 
          org={selectedOrg} 
          employees={employees} 
          searchQuery={searchQuery}
        />
      </div>
    </div>
  );
};

export default OrgHierarchyView;
