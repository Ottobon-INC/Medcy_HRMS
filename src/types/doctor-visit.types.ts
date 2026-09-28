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
  approvalStatus?: 'pending' | 'approved' | 'post_review' | 'rejected';
  approvedBy?: string;
  rejectionReason?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
  updatedAt?: string;
}
