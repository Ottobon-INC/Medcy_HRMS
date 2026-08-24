import React, { useState, useEffect } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase-client';
import { Language } from '../types';
import { translations } from '../translations';

interface EmployeeSpecialEventsProps {
  language: Language;
  employeeId: string;
}

export default function EmployeeSpecialEvents({ language, employeeId }: EmployeeSpecialEventsProps) {
  const t = translations[language];
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMyEvents();
  }, [employeeId]);

  const fetchMyEvents = async () => {
    setIsLoading(true);
    
    // First, find event IDs assigned to this employee
    const { data: assignments, error: assignmentsError } = await supabase
      .from('HRMS_special_event_assignees')
      .select('event_id')
      .eq('employee_id', employeeId);
      
    if (assignmentsError || !assignments) {
      console.error("Error fetching assignments", assignmentsError);
      setIsLoading(false);
      return;
    }
    
    if (assignments.length === 0) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    const eventIds = assignments.map(a => a.event_id);
    
    // Fetch the actual events
    const { data: eventsData, error: eventsError } = await supabase
      .from('HRMS_special_location_events')
      .select('*')
      .in('id', eventIds)
      .order('from_date', { ascending: true });
      
    if (eventsError) {
      console.error("Error fetching events", eventsError);
    } else if (eventsData) {
      setEvents(eventsData);
    }
    
    setIsLoading(false);
  };

  const title = language === 'te' ? 'ప్రత్యేక ఈవెంట్‌లు' : 'Special Events';
  const subtitle = language === 'te' ? 'మీకు కేటాయించబడిన ప్రత్యేక ఈవెంట్‌లు మరియు శిబిరాలు.' : 'Special events and camps assigned to you.';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col items-start gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            {title}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {subtitle}
          </p>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            {language === 'te' ? 'మీకు ఏ ఈవెంట్‌లు కేటాయించబడలేదు.' : 'No special events assigned to you.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map(evt => {
              const isActive = new Date() >= new Date(evt.from_date) && new Date() <= new Date(evt.to_date);
              const isPast = new Date() > new Date(evt.to_date);
              
              return (
                <div key={evt.id} className={`p-5 rounded-2xl border transition-all ${isActive ? 'border-indigo-200 bg-indigo-50/30' : isPast ? 'border-slate-200 bg-slate-50/50 grayscale' : 'border-slate-200 bg-white'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-slate-800">{evt.name}</h4>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-100 text-emerald-700' : isPast ? 'bg-slate-200 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>
                          {isActive ? (language === 'te' ? 'యాక్టివ్' : 'Active Now') : isPast ? (language === 'te' ? 'పూర్తయింది' : 'Completed') : (language === 'te' ? 'రాబోయేవి' : 'Upcoming')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-100 text-xs text-slate-500 font-mono flex gap-8">
                      <div className="flex gap-2"><span className="text-slate-400">From:</span><span className="font-semibold text-slate-700">{evt.from_date}</span></div>
                      <div className="flex gap-2"><span className="text-slate-400">To:</span><span className="font-semibold text-slate-700">{evt.to_date}</span></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
