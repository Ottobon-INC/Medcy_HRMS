import React, { useState, useEffect } from 'react';
import { Language } from './types';
import { translations } from './core/translations';

// Custom State Hooks
import { useEmployees } from './hooks/useEmployees';
import { useAuth } from './hooks/useAuth';
import { useLeaves } from './hooks/useLeaves';
import { useAttendance } from './hooks/useAttendance';
import { usePayroll } from './hooks/usePayroll';
import { useAdvances } from './hooks/useAdvances';
import { useLocationPins } from './hooks/useLocationPins';
import { useTaskModule } from './hooks/useTaskModule';

// Shared Modal and Auth Components
import LoginScreen from './components/LoginScreen';
import UserProfileModal from './components/UserProfileModal';

// Layout Components
import { AppHeader } from './components/layout/AppHeader';
import { AppSidebar } from './components/layout/AppSidebar';
import { AppMobileNav } from './components/layout/AppMobileNav';
import { AppRouter } from './components/layout/AppRouter';
import { PwaInstallPrompt } from './components/shared/PwaInstallPrompt';
import { OfflineIndicator } from './components/shared/OfflineIndicator';
import { LiveTrackingProvider } from './contexts/LiveTrackingContext';

export default function App() {
  // Pure English for VizagIVF HRMS
  const language: Language = 'en';
  const t = translations[language];

  // --- Dynamic Tab Navigation State & Routing ---
  const [activeTab, setActiveTab] = useState<string>(() => {
    const path = window.location.pathname.substring(1);
    const pathToTab: Record<string, string> = {
      'dashboard': 'dashboard',
      'attendance': 'attendance',
      'leave': 'leave',
      'advance': 'advance',
      'payroll': 'payroll',
      'admin-dashboard': 'adminDashboard',
      'directory': 'directory',
      'attendance-overview': 'attendanceOverview',
      'leave-approvals': 'leaveApprovals',
      'advance-approvals': 'advanceApprovals',
      'run-payroll': 'adminPayroll',
      'office-locations': 'officeLocations',
      'special-events': 'specialEvents',
      'messages': 'messages',
      'admin-settings': 'adminSettings',
      'missed-punches-admin': 'adminMissedPunches',
      'missed-punches': 'employeeMissedPunches',
      'field-duty': 'fieldDuty',
      'field-ops': 'fieldOps',
      'tasks': 'tasks',
      'admin-tasks': 'adminTasks'
    };
    
    if (pathToTab[path]) return pathToTab[path];
    return localStorage.getItem('medcy_active_tab') || 'dashboard';
  });
  
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Sync activeTab to LocalStorage and URL
  useEffect(() => {
    localStorage.setItem('medcy_active_tab', activeTab);
    
    const tabToPath: Record<string, string> = {
      'dashboard': 'dashboard',
      'attendance': 'attendance',
      'leave': 'leave',
      'advance': 'advance',
      'payroll': 'payroll',
      'adminDashboard': 'admin-dashboard',
      'directory': 'directory',
      'attendanceOverview': 'attendance-overview',
      'leaveApprovals': 'leave-approvals',
      'advanceApprovals': 'advance-approvals',
      'adminPayroll': 'run-payroll',
      'officeLocations': 'office-locations',
      'specialEvents': 'special-events',
      'messages': 'messages',
      'adminSettings': 'admin-settings',
      'adminMissedPunches': 'missed-punches-admin',
      'employeeMissedPunches': 'missed-punches',
      'fieldDuty': 'field-duty',
      'fieldOps': 'field-ops',
      'tasks': 'tasks',
      'adminTasks': 'admin-tasks'
    };
    
    const newPath = '/' + (tabToPath[activeTab] || activeTab);
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  }, [activeTab]);

  // Handle Browser Back/Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.substring(1);
      const pathToTab: Record<string, string> = {
        'dashboard': 'dashboard',
        'attendance': 'attendance',
        'leave': 'leave',
        'payroll': 'payroll',
        'admin-dashboard': 'adminDashboard',
        'directory': 'directory',
        'team-attendance': 'attendanceOverview',
        'leave-approvals': 'leaveApprovals',
        'run-payroll': 'adminPayroll',
        'office-locations': 'officeLocations',
        'special-events': 'specialEvents',
        'messages': 'messages',
        'admin-settings': 'adminSettings',
        'missed-punches-admin': 'adminMissedPunches',
        'missed-punches': 'employeeMissedPunches',
        'field-duty': 'fieldDuty',
        'field-ops': 'fieldOps',
        'tasks': 'tasks',
        'admin-tasks': 'adminTasks'
      };
      
      if (pathToTab[path]) {
        setActiveTab(pathToTab[path]);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // --- Domain Hooks ---
  const { employees, isLoading, error, isLocalMode, loadData, addEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const { currentUser, currentUserId, login, logout } = useAuth(employees);
  
  const { applyLeave, approveLeave, rejectLeave, updateBalances } = useLeaves(isLocalMode, loadData);
  const { toggleCheckIn, updateAttendance, forceCloseSession } = useAttendance(isLocalMode, loadData);
  const { runBulkPayroll, updatePayslip, generateSinglePayslip } = usePayroll(isLocalMode, loadData);
  const { submitAdvance, approveAdvance, rejectAdvance } = useAdvances(isLocalMode, loadData);
  const { addPin } = useLocationPins(currentUser?.id, isLocalMode);
  const { tasks, createTask, updateTask, updateTaskStatus, deleteTask } = useTaskModule(employees);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Auto Route On Role Change ---
  useEffect(() => {
    if (!currentUser) return;
    
    const adminTabs = [
      'adminDashboard', 'directory', 'attendanceOverview', 'leaveApprovals',
      'advanceApprovals', 'adminPayroll', 'officeLocations', 'specialEvents',
      'messages', 'adminSettings', 'dutyRoster', 'adminMissedPunches', 'fieldOps', 'adminTasks'
    ];
    const employeeTabs = [
      'dashboard', 'attendance', 'leave', 'advance', 'payroll',
      'events', 'messages', 'myRoster', 'employeeMissedPunches', 'fieldDuty', 'tasks'
    ];

    if (currentUser.role === 'admin' && !adminTabs.includes(activeTab)) {
      setActiveTab('adminDashboard');
    } else if (currentUser.role === 'employee' && !employeeTabs.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [currentUserId, currentUser, activeTab]);

  const handleLogout = () => {
    logout();
    localStorage.removeItem('medcy_active_tab');
  };

  // Center spinner for initial database loading
  if (isLoading && employees.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading...</p>
      </div>
    );
  }

  // Database Connection Fallback Screen
  if (error && employees.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 p-8 sm:p-10 shadow-xl space-y-6">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 border border-rose-100 rounded-full flex items-center justify-center mx-auto text-2xl font-black">
            !
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-black text-slate-800 tracking-tight">Supabase Connection Required</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              We couldn't connect or fetch tables. Ensure your Supabase project is active and schemas have been executed.
            </p>
          </div>
          
          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl text-left space-y-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-teal-600">Quick Setup:</span>
            <ol className="text-[10px] text-slate-500 space-y-1 list-decimal list-inside leading-normal font-medium">
              <li>Open your Supabase SQL Editor</li>
              <li>Run the schema script from <code className="font-mono bg-slate-200/60 px-1 rounded text-slate-700">database/06_all_tables_complete.sql</code></li>
              <li>Verify environment variables in <code className="font-mono bg-slate-200/60 px-1 rounded text-slate-700">.env</code></li>
            </ol>
          </div>

          <div className="pt-2">
            <button 
              onClick={loadData} 
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 active:scale-98 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-teal-600/10 cursor-pointer transition-all"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is not logged in, render Login Screen
  if (!currentUserId || !currentUser) {
    return (
      <>
        <OfflineIndicator />
        <PwaInstallPrompt />
        <LoginScreen
          employees={employees}
          onLoginSuccess={(emp) => {
            login(emp.id);
            if (emp.role === 'admin') {
              setActiveTab('adminDashboard');
            } else {
              setActiveTab('dashboard');
            }
          }}
        />
      </>
    );
  }

  return (
    <LiveTrackingProvider currentUser={currentUser}>
      <div id="app-root-shell" className="min-h-screen bg-[#f8fafc] flex flex-col font-sans antialiased text-slate-900 pb-16 lg:pb-0">
        <OfflineIndicator />
        <PwaInstallPrompt />
        
        {/* 1. Header Navigation Bar */}
        <AppHeader
          currentUser={currentUser}
          onOpenProfile={() => setShowProfileModal(true)}
          onLogout={handleLogout}
          onLogoClick={() => setActiveTab(currentUser.role === 'admin' ? 'adminDashboard' : 'dashboard')}
        />

        {/* User Profile View / Edit Modal */}
        {showProfileModal && (
          <UserProfileModal
            language={language}
            currentUser={currentUser}
            onClose={() => setShowProfileModal(false)}
            onUpdatePassword={async (newPassword) => {
              await updateEmployee(currentUser.id, { password: newPassword });
            }}
          />
        )}

        {/* 2. Body Grid / Sidebar Layout */}
        <div id="portal-body-wrapper" className="flex-1 w-full mx-auto px-4 sm:px-6 py-6 md:py-8 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 print:p-0 print:m-0">
          
          {/* Desktop Sidebar Navigation */}
          <AppSidebar
            currentUser={currentUser}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
          />

          {/* Primary Content Router */}
          <main id="portal-primary-content" className="lg:col-span-9 print:col-span-12">
            <React.Suspense fallback={
              <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Module...</p>
              </div>
            }>
              <AppRouter
                activeTab={activeTab}
                language={language}
                currentUser={currentUser}
                employees={employees}
                isLocalMode={isLocalMode}
                tasks={tasks}
                noDataText={t.noData}
                setActiveTab={setActiveTab}
                onToggleCheckIn={(userId, isCheckedIn, photoData, punchType, punchNote) =>
                  toggleCheckIn(userId, isCheckedIn, photoData, punchType, punchNote)
                }
                onAddPin={addPin}
                onApplyLeave={applyLeave}
                onApproveLeave={approveLeave}
                onRejectLeave={rejectLeave}
                onSubmitAdvance={submitAdvance}
                onApproveAdvance={approveAdvance}
                onRejectAdvance={rejectAdvance}
                onAddEmployee={addEmployee}
                onUpdateEmployee={updateEmployee}
                onDeleteEmployee={deleteEmployee}
                onUpdateBalances={updateBalances}
                onUpdateAttendance={updateAttendance}
                onForceCloseSession={forceCloseSession}
                onRunBulkPayroll={(month) => runBulkPayroll(employees, month)}
                onGenerateSinglePayslip={generateSinglePayslip}
                onUpdatePayslip={updatePayslip}
                onCreateTask={createTask}
                onUpdateTask={updateTask}
                onDeleteTask={deleteTask}
                onUpdateTaskStatus={updateTaskStatus}
              />
            </React.Suspense>
          </main>

        </div>

        {/* 3. Mobile Bottom Navigation Panel */}
        <AppMobileNav
          currentUser={currentUser}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />

        {/* Spacing compensation on mobile */}
        <div className="h-16 lg:hidden no-print" />

      </div>
    </LiveTrackingProvider>
  );
}
