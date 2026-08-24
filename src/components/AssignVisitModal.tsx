import React, { useState } from 'react';
import { FieldVisitType, Language, Employee } from '../types';
import * as fieldVisitService from '../lib/services/field-visit-service';

interface AssignVisitModalProps {
  language: Language;
  onClose: () => void;
  employees: Employee[];
  adminId: string;
}

export default function AssignVisitModal({ language, onClose, employees, adminId }: AssignVisitModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [employeeId, setEmployeeId] = useState('');
  const [title, setTitle] = useState('');
  const [visitType, setVisitType] = useState<FieldVisitType>('PATIENT_VISIT');
  const [patientName, setPatientName] = useState('');
  const [address, setAddress] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const today = new Date().toISOString().split('T')[0];

    try {
      await fieldVisitService.createVisit({
        employeeId,
        assignedBy: adminId,
        title,
        visitType,
        patientName,
        scheduledDate: today,
        scheduledStart: scheduledStart || undefined,
        priority: 'normal',
        status: 'ASSIGNED',
        assignedAddress: address,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign visit');
      setLoading(false);
    }
  };

  const activeEmployees = employees.filter(e => e.status === 'active');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800">Assign Field Visit</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold border border-rose-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Select Employee</label>
            <select 
              required
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">-- Select Employee --</option>
              {activeEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Visit Title</label>
            <input 
              required
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. Follow-up with patient"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Visit Type</label>
              <select 
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500"
                value={visitType}
                onChange={(e) => setVisitType(e.target.value as FieldVisitType)}
              >
                <option value="PATIENT_VISIT">Patient Visit</option>
                <option value="MEDICAL_CAMP">Medical Camp</option>
                <option value="DELIVERY">Delivery</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Time (Optional)</label>
              <input 
                type="time" 
                className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Patient/Client Name</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Destination Address</label>
            <textarea 
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500"
              rows={2}
              placeholder="Enter full address..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !employeeId}
              className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors"
            >
              {loading ? 'Assigning...' : 'Assign Visit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
