import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Save, Send, User, Clock, Plus } from 'lucide-react';
import { Employee, Language, DutyRosterShift } from '../types';
import { fetchRoster, upsertShiftEntry, publishRoster } from '../lib/services/roster-service';
import { PREDEFINED_SHIFTS } from '../lib/constants/shifts';

interface DutyRosterModuleProps {
  language: Language;
  employees: Employee[];
}

export default function DutyRosterModule({ language, employees }: DutyRosterModuleProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay() || 7; 
    if (day !== 1) d.setHours(-24 * (day - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [roster, setRoster] = useState<DutyRosterShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [editingCell, setEditingCell] = useState<{ empId: string; date: string } | null>(null);

  useEffect(() => {
    loadWeekRoster();
  }, [currentWeekStart]);

  const loadWeekRoster = async () => {
    setIsLoading(true);
    const dateStr = currentWeekStart.toLocaleDateString('en-CA'); // 'YYYY-MM-DD' in local time
    const data = await fetchRoster(dateStr);
    setRoster(data);
    setIsLoading(false);
  };

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  const handlePrevWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const getShiftForCell = (empId: string, dateStr: string) => {
    return roster.find(s => s.employeeId === empId && s.shiftDate === dateStr);
  };

  const handleSelectShift = async (empId: string, dateStr: string, shiftTemplate: typeof PREDEFINED_SHIFTS[0]) => {
    setIsSaving(true);
    try {
      const shiftData = {
        employeeId: empId,
        shiftDate: dateStr,
        shiftStart: shiftTemplate.start,
        shiftEnd: shiftTemplate.end,
        shiftLabel: shiftTemplate.label,
        isPublished: false
      };
      
      await upsertShiftEntry(shiftData);
      
      setRoster(prev => {
        const filtered = prev.filter(s => !(s.employeeId === empId && s.shiftDate === dateStr));
        // We push a mock id to local state, it will be refetched on reload anyway
        return [...filtered, { ...shiftData, id: 'temp-' + Date.now() }];
      });
      
    } catch (err) {
      console.error(err);
      alert('Failed to save shift');
    } finally {
      setIsSaving(false);
      setEditingCell(null);
    }
  };

  const handlePublish = async () => {
    if (roster.length === 0) return;
    setIsPublishing(true);
    try {
      const dateStr = currentWeekStart.toLocaleDateString('en-CA');
      await publishRoster(dateStr);
      alert(language === 'te' ? 'రోస్టర్ ప్రచురించబడింది' : 'Roster published successfully');
      loadWeekRoster();
    } catch (err) {
      console.error(err);
      alert('Failed to publish roster');
    } finally {
      setIsPublishing(false);
    }
  };

  // Only show active employees or employees who have a shift this week
  const activeEmployees = employees.filter(e => e.status !== 'inactive' || roster.some(s => s.employeeId === e.id));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Panel */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-teal-600" />
            {language === 'te' ? 'డ్యూటీ రోస్టర్' : 'Duty Roster'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'te' ? 'ఉద్యోగుల షిఫ్ట్ సమయాలను నిర్వహించండి' : 'Manage employee shift assignments'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button onClick={handlePrevWeek} className="p-2 text-slate-400 hover:text-slate-800 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-4 py-1 text-xs font-bold text-slate-700 min-w-[140px] text-center">
              {currentWeekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} 
              {' - '}
              {weekDates[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </div>
            <button onClick={handleNextWeek} className="p-2 text-slate-400 hover:text-slate-800 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handlePublish}
            disabled={isPublishing || roster.length === 0}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-teal-600/15 cursor-pointer transition-all disabled:opacity-50"
          >
            {isPublishing ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {language === 'te' ? 'ప్రచురించండి' : 'Publish Roster'}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading...</div>
        ) : (
          <div className="overflow-auto max-h-[65vh] pb-48">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 z-40 bg-white shadow-sm">
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400 min-w-[200px] border-r border-slate-100 sticky left-0 z-10 bg-slate-50/95 backdrop-blur-sm">
                    {language === 'te' ? 'ఉద్యోగి' : 'Employee'}
                  </th>
                  {weekDates.map(d => (
                    <th key={d.toISOString()} className="p-4 text-center min-w-[140px] border-r border-slate-100 last:border-r-0">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                      </div>
                      <div className="text-xs font-bold text-slate-700 mt-1">
                        {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="p-4 border-r border-slate-100 sticky left-0 z-10 bg-white group-hover:bg-slate-50/95 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="bg-teal-50 text-teal-700 w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0">
                          {emp.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{emp.name}</p>
                          <p className="text-[9px] text-slate-400 truncate">{emp.designation}</p>
                        </div>
                      </div>
                    </td>
                    
                    {weekDates.map(d => {
                      const dateStr = d.toLocaleDateString('en-CA');
                      const shift = getShiftForCell(emp.id, dateStr);
                      const isEditing = editingCell?.empId === emp.id && editingCell?.date === dateStr;
                      
                      const template = shift ? PREDEFINED_SHIFTS.find(t => t.label === shift.shiftLabel) : null;
                      const colorClass = template?.colorClass || 'bg-slate-50 text-slate-500 border-slate-200';

                      return (
                        <td key={dateStr} className="p-2 border-r border-slate-100 last:border-r-0 relative text-center h-16 align-middle">
                            <div 
                              onClick={() => setEditingCell({ empId: emp.id, date: dateStr })}
                              className={`w-full h-full flex flex-col items-center justify-center rounded-lg border border-dashed transition-all cursor-pointer p-2
                                ${shift 
                                  ? `border-solid ${colorClass} hover:ring-2 hover:ring-teal-500/20` 
                                  : 'border-slate-200 hover:border-teal-300 hover:bg-teal-50/50'
                                } ${isEditing ? 'ring-2 ring-teal-500' : ''}`}
                            >
                              {shift ? (
                                <>
                                  <span className="text-[10px] font-bold truncate w-full">{shift.shiftLabel}</span>
                                  {shift.shiftLabel !== 'Off' && (
                                    <span className="text-[9px] opacity-75">{shift.shiftStart} - {shift.shiftEnd}</span>
                                  )}
                                  {!shift.isPublished && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full border border-white" title="Unpublished changes"></span>
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-300 group-hover:text-teal-300">
                                  <Plus className="w-4 h-4" />
                                </span>
                              )}
                            </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Responsive Edit Modal */}
      {editingCell && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingCell(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 flex flex-col gap-2 min-w-[240px] max-w-sm w-full animate-scaleUp" onClick={e => e.stopPropagation()}>
            <div className="mb-2 text-center border-b border-slate-100 pb-2">
              <p className="text-sm font-bold text-slate-800">
                {employees.find(e => e.id === editingCell.empId)?.name}
              </p>
              <p className="text-[10px] font-black uppercase text-slate-400">
                {new Date(editingCell.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PREDEFINED_SHIFTS.map(tmpl => (
                <button
                  key={tmpl.label}
                  onClick={() => handleSelectShift(editingCell.empId, editingCell.date, tmpl)}
                  className={`text-xs font-bold px-3 py-2.5 rounded-xl text-left transition-all active:scale-95 border ${tmpl.colorClass} hover:opacity-80 flex flex-col`}
                >
                  <span>{tmpl.label}</span>
                  <span className="opacity-75 text-[10px]">{tmpl.start}-{tmpl.end}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setEditingCell(null)}
              className="text-xs font-bold px-3 py-2.5 rounded-xl text-center text-slate-500 hover:bg-slate-100 mt-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
