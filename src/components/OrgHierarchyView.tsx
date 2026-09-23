import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Search, 
  Users, 
  ChevronDown, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw,
  Edit3,
  UserPlus,
  UserMinus,
  History,
  ShieldCheck,
  Check,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Eye,
  Layers
} from 'lucide-react';
import { Employee, Language, HierarchyLevel, Hospital, Branch } from '../types';
import { 
  canUserModifyHierarchy, 
  updateHierarchyAssignment, 
  detectHierarchyCycle 
} from '../lib/services/hierarchy-service';
import HierarchyEditModal from './HierarchyEditModal';
import HierarchyAuditModal from './HierarchyAuditModal';

interface OrgHierarchyViewProps {
  language: Language;
  employees: Employee[];
  currentUser: Employee;
  onUpdateEmployee?: (id: string, fields: Partial<Employee>) => Promise<void>;
  onRefreshEmployees?: () => Promise<void>;
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
  let name = lead.designation || (lead.hospital === 'vizag_ivf' ? 'Vizag Operations' : 'Medcy Operations');
  let colorClass = lead.hospital === 'vizag_ivf' ? 'from-blue-500 to-cyan-500' : 'from-[#8a42db] to-purple-500';
  
  const desLower = (lead.designation || '').toLowerCase();
  if (desLower.includes('marketing') || desLower.includes('regional head')) {
    name = lead.designation || 'Marketing & Field Ops';
    colorClass = 'from-blue-600 to-indigo-600';
  } else if (desLower.includes('unit head') || desLower.includes('vzm') || desLower.includes('sklm')) {
    name = lead.designation || 'Unit Operations';
    colorClass = 'from-teal-500 to-emerald-500';
  } else if (desLower.includes('senior manager')) {
    name = 'Senior Operations';
    colorClass = 'from-purple-600 to-pink-600';
  } else if (desLower.includes('product')) {
    name = 'Product';
    colorClass = 'from-pink-500 to-rose-500';
  } else if (desLower.includes('tech') || desLower.includes('engineer')) {
    name = 'Engineering';
    colorClass = 'from-indigo-500 to-blue-500';
  }

  return { name, colorClass };
};

/**
 * 100% Dynamic Hook: Computes tree structure without hardcoded employee names.
 * Supports Vizag IVF and Medcy Hospitals, multi-tier leads, and unassigned staff.
 */
const useDynamicOrgHierarchy = (
  org: 'medcy_hospitals' | 'vizag_ivf', 
  searchQuery: string, 
  employees: Employee[]
) => {
  return useMemo(() => {
    const search = searchQuery.toLowerCase().trim();
    const applyFilters = (e: Employee) => {
      if (!search) return true;
      return (e.name || '').toLowerCase().includes(search) || 
             (e.designation || '').toLowerCase().includes(search) ||
             (e.id || '').toLowerCase().includes(search) ||
             (e.branch || '').toLowerCase().includes(search);
    };

    // Filter employees belonging to the selected organization (or shared cross-org 'both')
    const orgEmployees = employees.filter(e => {
      if (org === 'medcy_hospitals') {
        return e.hospital === 'medcy_hospitals' || e.hospital === 'both';
      } else {
        return e.hospital === 'vizag_ivf' || e.hospital === 'both' || !e.hospital;
      }
    });

    // 1. Top Tier: Executives & C-Suite
    const executives = orgEmployees.filter(e => e.hierarchyLevel === 'executive');

    // 2. Mid Tier: Managers, Senior Managers, Unit Heads, and Team Leads
    const midLevelLeaders = orgEmployees.filter(e => 
      ['senior_manager', 'manager', 'team_lead'].includes(e.hierarchyLevel || '')
    );

    // Sort mid-level leaders by rank (senior_manager -> manager -> team_lead) then alphabetically
    const rankWeight: Record<string, number> = {
      senior_manager: 1,
      manager: 2,
      team_lead: 3
    };
    midLevelLeaders.sort((a, b) => {
      const wA = rankWeight[a.hierarchyLevel || 'team_lead'] || 3;
      const wB = rankWeight[b.hierarchyLevel || 'team_lead'] || 3;
      if (wA !== wB) return wA - wB;
      return (a.name || '').localeCompare(b.name || '');
    });

    // 3. Base staff: employees reporting to leaders
    const baseEmployees = orgEmployees.filter(e => 
      e.hierarchyLevel === 'employee' || !e.hierarchyLevel
    );

    const groupsByLead: Record<string, Employee[]> = {};
    midLevelLeaders.forEach(lead => {
      groupsByLead[lead.id] = [];
    });

    const unassigned: Employee[] = [];

    baseEmployees.forEach(emp => {
      const leadId = emp.reportingTo;
      if (leadId && groupsByLead[leadId]) {
        groupsByLead[leadId].push(emp);
      } else {
        unassigned.push(emp);
      }
    });

    // Search filtering logic
    const filteredGroups: Record<string, Employee[]> = {};
    Object.keys(groupsByLead).forEach(key => {
      filteredGroups[key] = groupsByLead[key].filter(applyFilters);
    });

    const finalMidLevel = midLevelLeaders.filter(lead => {
      if (applyFilters(lead)) return true;
      if (filteredGroups[lead.id] && filteredGroups[lead.id].length > 0) return true;
      return false;
    });

    const finalExecs = executives.filter(exec => {
      if (applyFilters(exec)) return true;
      return finalMidLevel.length > 0;
    });

    return { 
      executives: finalExecs, 
      midLevelLeaders: finalMidLevel, 
      groupsByLead: filteredGroups,
      unassigned: unassigned.filter(applyFilters),
      rawUnassignedCount: unassigned.length,
      totalCount: orgEmployees.length
    };
  }, [employees, searchQuery, org]);
};

