import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Search, 
  Phone, 
  Mail,
  MoreHorizontal
} from 'lucide-react';
import { Employee, Language, Branch } from '../types';

interface OrgHierarchyViewProps {
  language: Language;
  employees: Employee[];
  currentUser: Employee;
}

const OrgCard: React.FC<{ employee: Employee, subtitle: string }> = ({ employee, subtitle }) => {
  const name = employee?.name || 'Unknown';
  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  const isGhost = employee?.status === 'pending';
  
  return (
    <div className={`relative bg-white border border-slate-200 rounded-xl shadow-sm w-52 text-left mt-6 hover:shadow-md transition-shadow ${isGhost ? 'opacity-60 border-dashed border-slate-300 bg-slate-50' : ''}`}>
      {/* Absolute Avatar Overlap */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ring-[3px] ring-white shadow-sm overflow-hidden ${isGhost ? 'bg-slate-300 text-slate-500' : 'bg-slate-800 text-white'}`}>
           {(employee as any).photo && !isGhost ? (
             <img src={(employee as any).photo} alt={employee.name} className="w-full h-full object-cover grayscale-0" />
           ) : (
             initials
           )}
        </div>
      </div>

      {/* Options Icon */}
      {!isGhost && (
        <button className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 cursor-pointer">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      )}

      {/* Content */}
      <div className="pt-8 pb-4 px-4 text-center">
        <h3 className={`text-sm font-bold truncate ${isGhost ? 'text-slate-500' : 'text-slate-800'}`}>
          {name}
        </h3>
        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{subtitle}</p>
        
        {isGhost && (
          <div className="mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-200/50 rounded-full py-0.5 px-2 inline-block">
            Pending Setup
          </div>
        )}
      </div>
    </div>
  );
};

// Reusable Arrow Component
const DownArrow = () => (
  <div className="flex flex-col items-center my-2">
    <div className="w-px h-8 bg-slate-300"></div>
    <div className="w-2 h-2 border-r-2 border-b-2 border-slate-300 transform rotate-45 -mt-1.5"></div>
  </div>
);

export const OrgHierarchyView: React.FC<OrgHierarchyViewProps> = ({
  employees,
}) => {
  const [branchFilter, setBranchFilter] = useState<Branch | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dual Hospital Processing
  // 1. Master Executives (Above everything)
  const executives = employees.filter(e => e.hierarchyLevel === 'executive');

  // 2. Medcy Swimlane
  const medcyStaff = employees.filter(e => e.hospital === 'medcy_hospitals' || e.hospital === 'both');
  const medcySeniorManagers = medcyStaff.filter(e => e.hierarchyLevel === 'senior_manager');
  const medcyTeamLeads = medcyStaff.filter(e => e.hierarchyLevel === 'team_lead');
  
  // Base Medcy Employees grouped by Team Lead
  const medcyBaseEmployees = medcyStaff.filter(e => e.hierarchyLevel === 'employee');

  // 3. Vizag IVF Swimlane
  const vizagStaff = employees.filter(e => e.hospital === 'vizag_ivf' || e.hospital === 'both');
  const vizagManagers = vizagStaff.filter(e => e.hierarchyLevel === 'manager');
  const vizagBaseEmployees = vizagStaff.filter(e => e.hierarchyLevel === 'employee');

  // Filter wrapper
  const applyFilters = (emps: Employee[]) => {
    return emps.filter(e => {
      const empBranch = e.branch || 'visakhapatnam';
      const matchesBranch = branchFilter === 'all' || empBranch === branchFilter;
      const search = searchQuery.toLowerCase();
      const matchesSearch = (e.name || '').toLowerCase().includes(search) || 
                            (e.designation || '').toLowerCase().includes(search) ||
                            (e.id || '').toLowerCase().includes(search);
      return matchesBranch && matchesSearch;
    });
  };

  const filteredVizagBase = applyFilters(vizagBaseEmployees);
  const filteredMedcyBase = applyFilters(medcyBaseEmployees);

  // Group Medcy base employees by reportingTo
  const medcyGroupsByLead: Record<string, Employee[]> = {};
  medcyTeamLeads.forEach(lead => medcyGroupsByLead[lead.id] = []);
  filteredMedcyBase.forEach(emp => {
    if (emp.reportingTo && medcyGroupsByLead[emp.reportingTo]) {
      medcyGroupsByLead[emp.reportingTo].push(emp);
    } else {
       // fallback if no reportingTo is set but they are medcy employees
       if(!medcyGroupsByLead['unassigned']) medcyGroupsByLead['unassigned'] = [];
       medcyGroupsByLead['unassigned'].push(emp);
    }
  });

  // Order of team leads: Rambabu, Satish, Prudhvi
  const leadOrder = ['EMP-2026-004', 'EMP-MEDCY-002', 'EMP-MEDCY-005'];
  const sortedMedcyTeamLeads = [...medcyTeamLeads].sort((a, b) => {
    const idxA = leadOrder.indexOf(a.id);
    const idxB = leadOrder.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  // Order of team members inside teams
  const memberOrder = [
    'EMP-2026-005', 'EMP-2026-006', // Rambabu: Manoj, AppalNaidu
    'EMP-2026-002', 'EMP-MEDCY-003', 'EMP-2026-007', 'EMP-MEDCY-004', // Satish: Rajesh, Santosh, Hari-Krishna, Uday Kumar
    'EMP-2026-003', 'EMP-2026-001' // Prudhvi: Mahesh babu, Karan kumar
  ];
  Object.keys(medcyGroupsByLead).forEach(leadId => {
    medcyGroupsByLead[leadId].sort((a, b) => {
      const idxA = memberOrder.indexOf(a.id);
      const idxB = memberOrder.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  });


  return (
    <div className="space-y-8 animate-fadeIn pb-16 h-full flex flex-col">
      {/* Header aligned left, clean */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="w-6 h-1 bg-[#8a42db] rounded-full"></div>
             <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Unified Org Chart</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800">Hospital Hierarchy</h1>
          <p className="text-xs text-slate-500 mt-1">{employees.length} Total Staff across Entities</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#8a42db]/20 w-48 shadow-sm"
            />
          </div>
          <div className="flex bg-white rounded-full p-1 border border-slate-100 shadow-sm">
            <button 
              onClick={() => setBranchFilter('all')}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${branchFilter === 'all' ? 'bg-[#f3edfb] text-[#8a42db]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              All Branches
            </button>
            <button 
              onClick={() => setBranchFilter('visakhapatnam')}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${branchFilter === 'visakhapatnam' ? 'bg-[#f3edfb] text-[#8a42db]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Visakhapatnam
            </button>
            <button 
              onClick={() => setBranchFilter('vizianagaram')}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${branchFilter === 'vizianagaram' ? 'bg-[#f3edfb] text-[#8a42db]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Vizianagaram
            </button>
          </div>
        </div>
      </div>

      {/* Tree Visualization (Flexbox implementation) */}
      <div className="flex-1 bg-slate-50/50 rounded-3xl border border-slate-100 shadow-inner p-4 md:p-8 overflow-auto custom-scrollbar relative flex justify-center">
        
        <div className="flex flex-col items-center w-full max-w-[1400px]">
          
          {/* Level 0: Board of Directors (Master Control) */}
          {executives.length > 0 && (
            <div className="flex flex-wrap justify-center gap-6 mb-8 relative z-10">
              {executives.map(exec => (
                <OrgCard key={exec.id} employee={exec} subtitle="Board of Directors" />
              ))}
            </div>
          )}

          {/* Connect 0 to swimlanes */}
          {executives.length > 0 && (
             <div className="w-full flex justify-center relative h-12">
               <div className="w-px h-6 bg-slate-300 absolute top-0"></div>
               <div className="w-1/2 md:w-3/4 h-px bg-slate-300 absolute top-6 border-t border-slate-300"></div>
               <div className="w-px h-6 bg-slate-300 absolute top-6 left-1/4 md:left-[12.5%]"></div>
               <div className="w-px h-6 bg-slate-300 absolute top-6 right-1/4 md:right-[12.5%]"></div>
             </div>
          )}

          {/* Dual Swimlane Container */}
          <div className="flex flex-col xl:flex-row w-full gap-8 xl:gap-4 items-start">
            
            {/* Vizag IVF Swimlane */}
            <div className="flex-1 w-full bg-white rounded-2xl border border-blue-100 p-6 shadow-sm relative pt-12">
               <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-50 px-4 py-1 rounded-full border border-blue-200 text-blue-700 font-black text-[10px] tracking-widest uppercase">
                 Vizag IVF Group
               </div>

               <div className="flex flex-col items-center w-full mt-4">
                 {vizagManagers.length > 0 && (
                    <div className="flex justify-center mb-4">
                      {vizagManagers.map(mgr => (
                        <OrgCard key={mgr.id} employee={mgr} subtitle={branchFilter === 'all' ? 'Branch Operations Manager' : `${branchFilter} Lead`} />
                      ))}
                    </div>
                 )}

                 {vizagManagers.length > 0 && filteredVizagBase.length > 0 && <DownArrow />}

                 {filteredVizagBase.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-4 max-w-2xl mx-auto">
                      {filteredVizagBase.map(emp => (
                        <OrgCard key={emp.id} employee={emp} subtitle={emp.designation} />
                      ))}
                    </div>
                 )}
               </div>
            </div>

            {/* Medcy Hospitals Swimlane */}
            <div className="flex-1 w-full bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm relative pt-12">
               <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-50 px-4 py-1 rounded-full border border-emerald-200 text-emerald-700 font-black text-[10px] tracking-widest uppercase flex items-center gap-2">
                 <img src="/medcy-Logo.jpeg" alt="Medcy" className="h-4 w-auto mix-blend-multiply" />
                 Medcy Hospitals
               </div>

               <div className="flex flex-col items-center w-full mt-4">
                 {/* Medcy Level 1: Senior Manager */}
                 {medcySeniorManagers.length > 0 && (
                    <div className="flex justify-center mb-4">
                      {medcySeniorManagers.map(mgr => (
                        <OrgCard key={mgr.id} employee={mgr} subtitle="Senior Operations Manager" />
                      ))}
                    </div>
                 )}

                 {/* Connect Level 1 to Level 2 (Team Leads) */}
                 {medcySeniorManagers.length > 0 && medcyTeamLeads.length > 0 && (
                    <div className="w-full flex justify-center relative h-12">
                      <div className="w-px h-6 bg-slate-300 absolute top-0"></div>
                      <div className="w-3/4 h-px bg-slate-300 absolute top-6 border-t border-slate-300"></div>
                      <div className="w-px h-6 bg-slate-300 absolute top-6 left-[12.5%]"></div>
                      <div className="w-px h-6 bg-slate-300 absolute top-6 left-1/2 -translate-x-1/2"></div>
                      <div className="w-px h-6 bg-slate-300 absolute top-6 right-[12.5%]"></div>
                    </div>
                 )}

                 {/* Medcy Level 2 & 3: Team Leads and their Teams */}
                 {sortedMedcyTeamLeads.length > 0 && (
                    <div className="flex flex-wrap md:flex-nowrap justify-center gap-4 w-full">
                      {sortedMedcyTeamLeads.map(lead => (
                         <div key={lead.id} className="flex flex-col items-center flex-1 min-w-[220px]">
                           <OrgCard employee={lead} subtitle="Team Lead" />
                           
                           {medcyGroupsByLead[lead.id] && medcyGroupsByLead[lead.id].length > 0 && (
                             <>
                               <DownArrow />
                               <div className="flex flex-col gap-2 w-full items-center">
                                 {medcyGroupsByLead[lead.id].map(emp => (
                                   <OrgCard key={emp.id} employee={emp} subtitle={emp.designation} />
                                 ))}
                               </div>
                             </>
                           )}
                         </div>
                      ))}
                    </div>
                 )}

                 {/* Unassigned Medcy Employees (Edge Case) */}
                 {medcyGroupsByLead['unassigned'] && medcyGroupsByLead['unassigned'].length > 0 && (
                   <div className="mt-8 pt-8 border-t border-slate-100 w-full flex flex-col items-center opacity-70">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Direct Reports (No Team)</span>
                     <div className="flex flex-wrap justify-center gap-4">
                       {medcyGroupsByLead['unassigned'].map(emp => (
                         <OrgCard key={emp.id} employee={emp} subtitle={emp.designation} />
                       ))}
                     </div>
                   </div>
                 )}

               </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default OrgHierarchyView;
