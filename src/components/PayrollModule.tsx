import React, { useState } from 'react';
import { Check, Edit2, Save, X, Printer, Plus, Trash2 } from 'lucide-react';
import { Language, Payslip, Allowance, Deduction, BankDetails, AttendanceRecord, LeaveRequest } from '../types';
import { translations } from '../translations';
import { numberToWords, formatMonth } from '../lib/utils';
import { computeAttendanceStats } from '../lib/utils/attendance-stats';
import SmsLogo from './SmsLogo';

interface PayrollModuleProps {
  language: Language;
  payslips: Payslip[];
  employeeName?: string;
  employeeId?: string;
  employeeEmail?: string;
  employeeDesignation?: string;
  employeeJoiningDate?: string;
  employeeExperience?: number;
  employeeBankDetails?: BankDetails;
  onUpdatePayslip: (updatedSlip: Payslip) => void;
  onUpdateBankDetails?: (details: BankDetails) => void;
  attendanceRecords?: AttendanceRecord[];
  leaveRequests?: LeaveRequest[];
}

export default function PayrollModule({
  language,
  payslips,
  employeeName = 'Ravi Kumar',
  employeeId = 'EMP-2026-089',
  employeeEmail = 'employee@example.com',
  employeeDesignation = 'Software Engineer',
  employeeJoiningDate,
  employeeExperience,
  employeeBankDetails,
  onUpdatePayslip,
  onUpdateBankDetails,
  attendanceRecords = [],
  leaveRequests = []
}: PayrollModuleProps) {
  const t = translations[language];

  // Selected payslip state
  const [selectedSlipId, setSelectedSlipId] = useState(payslips[0]?.id || '');

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [draftBasicPay, setDraftBasicPay] = useState<number>(0);
  const [draftAllowances, setDraftAllowances] = useState<Allowance[]>([]);
  const [draftDeductions, setDraftDeductions] = useState<Deduction[]>([]);
  const [draftAdvanceTaken, setDraftAdvanceTaken] = useState<boolean>(false);
  const [draftAdvanceAmount, setDraftAdvanceAmount] = useState<number>(0);
  
  const [draftWorkingDays, setDraftWorkingDays] = useState<number>(0);
  const [draftDaysPresent, setDraftDaysPresent] = useState<number>(0);
  const [draftLeavesTaken, setDraftLeavesTaken] = useState<number>(0);

  const [draftBankAccountNo, setDraftBankAccountNo] = useState<string>('');
  const [draftBankName, setDraftBankName] = useState<string>('');
  const [draftBankIfsc, setDraftBankIfsc] = useState<string>('');
  const [draftBankAccountType, setDraftBankAccountType] = useState<string>('savings');

  const activeSlip = payslips.find(p => p.id === selectedSlipId) || payslips[0];

  if (!activeSlip) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center text-slate-500 shadow-sm border border-slate-100">
        {t.noData}
      </div>
    );
  }

  // --- Computed Fallback for Missing Stats ---
  // If the database is missing these columns (due to Supabase schema lag), compute them on the fly
  let displayWorkingDays = activeSlip.workingDays;
  let displayDaysPresent = activeSlip.daysPresent;
  let displayLeavesTaken = activeSlip.leavesTaken;
  
  let displayPaidLeaves = 0;
  let displayLopDays = 0;

  // Always compute dynamically from employee's actual attendance records + leave requests
  const stats = computeAttendanceStats(activeSlip.month, attendanceRecords, leaveRequests);
  displayWorkingDays = stats.workingDays;
  displayDaysPresent = stats.daysPresent;
  displayLeavesTaken = stats.leavesTaken;
  displayPaidLeaves = stats.paidLeaves;
  displayLopDays = stats.lopDays;
  const hasAttendanceData = stats.hasData;

  // Formatting helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Math Calculations (Live/Draft vs Standard)
  const basicPayValue = isEditing ? draftBasicPay : activeSlip.basicPay;
  const allowancesList = isEditing ? draftAllowances : activeSlip.allowances;
  const deductionsList = isEditing ? draftDeductions : activeSlip.deductions.filter(d => d.nameKey !== 'incomeTax');
  
  const advanceTaken = isEditing ? draftAdvanceTaken : activeSlip.advanceMoneyTaken;
  const advanceAmount = isEditing ? (draftAdvanceTaken ? draftAdvanceAmount : 0) : (activeSlip.advanceMoneyTaken ? activeSlip.advanceMoneyAmount || 0 : 0);

  const totalEarnings = basicPayValue + allowancesList.reduce((acc, a) => acc + a.amount, 0);
  const hasAdvanceInDeductions = deductionsList.some(d => d.nameKey.startsWith('advanceInstallment'));
  const totalDeductions = deductionsList.reduce((acc, d) => acc + d.amount, 0) + (hasAdvanceInDeductions ? 0 : advanceAmount);
  const netPay = totalEarnings - totalDeductions;

  // Advance Eligibility
  let isEligibleForAdvance = false;
  if (employeeExperience && employeeExperience >= 1) {
    isEligibleForAdvance = true;
  } else if (employeeJoiningDate) {
    const joinDate = new Date(employeeJoiningDate);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    isEligibleForAdvance = joinDate <= oneYearAgo;
  }

  // Handle Print Action
  const handlePrint = () => {
    window.print();
  };

  // Start Editing Draft
  const startEditing = () => {
    setDraftBasicPay(activeSlip.basicPay);
    setDraftAllowances([...activeSlip.allowances]);
    setDraftDeductions(activeSlip.deductions.filter(d => d.nameKey !== 'incomeTax'));
    setDraftAdvanceTaken(activeSlip.advanceMoneyTaken || false);
    setDraftAdvanceAmount(activeSlip.advanceMoneyAmount || 0);
    setDraftWorkingDays(displayWorkingDays || 0);
    setDraftDaysPresent(displayDaysPresent || 0);
    setDraftLeavesTaken(displayLeavesTaken || 0);
    setDraftBankAccountNo(employeeBankDetails?.accountNumber || '');
    setDraftBankName(employeeBankDetails?.bankName || '');
    setDraftBankIfsc(employeeBankDetails?.ifsc || '');
    setDraftBankAccountType(employeeBankDetails?.accountType || 'savings');
    setIsEditing(true);
  };

  // Allowance handlers
  const handleAddAllowance = () => {
    setDraftAllowances([...draftAllowances, { nameKey: 'specialAllow', amount: 0 }]);
  };

  const handleUpdateAllowance = (index: number, field: keyof Allowance, value: any) => {
    setDraftAllowances(draftAllowances.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveAllowance = (index: number) => {
    setDraftAllowances(draftAllowances.filter((_, idx) => idx !== index));
  };

  // Deduction handlers
  const handleAddDeduction = () => {
    setDraftDeductions([...draftDeductions, { nameKey: 'professionalTax', amount: 0 }]);
  };

  const handleUpdateDeduction = (index: number, field: keyof Deduction, value: any) => {
    setDraftDeductions(draftDeductions.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveDeduction = (index: number) => {
    setDraftDeductions(draftDeductions.filter((_, idx) => idx !== index));
  };

  // Save changes
  const handleSaveChanges = () => {
    if (onUpdatePayslip) {
      onUpdatePayslip({
        ...activeSlip,
        basicPay: draftBasicPay,
        allowances: draftAllowances,
        deductions: draftDeductions,
        advanceMoneyTaken: draftAdvanceTaken,
        advanceMoneyAmount: draftAdvanceTaken ? draftAdvanceAmount : 0,
        workingDays: draftWorkingDays,
        daysPresent: draftDaysPresent,
        leavesTaken: draftLeavesTaken,
      });
    }
    if (onUpdateBankDetails) {
      onUpdateBankDetails({
        accountNumber: draftBankAccountNo,
        bankName: draftBankName,
        ifsc: draftBankIfsc,
        accountType: draftBankAccountType as any
      });
    }
    setIsEditing(false);
  };

  return (
    <div id="payroll-module-container" className="space-y-6">
      
      {/* Top Controller: Selector and Print/Edit Buttons */}
      <div id="payroll-top-panel" className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="w-1.5 h-1.5 bg-teal-600 rounded-full shrink-0" />
          <div>
            <h2 className="text-xl font-bold font-display text-slate-800">
              {t.payrollTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {onUpdatePayslip 
                ? (language === 'te' ? 'జీతాల వివరాలు సవరించండి మరియు పర్యవేక్షించండి' : 'Edit and inspect employee monthly payroll documents') 
                : t.payrollSelect}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Dropdown Selector */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
              {t.payrollSelect}:
            </label>
            <select
              id="payslip-month-select"
              value={selectedSlipId}
              disabled={isEditing}
              onChange={(e) => setSelectedSlipId(e.target.value)}
              className="border border-slate-200 bg-slate-50 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600/20 disabled:opacity-50"
            >
              {payslips.map(slip => {
                return (
                  <option key={slip.id} value={slip.id}>
                    {formatMonth(slip.month, language)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Admin Edit Trigger */}
          {onUpdatePayslip && !isEditing && (
            <button
              id="edit-payslip-btn"
              onClick={startEditing}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer border border-transparent"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{language === 'te' ? 'సవరించు' : 'Edit Payslip'}</span>
            </button>
          )}

          {/* Print Button */}
          {!isEditing && (
            <button id="print-payslip-btn" onClick={handlePrint} className="bg-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <Printer className="w-4 h-4" /> {t.print}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 0; }
        }
      `}</style>
      
      <div 
        id="printable-payslip" 
        className="bg-white p-5 sm:p-8 md:p-12 shadow-sm border border-slate-200 relative overflow-hidden transition-all duration-300 print:border-0 print:shadow-none print:p-12"
      >
        {/* Background Watermark zoomed in to completely hide the letterhead's top and bottom logos */}
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: 'url(/watermark.jpeg)',
            backgroundSize: '180% auto',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact'
          }}
        ></div>

        {/* Light overlay just in case the background image is too dark, ensuring text remains readable */}
        <div className="absolute inset-0 bg-white/50 pointer-events-none print:bg-white/50 z-0"></div>
        
        {!isEditing ? (
          <div className="font-sans text-sm text-black relative z-10">
            {/* 1. Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
              <div className="flex w-full items-center">
                <div className="shrink-0 pr-6">
                  <SmsLogo className="h-16 w-auto" />
                </div>
                <div className="flex-1 text-right">
                  <h1 className="text-2xl font-bold uppercase tracking-wider mb-1 text-teal-800">MEDCY HEALTH TECH</h1>
                  <p className="text-xs mb-1 text-slate-800 font-medium">Medcy Health Tech Clinic, Health Services Division</p>
                  <p className="text-xs text-slate-800 font-medium">contact@medcytech.com &nbsp;&nbsp;|&nbsp;&nbsp; www.medcytech.com</p>
                </div>
              </div>
            </div>

            {/* 2. Title */}
            <div className="text-center font-bold text-lg mb-6 uppercase tracking-wide">
              Pay slip for the month of {new Date(activeSlip.month + '-01').toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </div>

            {/* 3. Employee Info Grid */}
            <div className="grid grid-cols-2 border border-black mb-6">
              <div className="border-r border-black flex flex-col">
                <div className="flex border-b border-black last:border-b-0"><div className="w-1/2 p-2 border-r border-black font-semibold">Employee Code</div><div className="w-1/2 p-2">: {employeeId}</div></div>
                <div className="flex border-b border-black last:border-b-0"><div className="w-1/2 p-2 border-r border-black font-semibold">Base Location</div><div className="w-1/2 p-2">: Visakhapatnam</div></div>
                <div className="flex border-b border-black last:border-b-0"><div className="w-1/2 p-2 border-r border-black font-semibold">Date of Joining</div><div className="w-1/2 p-2">: {employeeJoiningDate ? new Date(employeeJoiningDate).toLocaleDateString('en-GB') : 'N/A'}</div></div>
              </div>
              <div className="flex flex-col">
                <div className="flex border-b border-black last:border-b-0"><div className="w-1/3 p-2 border-r border-black font-bold">Company:</div><div className="w-2/3 p-2 font-bold">MEDCY HEALTH TECH</div></div>
                <div className="flex border-b border-black last:border-b-0"><div className="w-1/3 p-2 border-r border-black font-bold">Email:</div><div className="w-2/3 p-2 font-medium">{employeeEmail || 'N/A'}</div></div>
                <div className="flex border-b border-black last:border-b-0"><div className="w-1/3 p-2 border-r border-black font-bold">Employee Name:</div><div className="w-2/3 p-2 font-bold">{employeeName}</div></div>
                <div className="flex border-b border-black last:border-b-0"><div className="w-1/3 p-2 border-r border-black font-bold">Designation:</div><div className="w-2/3 p-2">{employeeDesignation}</div></div>
                <div className="flex border-b border-black last:border-b-0"><div className="w-1/3 p-2 border-r border-black font-bold">Payslip #:</div><div className="w-2/3 p-2 font-mono text-xs">{activeSlip.id}</div></div>
              </div>
            </div>

            {/* 4. Attendance Summary */}
            <div className="grid grid-cols-8 border border-black text-center text-[10px] sm:text-xs">
              <div className="p-2 border-r border-black font-bold bg-gray-100">{t.workingDays || 'Working Days'}</div>
              <div className="p-2 border-r border-black">{displayWorkingDays ?? '-'}</div>
              <div className="p-2 border-r border-black font-bold bg-gray-100">{t.daysPresent || 'Days Present'}</div>
              <div className="p-2 border-r border-black">{displayDaysPresent}</div>
              <div className="p-2 border-r border-black font-bold bg-gray-100">{language === 'te' ? 'పెయిడ్ సెలవులు' : 'Paid Leaves'}</div>
              <div className="p-2 border-r border-black">{displayPaidLeaves}</div>
              <div className="p-2 border-r border-black font-bold bg-gray-100">{language === 'te' ? 'సెలవులు/LOP' : 'LOP Days'}</div>
              <div className="p-2">{displayLopDays}</div>
            </div>
            {!hasAttendanceData && (
              <div className="border border-t-0 border-black px-3 py-1 mb-6 bg-amber-50 text-amber-700 text-[9px] italic text-center">
                * No attendance data recorded for this month — please enter attendance in the Team Attendance module for accurate figures.
              </div>
            )}
            {hasAttendanceData && <div className="mb-6" />}

            {/* 5. Bank Details */}
            {employeeBankDetails && (
              <div className="grid grid-cols-6 border border-black mb-6 text-center">
                <div className="p-2 border-r border-black font-bold bg-gray-100">{t.bankName || 'Bank Name'}</div>
                <div className="p-2 border-r border-black col-span-2">{employeeBankDetails.bankName || '-'}</div>
                <div className="p-2 border-r border-black font-bold bg-gray-100">{t.bankAccountNo || 'Account No'}</div>
                <div className="p-2 col-span-2 font-mono">{employeeBankDetails.accountNumber || '-'}</div>
              </div>
            )}

            {/* 6. Earnings and Deductions Table */}
            <div className="border border-black mb-6">
              <div className="grid grid-cols-2 bg-gray-100 font-bold border-b border-black">
                <div className="p-2 border-r border-black text-center">Earnings</div>
                <div className="p-2 text-center">Deductions</div>
              </div>
              <div className="grid grid-cols-4 font-bold border-b border-black bg-gray-50">
                <div className="p-2 border-r border-black">Particulars</div><div className="p-2 border-r border-black text-right">Rate / Month (Rs.)</div>
                <div className="p-2 border-r border-black">Particulars</div><div className="p-2 text-right">Amount (Rs.)</div>
              </div>
              
              {/* Table Body (Flex columns to allow different row counts) */}
              <div className="grid grid-cols-2">
                
                {/* Earnings Column */}
                <div className="border-r border-black flex flex-col">
                  <div className="flex justify-between p-2"><span>Basic Salary</span><span>{activeSlip.basicPay.toLocaleString('en-IN')}</span></div>
                  {allowancesList.map((a, i) => (
                    <div key={i} className="flex justify-between p-2">
                      <span>{t[a.nameKey] || a.nameKey}</span>
                      <span>{a.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  {/* Fill empty space if earnings are fewer than deductions */}
                  {Array.from({ length: Math.max(0, deductionsList.length + (activeSlip.advanceMoneyTaken && !hasAdvanceInDeductions ? 1 : 0) - allowancesList.length) }).map((_, i) => (
                     <div key={`empty-e-${i}`} className="flex justify-between p-2 text-transparent"><span>-</span><span>-</span></div>
                  ))}
                </div>
                
                {/* Deductions Column */}
                <div className="flex flex-col">
                  {deductionsList.map((d, i) => (
                    <div key={i} className="flex justify-between p-2">
                      <span>
                        {d.nameKey === 'advanceInstallment' || d.nameKey === 'advanceInstallment_salary'
                          ? (language === 'te' ? 'జీతం అడ్వాన్స్ వాయిదా' : 'Salary Advance Installment')
                          : d.nameKey === 'advanceInstallment_medical'
                          ? (language === 'te' ? 'మెడికల్ ఎమర్జెన్సీ వాయిదా' : 'Medical Advance Installment')
                          : (t[d.nameKey] || d.nameKey)
                        }
                      </span>
                      <span>{d.amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  {!hasAdvanceInDeductions && activeSlip.advanceMoneyTaken && (
                    <div className="flex justify-between p-2">
                      <span>{t.advInstallmentLabel || 'Advance Installment'}</span>
                      <span>{activeSlip.advanceMoneyAmount?.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {/* Fill empty space if deductions are fewer than earnings */}
                  {Array.from({ length: Math.max(0, allowancesList.length - deductionsList.length - (activeSlip.advanceMoneyTaken && !hasAdvanceInDeductions ? 1 : 0)) }).map((_, i) => (
                     <div key={`empty-d-${i}`} className="flex justify-between p-2 text-transparent"><span>-</span><span>-</span></div>
                  ))}
                </div>

              </div>
              
              {/* Totals Row */}
              <div className="grid grid-cols-2 border-t border-black font-bold">
                <div className="flex justify-between p-2 border-r border-black"><span>Total Earnings</span><span>{totalEarnings.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between p-2"><span>Total Deductions</span><span>{totalDeductions.toLocaleString('en-IN')}</span></div>
              </div>
              
              {/* Net Salary Row */}
              <div className="border-t border-black font-bold flex justify-between p-3 bg-gray-200 text-base">
                <span>Net Salary:</span><span>Rs. {netPay.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* 7. In Words */}
            <div className="text-sm mb-12">
              <span className="font-normal">In words: {numberToWords(netPay)} Rupees only</span>
            </div>

            {/* 8. Footer */}
            <div className="flex justify-between items-end mt-12">
              <div className="text-xs italic text-gray-500">
                This is a computer-generated payslip and does not require a signature.<br/>
                Generated on: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, ' ')}
              </div>
            </div>
          </div>
        ) : (
          /* ----- EDIT MODE VIEW ----- */
          <div className="relative z-10">
            {/* Attendance & Bank Details Editors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4 border-b border-slate-100">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-blue-700 border-l-3 border-blue-500 pl-2.5 uppercase">{t.attendanceSummary || 'Attendance'}</h3>
                <div className="flex justify-between items-center text-sm border-b pb-2">
                  <span>{t.workingDays || 'Working Days'}</span>
                  <input type="number" value={draftWorkingDays} onChange={(e) => setDraftWorkingDays(Number(e.target.value))} className="w-24 text-right border rounded p-1"/>
                </div>
                <div className="flex justify-between items-center text-sm border-b pb-2">
                  <span>{t.daysPresent || 'Days Present'}</span>
                  <input type="number" step="0.5" value={draftDaysPresent} onChange={(e) => setDraftDaysPresent(Number(e.target.value))} className="w-24 text-right border rounded p-1"/>
                </div>
                <div className="flex justify-between items-center text-sm border-b pb-2">
                  <span>{t.leavesTaken || 'Leaves Taken'}</span>
                  <input type="number" step="0.5" value={draftLeavesTaken} onChange={(e) => setDraftLeavesTaken(Number(e.target.value))} className="w-24 text-right border rounded p-1"/>
                </div>
              </div>

              {onUpdateBankDetails && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-indigo-700 border-l-3 border-indigo-500 pl-2.5 uppercase">{t.bankDetails || 'Bank Details'}</h3>
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span>{t.bankName || 'Bank Name'}</span>
                    <input type="text" value={draftBankName} onChange={(e) => setDraftBankName(e.target.value)} className="w-40 text-right border rounded p-1"/>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span>{t.bankAccountNo || 'Account No'}</span>
                    <input type="text" value={draftBankAccountNo} onChange={(e) => setDraftBankAccountNo(e.target.value)} className="w-40 text-right border rounded p-1 font-mono text-xs"/>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b pb-2">
                    <span>{t.bankIfsc || 'IFSC'}</span>
                    <input type="text" value={draftBankIfsc} onChange={(e) => setDraftBankIfsc(e.target.value)} className="w-40 text-right border rounded p-1 font-mono text-xs"/>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 border-b border-slate-100">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-teal-700 border-l-3 border-teal-500 pl-2.5 uppercase">Earnings</h3>
                <div className="flex justify-between items-center text-sm border-b pb-2">
                  <span>Basic</span>
                  <input type="number" value={draftBasicPay} onChange={(e) => setDraftBasicPay(Number(e.target.value))} className="w-24 text-right border rounded p-1"/>
                </div>
                {allowancesList.map((item, index) => (
                  <div key={index} className="flex justify-between items-center gap-2">
                    <select value={item.nameKey} onChange={(e) => handleUpdateAllowance(index, 'nameKey', e.target.value)} className="border p-1 text-xs">
                      <option value="hra">HRA</option><option value="medicalAllow">Medical</option><option value="specialAllow">Special</option>
                    </select>
                    <input type="number" value={item.amount} onChange={(e) => handleUpdateAllowance(index, 'amount', Number(e.target.value))} className="w-20 text-right border rounded p-1"/>
                    <button onClick={() => handleRemoveAllowance(index)}><Trash2 className="w-4 h-4 text-rose-500"/></button>
                  </div>
                ))}
                <button onClick={handleAddAllowance} className="text-xs text-teal-600 font-bold">+ Add Allowance</button>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-rose-700 border-l-3 border-rose-500 pl-2.5 uppercase">Deductions</h3>
                {deductionsList.map((item, index) => (
                  <div key={index} className="flex justify-between items-center gap-2">
                    <select value={item.nameKey} onChange={(e) => handleUpdateDeduction(index, 'nameKey', e.target.value)} className="border p-1 text-xs">
                      <option value="providentFund">PF</option><option value="professionalTax">PT</option>
                    </select>
                    <input type="number" value={item.amount} onChange={(e) => handleUpdateDeduction(index, 'amount', Number(e.target.value))} className="w-20 text-right border rounded p-1"/>
                    <button onClick={() => handleRemoveDeduction(index)}><Trash2 className="w-4 h-4 text-rose-500"/></button>
                  </div>
                ))}
                <button onClick={handleAddDeduction} className="text-xs text-rose-600 font-bold">+ Add Deduction</button>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setIsEditing(false)} className="bg-slate-100 px-5 py-2.5 rounded-xl font-bold text-xs">Cancel</button>
              <button onClick={handleSaveChanges} className="bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs">Save Changes</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
