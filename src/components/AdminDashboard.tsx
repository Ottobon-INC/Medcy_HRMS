import React, { useState, useEffect } from 'react';
import { ArrowRight, Users, CheckCircle, Clock, AlertCircle, MapPin, ChevronRight } from 'lucide-react';
import { Language, Employee, LeaveRequest } from '../types';
import { translations } from '../translations';
import TickerAlert from './TickerAlert';
import { countPendingMissedPunches } from '../lib/services/missed-punch-service';

interface AdminDashboardProps {
  language: Language;
  employees: Employee[];
  setActiveTab: (tab: string) => void;
}

export default function AdminDashboard({ language, employees, setActiveTab }: AdminDashboardProps) {
  const t = translations[language];
  const [tick, setTick] = useState(0);
  const [pendingMissedCount, setPendingMissedCount] = useState(0);

  useEffect(() => {
    const fetchMissed = async () => {
      const count = await countPendingMissedPunches();
      setPendingMissedCount(count);
    };
    
    fetchMissed(); // Initial fetch
    
    const timer = setInterval(() => {
      setTick(t => t + 1);
      fetchMissed(); // Refresh count every minute
    }, 60000); 
    
    return () => clearInterval(timer);
  }, []);

  // Calculate snapshot metrics
  const totalEmployees = employees.length;
  
  // Checking active today
  const checkedInToday = employees.filter(emp => emp.isCheckedIn).length;
  
  const inactiveEmployees = employees.filter(emp => emp.status === 'inactive').length;
  
  // Pending leaves across everyone
  const pendingRequests: { req: LeaveRequest; empName: string; empId: string }[] = [];
  employees.forEach(emp => {
    emp.leaveRequests.forEach(req => {
      if (req.status === 'pending') {
        pendingRequests.push({ req, empName: emp.name, empId: emp.id });
      }
    });
  });
  const pendingCount = pendingRequests.length;

  const localizedText = {
    en: {
      title: "Admin Management Dashboard",
      subtitle: "Medcy Health Tech Clinic Overview",
      summaryCardTitle: "Admin Quick Snapshot",
      quickActionTitle: "Quick Management Actions",
      recentLeavesTitle: "Recent Pending Leaves Requiring Decision",
      allCheckedIn: "View who is active in the directory.",
      actionApprove: "Go to Leave Approvals",
      actionDirectory: "View Directory",
      actionAttendance: "View Company Attendance",
      actionFieldOps: "View Field Operations",
      activeLabel: "Checked In",
      onLeaveLabel: "On Leave",
      absentLabel: "Absent",
    },
    te: {
      title: "Admin Management Dashboard",
      subtitle: "Medcy Health Tech Clinic Overview",
      summaryCardTitle: "Admin Quick Snapshot",
      quickActionTitle: "Quick Management Actions",
      recentLeavesTitle: "Recent Pending Leaves Requiring Decision",
      allCheckedIn: "View who is active in the directory.",
      actionApprove: "Go to Leave Approvals",
      actionDirectory: "View Directory",
      actionAttendance: "View Company Attendance",
      actionFieldOps: "View Field Operations",
      activeLabel: "Checked In",
      onLeaveLabel: "On Leave",
      absentLabel: "Absent",
      inactiveEmployees: "Inactive Staff",
      checkInFeedTitle: "Today's Live Check-In Feed",
      noCheckIns: "No staff checked in yet today.",
    }
  }[language];

  // Get today's date string
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Collect today's check-ins with location
  const todaysCheckIns = employees
    .map(emp => {
      const todayLog = emp.checkInLogs.find(log => log.date === todayStr);
      return {
        emp,
        log: todayLog
      };
    })
    .filter(item => item.log && item.log.checkInTime)
    .sort((a, b) => (b.log!.checkInTime > a.log!.checkInTime ? 1 : -1));

  return (
    <div id="admin-dashboard-container" className="space-y-6 animate-fadeIn">
      
      {/* Ticker Alerts */}
      <TickerAlert employees={employees} />

      {/* 1. Header Hero Panel */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 text-center md:text-left z-10">
          <span className="px-3 py-1 rounded-full text-[10px] bg-purple-100 text-purple-700 font-bold uppercase tracking-wider">
            Administrator Control Panel
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800 leading-tight">
            {localizedText.title}
          </h2>
          <p className="text-xs text-slate-400">
            {localizedText.subtitle}
          </p>
        </div>

        <div className="flex gap-3 shrink-0 z-10">
          <button
            onClick={() => setActiveTab('directory')}
            className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all uppercase tracking-wide cursor-pointer active:scale-95 shadow-md shadow-teal-600/10"
          >
            {localizedText.actionDirectory}
          </button>
        </div>

        {/* Decorative background circle */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-teal-50/25 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. Numeric Snapshot Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Card 1: Total Employees */}
        <div 
          onClick={() => setActiveTab('directory')}
          className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 cursor-pointer hover:-translate-y-1"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.totalEmployees}</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black font-mono text-slate-800">{totalEmployees.toString().padStart(2, '0')}</span>
              <span className="text-xs text-slate-400 font-medium">{language === 'te' ? 'మంది' : 'active'}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 border-t border-slate-50 pt-3">
            {language === 'te' ? 'కంపెనీలో మొత్తం స్టాఫ్' : 'Total staff onboarded'}
          </p>
        </div>

        {/* Card 2: Punched In Today */}
        <div 
          onClick={() => setActiveTab('attendanceOverview')}
          className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 cursor-pointer hover:-translate-y-1"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.checkedInToday}</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black font-mono text-slate-800">{checkedInToday.toString().padStart(2, '0')}</span>
              <span className="text-xs text-slate-400 font-medium">/ {totalEmployees}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 border-t border-slate-50 pt-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {localizedText.allCheckedIn}
          </p>
        </div>

        {/* Card 3: Pending Leaves */}
        <div 
          onClick={() => setActiveTab('leaveApprovals')}
          className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 cursor-pointer hover:-translate-y-1"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.pendingLeaves}</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black font-mono text-slate-800">{pendingCount.toString().padStart(2, '0')}</span>
              <span className="text-xs text-slate-400 font-medium">{language === 'te' ? 'అభ్యర్థనలు' : 'pending'}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 border-t border-slate-50 pt-3">
            {language === 'te' ? 'ఆమోదం కొరకు వెయిటింగ్' : 'Requires quick manager attention'}
          </p>
        </div>

        {/* Card 4: Pending Missed Punches */}
        <div 
          onClick={() => setActiveTab('adminMissedPunches')}
          className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 cursor-pointer hover:-translate-y-1"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === 'te' ? 'మిస్ అయిన పంచ్ అవుట్స్' : 'Missed Punches'}
              </span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl sm:text-4xl font-black font-mono text-slate-800">{pendingMissedCount.toString().padStart(2, '0')}</span>
              <span className="text-xs text-slate-400 font-medium">{language === 'te' ? 'అభ్యర్థనలు' : 'requests'}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4 border-t border-slate-50 pt-3 text-rose-500 font-medium">
            {language === 'te' ? 'పెండింగ్ అప్రూవల్స్' : 'Action required in Attendance'}
          </p>
        </div>

      </div>

      {/* 3. Bottom Columns: Quick Action Panels and Recent Pending Leaves */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN (lg:col-span-4): Quick Action Panel */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-6">
              {localizedText.quickActionTitle}
            </h3>

            <div className="space-y-3">
              {/* Directory */}
              <button 
                onClick={() => setActiveTab('directory')}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-teal-50 hover:text-teal-700 transition-colors text-left border border-slate-100 cursor-pointer text-xs font-bold text-slate-700"
              >
                <span>{localizedText.actionDirectory}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
              
              {/* Attendance */}
              <button 
                onClick={() => setActiveTab('attendanceOverview')}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-teal-50 hover:text-teal-700 transition-colors text-left border border-slate-100 cursor-pointer text-xs font-bold text-slate-700"
              >
                <span>{localizedText.actionAttendance}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Leave Approvals */}
              <button 
                onClick={() => setActiveTab('leaveApprovals')}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-teal-50 hover:text-teal-700 transition-colors text-left border border-slate-100 cursor-pointer text-xs font-bold text-slate-700"
              >
                <span>{localizedText.actionApprove}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Field Operations */}
              <button 
                onClick={() => setActiveTab('fieldOps')}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-teal-50 hover:text-teal-700 transition-colors text-left border border-slate-100 cursor-pointer text-xs font-bold text-slate-700"
              >
                <span>{localizedText.actionFieldOps}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="mt-8 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-amber-900 leading-normal text-xs font-medium">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p>
              {language === 'te'
                ? "అడ్మిన్ పనులన్నీ నేరుగా ఉద్యోగుల వ్యూ లో అప్డేట్ అవుతాయి."
                : "All administrator updates instantly sync and reflect on employee mobile and desktop portals."
              }
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN (lg:col-span-8): Recent Pending Leaves List */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-50">
            <h3 className="text-base font-bold text-slate-800">
              {localizedText.recentLeavesTitle}
            </h3>
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 rounded-full">
              {pendingCount} {language === 'te' ? 'పెండింగ్' : 'Pending'}
            </span>
          </div>

          {pendingCount === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium">
              {language === 'te' 
                ? 'ఆమోదం కొరకు ఎలాంటి లీవ్ రిక్వెస్ట్లు లేవు.' 
                : 'Excellent! No pending leave requests to process.'
              }
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.slice(0, 3).map(({ req, empName, empId }) => {
                const empObj = employees.find(e => e.id === empId);
                const empBranch = empObj?.branch || 'visakhapatnam';
                return (
                <div key={req.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-800">{empName}</span>
                      <span className="text-[10px] text-slate-400 font-medium">({empId})</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        empBranch === 'visakhapatnam' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {empBranch === 'visakhapatnam' ? 'Vizag' : 'Vizianagaram'}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-teal-700">
                      {req.type.toUpperCase()} LEAVE • {req.fromDate} to {req.toDate}
                    </p>
                    <p className="text-xs text-slate-500 italic">
                      "{req.reason}"
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('leaveApprovals')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wide cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{language === 'te' ? 'నిర్ణయం తీసుకోండి' : 'Process Request'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                );
              })}
              
              {pendingCount > 3 && (
                <button
                  onClick={() => setActiveTab('leaveApprovals')}
                  className="w-full text-center py-2.5 border border-dashed border-slate-200 hover:border-teal-500 rounded-xl text-xs font-bold text-slate-500 hover:text-teal-600 transition-all"
                >
                  {language === 'te' ? `మిగిలిన ${pendingCount - 3} రిక్వెస్ట్లను చూడండి` : `View Remaining ${pendingCount - 3} Requests`}
                </button>
              )}
            </div>
          )}
        </div>

      </div>

      {/* 4. Today's Check-In Feed (Locations) */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-50">
          <MapPin className="w-5 h-5 text-teal-600" />
          <h3 className="text-base font-bold text-slate-800">
            {language === 'te' ? 'ఈ రోజు పంచ్ ఇన్ ఫీడ్ (స్థానాలు)' : "Today's Punch-In Feed & Locations"}

          </h3>
        </div>

        {todaysCheckIns.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-slate-100/50 border-dashed">
            {language === 'te' ? 'ఈ రోజు ఇంకా ఎవరూ పంచ్ ఇన్ చేయలేదు.' : 'No punch-ins recorded yet today.'}

          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaysCheckIns.map(({ emp, log }) => (
              <div key={emp.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-teal-100 text-teal-700 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0">
                      {emp.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-800">{emp.name}</h4>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          (emp.branch || 'visakhapatnam') === 'visakhapatnam' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {(emp.branch || 'visakhapatnam') === 'visakhapatnam' ? 'Vizag' : 'Vizianagaram'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">{emp.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 shadow-sm">
                      {log!.checkInTime.substring(0, 5)}
                    </span>
                    {!log!.checkOutTime && (
                      <span className="px-2 py-1 bg-teal-50 border border-teal-100 rounded-lg text-[10px] font-bold text-teal-700 shadow-sm flex items-center gap-1">
                        <Clock className="w-3 h-3 animate-pulse" />
                        {(() => {
                          const [h, m, s] = log!.checkInTime.split(':').map(Number);
                          const checkInDate = new Date();
                          checkInDate.setHours(h, m, s, 0);
                          let diffMs = new Date().getTime() - checkInDate.getTime();
                          if (diffMs < 0) diffMs = 0;
                          const totalSecs = Math.floor(diffMs / 1000);
                          const hrs = Math.floor(totalSecs / 3600);
                          const mins = Math.floor((totalSecs % 3600) / 60);
                          return `${hrs}h ${mins}m`;
                        })()}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 pt-3 border-t border-slate-100/80">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {log!.checkInLocation || (language === 'te' ? 'లొకేషన్ అందుబాటులో లేదు' : 'Location unavailable')}
                    </p>
                  </div>
                  {log!.punchNote && (
                    <div className="mt-1 ml-5 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                      <p className="text-[10px] text-amber-800 font-medium italic">
                        <span className="font-bold mr-1">Note:</span>
                        {log!.punchNote}
                      </p>
                    </div>
                  )}
                  {log!.checkInLatLng && (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${log!.checkInLatLng}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] text-teal-600 hover:text-teal-700 font-bold ml-5"
                    >
                      {language === 'te' ? 'మ్యాప్‌లో చూడండి' : 'View on map'} →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
