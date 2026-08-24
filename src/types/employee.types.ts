import type { LeaveBalance, LeaveRequest, MonthlyLeaveQuota } from './leave.types';
import type { AttendanceRecord, CheckInLog } from './attendance.types';
import type { Payslip } from './payroll.types';
import type { AdvanceRequest } from './advance.types';
import type { LocationPin } from './location.types';
import type { DutyRosterShift } from './roster.types';

export interface BankDetails {
  accountNumber: string;
  bankName: string;
  ifsc: string;
  accountType?: 'savings' | 'current';
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  designation: string;
  joiningDate: string;
  basicSalary: number;
  role: 'employee' | 'admin';
  password?: string;
  status: 'active' | 'inactive';
  phone?: string;
  isCheckedIn: boolean;
  leaveBalance: LeaveBalance;
  leaveRequests: LeaveRequest[];
  attendanceRecords: AttendanceRecord[];
  checkInLogs: CheckInLog[];
  payslips: Payslip[];
  advanceRequests: AdvanceRequest[];
  gender?: 'male' | 'female' | 'other';
  dob?: string;
  experience?: number;
  monthlyQuota?: MonthlyLeaveQuota;
  locationPins?: LocationPin[];
  shifts?: DutyRosterShift[];
  bankDetails?: BankDetails;
}
