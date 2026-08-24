import { PunchType } from './common.types';

export type AttendanceStatus = 'present' | 'absent' | 'half-day' | 'leave' | 'holiday' | 'mispunch' | 'weekoff';

export interface CheckInLog {
  id: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // HH:MM:SS
  checkOutTime: string | null; // HH:MM:SS
  totalHours: number | null; // Decimal hours
  checkInLocation?: string; // e.g. "Visakhapatnam, AP"
  checkInLatLng?: string; // e.g. "17.7,83.3"
  photoUrl?: string; // base64 photo data
  checkOutLocation?: string;
  checkOutLatLng?: string;
  checkOutPhotoUrl?: string; // check-out photo
  punchType?: PunchType; // 'in_office' | 'out_of_office'
  punchNote?: string;
  sessionNumber?: number;
}

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  note?: string;
  photoUrl?: string;
  punchNote?: string;
}

// Missed Punch Correction Requests
export type MissedPunchStatus = 'pending' | 'approved' | 'rejected';
export type MissedPunchCorrectionType = 'in' | 'out';

export interface MissedPunchRequest {
  id: string;
  employeeId: string;
  employeeName?: string;       // joined for admin display
  missedDate: string;          // YYYY-MM-DD
  punchType: MissedPunchCorrectionType;
  reason?: string;
  status: MissedPunchStatus;
  adminNote?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}
