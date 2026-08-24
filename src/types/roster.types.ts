export interface DutyRosterShift {
  id: string;
  employeeId: string;
  shiftDate: string; // YYYY-MM-DD
  shiftStart: string; // HH:MM
  shiftEnd: string; // HH:MM
  shiftLabel?: string;
  notes?: string;
  isPublished: boolean;
}
