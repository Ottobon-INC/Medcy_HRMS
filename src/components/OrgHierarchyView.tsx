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
  
  return (
    <div className="relative bg-white border border-slate-200 rounded-xl shadow-sm w-52 text-left mt-6 hover:shadow-md transition-shadow">
      {/* Absolute Avatar Overlap */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2">
        <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs ring-[3px] ring-white shadow-sm overflow-hidden">
           {(employee as any).photo ? (
             <img src={(employee as any).photo} alt={employee.name} className="w-full h-full object-cover" />
           ) : (
             initials
           )}
        </div>
      </div>

      {/* Options Icon */}
      <button className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 cursor-pointer">
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {/* Content */}
      <div className="pt-8 pb-4 px-4 text-center">
        <h3 className="text-sm font-bold text-slate-800 truncate">{name}</h3>
        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{subtitle}</p>
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

  // 1. Executives
  const executives = employees.filter(e => {
    const name = e?.name || '';
    return e?.hierarchyLevel === 'executive' || 
           name.toLowerCase().includes('indra') || 
           name.toLowerCase().includes('anoopama');
  });

  // 2. Managers
  const managers = employees.filter(e => {
    const name = e?.name || '';
    const isMgr = (e?.hierarchyLevel === 'manager' || e?.id === 'EMP-2026-011' || name.toLowerCase().includes('ravi kumar')) &&
                  !executives.some(ex => ex.id === e.id);
    return isMgr;
  });

  // 3. Base Employees
  const baseEmployees = employees.filter(e => 
    !executives.some(ex => ex.id === e.id) &&
    !managers.some(mg => mg.id === e.id)
  );

  const filteredBase = baseEmployees.filter(e => {
    const empBranch = e.branch || 'visakhapatnam';
    const matchesBranch = branchFilter === 'all' || empBranch === branchFilter;
    const name = e?.name || '';
    const designation = e?.designation || '';
    const id = e?.id || '';
    const search = searchQuery.toLowerCase();
    const matchesSearch = name.toLowerCase().includes(search) || 
                          designation.toLowerCase().includes(search) ||
                          id.toLowerCase().includes(search);
    return matchesBranch && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-fadeIn pb-16 h-full flex flex-col">
      {/* Header aligned left, clean */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="w-6 h-1 bg-[#8a42db] rounded-full"></div>
             <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Org chart</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800">Medcy Hospitals</h1>
          <p className="text-xs text-slate-500 mt-1">{employees.length} Total Staff</p>
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
      <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm p-8 overflow-auto custom-scrollbar relative flex justify-center pt-16">
        
        <div className="flex flex-col items-center w-full max-w-5xl">
          
          {/* Level 1: Board of Directors */}
          {executives.length > 0 && (
            <div className="flex flex-wrap justify-center gap-6">
              {executives.map(exec => (
                <OrgCard key={exec.id} employee={exec} subtitle="Board of Directors" />
              ))}
            </div>
          )}

          {/* Connect 1 to 2 */}
          {executives.length > 0 && managers.length > 0 && <DownArrow />}

          {/* Level 2: Managers */}
          {managers.length > 0 && (
            <div className="flex flex-wrap justify-center gap-6">
              {managers.map(mgr => (
                <OrgCard key={mgr.id} employee={mgr} subtitle={branchFilter === 'all' ? 'Branch Operations Manager' : `${branchFilter} Lead`} />
              ))}
            </div>
          )}

          {/* Connect 2 to 3 */}
          {(executives.length > 0 || managers.length > 0) && filteredBase.length > 0 && <DownArrow />}

          {/* Level 3: Workforce Grid */}
          {filteredBase.length > 0 && (
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-4">
              {filteredBase.map(emp => (
                <OrgCard key={emp.id} employee={emp} subtitle={emp.designation} />
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default OrgHierarchyView;
