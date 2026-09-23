import { supabase } from '../supabase-client';
import { Employee, HierarchyLevel, Hospital, Branch } from '../../types';
import { updateEmployee } from './employee-service';

export interface HierarchyAuditEntry {
  id: string;
  changedById?: string;
  changedByName?: string;
  employeeId: string;
  employeeName: string;
  actionType: 'reassign' | 'promote' | 'demote' | 'unassign' | 'update' | 'add';
  oldValues: {
    name?: string;
    email?: string;
    phone?: string;
    hierarchyLevel?: string;
    reportingTo?: string | null;
    reportingToName?: string | null;
    designation?: string;
    hospital?: string;
    branch?: string;
  };
  newValues: {
    name?: string;
    email?: string;
    phone?: string;
    hierarchyLevel?: string;
    reportingTo?: string | null;
    reportingToName?: string | null;
    designation?: string;
    hospital?: string;
    branch?: string;
  };
  notes?: string;
  createdAt: string;
}

const LOCAL_STORAGE_AUDIT_KEY = 'hrms_hierarchy_audit_log';

/**
 * Checks if the current user has permission to modify the hierarchy.
 * Allowed: Executives, Managers, and System Admins (Option A).
 */
export function canUserModifyHierarchy(user: Employee | null | undefined): boolean {
  if (!user) return false;
  return (
    user.hierarchyLevel === 'executive' ||
    user.hierarchyLevel === 'manager' ||
    user.role === 'admin'
  );
}

/**
 * Validates against circular reporting chains.
 * E.g., A -> B -> C -> A.
 */
export function detectHierarchyCycle(
  employeeId: string,
  targetReportingToId: string | null | undefined,
  allEmployees: Employee[]
): { hasCycle: boolean; error?: string } {
  if (!targetReportingToId || targetReportingToId === '') {
    return { hasCycle: false };
  }

  if (employeeId === targetReportingToId) {
    return {
      hasCycle: true,
      error: 'An employee cannot be set to report to themselves.'
    };
  }

  const employeeMap = new Map<string, Employee>();
  allEmployees.forEach(emp => employeeMap.set(emp.id, emp));

  const targetManager = employeeMap.get(targetReportingToId);
  const targetName = targetManager ? targetManager.name : targetReportingToId;
  const currentEmp = employeeMap.get(employeeId);
  const empName = currentEmp ? currentEmp.name : employeeId;

  let currentId: string | undefined = targetReportingToId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) {
      // Existing cycle in historical data
      break;
    }
    visited.add(currentId);

    if (currentId === employeeId) {
      return {
        hasCycle: true,
        error: `Circular reporting detected: "${targetName}" is already in "${empName}"'s reporting chain. Setting "${empName}" to report to "${targetName}" would create an infinite loop.`
      };
    }

    const nextManager = employeeMap.get(currentId);
    currentId = nextManager?.reportingTo;
  }

  return { hasCycle: false };
}

/**
 * Records a hierarchy mutation in Supabase and local cache.
 */
export async function recordHierarchyAudit(audit: Omit<HierarchyAuditEntry, 'id' | 'createdAt'>): Promise<void> {
  const newEntry: HierarchyAuditEntry = {
    ...audit,
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    createdAt: new Date().toISOString()
  };

  // 1. Cache to localStorage for instant availability & offline resilience
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_AUDIT_KEY);
    const existing: HierarchyAuditEntry[] = raw ? JSON.parse(raw) : [];
    existing.unshift(newEntry);
    localStorage.setItem(LOCAL_STORAGE_AUDIT_KEY, JSON.stringify(existing.slice(0, 200)));
  } catch (err) {
    console.warn('Unable to persist hierarchy audit in localStorage:', err);
  }

  // 2. Insert into Supabase table if it exists
  try {
    await supabase.from('HRMS_hierarchy_audit').insert([
      {
        changed_by_id: newEntry.changedById,
        changed_by_name: newEntry.changedByName,
        employee_id: newEntry.employeeId,
        employee_name: newEntry.employeeName,
        action_type: newEntry.actionType,
        old_values: newEntry.oldValues,
        new_values: newEntry.newValues,
        notes: newEntry.notes,
        created_at: newEntry.createdAt
      }
    ]);
  } catch (err) {
    // Graceful fallback if table is not yet migrated
    console.info('Audit log saved locally (remote table not reachable or pending migration).');
  }
}

/**
 * Fetches all hierarchy audit entries, merging remote and local records.
 */
