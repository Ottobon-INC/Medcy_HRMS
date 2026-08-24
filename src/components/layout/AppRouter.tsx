import React from 'react';
import { Employee, Language, Task, PunchType, LeaveBalance, Payslip, PinType, RepaymentTimeline, AdvanceType } from '../../types';

// Lazy Loaded Modules
const DashboardSnapshot = React.lazy(() => import('../DashboardSnapshot'));
const AttendanceModule = React.lazy(() => import('../AttendanceModule'));
const EmployeeMissedPunches = React.lazy(() => import('../EmployeeMissedPunches'));
const FieldDutyModule = React.lazy(() => import('../FieldDutyModule'));
const EmployeeSpecialEvents = React.lazy(() => import('../EmployeeSpecialEvents'));
const EmployeeRoster = React.lazy(() => import('../EmployeeRoster'));
const LeaveModule = React.lazy(() => import('../LeaveModule'));
const AdvanceRequestModule = React.lazy(() => import('../AdvanceRequestModule'));
const PayrollModule = React.lazy(() => import('../PayrollModule'));
const AdminDashboard = React.lazy(() => import('../AdminDashboard'));
const EmployeeDirectory = React.lazy(() => import('../EmployeeDirectory'));
const AdminAttendance = React.lazy(() => import('../AdminAttendance'));
const AdminMissedPunches = React.lazy(() => import('../AdminMissedPunches'));
const FieldOpsModule = React.lazy(() => import('../FieldOpsModule'));
const AdminLeaveApprovals = React.lazy(() => import('../AdminLeaveApprovals'));
const AdminAdvanceApprovals = React.lazy(() => import('../AdminAdvanceApprovals'));
const AdminPayroll = React.lazy(() => import('../AdminPayroll'));
const AdminOfficeLocations = React.lazy(() => import('../AdminOfficeLocations'));
const AdminSpecialEvents = React.lazy(() => import('../AdminSpecialEvents'));
const MessagingModule = React.lazy(() => import('../MessagingModule').then(m => ({ default: m.MessagingModule })));
const AdminSettings = React.lazy(() => import('../AdminSettings'));
const DutyRosterModule = React.lazy(() => import('../DutyRosterModule'));
const TaskModule = React.lazy(() => import('../TaskModule'));
const AdminTaskManager = React.lazy(() => import('../AdminTaskManager'));

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
  onSubmitAdvance: (empId: string, amount: number, reason: string, repaymentMonths?: RepaymentTimeline, type?: AdvanceType) => Promise<void>;
  onApproveAdvance: (advId: string) => Promise<void>;
  onRejectAdvance: (advId: string) => Promise<void>;
  onAddEmployee: (emp: any) => Promise<void>;
  onUpdateEmployee: (id: string, fields: Partial<Employee>) => Promise<void>;
  onDeleteEmployee: (id: string) => Promise<void>;
  onUpdateBalances: (empId: string, balances: LeaveBalance) => Promise<void>;
  onUpdateAttendance: (employeeId: string, date: string, status: any, checkInTime?: string, checkOutTime?: string, sessionNumber?: number) => Promise<void>;
  onForceCloseSession: (employeeId: string, date: string, sessionNumber?: number) => Promise<void>;
  onRunBulkPayroll: (month: string) => Promise<void>;
  onGenerateSinglePayslip: (empId: string, month: string) => Promise<void>;
  onUpdatePayslip: (empId: string, payslip: Payslip) => Promise<void>;
  onCreateTask: (task: any) => Promise<void>;
  onUpdateTask: (id: string, updates: any) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onUpdateTaskStatus: (id: string, status: any) => Promise<void>;
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
  onToggleCheckIn,
  onAddPin,
  onApplyLeave,
  onApproveLeave,
  onRejectLeave,
  onSubmitAdvance,
  onApproveAdvance,
  onRejectAdvance,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onUpdateBalances,
  onUpdateAttendance,
  onForceCloseSession,
  onRunBulkPayroll,
  onGenerateSinglePayslip,
  onUpdatePayslip,
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
          payslips={currentUser.payslips}
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
    case 'events':
      return (
        <EmployeeSpecialEvents
          language={language}
          employeeId={currentUser.id}
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
    case 'advance':
      return (
        <AdvanceRequestModule
          language={language}
          advanceRequests={currentUser.advanceRequests || []}
          onSubmitAdvance={(amount, reason, repaymentMonths, type) =>
            onSubmitAdvance(currentUser.id, amount, reason, repaymentMonths, type)
          }
          isEligible={
            (currentUser.experience || 0) >= 1 ||
            new Date(currentUser.joiningDate) <= new Date(new Date().setFullYear(new Date().getFullYear() - 1))
          }
          employeeSalary={currentUser.basicSalary}
        />
      );
    case 'payroll':
      return (
        <PayrollModule
          language={language}
          payslips={currentUser.payslips}
          employeeName={currentUser.name}
          employeeId={currentUser.id}
          employeeEmail={currentUser.email}
          employeeDesignation={currentUser.designation}
          employeeJoiningDate={currentUser.joiningDate}
          employeeExperience={currentUser.experience}
          employeeBankDetails={currentUser.bankDetails}
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
          onUpdatePayslip={onUpdatePayslip}
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
    case 'leaveApprovals':
      return (
        <AdminLeaveApprovals
          language={language}
          employees={employees}
          onApproveLeave={(_empId, reqId, note) => onApproveLeave(reqId, note)}
          onRejectLeave={(_empId, reqId, note) => onRejectLeave(reqId, note)}
        />
      );
    case 'advanceApprovals':
      return (
        <AdminAdvanceApprovals
          language={language}
          employees={employees}
          onApprove={onApproveAdvance}
          onReject={onRejectAdvance}
        />
      );
    case 'adminPayroll':
      return (
        <AdminPayroll
          language={language}
          employees={employees}
          onRunBulkPayroll={onRunBulkPayroll}
          onGenerateSinglePayslip={onGenerateSinglePayslip}
          onUpdatePayslip={onUpdatePayslip}
          onUpdateEmployee={onUpdateEmployee}
        />
      );
    case 'officeLocations':
      return (
        <AdminOfficeLocations language={language} />
      );
    case 'specialEvents':
      return (
        <AdminSpecialEvents language={language} employees={employees} />
      );
    case 'messages':
      return (
        <MessagingModule currentUser={currentUser} employees={employees} />
      );
    case 'adminSettings':
      return (
        <AdminSettings language={language} />
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

    default:
      return (
        <div className="py-12 text-center text-slate-500 font-medium">
          {noDataText}
        </div>
      );
  }
};

export default AppRouter;
