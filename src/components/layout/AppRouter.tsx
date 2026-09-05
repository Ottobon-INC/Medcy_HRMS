import React from 'react';
import { Employee, Language, Task, PunchType, LeaveBalance, PinType } from '../../types';

// Lazy Loaded Modules
const DashboardSnapshot = React.lazy(() => import('../DashboardSnapshot'));
const AttendanceModule = React.lazy(() => import('../AttendanceModule'));
const EmployeeMissedPunches = React.lazy(() => import('../EmployeeMissedPunches'));
const FieldDutyModule = React.lazy(() => import('../FieldDutyModule'));
const EmployeeMapDashboard = React.lazy(() => import('../EmployeeMapDashboard'));
const EmployeeRoster = React.lazy(() => import('../EmployeeRoster'));
const LeaveModule = React.lazy(() => import('../LeaveModule'));
const AdminDashboard = React.lazy(() => import('../AdminDashboard'));
const EmployeeDirectory = React.lazy(() => import('../EmployeeDirectory'));
const AdminAttendance = React.lazy(() => import('../AdminAttendance'));
const AdminMissedPunches = React.lazy(() => import('../AdminMissedPunches'));
const FieldOpsModule = React.lazy(() => import('../FieldOpsModule'));
const AdminLeaveApprovals = React.lazy(() => import('../AdminLeaveApprovals'));
const AdminOfficeLocations = React.lazy(() => import('../AdminOfficeLocations'));
const MessagingModule = React.lazy(() => import('../MessagingModule').then(m => ({ default: m.MessagingModule })));
const AdminSettings = React.lazy(() => import('../AdminSettings'));
const DutyRosterModule = React.lazy(() => import('../DutyRosterModule'));
const TaskModule = React.lazy(() => import('../TaskModule'));
const AdminTaskManager = React.lazy(() => import('../AdminTaskManager'));
const ExecutiveOverview = React.lazy(() => import('../ExecutiveOverview'));
const OrgHierarchyView = React.lazy(() => import('../OrgHierarchyView'));
const CallPhotoCaptureView = React.lazy(() => import('../fieldops/CallPhotoCaptureView').then(m => ({ default: m.CallPhotoCaptureView })));
const AdminLiveMapDashboard = React.lazy(() => import('../AdminLiveMapDashboard'));


interface AppRouterProps {
  activeTab: string;
  language: Language;
  currentUser: Employee;
  employees: Employee[];
  isLocalMode: boolean;
  tasks: Task[];
  noDataText: string;
  setActiveTab: (tab: string) => void;
  // Actions
  onToggleCheckIn: (userId: string, isCheckedIn: boolean, photoData?: string, punchType?: PunchType, punchNote?: string) => Promise<any>;
  onAddPin: (employeeId: string, label: string, pinType?: PinType, photoUrl?: string) => Promise<any>;
  onApplyLeave: (empId: string, req: any) => Promise<void>;
  onApproveLeave: (reqId: string, note?: string) => Promise<void>;
  onRejectLeave: (reqId: string, note?: string) => Promise<void>;
  onAddEmployee: (emp: any) => Promise<void>;
  onUpdateEmployee: (id: string, fields: Partial<Employee>) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
  onUpdateBalances: (empId: string, balances: LeaveBalance) => Promise<void>;
  onUpdateAttendance: (employeeId: string, date: string, status: any, checkInTime?: string, checkOutTime?: string, sessionNumber?: number) => Promise<void>;
  onForceCloseSession: (employeeId: string, date: string, sessionNumber?: number) => Promise<void>;
  onCreateTask: (task: any) => Promise<void>;
  onUpdateTask: (id: string, updates: any) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onUpdateTaskStatus: (id: string, status: any) => Promise<void>;
  onOpenProfile?: () => void;
}

