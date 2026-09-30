// ====================================================================
// ASHA Worker Encounter Types
// ====================================================================

export interface ASHAEncounter {
  id: string;
  employeeId: string;
  ashaName: string;
  village: string;
  encounterDate: string; // YYYY-MM-DD
  referralsCount: number;
  hospitalName?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  // Hydrated helper field for team views
  employeeName?: string;
}

export interface CreateASHAEncounterInput {
  employeeId: string;
  ashaName: string;
  village: string;
  encounterDate: string;
  referralsCount?: number;
  hospitalName?: string;
  notes?: string;
}