export async function fetchHierarchyAuditLog(): Promise<HierarchyAuditEntry[]> {
  let localEntries: HierarchyAuditEntry[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_AUDIT_KEY);
    if (raw) localEntries = JSON.parse(raw);
  } catch {
    localEntries = [];
  }

  try {
    const { data, error } = await supabase
      .from('HRMS_hierarchy_audit')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data && data.length > 0) {
      const mappedRemote: HierarchyAuditEntry[] = data.map((d: any) => ({
        id: d.id,
        changedById: d.changed_by_id,
        changedByName: d.changed_by_name,
        employeeId: d.employee_id,
        employeeName: d.employee_name,
        actionType: d.action_type,
        oldValues: d.old_values || {},
        newValues: d.new_values || {},
        notes: d.notes,
        createdAt: d.created_at
      }));

      // Combine and de-duplicate by id
      const combined = [...mappedRemote];
      localEntries.forEach(loc => {
        if (!combined.some(c => c.id === loc.id || (c.employeeId === loc.employeeId && c.createdAt === loc.createdAt))) {
          combined.push(loc);
        }
      });
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return combined;
    }
  } catch (remoteErr) {
    console.warn('Falling back to local hierarchy audit history:', remoteErr);
  }

  return localEntries;
}

/**
 * Main function to update an employee's hierarchy position.
 */
export async function updateHierarchyAssignment(
  currentUser: Employee,
  employee: Employee,
  updates: {
    hierarchyLevel: HierarchyLevel;
    reportingTo: string | null;
    designation?: string;
    hospital?: Hospital;
    branch?: Branch;
    name?: string;
    email?: string;
    phone?: string;
  },
  allEmployees: Employee[],
  notes?: string
): Promise<void> {
  if (!canUserModifyHierarchy(currentUser)) {
    throw new Error('Unauthorized: Only Executives and Managers can modify employee hierarchy.');
  }

  // Validate circular dependency
  const cycleCheck = detectHierarchyCycle(employee.id, updates.reportingTo, allEmployees);
  if (cycleCheck.hasCycle) {
    throw new Error(cycleCheck.error || 'Circular reporting relationship detected.');
  }

  const employeeMap = new Map<string, Employee>();
  allEmployees.forEach(e => employeeMap.set(e.id, e));

  const oldReportingManager = employee.reportingTo ? employeeMap.get(employee.reportingTo) : null;
  const newReportingManager = updates.reportingTo ? employeeMap.get(updates.reportingTo) : null;

  // Determine action type
  let actionType: HierarchyAuditEntry['actionType'] = 'update';
  if (!updates.reportingTo && employee.reportingTo) {
    actionType = 'unassign';
  } else if (employee.hierarchyLevel !== updates.hierarchyLevel) {
    const levelRanks: Record<HierarchyLevel, number> = {
      employee: 1,
      team_lead: 2,
      manager: 3,
      senior_manager: 4,
      executive: 5
    };
    const oldRank = levelRanks[employee.hierarchyLevel || 'employee'] || 1;
    const newRank = levelRanks[updates.hierarchyLevel] || 1;
    actionType = newRank > oldRank ? 'promote' : 'demote';
  } else if (employee.reportingTo !== updates.reportingTo) {
    actionType = 'reassign';
  }

  // Determine role based on hierarchy level
  const isManagerial = ['executive', 'manager', 'senior_manager', 'team_lead'].includes(updates.hierarchyLevel);
  const updatedRole = isManagerial ? 'admin' : employee.role;

  const targetName = updates.name && updates.name.trim() ? updates.name.trim() : employee.name;
  const targetEmail = updates.email && updates.email.trim() ? updates.email.trim() : employee.email;
  const targetPhone = updates.phone !== undefined ? updates.phone.trim() : employee.phone;

  // Perform database update
  await updateEmployee(employee.id, {
    name: targetName,
    email: targetEmail,
    phone: targetPhone,
    hierarchyLevel: updates.hierarchyLevel,
    reportingTo: updates.reportingTo || undefined,
    designation: updates.designation ?? employee.designation,
    hospital: updates.hospital ?? employee.hospital,
    branch: updates.branch ?? employee.branch,
    role: updatedRole
  });

  // Explicitly ensure reporting_to is set to null in Supabase if unassigned
  if (!updates.reportingTo) {
    try {
      await supabase
        .from('HRMS_employees')
        .update({ reporting_to: null })
        .eq('id', employee.id);
    } catch (e) {
      console.warn('Could not explicitly set null on reporting_to:', e);
    }
  }

  // Audit record
  await recordHierarchyAudit({
    changedById: currentUser.id,
    changedByName: currentUser.name,
    employeeId: employee.id,
    employeeName: targetName,
    actionType,
    oldValues: {
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      hierarchyLevel: employee.hierarchyLevel,
      reportingTo: employee.reportingTo,
      reportingToName: oldReportingManager?.name || 'None (Top / Unassigned)',
      designation: employee.designation,
      hospital: employee.hospital,
      branch: employee.branch
    },
    newValues: {
      name: targetName,
      email: targetEmail,
      phone: targetPhone,
      hierarchyLevel: updates.hierarchyLevel,
      reportingTo: updates.reportingTo,
      reportingToName: newReportingManager?.name || 'None (Top / Unassigned)',
      designation: updates.designation ?? employee.designation,
      hospital: updates.hospital ?? employee.hospital,
      branch: updates.branch ?? employee.branch
    },
    notes: notes || `Hierarchy & Profile updated by ${currentUser.name}`
  });
}