export const AppRouter: React.FC<AppRouterProps> = ({
  activeTab,
  language,
  currentUser,
  employees,
  isLocalMode,
  tasks,
  noDataText,
  setActiveTab,
  onOpenProfile,
  onToggleCheckIn,
  onAddPin,
  onApplyLeave,
  onApproveLeave,
  onRejectLeave,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onUpdateBalances,
  onUpdateAttendance,
  onForceCloseSession,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onUpdateTaskStatus
}) => {
  switch (activeTab) {
    // --- EMPLOYEE MODULES ---
    case 'dashboard':
      return (
        <DashboardSnapshot
          language={language}
          currentUser={currentUser}
          isCheckedIn={currentUser.isCheckedIn}
          logs={currentUser.checkInLogs}
          attendanceRecords={currentUser.attendanceRecords}
          leaveBalance={currentUser.leaveBalance}
          setActiveTab={setActiveTab}
          onToggleCheckIn={(photoData?: string, punchType?: PunchType, punchNote?: string) =>
            onToggleCheckIn(currentUser.id, currentUser.isCheckedIn, photoData, punchType, punchNote)
          }
          pins={currentUser.locationPins || []}
          onAddPin={onAddPin}
        />
      );
    case 'attendance':
      return (
        <AttendanceModule
          language={language}
          attendanceRecords={currentUser.attendanceRecords}
        />
      );
    case 'employeeMissedPunches':
      return (
        <EmployeeMissedPunches
          language={language}
          currentUser={currentUser}
        />
      );
    case 'fieldDuty':
      return (
        <FieldDutyModule
          language={language}
          employeeId={currentUser.id}
          isLocalMode={isLocalMode}
        />
      );
    case 'callCapture':
      return (
        <CallPhotoCaptureView
          language={language}
          employeeId={currentUser.id}
          isLocalMode={isLocalMode}
        />
      );
    case 'liveMap':
      return (
        <EmployeeMapDashboard
          currentUser={currentUser}
          employees={employees}
          isLocalMode={isLocalMode}
        />
      );
    case 'myRoster':
      return (
        <EmployeeRoster 
          language={language}
          employeeId={currentUser.id}
        />
      );
    case 'leave':
      return (
        <LeaveModule
          language={language}
          leaveBalance={currentUser.leaveBalance}
          monthlyQuota={currentUser.monthlyQuota!}
          leaveRequests={currentUser.leaveRequests}
          gender={currentUser.gender}
          onApplyLeave={(type, fromDate, toDate, reason) =>
            onApplyLeave(currentUser.id, { type, fromDate, toDate, reason, status: 'pending', submittedAt: new Date().toISOString() })
          }
          onApproveLeave={onApproveLeave}
          onRejectLeave={onRejectLeave}
        />
      );

    // --- ADMIN MODULES ---
    case 'adminDashboard':
      return (
        <AdminDashboard
          language={language}
          employees={employees}
          setActiveTab={setActiveTab}
        />
      );
    case 'directory':
      return (
        <EmployeeDirectory
          language={language}
          employees={employees}
          onAddEmployee={onAddEmployee}
          onUpdateEmployee={onUpdateEmployee}
          onDeleteEmployee={onDeleteEmployee}
          onApproveEmployeeLeave={(_empId, reqId) => onApproveLeave(reqId)}
          onRejectEmployeeLeave={(_empId, reqId) => onRejectLeave(reqId)}
          onApplyEmployeeLeave={(empId, type, fromDate, toDate, reason) =>
            onApplyLeave(empId, { type, fromDate, toDate, reason, status: 'pending', submittedAt: new Date().toISOString() })
          }
          onUpdateLeaveBalances={onUpdateBalances}
        />
      );
    case 'attendanceOverview':
      return (
        <AdminAttendance
          language={language}
          employees={employees}
          onUpdateAttendance={onUpdateAttendance}
          onForceCloseSession={onForceCloseSession}
        />
      );
    case 'adminMissedPunches':
      return (
        <AdminMissedPunches
          language={language}
          employees={employees}
          adminId={currentUser.id}
        />
      );
    case 'fieldOps':
      return (
        <FieldOpsModule
          language={language}
          isLocalMode={isLocalMode}
          employees={employees}
          adminId={currentUser.id}
        />
      );
    case 'adminLiveMap':
      return (
        <AdminLiveMapDashboard
          employees={employees}
          isLocalMode={isLocalMode}
        />
      );
    case 'leaveApprovals':
      return (
        <AdminLeaveApprovals
          language={language}
          employees={employees}
          onApproveLeave={(_empId, reqId, note) => onApproveLeave(reqId, note)}
          onRejectLeave={(_empId, reqId, note) => onRejectLeave(reqId, note)}
        />
      );
    case 'officeLocations':
      return (
        <AdminOfficeLocations language={language} />
      );
    case 'messages':
      return (
        <MessagingModule currentUser={currentUser} employees={employees} />
      );
    case 'adminSettings':
      return (
        <AdminSettings language={language} onOpenProfile={onOpenProfile} />
      );
    case 'dutyRoster':
      return (
        <DutyRosterModule language={language} employees={employees} />
      );
    case 'tasks':
      return (
        <TaskModule
          language={language}
          currentUser={currentUser}
          employees={employees}
          tasks={tasks}
          onUpdateStatus={onUpdateTaskStatus}
        />
      );
    case 'adminTasks':
      return (
        <AdminTaskManager
          language={language}
          currentUser={currentUser}
          employees={employees}
          tasks={tasks}
          onCreateTask={onCreateTask}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onUpdateStatus={onUpdateTaskStatus}
        />
      );
    case 'executiveOverview':
      return (
        <ExecutiveOverview
          language={language}
          currentUser={currentUser}
          employees={employees}
          tasks={tasks}
          setActiveTab={setActiveTab}
        />
      );
    case 'orgChart':
      return (
        <OrgHierarchyView
          language={language}
          currentUser={currentUser}
          employees={employees}
        />
      );

    default:
      return (
        <div className="py-12 text-center text-slate-500 font-medium">
          {noDataText}
        </div>
      );
  }
};

export default AppRouter;
