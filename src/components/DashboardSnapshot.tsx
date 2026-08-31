import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Camera, X, MapPin, AlertCircle } from "lucide-react";
import { Language, CheckInLog, AttendanceRecord, LeaveBalance, Payslip, Employee } from "../types";
import { translations } from "../translations";
import LocationPinTimeline from "./LocationPinTimeline";
import TickerAlert from "./TickerAlert";
import { submitMissedPunchRequest } from "../lib/services/missed-punch-service";
import { fetchRoster } from "../lib/services/roster-service";

interface DashboardSnapshotProps {
  language: Language;
  currentUser: Employee;
  isCheckedIn: boolean;
  logs: CheckInLog[];
  attendanceRecords: AttendanceRecord[];
  leaveBalance: LeaveBalance;
  payslips: Payslip[];
  setActiveTab: (tab: string) => void;
  onToggleCheckIn: (photoData?: string, punchType?: import("../types").PunchType, punchNote?: string) => Promise<{success: boolean, geoError?: any, error?: string} | void>;
  pins: import("../types").LocationPin[];
  onAddPin: (pinType: import("../types").PinType, label?: string, photoData?: string) => Promise<{ success: boolean; error?: string }>;
}

export default function DashboardSnapshot({ language, currentUser, isCheckedIn, logs, attendanceRecords, leaveBalance, payslips, setActiveTab, onToggleCheckIn, pins, onAddPin }: DashboardSnapshotProps) {
  const t = translations[language];

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isPinCameraOpen, setIsPinCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [punchType, setPunchType] = useState<import("../types").PunchType>("in_office");
  const [punchNote, setPunchNote] = useState("");
  const [missedPunchDate, setMissedPunchDate] = useState<string | null>(null);
  const [missedPunchReason, setMissedPunchReason] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinType, setPinType] = useState<import("../types").PinType>("field_visit");
  const [pinLabel, setPinLabel] = useState("");
  const [isPinning, setIsPinning] = useState(false);
  const [todayShift, setTodayShift] = useState<import("../types").DutyRosterShift | null>(null);

  useEffect(() => {
    const fetchTodayShift = async () => {
      const today = new Date();
      // To get the start of the week for fetchRoster
      const d = new Date(today);
      const day = d.getDay() || 7; 
      if (day !== 1) d.setHours(-24 * (day - 1));
      d.setHours(0, 0, 0, 0);
      const weekStartStr = d.toLocaleDateString('en-CA');
      
      const data = await fetchRoster(weekStartStr);
      const todayStr = today.toLocaleDateString('en-CA');
      const publishedShift = data.find(s => s.employeeId === currentUser.id && s.shiftDate === todayStr && s.isPublished);
      setTodayShift(publishedShift || null);
    };
    fetchTodayShift();
  }, [currentUser.id]);

  // Attach stream using useEffect so the video DOM element is guaranteed to be mounted
  useEffect(() => {
    if ((isCameraOpen || isPinCameraOpen) && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraOpen, isPinCameraOpen]);

  const startCamera = async (isForPin: boolean = false) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not available. Access the app over HTTPS.");
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "user" } }, audio: false });
      } catch (firstErr: any) {
        if (firstErr.name === "NotAllowedError") throw firstErr;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      isForPin ? setIsPinCameraOpen(true) : setIsCameraOpen(true);
    } catch (err: any) {
      console.warn("Camera not available:", err.name, err.message);
      const isNoCamera = err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError';
      const isPermissionDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      if (isPermissionDenied) {
        alert(language === 'te' ? 'కెమెరా అనుమతి నిరాకరించబడింది. బ్రౌజర్ సెట్టింగ్స్‌లో కెమెరా అనుమతి ఇవ్వండి.' : 'Camera permission denied. Please allow Camera access in your browser address bar and reload.');
      } else if (!isNoCamera) {
        alert(language === 'te' ? 'కెమెరా అందుబాటులో లేదు. ఫోటో లేకుండా ముందుకు వెళ్తాము.' : `Camera error: ${err.message}. Proceeding without photo.`);
      }
      isForPin ? handlePinSubmit(undefined) : proceedWithCheckIn(undefined);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsCameraOpen(false);
    setIsPinCameraOpen(false);
  };

  const proceedWithCheckIn = async (photoData?: string) => {
    setIsProcessing(true);
    const result = await onToggleCheckIn(photoData, punchType, punchNote);
    setIsProcessing(false);
    if (result && !result.success) {
      if (result.error) {
        if (result.error.startsWith("missed_punchout:")) setMissedPunchDate(result.error.split(":")[1]);
        else alert(result.error);
      }
    }
  };

  const handleCaptureAndCheckIn = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const MAX_WIDTH = 480;
    let w = video.videoWidth, h = video.videoHeight;
    if (w > MAX_WIDTH) { h = Math.floor(h * (MAX_WIDTH / w)); w = MAX_WIDTH; }
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const photoData = canvas.toDataURL("image/jpeg", 0.6);
    stopCamera();
    await proceedWithCheckIn(photoData);
  };

  const handleSubmitMissedPunchRequest = async () => {
    if (!missedPunchDate) return;
    setIsSubmittingRequest(true);
    try {
      await submitMissedPunchRequest(currentUser.id, missedPunchDate, "out", missedPunchReason);
      setRequestSubmitted(true);
    } catch (err: any) {
      alert("Failed to submit: " + (err.message || JSON.stringify(err)));
    } finally { setIsSubmittingRequest(false); }
  };

  const handlePinSubmit = async (photoData?: string) => {
    setIsPinning(true);
    const result = await onAddPin(pinType, pinLabel, photoData);
    setIsPinning(false);
    if (result.success) { setIsPinModalOpen(false); setPinLabel(""); }
    else alert(result.error || "Failed to pin location");
  };

  const handleCaptureAndPin = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoData = canvas.toDataURL("image/jpeg", 0.7);
    stopCamera();
    await handlePinSubmit(photoData);
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter(l => l.date === todayStr);
  const latestCheckIn = todayLogs[todayLogs.length - 1];
  const hasCheckedOutToday = !!(latestCheckIn && latestCheckIn.checkOutTime !== null);
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const presentDays = attendanceRecords.filter(r => r.date.startsWith(currentMonthStr) && r.status === "present").length;
  const sickLeft = leaveBalance.sick.allowed - leaveBalance.sick.taken;
  const casualLeft = leaveBalance.casual.allowed - leaveBalance.casual.taken;
  let totalLeft = sickLeft + casualLeft;
  if (leaveBalance.maternity) totalLeft += leaveBalance.maternity.allowed - leaveBalance.maternity.taken;
  if (leaveBalance.paternity) totalLeft += leaveBalance.paternity.allowed - leaveBalance.paternity.taken;
  const todayWorkedSecs = logs.filter(l => l.date === todayStr && l.checkOutTime !== null).reduce((acc, log) => {
    if (log.checkInTime && log.checkOutTime) {
      const [h1,m1,s1] = log.checkInTime.split(":").map(Number);
      const [h2,m2,s2] = log.checkOutTime.split(":").map(Number);
      return acc + ((h2*3600+m2*60+s2)-(h1*3600+m1*60+s1));
    } return acc;
  }, 0);
  const todayWorkedHrs = (todayWorkedSecs / 3600).toFixed(2);
  const latestPayslip = payslips[0];
  const formattedSalary = latestPayslip
    ? new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(latestPayslip.basicPay+latestPayslip.allowances.reduce((a,x)=>a+x.amount,0)-latestPayslip.deductions.reduce((a,x)=>a+x.amount,0))
    : "₹28,450";
  const salaryMonth = latestPayslip ? (language==="te"?"నికర జీతం":`Net Salary`) : "Net Salary";

  return (
    <div id="dashboard-snapshot-container" className="space-y-6 sm:space-y-8 animate-fadeIn">
      <TickerAlert employees={[currentUser]} />

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div id="today-status-snap" className="lg:col-span-8 bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-4 text-center sm:text-left">
            <div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isCheckedIn?"bg-teal-100 text-teal-700 animate-pulse":"bg-slate-100 text-slate-500"}`}>
                {isCheckedIn?(language==="te"?"పనిలో ఉన్నారు":"Active Now"):(language==="te"?"హాజరు కాలేదు":"Not Checked-In")}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mt-3 leading-tight">{isCheckedIn?t.checkedIn:t.checkedOut}</h2>
              <p className="text-slate-500 text-sm mt-1">
                {isCheckedIn?`${language==="te"?"మీరు విజయవంతంగా లోపలికి వచ్చారు":"You are checked in"} (${latestCheckIn?.checkInTime||""})`:hasCheckedOutToday?(language==="te"?"ఈ రోజు మీ షిఫ్ట్ ముగిసింది":"You have completed your shift for today."):(language==="te"?"మీ హాజరును ఇప్పుడే రికార్డ్ చేయండి":"Tap to register your shift presence today.")}
              </p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-4">
              {[{label:"Shift Start",val:latestCheckIn?.checkInTime || todayShift?.shiftStart || "09:00 AM"},{label:"Worked Today",val:isCheckedIn?"Live Running":`${todayWorkedHrs} hrs`},{label:"Shift Stops",val:latestCheckIn?.checkOutTime || todayShift?.shiftEnd || "Pending"}].map(item=>(
                <div key={item.label} className="text-center bg-slate-50 px-4 py-2 rounded-xl min-w-[100px]">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">{item.label}</p>
                  <p className="text-xs font-bold text-slate-700">{item.val}</p>
                </div>
              ))}
            </div>
            {isCheckedIn&&(<div className="mt-6 flex justify-center sm:justify-start"><button onClick={()=>setIsPinModalOpen(true)} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-xl transition-colors active:scale-95 border border-slate-200"><MapPin className="w-4 h-4 text-rose-500"/>{language==="te"?"లొకేషన్ పిన్ చేయండి":"Pin Location Now"}</button></div>)}
          </div>
          <button id="go-to-checkin-tab" onClick={hasCheckedOutToday?undefined:()=>startCamera(false)} disabled={hasCheckedOutToday||isProcessing} className={`w-40 h-40 rounded-full border-[12px] flex flex-col items-center justify-center text-white transition-all duration-300 relative ${hasCheckedOutToday?"border-slate-100 bg-slate-300 cursor-not-allowed":isCheckedIn?"border-rose-50 bg-rose-500 hover:bg-rose-600 shadow-xl shadow-rose-200 active:scale-95 cursor-pointer":"border-teal-50 bg-teal-600 hover:bg-teal-700 shadow-xl shadow-teal-100 active:scale-95 cursor-pointer"}`}>
            {isProcessing?<span className="text-xs font-bold animate-pulse">Processing...</span>:<><span className="font-black uppercase tracking-tighter text-sm">{hasCheckedOutToday?"Completed":isCheckedIn?"Punch Out":"Punch In"}</span><span className="text-[10px] opacity-80 mt-1">{hasCheckedOutToday?"పూర్తయింది":isCheckedIn?"వెళ్ళిపోండి":"లోపలికి రండి"}</span></>}
          </button>
        </div>

        {pins.filter(p=>p.date===todayStr).length>0&&(<div className="lg:col-span-12"><LocationPinTimeline language={language} pins={pins.filter(p=>p.date===todayStr)}/></div>)}

        <div id="leaves-balance-snap" onClick={()=>setActiveTab("leave")} className="lg:col-span-4 bg-teal-600 rounded-[32px] p-8 text-white relative overflow-hidden flex flex-col justify-between shadow-lg shadow-teal-100/50 min-h-[250px] cursor-pointer group hover:bg-teal-700 transition-all duration-300">
          <div className="relative z-10"><h3 className="text-lg font-bold tracking-tight">{t.snapLeaveTitle}</h3><p className="text-teal-100 text-xs">సెలవు నిల్వ</p></div>
          <div className="relative z-10 flex items-baseline gap-1.5 my-3"><span className="text-6xl font-black leading-none">{totalLeft.toString().padStart(2,"0")}</span><span className="text-teal-100 uppercase text-xs font-bold tracking-wider">{t.leaveLeftOf.split(" ")[0]}</span></div>
          <div className="relative z-10 bg-white/10 rounded-2xl p-4 flex justify-between items-center text-xs"><div><p className="font-semibold">{t.leaveSick.split(" ")[0]}: {sickLeft} days</p><p className="opacity-70 mt-0.5 italic">{t.btnSubmitLeave.split(" ")[0]}</p></div><div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center group-hover:translate-x-1.5 transition-all">→</div></div>
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-teal-500 rounded-full opacity-40 pointer-events-none"/>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[320px]">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">{t.attendance}</h4>
              <span className="text-teal-600 font-bold text-xs uppercase">{new Date().toLocaleString("en-IN",{month:"long",year:"numeric"}).toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-end gap-2.5 h-24 my-4">
              {[40,70,55,80,65].map((h,i)=>(<div key={i} className="flex-1 bg-slate-100 rounded-t-lg hover:bg-slate-200 transition-colors" style={{height:`${h}%`}}/>))}
              <div className="flex-1 bg-teal-500 rounded-t-lg h-full shadow-md shadow-teal-500/20"/>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">{language==="te"?`ఈ నెలలో మీరు ${presentDays} రోజులు పనికి హాజరయ్యారు.`:`You have been recorded present for ${presentDays} days this month.`}</p>
            <button onClick={()=>setActiveTab("attendance")} className="mt-4 text-xs font-bold text-teal-600 hover:text-teal-700 underline cursor-pointer">{language==="te"?"హాజరు షీట్ చూడండి":"View Full Sheet"}</button>
          </div>
        </div>
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[320px]">
          <div>
            <div className="flex justify-between items-center mb-6"><h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">{t.payroll}</h4><button onClick={()=>setActiveTab("payroll")} className="text-teal-600 font-bold text-xs underline cursor-pointer hover:text-teal-700">View PDF</button></div>
            <div className="py-2"><p className="text-xs text-slate-400 mb-1">{salaryMonth}</p><p className="text-3xl font-black text-slate-800 tracking-tighter">{formattedSalary}</p></div>
          </div>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3.5 flex gap-3 items-start"><div className="text-amber-600 shrink-0 mt-0.5"><Sparkles className="w-4 h-4 fill-amber-500 text-amber-500"/></div><p className="text-[10px] text-amber-800 leading-tight font-medium">{language==="te"?"మీ జీతం బ్యాంక్ ఖాతాకు నేరుగా జమ చేయబడింది.":"Credited directly via bank transfer."}</p></div>
            <button onClick={()=>setActiveTab("payroll")} className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer text-center">{language==="te"?"జీతం రశీదు తెరవండి":"Open Salary Slips"}</button>
          </div>
        </div>
      </section>

      {/* Camera Modal — Punch In/Out */}
      {isCameraOpen&&(
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl overflow-hidden max-w-md w-full shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Camera className="w-5 h-5 text-teal-600"/>{language==="te"?"ఫోటో తీయండి":isCheckedIn?"Photo Punch-Out":"Photo Punch-In"}</h3>
              <button onClick={stopCamera} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500"/></button>
            </div>
            <div className="relative bg-black aspect-video"><video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"/><canvas ref={canvasRef} className="hidden"/><div className="absolute inset-0 border-4 border-teal-500/30 m-4 rounded-xl pointer-events-none"/></div>
            <div className="p-6 flex flex-col items-center gap-4">
              {!isCheckedIn&&(<div className="w-full"><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t.selectPunchType||"Punch Category"}</label><div className="grid grid-cols-2 gap-3">{(["in_office","out_of_office"] as const).map(pt=>(<button key={pt} onClick={()=>setPunchType(pt)} className={`py-3 px-2 rounded-xl text-xs font-bold border-2 transition-all ${punchType===pt?"border-teal-500 bg-teal-50 text-teal-700":"border-slate-100 bg-white text-slate-500 hover:border-slate-200"}`}>{pt==="in_office"?(t.punchTypeInOffice||"In Office"):(t.punchTypeOutOfOffice||"Medical Camp")}</button>))}</div></div>)}
              {punchType==="out_of_office"&&!isCheckedIn&&(<div className="w-full"><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{language==="te"?"లొకేషన్ నోట్":"Location Note (Required)"}</label><input type="text" value={punchNote} onChange={e=>setPunchNote(e.target.value)} placeholder={language==="te"?"మీరు ఎక్కడ ఉన్నారో రాయండి...":"e.g. Medical Camp, Field Visit..."} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20"/></div>)}
              <p className="text-xs text-slate-500 text-center">{language==="te"?"హాజరు నమోదు చేయడానికి దయచేసి మీ ఫోటో తీయండి.":"Please capture your photo to record attendance."}</p>
              <button onClick={()=>{if(punchType==="out_of_office"&&!isCheckedIn&&!punchNote.trim()){alert(language==="te"?"దయచేసి ఒక నోట్ రాయండి.":"Please enter a location note.");return;}handleCaptureAndCheckIn();}} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all flex items-center gap-2 w-full justify-center active:scale-95"><Camera className="w-5 h-5"/>{language==="te"?(isCheckedIn?"ఫోటో తీసి పంచ్ అవుట్ చేయండి":"ఫోటో తీసి పంచ్ ఇన్ చేయండి"):(isCheckedIn?"Capture & Punch Out":"Capture & Punch In")}</button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal — Pin Location */}
      {isPinCameraOpen&&(
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl overflow-hidden max-w-md w-full shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-800 flex items-center gap-2"><Camera className="w-5 h-5 text-teal-600"/>{language==="te"?"పిన్ ఫోటో":"Pin Photo"}</h3><button onClick={stopCamera} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500"/></button></div>
            <div className="relative bg-black aspect-video"><video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover"/><canvas ref={canvasRef} className="hidden"/><div className="absolute inset-0 border-4 border-teal-500/30 m-4 rounded-xl pointer-events-none"/></div>
            <div className="p-6"><button onClick={handleCaptureAndPin} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all flex items-center gap-2 w-full justify-center active:scale-95"><Camera className="w-5 h-5"/>{language==="te"?"ఫోటో తీయండి":"Capture & Pin"}</button></div>
          </div>
        </div>
      )}

      {/* Missed Punch-Out Modal */}
      {missedPunchDate&&(
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-4">
            {!requestSubmitted?(<>
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto"><AlertCircle className="w-8 h-8"/></div>
              <h3 className="text-xl font-bold text-slate-800">{language==="te"?"పంచ్ అవుట్ మిస్ అయింది":"Missed Punch-Out Detected"}</h3>
              <p className="text-sm text-slate-500 text-left bg-amber-50 rounded-xl p-3 border border-amber-100">{language==="te"?`మీరు ${missedPunchDate} న పంచ్ అవుట్ చేయలేదు.`:`You did not punch out on ${missedPunchDate}. Please submit a request to Admin.`}</p>
              <div className="text-left"><label className="block text-xs font-bold text-slate-700 mb-1">{language==="te"?"కారణం (ఐచ్ఛికం)":"Reason (Optional)"}</label><textarea value={missedPunchReason} onChange={e=>setMissedPunchReason(e.target.value)} placeholder={language==="te"?"ఉదా: అత్యవసర పరిస్థితి":"e.g. Had an emergency"} rows={3} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/30"/></div>
              <div className="flex gap-3 pt-2">
                <button onClick={()=>{setMissedPunchDate(null);setMissedPunchReason("");}} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-xs uppercase tracking-wider">{language==="te"?"రద్దు":"Cancel"}</button>
                <button onClick={handleSubmitMissedPunchRequest} disabled={isSubmittingRequest} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors text-xs uppercase tracking-wider shadow-md disabled:opacity-60">{isSubmittingRequest?(language==="te"?"పంపుతున్నారు...":"Submitting..."):(language==="te"?"అడ్మిన్‌కు అభ్యర్థించు":"Request Admin Access")}</button>
              </div>
            </>):(<>
              <div className="w-16 h-16 bg-teal-50 text-teal-500 rounded-full flex items-center justify-center mx-auto"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg></div>
              <h3 className="text-xl font-bold text-slate-800">{language==="te"?"అభ్యర్థన పంపబడింది":"Request Submitted!"}</h3>
              <p className="text-sm text-slate-500">{language==="te"?"మీ అభ్యర్థన అడ్మిన్‌కు పంపబడింది.":"Your request has been sent to Admin. Once approved, you can punch in normally."}</p>
              <button onClick={()=>{setMissedPunchDate(null);setMissedPunchReason("");setRequestSubmitted(false);}} className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors text-xs uppercase tracking-wider shadow-md">{language==="te"?"సరే":"Got It"}</button>
            </>)}
          </div>
        </div>
      )}

      {/* Pin Location Modal */}
      {isPinModalOpen&&(
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-rose-500"/>{language==="te"?"లొకేషన్ పిన్ చేయండి":"Pin Current Location"}</h3><button onClick={()=>setIsPinModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500"/></button></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-xs font-bold text-slate-700 mb-2">{language==="te"?"పిన్ రకం":"Pin Type"}</label><select value={pinType} onChange={e=>setPinType(e.target.value as import("../types").PinType)} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20"><option value="field_visit">Field Visit / ఫీల్డ్ విజిట్</option><option value="medical_camp">Medical Camp / మెడికల్ క్యాంప్</option><option value="client_site">Client Site / క్లయింట్ సైట్</option><option value="delivery">Delivery / డెలివరీ</option><option value="other">Other / ఇతర</option></select></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-2">{language==="te"?"వివరాలు (ఐచ్ఛికం)":"Label (Optional)"}</label><input type="text" value={pinLabel} onChange={e=>setPinLabel(e.target.value)} placeholder={language==="te"?"ఉదా: గాజువాక క్యాంప్":"e.g. Gajuwaka Medical Camp"} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20"/></div>
              <div className="pt-2 flex flex-col gap-3">
                <button onClick={()=>startCamera(true)} disabled={isPinning} className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"><Camera className="w-4 h-4"/>{isPinning?"Processing...":(language==="te"?"ఫోటోతో పిన్ చేయండి":"Capture Photo & Pin")}</button>
                <button onClick={()=>handlePinSubmit(undefined)} disabled={isPinning} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors disabled:opacity-50">{language==="te"?"ఫోటో లేకుండా పిన్ చేయండి":"Skip Photo & Pin"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
