import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Language, DutyRosterShift } from '../types';
import { fetchRoster } from '../lib/services/roster-service';
import { PREDEFINED_SHIFTS } from '../lib/constants/shifts';

interface EmployeeRosterProps {
  language: Language;
  employeeId: string;
}

export default function EmployeeRoster({ language, employeeId }: EmployeeRosterProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay() || 7; 
    if (day !== 1) d.setHours(-24 * (day - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [roster, setRoster] = useState<DutyRosterShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWeekRoster();
  }, [currentWeekStart]);

  const loadWeekRoster = async () => {
    setIsLoading(true);
    const dateStr = currentWeekStart.toLocaleDateString('en-CA');
    const data = await fetchRoster(dateStr);
    // Only show published shifts for this employee
    setRoster(data.filter(s => s.employeeId === employeeId && s.isPublished));
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

  const getShiftForCell = (dateStr: string) => {
    return roster.find(s => s.shiftDate === dateStr);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Panel */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-teal-600" />
            {language === 'te' ? 'నా డ్యూటీ రోస్టర్' : 'My Duty Roster'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'te' ? 'మీ షిఫ్ట్ సమయాలను ఇక్కడ చూడండి' : 'View your shift assignments for the week'}
          </p>
        </div>

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
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-slate-400">Loading...</div>
        ) : (
          weekDates.map(d => {
            const dateStr = d.toLocaleDateString('en-CA');
            const shift = getShiftForCell(dateStr);
            const template = shift ? PREDEFINED_SHIFTS.find(t => t.label === shift.shiftLabel) : null;
            const colorClass = template?.colorClass || 'bg-slate-50 text-slate-500 border-slate-200';
            const isToday = new Date().toLocaleDateString('en-CA') === dateStr;

            return (
              <div 
                key={dateStr} 
                className={`bg-white rounded-2xl p-4 border shadow-sm flex flex-col gap-3 relative ${isToday ? 'border-teal-400 ring-1 ring-teal-400' : 'border-slate-100'}`}
              >
                {isToday && (
                  <span className="absolute -top-2 -right-2 bg-teal-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    Today
                  </span>
                )}
                
                <div className="flex flex-col items-center pb-3 border-b border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {d.toLocaleDateString('en-GB', { weekday: 'short' })}
                  </span>
                  <span className="text-lg font-bold text-slate-700">
                    {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center min-h-[80px]">
                  {shift ? (
                    <div className={`w-full flex flex-col items-center justify-center p-3 rounded-xl border border-solid ${colorClass}`}>
                      <span className="text-xs font-bold text-center">{shift.shiftLabel}</span>
                      {shift.shiftLabel !== 'Off' && (
                        <div className="flex items-center gap-1 mt-1 opacity-75">
                          <Clock className="w-3 h-3" />
                          <span className="text-[10px] font-medium">{shift.shiftStart} - {shift.shiftEnd}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-400">
                      <span className="text-xs font-medium italic">No Shift Assigned</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
