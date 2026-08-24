import { useState, useCallback } from 'react';
import { Employee } from '../types';
import * as employeeService from '../lib/services/employee-service';

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem('hrms_local_employees');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const saveLocalData = (emps: Employee[]) => {
    try {
      localStorage.setItem('hrms_local_employees', JSON.stringify(emps));
    } catch (storageErr) {
      console.warn('Could not cache employees to localStorage:', storageErr);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      try {
        await employeeService.seedInitialDatabase();
      } catch (seedErr) {
        console.warn('Seed database checked/passed:', seedErr);
      }

      const emps = await employeeService.fetchAllEmployeesData();
      setEmployees(emps);
      saveLocalData(emps);
    } catch (err: any) {
      console.error('Error fetching Supabase employee data:', err);
      const errDetails = err?.message || err?.details || 'Database connection offline.';
      setError(`Database connection notice: "${errDetails}". Ensure Supabase is configured and tables are migrated.`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addEmployee = async (emp: Omit<Employee, 'isCheckedIn' | 'leaveBalance' | 'leaveRequests' | 'attendanceRecords' | 'checkInLogs' | 'payslips'>) => {
    await employeeService.createEmployee(emp);
    await loadData();
  };

  const updateEmployee = async (id: string, fields: Partial<Employee>) => {
    await employeeService.updateEmployee(id, fields);
    await loadData();
  };

  const deleteEmployee = async (id: string) => {
    await employeeService.deleteEmployee(id);
    await loadData();
  };

  const toggleStatus = async (id: string, status: 'active' | 'inactive') => {
    await employeeService.toggleEmployeeStatus(id, status);
    await loadData();
  };

  return {
    employees,
    isLoading,
    error,
    isLocalMode: false,
    loadData,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    toggleStatus
  };
}
