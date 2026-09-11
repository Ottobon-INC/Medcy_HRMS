import React, { useEffect } from 'react';
import {
 X,
 Home,
 Users,
 Calendar,
 Clock,
 Moon,
 CalendarDays,
 MapPin,
 MessageSquare,
 CheckSquare,
 Settings,
 Radio,
 HeartHandshake,
 Activity,
 Network,
 Camera
} from 'lucide-react';
import { Employee } from '../../types';

interface MobileDrawerNavProps {
 isOpen: boolean;
 onClose: () => void;
 currentUser: Employee;
 activeTab: string;
 onSelectTab: (tab: string) => void;
 onOpenProfile?: () => void;
}

export const MobileDrawerNav: React.FC<MobileDrawerNavProps> = ({
 isOpen,
 onClose,
 currentUser,
 activeTab,
 onSelectTab,
 onOpenProfile
}) => {
 const isExecutive = currentUser.hierarchyLevel === 'executive';
 const isManager = currentUser.hierarchyLevel === 'manager';
 const isSeniorManager = currentUser.hierarchyLevel === 'senior_manager';
 const isTeamLead = currentUser.hierarchyLevel === 'team_lead';
 const isAdmin = currentUser.role === 'admin' || isExecutive || isManager || isSeniorManager || isTeamLead;

 let roleSubtitle = currentUser.designation || 'Staff';
 if (isExecutive) {
  roleSubtitle = 'Executive · Both Branches';
 } else if (isManager) {
  roleSubtitle = 'Operations Manager · Both Branches';
 } else if (currentUser.branch) {
  roleSubtitle = `${currentUser.designation || 'Staff'} · ${currentUser.branch === 'visakhapatnam' ? 'Vizag' : 'Vizianagaram'}`;
 }

 // Prevent background body scroll when drawer is open
 useEffect(() => {
  if (isOpen) {
   document.body.style.overflow = 'hidden';
  } else {
   document.body.style.overflow = '';
  }
  return () => {
   document.body.style.overflow = '';
  };
 }, [isOpen]);

 const handleTabClick = (tab: string) => {
  onSelectTab(tab);
  onClose();
 };

 const getAvatarInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2);
 };

 return (
  <div className="lg:hidden no-print">
   {/* Backdrop */}
   <div
    id="mobile-drawer-backdrop"
    onClick={onClose}
    className={`fixed inset-0 bg-slate-900/50 z-50 transition-opacity duration-300 ${
     isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
    }`}
    aria-hidden="true"
   />

   {/* Slide-over Drawer Panel */}
   <aside
    id="mobile-drawer-panel"
    className={`fixed top-0 left-0 bottom-0 w-[290px] max-w-[85vw] bg-white z-50 shadow-md flex flex-col transition-transform duration-300 ease-in-out transform ${
     isOpen ? 'translate-x-0' : '-translate-x-full'
    }`}
   >
    {/* Drawer Header with Title & Close Button */}
    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
     <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-xl bg-[#8a42db] text-white flex items-center justify-center font-black text-xs shadow-sm">
       VI
      </div>
      <div>
       <h3 className="text-xs font-black text-slate-800 tracking-tight leading-none">Vizag IVF</h3>
       <p className="text-[9px] text-[#8a42db] font-bold uppercase tracking-wider mt-0.5">HRMS Portal</p>
      </div>
     </div>
     <button
      onClick={onClose}
      title="Close navigation menu"
      className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer active:scale-95"
     >
      <X className="w-5 h-5"/>
     </button>
    </div>

    {/* User Profile Card */}
    <div className="p-4 border-b border-slate-100 bg-white">
     <button
      onClick={() => {
       if (onOpenProfile) onOpenProfile();
       onClose();
      }}
      title="Open Profile & Settings"
      className="w-full p-3 bg-slate-50 hover:bg-[#f3edfb]/60 rounded-xl border border-slate-100 hover:border-purple-200 flex items-center justify-between text-left transition-all cursor-pointer group"
     >
      <div className="flex items-center gap-3 min-w-0">
       <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm ${
        isExecutive ? 'bg-amber-100 text-amber-800' : isManager ? 'bg-blue-100 text-blue-800' : 'bg-[#8a42db] text-white'
       }`}>
        {getAvatarInitials(currentUser.name)}
       </div>
       <div className="truncate">
        <h4 className="text-xs font-bold text-slate-800 leading-tight truncate group-hover:text-[#7e3acb] transition-colors">
         {currentUser.name}
        </h4>
        <p className="text-[10px] text-slate-400 font-semibold leading-none mt-1 uppercase tracking-wide">
         {roleSubtitle}
        </p>
       </div>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-wider text-[#8a42db] bg-[#f3edfb] px-2 py-0.5 rounded-md shrink-0">
       Profile
      </span>
     </button>
    </div>

    {/* Navigation Links Scrollable List */}
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
     <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
      {isAdmin ? 'Administration Modules' : 'Employee Dashboards'}
     </p>

     {isAdmin ? (
      /* --- ADMIN NAV BUTTONS --- */
      <>
       {isExecutive && (
        <button
         onClick={() => handleTabClick('executiveOverview')}
         className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
          activeTab === 'executiveOverview'
           ? 'bg-amber-50 text-amber-800 font-bold border border-amber-200'
           : 'text-slate-600 hover:bg-amber-50/50 hover:text-amber-800'
         }`}
        >
         <Activity className={`w-4 h-4 shrink-0 ${activeTab === 'executiveOverview' ? 'text-amber-600' : 'text-slate-400'}`} />
         <span>Executive Overview</span>
        </button>
       )}

       <button
        onClick={() => handleTabClick('adminDashboard')}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
         activeTab === 'adminDashboard'
          ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
       >
        <Home className={`w-4 h-4 shrink-0 ${activeTab === 'adminDashboard' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
        <span>Operations Dashboard</span>
       </button>

       <button
        onClick={() => handleTabClick('orgChart')}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
         activeTab === 'orgChart'
          ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
       >
        <Network className={`w-4 h-4 shrink-0 ${activeTab === 'orgChart' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
        <span>Org Hierarchy</span>
       </button>

       {(!isTeamLead && !isSeniorManager) && (
         <>
           <button
           onClick={() => handleTabClick('directory')}
           className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
             activeTab === 'directory'
             ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
             : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
           }`}
           >
           <Users className={`w-4 h-4 shrink-0 ${activeTab === 'directory' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
           <span>Employee Directory</span>
           </button>

           <button
           onClick={() => handleTabClick('attendanceOverview')}
           className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
             activeTab === 'attendanceOverview'
             ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
             : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
           }`}
           >
           <Calendar className={`w-4 h-4 shrink-0 ${activeTab === 'attendanceOverview' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
           <span>Team Attendance</span>
           </button>
         </>
       )}

       <button
        onClick={() => handleTabClick('leaveApprovals')}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
         activeTab === 'leaveApprovals'
          ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
       >
        <Moon className={`w-4 h-4 shrink-0 ${activeTab === 'leaveApprovals' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
        <span>Leave Approvals</span>
       </button>

       <button
        onClick={() => handleTabClick('doctorPlanner')}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
         activeTab === 'doctorPlanner'
          ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
       >
        <Calendar className={`w-4 h-4 shrink-0 ${activeTab === 'doctorPlanner' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
        <span>Doctor Plans</span>
       </button>

       {isTeamLead && (
         <>
           <button
             onClick={() => handleTabClick('callCapture')}
             className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
               activeTab === 'callCapture'
                 ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
                 : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
             }`}
           >
             <Camera className={`w-4 h-4 shrink-0 ${activeTab === 'callCapture' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
             <span>Visit Log</span>
           </button>
           <button
             onClick={() => handleTabClick('fieldDuty')}
             className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
               activeTab === 'fieldDuty'
                 ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
                 : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
             }`}
           >
             <MapPin className={`w-4 h-4 shrink-0 ${activeTab === 'fieldDuty' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
             <span>Navigation</span>
           </button>
         </>
       )}

       {(!isTeamLead && !isSeniorManager) && (
         <button
         onClick={() => handleTabClick('officeLocations')}
         className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
           activeTab === 'officeLocations'
           ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
           : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
         }`}
         >
         <MapPin className={`w-4 h-4 shrink-0 ${activeTab === 'officeLocations' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
         <span>Office Locations</span>
         </button>
       )}

       {(!isTeamLead && !isSeniorManager) && (
         <button
         onClick={() => handleTabClick('fieldOps')}
         className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
           activeTab === 'fieldOps'
           ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
           : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
         }`}
         >
         <MapPin className={`w-4 h-4 shrink-0 ${activeTab === 'fieldOps' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
         <span>Field Visit Register</span>
         </button>
       )}

       <button
        onClick={() => handleTabClick('adminTasks')}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
         activeTab === 'adminTasks'
          ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
       >
        <CheckSquare className={`w-4 h-4 shrink-0 ${activeTab === 'adminTasks' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
        <span>Work Assignment</span>
       </button>

       <button
        onClick={() => handleTabClick('messages')}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
         activeTab === 'messages'
          ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
       >
        <MessageSquare className={`w-4 h-4 shrink-0 ${activeTab === 'messages' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
        <span>Messages</span>
       </button>

       {(!isTeamLead && !isSeniorManager) && (
         <button
         onClick={() => handleTabClick('adminSettings')}
         className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
           activeTab === 'adminSettings'
           ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
           : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
         }`}
         >
         <Settings className={`w-4 h-4 shrink-0 ${activeTab === 'adminSettings' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
         <span>Admin Settings</span>
         </button>
       )}
      </>
     ) : (
      /* --- EMPLOYEE NAV BUTTONS --- */
      <>
       <button
        onClick={() => handleTabClick('dashboard')}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
         activeTab === 'dashboard'
          ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
       >
        <Home className={`w-4 h-4 shrink-0 ${activeTab === 'dashboard' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
        <span>Home Dashboard</span>
       </button>

       <button
        onClick={() => handleTabClick('fieldDuty')}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
         activeTab === 'fieldDuty'
          ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
       >
        <MapPin className={`w-4 h-4 shrink-0 ${activeTab === 'fieldDuty' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
        <span>Field Navigation</span>
       </button>

       <button
        onClick={() => handleTabClick('callCapture')}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
         activeTab === 'callCapture'
          ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
       >
        <Camera className={`w-4 h-4 shrink-0 ${activeTab === 'callCapture' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
        <span>Visit Log</span>
       </button>

       <button
        onClick={() => handleTabClick('doctorPlanner')}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
         activeTab === 'doctorPlanner'
          ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
       >
        <Calendar className={`w-4 h-4 shrink-0 ${activeTab === 'doctorPlanner' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
        <span>Visit Planner</span>
       </button>

       <button
        onClick={() => handleTabClick('attendance')}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
         activeTab === 'attendance'
          ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
       >
        <Calendar className={`w-4 h-4 shrink-0 ${activeTab === 'attendance' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
        <span>My Attendance</span>
       </button>

       <button
        onClick={() => handleTabClick('leave')}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
         activeTab === 'leave'
          ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
       >
        <Moon className={`w-4 h-4 shrink-0 ${activeTab === 'leave' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
        <span>Leave Requests</span>
       </button>

       <button
        onClick={() => handleTabClick('tasks')}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
         activeTab === 'tasks'
          ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
       >
        <CheckSquare className={`w-4 h-4 shrink-0 ${activeTab === 'tasks' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
        <span>Work Assignment</span>
       </button>

       <button
        onClick={() => handleTabClick('messages')}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
         activeTab === 'messages'
          ? 'bg-[#f3edfb] text-[#7e3acb] font-bold border border-teal-100'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
       >
        <MessageSquare className={`w-4 h-4 shrink-0 ${activeTab === 'messages' ? 'text-[#8a42db]' : 'text-slate-400'}`} />
        <span>Messages</span>
       </button>
      </>
     )}
    </div>

    {/* Drawer Footer */}
    <div className="p-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium text-center bg-slate-50/50">
     <HeartHandshake className="w-3.5 h-3.5 text-emerald-500 mx-auto mb-1 inline-block mr-1"/>
     Medcy HRMS Platform
    </div>
   </aside>
  </div>
 );
};

export default MobileDrawerNav;
