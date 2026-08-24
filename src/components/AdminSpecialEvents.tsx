import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Save, Loader2, Navigation, Users } from 'lucide-react';
import { supabase } from '../lib/supabase-client';
import { Employee, Language } from '../types';
import { translations } from '../translations';

interface AdminSpecialEventsProps {
  language: Language;
  employees: Employee[];
}

export default function AdminSpecialEvents({ language, employees }: AdminSpecialEventsProps) {
  const t = translations[language];
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('medical_camp');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    
    // Fetch events
    const { data: eventsData, error: eventsError } = await supabase
      .from('HRMS_special_location_events')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (eventsError) {
      console.error("Error fetching events", eventsError);
      setIsLoading(false);
      return;
    }
    
    // Fetch assignees
    const { data: assigneesData, error: assigneesError } = await supabase
      .from('HRMS_special_event_assignees')
      .select('*');
      
    if (assigneesError) {
      console.error("Error fetching assignees", assigneesError);
      setIsLoading(false);
      return;
    }
    
    const enrichedEvents = eventsData.map(evt => {
      const assignees = assigneesData.filter(a => a.event_id === evt.id).map(a => a.employee_id);
      return { ...evt, assignees };
    });
    
    setEvents(enrichedEvents);
    setIsLoading(false);
  };



  const toggleEmployeeSelection = (empId: string) => {
    if (selectedEmployees.includes(empId)) {
      setSelectedEmployees(prev => prev.filter(id => id !== empId));
    } else {
      setSelectedEmployees(prev => [...prev, empId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !fromDate || !toDate) return;
    
    setIsSubmitting(true);
    
    // 1. Insert Event
    const { data: newEvent, error: eventError } = await supabase.from('HRMS_special_location_events').insert([
      {
        name,
        event_type: eventType,
        latitude: 0,
        longitude: 0,
        radius_meters: 0,
        from_date: fromDate,
        to_date: toDate
      }
    ]).select().single();
    
    if (eventError) {
      alert('Error creating event: ' + eventError.message);
      setIsSubmitting(false);
      return;
    }
    
    // 2. Insert Assignees
    if (selectedEmployees.length > 0) {
      const assigneesPayload = selectedEmployees.map(empId => ({
        event_id: newEvent.id,
        employee_id: empId
      }));
      
      const { error: assigneesError } = await supabase.from('HRMS_special_event_assignees').insert(assigneesPayload);
      if (assigneesError) {
        console.error("Error assigning employees", assigneesError);
      }
    }
    
    setIsSubmitting(false);
    setShowForm(false);
    
    // Reset form
    setName('');
    setFromDate('');
    setToDate('');
    setSelectedEmployees([]);
    
    fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    const { error } = await supabase
      .from('HRMS_special_location_events')
      .delete()
      .eq('id', id);
      
    if (!error) {
      fetchEvents();
    }
  };

  const title = language === 'te' ? 'మెడికల్ క్యాంపులు (ప్రత్యేక ఈవెంట్‌లు)' : 'Special Location Events (Medical Camps)';
  const subtitle = language === 'te' ? 'ఉద్యోగులు హాజరు వేసుకోవడానికి తాత్కాలిక స్థానాలను నిర్వహించండి.' : 'Manage temporary geofenced locations for specific dates and assigned employees.';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            {title}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {subtitle}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
        >
          {showForm ? 'Cancel' : <><Plus className="w-4 h-4" /> Add Event</>}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm animate-scaleUp">
          <h3 className="text-base font-bold text-slate-800 mb-5 border-b pb-3">New Special Event</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Event Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Health Camp - Gajuwaka"
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                />
              </div>
              


              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    From Date
                  </label>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    To Date
                  </label>
                  <input
                    type="date"
                    required
                    value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Assign Employees
              </label>
              <p className="text-xs text-slate-400 mb-4">Select the employees who are allowed to check in from this location during the specified dates.</p>
              
              <div className="flex-1 overflow-y-auto space-y-2 max-h-80 pr-2">
                {employees.filter(e => e.role !== 'admin').map(emp => (
                  <label key={emp.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
                    <input 
                      type="checkbox"
                      checked={selectedEmployees.includes(emp.id)}
                      onChange={() => toggleEmployeeSelection(emp.id)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                    />
                    <div>
                      <div className="text-sm font-bold text-slate-800">{emp.name}</div>
                      <div className="text-[10px] text-slate-400">{emp.id}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 pt-4 border-t border-slate-50 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Event & Assignments
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
        {isLoading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No special events configured.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                          {isActive ? 'Active Now' : isPast ? 'Completed' : 'Upcoming'}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          {evt.assignees?.length || 0} Assigned
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteEvent(evt.id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="mb-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-100 text-xs text-slate-500 font-mono flex gap-8">
                      <div className="flex gap-2"><span className="text-slate-400">From:</span><span className="font-semibold text-slate-700">{evt.from_date}</span></div>
                      <div className="flex gap-2"><span className="text-slate-400">To:</span><span className="font-semibold text-slate-700">{evt.to_date}</span></div>
                    </div>
                  </div>
                  
                  {evt.assignees && evt.assignees.length > 0 && (
                    <div className="text-xs text-slate-500">
                      <span className="font-bold text-slate-700">Assigned:</span>{' '}
                      {evt.assignees.map((id: string) => employees.find(e => e.id === id)?.name || id).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