// Tree Canvas View - Desktop
const OrgTree = ({ 
  org, 
  searchQuery, 
  employees,
  isEditMode,
  onEditEmployee,
  onUnassignEmployee
}: { 
  org: 'medcy_hospitals' | 'vizag_ivf';
  searchQuery: string;
  employees: Employee[];
  isEditMode: boolean;
  onEditEmployee: (emp: Employee) => void;
  onUnassignEmployee: (emp: Employee) => void;
}) => {
  const { executives, midLevelLeaders, groupsByLead } = useDynamicOrgHierarchy(org, searchQuery, employees);

  return (
    <div className="flex flex-col items-center w-full min-w-max px-6">
      {/* Top Level: Executives */}
      {executives.length > 0 ? (
        <div className="flex justify-center gap-6 mb-3 relative z-10">
          {executives.map(ceo => {
            const reportCount = midLevelLeaders.length;
            
            return (
              <div 
                key={ceo.id} 
                className="bg-white border border-slate-200/90 rounded-xl w-64 shadow-xs overflow-hidden flex flex-col z-10 transition-all hover:shadow-md group relative"
              >
                <div className="h-1.5 w-full bg-gradient-to-r from-[#8a42db] via-purple-500 to-pink-500"></div>
                
                {isEditMode && (
                  <button
                    onClick={() => onEditEmployee(ceo)}
                    title="Edit executive details"
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-100 hover:bg-[#8a42db] hover:text-white text-slate-600 transition-all cursor-pointer shadow-xs z-20"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="p-3.5 flex flex-col items-center border-b border-slate-100">
                  <Avatar employee={ceo} size="lg" />
                  <h2 className="mt-2 text-base font-bold text-slate-800 tracking-tight text-center">{ceo.name}</h2>
                  <p className="text-[9px] font-black text-[#8a42db] tracking-widest uppercase mt-0.5">
                    {ceo.designation || 'EXECUTIVE DIRECTOR'}
                  </p>
                  <span className="text-[9px] font-medium text-slate-400 mt-0.5">ID: {ceo.id}</span>
                </div>

                <div className="px-3.5 py-1.5 bg-slate-50 flex justify-between items-center mt-auto">
                  <span className="text-[11px] text-slate-500 font-medium">{reportCount} Department Leads</span>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase">{ceo.branch || 'visakhapatnam'}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Connector from Executives to Mid Level */}
      {executives.length > 0 && midLevelLeaders.length > 0 && (
         <div className="w-px h-6 bg-slate-300 relative z-0"></div>
      )}

      {/* Mid Level: Department Leaders & Unit Heads */}
      {midLevelLeaders.length > 0 && (
        <div className="relative w-full flex justify-center">
          {/* Horizontal line connecting departments */}
          {midLevelLeaders.length > 1 && (
            <div 
              className="absolute top-0 h-px bg-slate-300" 
              style={{ 
                left: midLevelLeaders.length === 2 ? '25%' : '10%', 
                right: midLevelLeaders.length === 2 ? '25%' : '10%' 
              }}
            ></div>
          )}

          <div className="flex justify-center gap-6 pt-3.5">
            {midLevelLeaders.map((lead) => {
              const { name: deptName, colorClass } = getDepartmentInfo(lead);
              const directReports = groupsByLead[lead.id] || [];
              const reportCount = directReports.length;
              const isManager = lead.hierarchyLevel === 'manager' || lead.hierarchyLevel === 'senior_manager';

              return (
                <div key={lead.id} className="flex flex-col items-center relative">
                  {midLevelLeaders.length > 1 && (
                    <div className="absolute -top-3.5 w-px h-3.5 bg-slate-300"></div>
                  )}

                  <div className="bg-white border border-slate-200/90 rounded-xl w-60 shadow-xs overflow-hidden flex flex-col z-10 hover:shadow-md transition-all relative group">
                    <div className={`h-1.5 w-full bg-gradient-to-r ${colorClass}`}></div>
                    
                    {/* Action buttons in Edit Mode */}
                    {isEditMode && (
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 z-20">
                        <button
                          onClick={() => onEditEmployee(lead)}
                          title="Edit leader role / reporting"
                          className="p-1 rounded-lg bg-slate-100 hover:bg-[#8a42db] hover:text-white text-slate-600 transition-all cursor-pointer shadow-xs"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div className="p-3 flex justify-between items-start border-b border-slate-100">
                      <div>
                        <h3 className="text-slate-800 font-bold text-xs leading-snug truncate max-w-[170px]" title={deptName}>
                          {deptName}
                        </h3>
                        <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">
                          {lead.hierarchyLevel?.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div className="p-3 flex items-center gap-2.5">
                      <Avatar employee={lead} size={isManager ? "md" : "sm"} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[8px] font-black text-[#8a42db] tracking-widest uppercase truncate">
                          {lead.designation || (isManager ? 'Manager' : 'Team Lead')}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 truncate" title={lead.name}>
                          {lead.name}
                        </span>
                      </div>
                    </div>

                    <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center mt-auto">
                      <span className="text-[10px] text-slate-500 font-medium">{reportCount} Direct Reports</span>
                      <span className="text-[9px] font-medium text-slate-400 uppercase">{lead.branch || 'Vizag'}</span>
                    </div>
                  </div>

                  {/* Direct Reports Under This Lead */}
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
                            
                            <div 
                              className={`bg-white border rounded-lg p-2 flex flex-col items-center w-28 shadow-xs transition-all relative group ${
                                isEditMode 
                                  ? 'hover:border-[#8a42db] hover:shadow-md cursor-pointer border-slate-300' 
                                  : 'hover:shadow-md hover:border-[#8a42db]/40 border-slate-200/90'
                              }`}
                              onClick={() => {
                                if (isEditMode) onEditEmployee(emp);
                              }}
                            >
                              {/* Hover actions in Edit mode */}
                              {isEditMode && (
                                <div className="absolute -top-2 right-1 hidden group-hover:flex items-center gap-0.5 z-20">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditEmployee(emp);
                                    }}
                                    title="Edit employee"
                                    className="p-1 rounded-md bg-[#8a42db] text-white shadow-xs hover:bg-[#7a32cb]"
                                  >
                                    <Edit3 className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onUnassignEmployee(emp);
                                    }}
                                    title="Unassign from this lead"
                                    className="p-1 rounded-md bg-rose-500 text-white shadow-xs hover:bg-rose-600"
                                  >
                                    <UserMinus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              )}

                              <Avatar employee={emp} size="md" />
                              <h4 className="mt-1.5 text-xs font-bold text-slate-800 text-center group-hover:text-[#8a42db] transition-colors line-clamp-1 w-full" title={emp.name}>
                                {emp.name}
                              </h4>
                              <p className="text-[9px] text-slate-500 font-medium text-center uppercase tracking-wide truncate w-full" title={emp.designation}>
                                {emp.designation || 'Staff'}
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

// Mobile Tree View
const MobileOrgTree = ({ 
  org, 
  searchQuery, 
  employees,
  isEditMode,
  onEditEmployee,
  onUnassignEmployee
}: { 
  org: 'medcy_hospitals' | 'vizag_ivf';
  searchQuery: string;
  employees: Employee[];
  isEditMode: boolean;
  onEditEmployee: (emp: Employee) => void;
  onUnassignEmployee: (emp: Employee) => void;
}) => {
  const { executives, midLevelLeaders, groupsByLead } = useDynamicOrgHierarchy(org, searchQuery, employees);

  return (
    <div className="w-full flex flex-col gap-4 px-2 pb-20 max-w-md mx-auto">
      {/* Executives */}
      {executives.length > 0 && (
        <div className="flex flex-col gap-3">
          {executives.map(ceo => (
            <div key={ceo.id} className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden relative">
              <div className="h-1.5 w-full bg-gradient-to-r from-[#8a42db] via-purple-500 to-pink-500"></div>
              
              {isEditMode && (
                <button
                  onClick={() => onEditEmployee(ceo)}
                  className="absolute top-3 right-3 p-1 rounded-lg bg-slate-100 text-slate-600"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="p-3 flex items-center gap-3">
                <Avatar employee={ceo} size="lg" />
                <div>
                  <h2 className="text-sm font-bold text-slate-800">{ceo.name}</h2>
                  <p className="text-[9px] font-black text-[#8a42db] tracking-widest uppercase">
                    {ceo.designation || 'EXECUTIVE DIRECTOR'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mid Level Leaders */}
      {midLevelLeaders.length > 0 && (
        <div className="flex flex-col gap-3">
          {midLevelLeaders.map(lead => {
            const { name: deptName, colorClass } = getDepartmentInfo(lead);
            const directReports = groupsByLead[lead.id] || [];
            
            return (
              <div key={lead.id} className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                <div className={`h-1.5 w-full bg-gradient-to-r ${colorClass}`}></div>
                
                <div className="p-3 border-b border-slate-100 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar employee={lead} size="md" />
                    <div>
                      <span className="text-[9px] font-black text-[#8a42db] uppercase tracking-widest">{deptName}</span>
                      <h4 className="font-bold text-slate-800 text-xs">{lead.name}</h4>
                    </div>
                  </div>

                  {isEditMode && (
                    <button
                      onClick={() => onEditEmployee(lead)}
                      className="p-1 rounded-lg bg-slate-100 text-slate-600"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                
                {directReports.length > 0 && (
                  <div className="bg-slate-50/80 p-3 pt-2">
                    <div className="flex flex-col gap-2 relative">
                      <div className="absolute left-4 top-2 bottom-4 w-px bg-slate-300"></div>
                      {directReports.map((emp) => (
                        <div key={emp.id} className="flex items-center justify-between relative pl-8 py-0.5">
                          <div className="absolute left-4 top-1/2 w-3 h-px bg-slate-300"></div>
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar employee={emp} size="sm" />
                            <div className="flex flex-col truncate">
                              <span className="text-xs font-semibold text-slate-800 truncate">{emp.name}</span>
                              <span className="text-[9px] text-slate-500 uppercase truncate">{emp.designation || 'Staff'}</span>
                            </div>
                          </div>

                          {isEditMode && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => onEditEmployee(emp)}
                                className="p-1 rounded-md bg-slate-200 text-slate-700"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={() => onUnassignEmployee(emp)}
                                className="p-1 rounded-md bg-rose-100 text-rose-700"
                              >
                                <UserMinus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}
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
  currentUser,
  onUpdateEmployee,
  onRefreshEmployees
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<'medcy_hospitals' | 'vizag_ivf'>('vizag_ivf');
  
  // Admin Hierarchy Modification State (Option A: Executives and Managers)
  const canEdit = canUserModifyHierarchy(currentUser);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [showUnassignedDrawer, setShowUnassignedDrawer] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Hierarchy Data for the current view
  const hierarchyData = useDynamicOrgHierarchy(selectedOrg, searchQuery, employees);

  // Auto-hide toast after 4 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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
    
    const contentW = contentRef.current.scrollWidth || contentRef.current.offsetWidth;
    const contentH = contentRef.current.scrollHeight || contentRef.current.offsetHeight;
    
    if (contentW <= 0 || contentH <= 0 || vp.width <= 0 || vp.height <= 0) return;
    
    const paddingX = 40;
    const paddingY = 32;
    const availableW = vp.width - paddingX;
    const availableH = vp.height - paddingY;
    
    const scaleX = availableW / contentW;
    const scaleY = availableH / contentH;
    
    const fitScale = Math.min(scaleX, scaleY);
    const clampedScale = Math.max(0.35, Math.min(1.05, parseFloat(fitScale.toFixed(2))));
    
    setScale(clampedScale);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleFitToScreen();
    }, 150);

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

  // Handler to save hierarchy modification
  const handleSaveHierarchy = async (
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
  ) => {
    try {
      await updateHierarchyAssignment(currentUser, employee, updates, employees, notes);
      
      // Notify parent hook or trigger refresh
      if (onUpdateEmployee) {
        await onUpdateEmployee(employee.id, {
          name: updates.name,
          email: updates.email,
          phone: updates.phone,
          hierarchyLevel: updates.hierarchyLevel,
          reportingTo: updates.reportingTo || undefined,
          designation: updates.designation,
          hospital: updates.hospital,
          branch: updates.branch
        });
      }

      if (onRefreshEmployees) {
        await onRefreshEmployees();
      }

      setToastMessage({
        text: `Profile & Hierarchy updated for ${updates.name || employee.name}.`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Failed to update hierarchy:', err);
      setToastMessage({
        text: err?.message || 'Failed to update hierarchy.',
        type: 'error'
      });
      throw err;
    }
  };

  // Quick Unassign Handler
  const handleQuickUnassign = async (employee: Employee) => {
    if (!window.confirm(`Are you sure you want to unassign ${employee.name} from their current lead? They will be moved to the unassigned pool.`)) {
      return;
    }

    try {
      await updateHierarchyAssignment(
        currentUser,
        employee,
        {
          hierarchyLevel: employee.hierarchyLevel || 'employee',
          reportingTo: null,
          designation: employee.designation,
          hospital: employee.hospital,
          branch: employee.branch
        },
        employees,
        'Unassigned from reporting lead'
      );

      if (onUpdateEmployee) {
        await onUpdateEmployee(employee.id, { reportingTo: undefined });
      }
      if (onRefreshEmployees) {
        await onRefreshEmployees();
      }

      setToastMessage({
        text: `${employee.name} has been moved to the Unassigned pool.`,
        type: 'success'
      });
    } catch (err: any) {
      setToastMessage({
        text: err?.message || 'Failed to unassign employee.',
        type: 'error'
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] lg:h-[calc(100vh-100px)] bg-slate-50/50 p-2 sm:p-3 animate-fadeIn overflow-hidden rounded-2xl relative select-none">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold animate-slideDown ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {toastMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Control Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-2.5 mb-2 relative z-20 shrink-0 px-2 pt-1">
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/80 rounded-xl shadow-xs">
            <Users className="w-4 h-4 text-[#8a42db]" />
            <span className="text-xs font-bold text-slate-800 tracking-tight">Organization Hierarchy</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-[#8a42db] border border-purple-100">
              {hierarchyData.totalCount} Staff
            </span>
          </div>

          {/* Unassigned Staff Quick Pill */}
          {hierarchyData.rawUnassignedCount > 0 && (
            <button
              onClick={() => setShowUnassignedDrawer(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
                showUnassignedDrawer
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-amber-50 hover:bg-amber-100/80 text-amber-700 border-amber-200'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>{hierarchyData.rawUnassignedCount} Unassigned</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search employee, lead, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl py-1.5 pl-8 pr-3 focus:outline-none focus:ring-2 focus:ring-[#8a42db]/40 shadow-xs placeholder:text-slate-400 transition-all"
            />
          </div>
          
          {/* Organization Selector */}
          <div className="relative shrink-0 w-44">
            <select 
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value as any)}
              className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#8a42db]/40 shadow-xs appearance-none cursor-pointer pr-7 font-semibold"
            >
              <option value="vizag_ivf">Vizag IVF Centre</option>
              <option value="medcy_hospitals">Medcy Hospitals</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Hierarchy Edit Mode Toggle (Admins, Executives & Managers) */}
          {canEdit && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setIsEditMode(prev => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  isEditMode
                    ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300 animate-pulse'
                    : 'bg-[#8a42db] hover:bg-[#7a32cb] text-white'
                }`}
                title="Toggle hierarchy editing mode"
              >
                {isEditMode ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                <span>{isEditMode ? 'Done Editing' : 'Edit Hierarchy'}</span>
              </button>

              <button
                onClick={() => setIsAuditModalOpen(true)}
                title="View Hierarchy Change History"
                className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-[#8a42db] hover:border-[#8a42db]/40 shadow-xs transition-colors cursor-pointer"
              >
                <History className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Mode Information Banner */}
      {isEditMode && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between shrink-0 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              <strong>Hierarchy Edit Mode Active:</strong> Click any employee card or action icon to reassign, promote, or change reporting relationships.
            </span>
          </div>
          <button
            onClick={() => setShowUnassignedDrawer(true)}
            className="text-[11px] font-bold text-[#8a42db] hover:underline cursor-pointer ml-2 whitespace-nowrap"
          >
            View Unassigned Staff →
          </button>
        </div>
      )}

      {/* Unassigned Staff Drawer / Tray */}
      {showUnassignedDrawer && (
        <div className="mb-2 p-3 bg-white border border-amber-200 rounded-xl shadow-sm z-20 shrink-0 animate-slideDown">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-bold text-slate-800">
                Unassigned Staff in {selectedOrg === 'vizag_ivf' ? 'Vizag IVF Centre' : 'Medcy Hospitals'} ({hierarchyData.unassigned.length})
              </h4>
            </div>
            <button
              onClick={() => setShowUnassignedDrawer(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
            >
              Close Tray
            </button>
          </div>

          {hierarchyData.unassigned.length === 0 ? (
            <p className="text-xs text-slate-400 italic">All staff members are currently assigned to reporting leads.</p>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {hierarchyData.unassigned.map(emp => (
                <div 
                  key={emp.id} 
                  className="flex items-center gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-lg shrink-0 hover:border-[#8a42db] transition-colors"
                >
                  <Avatar employee={emp} size="sm" />
                  <div className="min-w-0 pr-1">
                    <p className="text-xs font-bold text-slate-800 truncate max-w-[110px]">{emp.name}</p>
                    <p className="text-[9px] text-slate-400 uppercase truncate max-w-[110px]">{emp.designation || 'Staff'}</p>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => setEditingEmployee(emp)}
                      className="px-2 py-1 rounded-md bg-[#8a42db] text-white text-[10px] font-bold hover:bg-[#7a32cb] cursor-pointer"
                    >
                      Assign
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
          className="w-max mx-auto pt-2 pb-8"
        >
          <OrgTree 
            org={selectedOrg} 
            employees={employees} 
            searchQuery={searchQuery}
            isEditMode={isEditMode}
            onEditEmployee={(emp) => setEditingEmployee(emp)}
            onUnassignEmployee={handleQuickUnassign}
          />
        </div>

        {/* Floating Zoom & Canvas Controls */}
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
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#8a42db]/10 hover:bg-[#8a42db]/20 text-[#8a42db] font-bold text-[10px] transition-colors cursor-pointer"
            title="Fit Entire Chart to Screen"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Fit Screen</span>
          </button>

          <button 
            onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
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
          isEditMode={isEditMode}
          onEditEmployee={(emp) => setEditingEmployee(emp)}
          onUnassignEmployee={handleQuickUnassign}
        />
      </div>

      {/* Hierarchy Edit Modal */}
      {editingEmployee && (
        <HierarchyEditModal
          isOpen={!!editingEmployee}
          onClose={() => setEditingEmployee(null)}
          employee={editingEmployee}
          allEmployees={employees}
          currentUser={currentUser}
          onSave={handleSaveHierarchy}
        />
      )}

      {/* Hierarchy Audit Modal */}
      {isAuditModalOpen && (
        <HierarchyAuditModal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
        />
      )}

    </div>
  );
};

export default OrgHierarchyView;
