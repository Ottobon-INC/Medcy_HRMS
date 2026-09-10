import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, Search, ChevronLeft, ChevronRight, Plus, Copy, Save, X, Edit, Trash2 } from 'lucide-react';
import { Language, Employee, DoctorVisit } from '../types';
import { translations } from '../translations';
import { useDoctorVisits } from '../hooks/useDoctorVisits';

interface DoctorVisitPlannerProps {
  language: Language;
  currentUser: Employee;
  employees: Employee[];
}

export default function DoctorVisitPlanner({ language, currentUser, employees }: DoctorVisitPlannerProps) {
  const t = translations[language];
  const { visits, isLoading, addVisit, updateVisit, removeVisit, copyVisits } = useDoctorVisits(currentUser.id);
  
  // State for date selection
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  });
  
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // State for modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<DoctorVisit | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    doctorName: '',
    clinicName: '',
    area: '',
    timeSlot: '',
    visitPurpose: '',
    notes: ''
  });

  const getWeekDates = (startDate: Date) => {
    return Array.from({ length: 6 }).map((_, i) => { // Mon-Sat
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const weekDates = getWeekDates(currentWeekStart);
  
  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
  };

  const nextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };

  const prevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };

  const selectedVisits = visits.filter(v => v.visitDate === selectedDate);

  const handleOpenModal = (visit?: DoctorVisit) => {
    if (visit) {
      setEditingVisit(visit);
      setFormData({
        doctorName: visit.doctorName,
        clinicName: visit.clinicName || '',
        area: visit.area || '',
        timeSlot: visit.timeSlot || '',
        visitPurpose: visit.visitPurpose || '',
        notes: visit.notes || ''
      });
    } else {
      setEditingVisit(null);
      setFormData({
        doctorName: '',
        clinicName: '',
        area: '',
        timeSlot: '',
        visitPurpose: '',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVisit(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doctorName) return;

    try {
      if (editingVisit) {
        await updateVisit(editingVisit.id, formData);
      } else {
        await addVisit({
          employeeId: currentUser.id,
          visitDate: selectedDate,
          ...formData,
          status: 'planned'
        });
      }
      handleCloseModal();
    } catch (err) {
      alert("Failed to save visit.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this planned visit?")) {
      await removeVisit(id);
    }
  };

  const handleCopyFromYesterday = async () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const yesterdayStr = d.toISOString().split('T')[0];
    
    if (window.confirm(`Copy all planned visits from ${yesterdayStr}?`)) {
      await copyVisits(yesterdayStr, selectedDate);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Doctor Visit Planner</h1>
          <p className="text-sm text-slate-500 mt-1">Plan and track your daily field visits</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <button onClick={prevWeek} className="p-2 hover:bg-white rounded-lg transition-colors cursor-pointer shadow-sm">
            <ChevronLeft size={18} className="text-slate-600" />
          </button>
          <div className="px-4 text-sm font-bold text-slate-700 w-48 text-center">
            {currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
            {weekDates[5].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <button onClick={nextWeek} className="p-2 hover:bg-white rounded-lg transition-colors cursor-pointer shadow-sm">
            <ChevronRight size={18} className="text-slate-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Week Calendar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <h3 className="font-bold text-slate-800 mb-4 px-2 text-sm uppercase tracking-wider">Select Day</h3>
            <div className="space-y-2">
              {weekDates.map((date) => {
                const dateStr = date.toISOString().split('T')[0];
                const isSelected = selectedDate === dateStr;
                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                const dayVisitsCount = visits.filter(v => v.visitDate === dateStr).length;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-[#8a42db] text-white shadow-md shadow-purple-500/20' 
                        : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                    } ${isToday && !isSelected ? 'border-purple-200 bg-purple-50/50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 flex flex-col items-center justify-center rounded-lg ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                        <span className="text-[10px] font-bold uppercase">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        <span className="text-sm font-black leading-tight">{date.getDate()}</span>
                      </div>
                      <div className="text-left flex flex-col">
                        <span className="text-sm font-bold">{isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                        {dayVisitsCount > 0 && (
                          <span className={`text-[10px] font-medium ${isSelected ? 'text-purple-100' : 'text-slate-400'}`}>
                            {dayVisitsCount} visit{dayVisitsCount !== 1 ? 's' : ''} planned
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Day View */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 min-h-[500px] flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-800">
                  {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">{selectedVisits.length} visits scheduled</p>
              </div>
              <div className="flex gap-2">
                {selectedVisits.length === 0 && (
                  <button 
                    onClick={handleCopyFromYesterday}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200"
                  >
                    <Copy size={14} />
                    Copy Prev Day
                  </button>
                )}
                <button 
                  onClick={() => handleOpenModal()}
                  className="flex items-center gap-2 px-4 py-2 bg-[#8a42db] hover:bg-[#7e3acb] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                >
                  <Plus size={16} />
                  Add Visit
                </button>
              </div>
            </div>

            {isLoading ? (
               <div className="flex-1 flex items-center justify-center">
                 <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
               </div>
            ) : selectedVisits.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
                <CalendarIcon className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-slate-600 font-bold mb-1">No visits planned</h3>
                <p className="text-slate-400 text-sm max-w-xs">You haven't scheduled any doctor visits for this day yet.</p>
                <button 
                  onClick={() => handleOpenModal()}
                  className="mt-6 text-[#8a42db] font-bold text-sm hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Plus size={16} /> Add your first visit
                </button>
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {selectedVisits.map(visit => (
                  <div key={visit.id} className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-purple-200 bg-white hover:bg-purple-50/30 transition-all">
                    
                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-800">{visit.doctorName}</h3>
                        {visit.status === 'completed' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase">Completed</span>}
                      </div>
                      
                      {visit.clinicName && (
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                          <MapPin size={12} className="text-slate-400" />
                          {visit.clinicName} {visit.area && `— ${visit.area}`}
                        </p>
                      )}
                      
                      {visit.visitPurpose && (
                        <p className="text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded inline-block mt-1 self-start">
                          {visit.visitPurpose}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 sm:flex-col sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                      {visit.timeSlot && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
                          <Clock size={14} className="text-slate-500" />
                          {visit.timeSlot}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenModal(visit)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDelete(visit.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-800">{editingVisit ? 'Edit Visit' : 'Plan Doctor Visit'}</h2>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Doctor Name *</label>
                <input
                  type="text"
                  required
                  value={formData.doctorName}
                  onChange={(e) => setFormData({...formData, doctorName: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-[#8a42db] focus:border-[#8a42db] block p-3 transition-colors outline-none"
                  placeholder="e.g. Dr. Ramesh Kumar"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Clinic / Hospital Name</label>
                <input
                  type="text"
                  value={formData.clinicName}
                  onChange={(e) => setFormData({...formData, clinicName: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-[#8a42db] focus:border-[#8a42db] block p-3 transition-colors outline-none"
                  placeholder="e.g. Apollo Pharmacy Clinic"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Area / Location</label>
                  <input
                    type="text"
                    value={formData.area}
                    onChange={(e) => setFormData({...formData, area: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-[#8a42db] focus:border-[#8a42db] block p-3 transition-colors outline-none"
                    placeholder="e.g. MVP Colony"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Time Slot</label>
                  <input
                    type="text"
                    value={formData.timeSlot}
                    onChange={(e) => setFormData({...formData, timeSlot: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-[#8a42db] focus:border-[#8a42db] block p-3 transition-colors outline-none"
                    placeholder="e.g. 10:30 AM"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Purpose of Visit</label>
                <select
                  value={formData.visitPurpose}
                  onChange={(e) => setFormData({...formData, visitPurpose: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-[#8a42db] focus:border-[#8a42db] block p-3 transition-colors outline-none"
                >
                  <option value="">Select purpose...</option>
                  <option value="Initial Introduction">Initial Introduction</option>
                  <option value="Follow-up / Reminder">Follow-up / Reminder</option>
                  <option value="Product Detailing">Product Detailing</option>
                  <option value="Sample Delivery">Sample Delivery</option>
                  <option value="CME Invitation">CME Invitation</option>
                  <option value="Relationship Building">Relationship Building</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Additional Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-[#8a42db] focus:border-[#8a42db] block p-3 transition-colors outline-none resize-none"
                  placeholder="Any specific talking points..."
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={handleCloseModal} className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-[#8a42db] text-white py-3 rounded-xl font-bold hover:bg-[#7e3acb] transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2">
                  <Save size={18} /> {editingVisit ? 'Update' : 'Save'} Visit
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
