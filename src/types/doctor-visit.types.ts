export interface DoctorVisit {
  id: string;
  employeeId: string;
  visitDate: string;
  doctorName: string;
  clinicName?: string;
  area?: string;
  timeSlot?: string;
  visitPurpose?: string;
  status: 'planned' | 'completed' | 'missed' | 'rescheduled';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
