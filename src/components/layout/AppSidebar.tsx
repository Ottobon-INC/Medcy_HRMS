import React from 'react';
import {
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

interface AppSidebarProps {
  currentUser: Employee;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenProfile?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  onOpenProfile
}) => {
  const getAvatarInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };

  const isExecutive = currentUser.hierarchyLevel === 'executive';
  const isManager = currentUser.hierarchyLevel === 'manager';
  const isAdmin = currentUser.role === 'admin' || isExecutive || isManager;

  let roleSubtitle = currentUser.designation || 'Staff';
  if (isExecutive) {
    roleSubtitle = 'Executive · Both Branches';
  } else if (isManager) {
    roleSubtitle = 'Operations Manager · Both Branches';
  } else if (currentUser.branch) {
    roleSubtitle = `${currentUser.designation || 'Staff'} · ${currentUser.branch === 'visakhapatnam' ? 'Vizag' : 'Vizianagaram'}`;
  }

  return (
    <aside id="desktop-sidebar" className="lg:col-span-3 space-y-2 hidden lg:block no-print">
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm sticky top-24">
        
        {/* Quick Profile Segment */}
        <button
          onClick={onOpenProfile}
          title="Click to view profile & change password"
          className="w-full p-3 mb-4 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 hover:border-slate-200/80 flex items-center justify-between text-left transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors shrink-0 ${
              isExecutive ? 'bg-amber-100 text-amber-800' : isManager ? 'bg-blue-100 text-blue-800' : 'bg-teal-50 group-hover:bg-teal-100 text-teal-700'
            }`}>
              {getAvatarInitials(currentUser.name)}
            </div>
            <div className="truncate">
              <h4 className="text-xs font-bold text-slate-800 leading-tight truncate group-hover:text-teal-700 transition-colors">{currentUser.name}</h4>
              <p className="text-[10px] text-slate-400 font-semibold leading-none mt-1.5 uppercase tracking-wide">
                {roleSubtitle}
              </p>
            </div>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            Edit
          </span>
        </button>

        <nav className="space-y-1">
          {isAdmin ? (
            /* --- ADMIN / EXECUTIVE / MANAGER NAV ITEMS --- */
            <>
              {isExecutive && (
                <button
                  id="nav-tab-executive-overview"
                  onClick={() => onSelectTab('executiveOverview')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                    activeTab === 'executiveOverview'
                      ? 'bg-amber-50 text-amber-800 font-bold border border-amber-200/60'
                      : 'text-slate-600 hover:bg-amber-50/50 hover:text-amber-800'
                  }`}
                >
                  {activeTab === 'executiveOverview' ? (
                    <span className="w-1.5 h-1.5 bg-amber-600 rounded-full shrink-0" />
                  ) : (
                    <Activity className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span>Executive Overview</span>
                </button>
              )}

              <button
                id="nav-tab-admin-dashboard"
                onClick={() => onSelectTab('adminDashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'adminDashboard'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'adminDashboard' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <Home className="w-4 h-4 shrink-0" />
                )}
                <span>Operations Dashboard</span>
              </button>

              <button
                id="nav-tab-org-chart"
                onClick={() => onSelectTab('orgChart')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'orgChart'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'orgChart' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <Network className="w-4 h-4 shrink-0" />
                )}
                <span>Org Hierarchy</span>
              </button>

              <button
                id="nav-tab-directory"
                onClick={() => onSelectTab('directory')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'directory'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'directory' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <Users className="w-4 h-4 shrink-0" />
                )}
                <span>Employee Directory</span>
              </button>

              <button
                id="nav-tab-attendance-overview"
                onClick={() => onSelectTab('attendanceOverview')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'attendanceOverview'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'attendanceOverview' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <Calendar className="w-4 h-4 shrink-0" />
                )}
                <span>Team Attendance</span>
              </button>

              <button
                id="nav-tab-admin-missed-punches"
                onClick={() => onSelectTab('adminMissedPunches')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'adminMissedPunches'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'adminMissedPunches' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 shrink-0" />
                )}
                <span>Missed Punches</span>
              </button>

              <button
                id="nav-tab-leave-approvals"
                onClick={() => onSelectTab('leaveApprovals')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'leaveApprovals'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'leaveApprovals' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <Moon className="w-4 h-4 shrink-0" />
                )}
                <span>Leave Approvals</span>
              </button>

              <button
                id="nav-tab-duty-roster"
                onClick={() => onSelectTab('dutyRoster')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'dutyRoster'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'dutyRoster' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <CalendarDays className="w-4 h-4 shrink-0" />
                )}
                <span>Duty Roster</span>
              </button>

              <button
                id="nav-tab-office-locations"
                onClick={() => onSelectTab('officeLocations')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'officeLocations'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'officeLocations' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <MapPin className="w-4 h-4 shrink-0" />
                )}
                <span>Office Locations</span>
              </button>

              <button
                id="nav-tab-messages"
                onClick={() => onSelectTab('messages')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'messages'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'messages' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <MessageSquare className="w-4 h-4 shrink-0" />
                )}
                <span>Messages</span>
              </button>

              <button
                id="nav-tab-field-ops"
                onClick={() => onSelectTab('fieldOps')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'fieldOps'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'fieldOps' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <MapPin className="w-4 h-4 shrink-0" />
                )}
                <span>Field Visit Register</span>
              </button>

              <button
                id="nav-tab-admin-live-map"
                onClick={() => onSelectTab('adminLiveMap')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'adminLiveMap'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'adminLiveMap' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <Radio className="w-4 h-4 shrink-0" />
                )}
                <span>Staff Live Map</span>
              </button>

              <button
                id="nav-tab-admin-tasks"
                onClick={() => onSelectTab('adminTasks')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'adminTasks'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'adminTasks' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <CheckSquare className="w-4 h-4 shrink-0" />
                )}
                <span>Work Assignment</span>
              </button>

              <button
                id="nav-tab-admin-settings"
                onClick={() => onSelectTab('adminSettings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'adminSettings'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'adminSettings' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <Settings className="w-4 h-4 shrink-0" />
                )}
                <span>Settings</span>
              </button>
            </>
          ) : (
            /* --- EMPLOYEE NAV ITEMS --- */
            <>
              <button
                id="nav-tab-dashboard"
                onClick={() => onSelectTab('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'dashboard' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <Home className="w-4 h-4 shrink-0" />
                )}
                <span>Home Dashboard</span>
              </button>

              <button
                id="nav-tab-field-duty"
                onClick={() => onSelectTab('fieldDuty')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'fieldDuty'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'fieldDuty' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <MapPin className="w-4 h-4 shrink-0" />
                )}
                <span>Field Navigation</span>
              </button>

              <button
                id="nav-tab-call-capture"
                onClick={() => onSelectTab('callCapture')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'callCapture'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'callCapture' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <Camera className="w-4 h-4 shrink-0" />
                )}
                <span>Visit Log</span>
              </button>

              <button
                id="nav-tab-live-map"
                onClick={() => onSelectTab('liveMap')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'liveMap'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'liveMap' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <Radio className="w-4 h-4 shrink-0" />
                )}
                <span>Live Map</span>
              </button>

              <button
                id="nav-tab-attendance"
                onClick={() => onSelectTab('attendance')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'attendance'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'attendance' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <Calendar className="w-4 h-4 shrink-0" />
                )}
                <span>My Attendance</span>
              </button>

              <button
                id="nav-tab-employee-missed-punches"
                onClick={() => onSelectTab('employeeMissedPunches')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'employeeMissedPunches'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'employeeMissedPunches' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 shrink-0" />
                )}
                <span>Missed Punches</span>
              </button>

              <button
                id="nav-tab-leave"
                onClick={() => onSelectTab('leave')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'leave'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'leave' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <Moon className="w-4 h-4 shrink-0" />
                )}
                <span>Leave Requests</span>
              </button>

              <button
                id="nav-tab-my-roster"
                onClick={() => onSelectTab('myRoster')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'myRoster'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'myRoster' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <CalendarDays className="w-4 h-4 shrink-0" />
                )}
                <span>Duty Roster</span>
              </button>

              <button
                id="nav-tab-tasks"
                onClick={() => onSelectTab('tasks')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'tasks'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'tasks' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <CheckSquare className="w-4 h-4 shrink-0" />
                )}
                <span>Work Assignment</span>
              </button>

              <button
                id="nav-tab-messages"
                onClick={() => onSelectTab('messages')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all uppercase cursor-pointer ${
                  activeTab === 'messages'
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {activeTab === 'messages' ? (
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
                ) : (
                  <MessageSquare className="w-4 h-4 shrink-0" />
                )}
                <span>Messages</span>
              </button>
            </>
          )}
        </nav>

        {/* Corporate Branding Disclaimer */}
        <div className="mt-8 pt-4 border-t border-slate-50 text-[10px] text-slate-400 font-medium text-center leading-relaxed">
          <HeartHandshake className="w-4 h-4 text-emerald-500 mx-auto mb-1.5" />
          Medcy Health Tech HRMS Platform.
        </div>

      </div>
    </aside>
  );
};

export default AppSidebar;
