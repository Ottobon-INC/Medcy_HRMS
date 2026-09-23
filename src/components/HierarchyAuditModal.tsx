import React, { useState, useEffect } from 'react';
import { 
  X, 
  History, 
  Search, 
  ArrowRight, 
  Calendar, 
  User, 
  ShieldAlert, 
  RefreshCw,
  GitCommit
} from 'lucide-react';
import { HierarchyAuditEntry, fetchHierarchyAuditLog } from '../lib/services/hierarchy-service';

interface HierarchyAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HierarchyAuditModal: React.FC<HierarchyAuditModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<HierarchyAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadAuditHistory = async () => {
    try {
      setIsLoading(true);
      const data = await fetchHierarchyAuditLog();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit trail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAuditHistory();
    }
  }, [isOpen]);

  const filteredLogs = logs.filter(log => {
    const q = searchQuery.toLowerCase();
    return (
      (log.employeeName || '').toLowerCase().includes(q) ||
      (log.changedByName || '').toLowerCase().includes(q) ||
      (log.actionType || '').toLowerCase().includes(q) ||
      (log.notes || '').toLowerCase().includes(q)
    );
  });

  const getActionBadge = (type: HierarchyAuditEntry['actionType']) => {
    switch (type) {
      case 'promote':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">PROMOTED</span>;
      case 'demote':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">DEMOTED</span>;
      case 'reassign':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">REASSIGNED</span>;
      case 'unassign':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">UNASSIGNED</span>;
      case 'add':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">ADDED</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">UPDATED</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#8a42db] flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Hierarchy Audit Trail</h3>
              <p className="text-xs text-slate-500">Historical log of all reporting structure and role changes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAuditHistory}
              title="Refresh logs"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#8a42db]' : ''}`} />
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-white flex items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by employee, admin, action, or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#8a42db]/30 transition-all placeholder:text-slate-400"
            />
          </div>
          <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
            {filteredLogs.length} change{filteredLogs.length === 1 ? '' : 's'} recorded
          </span>
        </div>

        {/* Audit List Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#8a42db] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-400 font-medium">Loading audit history...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <GitCommit className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-bold text-slate-700">No hierarchy changes recorded yet</p>
              <p className="text-[11px] text-slate-400 max-w-sm">
                When an executive or manager updates an employee's reporting manager, level, or branch, the action is automatically logged here.
              </p>
            </div>
          ) : (
            filteredLogs.map((entry) => {
              const dateStr = new Date(entry.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div 
                  key={entry.id}
                  className="bg-white border border-slate-200/90 hover:border-[#8a42db]/40 rounded-xl p-4 shadow-xs transition-all space-y-3"
                >
                  {/* Top Bar: Employee + Action + Time */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-50 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
                        {entry.employeeName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{entry.employeeName}</h4>
                        <span className="text-[10px] text-slate-400">ID: {entry.employeeId}</span>
                      </div>
                      {getActionBadge(entry.actionType)}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-600">{entry.changedByName || 'Admin'}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  </div>

                  {/* Change Diff Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Previous</span>
                      {entry.oldValues.name && entry.newValues.name && entry.oldValues.name !== entry.newValues.name && (
                        <p className="text-slate-700">
                          <strong className="font-semibold">Name:</strong> {entry.oldValues.name}
                        </p>
                      )}
                      {entry.oldValues.email && entry.newValues.email && entry.oldValues.email !== entry.newValues.email && (
                        <p className="text-slate-700">
                          <strong className="font-semibold">Email:</strong> {entry.oldValues.email}
                        </p>
                      )}
                      {entry.oldValues.phone !== undefined && entry.newValues.phone !== undefined && entry.oldValues.phone !== entry.newValues.phone && (
                        <p className="text-slate-700">
                          <strong className="font-semibold">Phone:</strong> {entry.oldValues.phone || 'None'}
                        </p>
                      )}
                      <p className="text-slate-700">
                        <strong className="font-semibold">Level:</strong> {entry.oldValues.hierarchyLevel || 'N/A'}
                      </p>
                      <p className="text-slate-700">
                        <strong className="font-semibold">Reports To:</strong> {entry.oldValues.reportingToName || entry.oldValues.reportingTo || 'None (Top)'}
                      </p>
                      {entry.oldValues.designation && (
                        <p className="text-slate-500 text-[11px]">
                          <strong className="font-semibold">Role:</strong> {entry.oldValues.designation}
                        </p>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-[#8a42db] uppercase tracking-wider block mb-1">Updated</span>
                      {entry.oldValues.name && entry.newValues.name && entry.oldValues.name !== entry.newValues.name && (
                        <p className="text-slate-900 font-medium">
                          <strong className="font-semibold">Name:</strong> {entry.newValues.name}
                        </p>
                      )}
                      {entry.oldValues.email && entry.newValues.email && entry.oldValues.email !== entry.newValues.email && (
                        <p className="text-slate-900 font-medium">
                          <strong className="font-semibold">Email:</strong> {entry.newValues.email}
                        </p>
                      )}
                      {entry.oldValues.phone !== undefined && entry.newValues.phone !== undefined && entry.oldValues.phone !== entry.newValues.phone && (
                        <p className="text-slate-900 font-medium">
                          <strong className="font-semibold">Phone:</strong> {entry.newValues.phone || 'None'}
                        </p>
                      )}
                      <p className="text-slate-900 font-medium">
                        <strong className="font-semibold">Level:</strong> {entry.newValues.hierarchyLevel || 'N/A'}
                      </p>
                      <p className="text-slate-900 font-medium">
                        <strong className="font-semibold">Reports To:</strong> {entry.newValues.reportingToName || entry.newValues.reportingTo || 'None (Top)'}
                      </p>
                      {entry.newValues.designation && (
                        <p className="text-slate-600 text-[11px]">
                          <strong className="font-semibold">Role:</strong> {entry.newValues.designation}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Notes if present */}
                  {entry.notes && (
                    <p className="text-[11px] text-slate-500 italic bg-amber-50/40 px-3 py-1.5 rounded-md border border-amber-100/60">
                      "{entry.notes}"
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/80 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HierarchyAuditModal;
