import React, { useState, useMemo } from 'react';
import { IndianRupee, Clock, CheckCircle2, XCircle, Send, AlertCircle, FileText, CalendarDays, TrendingDown } from 'lucide-react';
import { Language, AdvanceRequest, RepaymentTimeline } from '../types';
import { translations } from '../translations';

interface AdvanceRequestModuleProps {
  language: Language;
  advanceRequests: AdvanceRequest[];
  onSubmitAdvance: (amount: number, reason: string, repaymentMonths: RepaymentTimeline, type: import('../types').AdvanceType) => void;
  isEligible: boolean;
  employeeSalary?: number;
}

const REPAYMENT_OPTIONS: RepaymentTimeline[] = [2, 3, 5];

export default function AdvanceRequestModule({
  language,
  advanceRequests,
  onSubmitAdvance,
  isEligible,
  employeeSalary,
}: AdvanceRequestModuleProps) {
  const t = translations[language];
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [repaymentMonths, setRepaymentMonths] = useState<RepaymentTimeline>(3);
  const [advanceType, setAdvanceType] = useState<import('../types').AdvanceType>('salary');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if employee already has an active (non-cleared) advance
  const hasActiveAdvance = useMemo(() =>
    advanceRequests.some(r => r.status === 'approved' && (r.installmentsRemaining ?? 0) > 0),
    [advanceRequests]
  );

  const MAX_ADVANCE = advanceType === 'medical' ? 20000 : 10000;
  
  const numAmount = Number(amount) || 0;
  const monthlyInstallment = numAmount > 0 ? Math.ceil(numAmount / repaymentMonths) : 0;
  const isAmountValid = numAmount >= 1 && numAmount <= MAX_ADVANCE;
  const finalReason = advanceType === 'medical' ? 'Medical Emergency' : reason.trim();
  const canSubmit = isEligible && isAmountValid && finalReason.length > 0 && !hasActiveAdvance && !isSubmitting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    onSubmitAdvance(numAmount, finalReason, repaymentMonths, advanceType);
    setAmount('');
    setReason('');
    setRepaymentMonths(3);
    setIsSubmitting(false);
  };

  const getStatusBadge = (req: AdvanceRequest) => {
    switch (req.status) {
      case 'approved':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-bold border border-teal-100">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {language === 'te' ? 'ఆమోదించబడింది' : 'Approved'}
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-100">
            <XCircle className="w-3.5 h-3.5" />
            {language === 'te' ? 'తిరస్కరించబడింది' : 'Rejected'}
          </span>
        );
      case 'deducted':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold border border-slate-200">
            <FileText className="w-3.5 h-3.5" />
            {language === 'te' ? 'జీతం నుండి తీసుకోబడింది' : 'Fully Deducted'}
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-100">
            <Clock className="w-3.5 h-3.5" />
            {language === 'te' ? 'పెండింగ్' : 'Pending'}
          </span>
        );
    }
  };

  const timelineLabel: Record<RepaymentTimeline, string> = {
    2: t.adv2Months,
    3: t.adv3Months,
    5: t.adv5Months,
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row gap-8">

          {/* Left Column: Form */}
          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-800">
                {language === 'te' ? 'అడ్వాన్స్ మనీ కోసం అప్లై చేయండి' : 'Request Advance'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'te' ? 'జీతం నుండి వాయిదాలలో కట్ చేయబడుతుంది.' : 'Auto-deducted from your salary in installments.'}
              </p>
            </div>

            {/* Advance Type Selector */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setAdvanceType('salary')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                  advanceType === 'salary' 
                    ? 'bg-white text-teal-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {language === 'te' ? 'జీతం అడ్వాన్స్ (Max ₹10k)' : 'Salary Advance (Max ₹10k)'}
              </button>
              <button
                onClick={() => setAdvanceType('medical')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
                  advanceType === 'medical' 
                    ? 'bg-white text-rose-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {language === 'te' ? 'మెడికల్ ఎమర్జెన్సీ (Max ₹20k)' : 'Medical Emergency (Max ₹20k)'}
              </button>
            </div>

            {!isEligible ? (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 text-rose-800">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">
                  {language === 'te'
                    ? 'మీరు అడ్వాన్స్ తీసుకోవడానికి ఇంకా అర్హత సాధించలేదు (1 సంవత్సరం అనుభవం అవసరం).'
                    : 'You are not eligible for a salary advance. Minimum 1 year of experience required.'}
                </p>
              </div>
            ) : hasActiveAdvance ? (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 text-amber-800">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{t.advActiveExists}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Amount Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {language === 'te' ? 'మొత్తం (₹)' : 'Amount (₹)'}
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {language === 'te' ? `గరిష్ట పరిమితి: ₹${MAX_ADVANCE.toLocaleString('en-IN')}` : `Max advance: ₹${MAX_ADVANCE.toLocaleString('en-IN')}`}
                    </span>
                  </div>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    <input
                      type="number"
                      required
                      min={1}
                      max={MAX_ADVANCE}
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700 transition-colors ${
                        numAmount > MAX_ADVANCE
                          ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-300/30'
                          : 'border-slate-200'
                      }`}
                      placeholder="e.g. 5000"
                    />
                  </div>
                  {numAmount > MAX_ADVANCE && (
                    <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">
                      {language === 'te' ? `గరిష్ట పరిమితి ₹${MAX_ADVANCE.toLocaleString('en-IN')} మాత్రమే` : `Maximum advance amount is ₹${MAX_ADVANCE.toLocaleString('en-IN')}`}
                    </p>
                  )}
                </div>

                {/* Repayment Timeline Selector */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    {t.advRepaymentTimeline}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {REPAYMENT_OPTIONS.map(months => {
                      const inst = numAmount > 0 ? Math.ceil(numAmount / months) : null;
                      const isSelected = repaymentMonths === months;
                      return (
                        <button
                          key={months}
                          type="button"
                          id={`repayment-${months}-months`}
                          onClick={() => setRepaymentMonths(months)}
                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'border-teal-500 bg-teal-50 text-teal-800 shadow-sm shadow-teal-100'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-teal-200 hover:bg-teal-50/50'
                          }`}
                        >
                          <span className="text-lg font-black">{months}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                            {language === 'te' ? 'నెలలు' : 'months'}
                          </span>
                          {inst !== null && (
                            <span className={`text-[9px] font-bold mt-1 ${isSelected ? 'text-teal-600' : 'text-slate-400'}`}>
                              ₹{inst.toLocaleString('en-IN')}/mo
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Preview Panel */}
                {numAmount >= 1 && numAmount <= MAX_ADVANCE && (
                  <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 rounded-2xl p-4 space-y-2">
                    <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5" />
                      {language === 'te' ? 'చెల్లింపు వివరాలు (ప్రివ్యూ)' : 'Repayment Preview'}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600">{language === 'te' ? 'మొత్తం అడ్వాన్స్' : 'Total Advance'}</span>
                      <span className="text-sm font-black text-slate-800">₹{numAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-600">{t.advMonthlyInstallment}</span>
                      <span className="text-sm font-black text-teal-700">₹{monthlyInstallment.toLocaleString('en-IN')} × {repaymentMonths}</span>
                    </div>
                    <div className="border-t border-teal-100 pt-2 mt-1">
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        <CalendarDays className="w-3 h-3 inline mr-1 text-teal-500" />
                        {language === 'te'
                          ? `మీ తదుపరి ${repaymentMonths} నెలల జీతం నుండి ₹${monthlyInstallment.toLocaleString('en-IN')} చొప్పున స్వయంచాలకంగా కట్ అవుతుంది.`
                          : `₹${monthlyInstallment.toLocaleString('en-IN')} will be auto-deducted from your next ${repaymentMonths} salary slips.`
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Reason */}
                {advanceType === 'salary' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {language === 'te' ? 'కారణం' : 'Reason'}
                    </label>
                    <textarea
                      required
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/10 text-slate-700 resize-none"
                      placeholder={language === 'te' ? 'సంక్షిప్త కారణం వివరించండి...' : 'Briefly explain why you need this advance...'}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-xs font-bold uppercase transition-all tracking-wider cursor-pointer active:scale-95 shadow-md shadow-teal-600/10"
                >
                  <Send className="w-4 h-4" />
                  <span>{language === 'te' ? 'అప్లై చేయండి' : 'Submit Advance Request'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Right Column: History */}
          <div className="flex-1 md:border-l md:border-slate-100 md:pl-8">
            <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              {language === 'te' ? 'మీ అడ్వాన్స్ హిస్టరీ' : 'Your Advance Request History'}
            </h3>

            {advanceRequests.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-slate-100/50 border-dashed">
                {language === 'te' ? 'ఎలాంటి అభ్యర్థనలు లేవు' : 'No advance requests found.'}
              </div>
            ) : (
              <div className="space-y-3">
                {advanceRequests.map(req => {
                  const totalInstall = req.repaymentMonths ?? 1;
                  const remaining = req.installmentsRemaining ?? 0;
                  const paid = totalInstall - remaining;
                  const progressPct = totalInstall > 0 ? Math.round((paid / totalInstall) * 100) : 100;
                  const isActive = req.status === 'approved' && remaining > 0;

                  return (
                    <div key={req.id} className={`p-4 rounded-2xl border flex flex-col gap-3 hover:shadow-sm transition-shadow ${isActive ? 'bg-teal-50/40 border-teal-100' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-bold text-slate-800 text-sm">
                              {req.amount.toLocaleString('en-IN')}
                            </span>
                            {req.repaymentMonths && (
                              <span className="text-[9px] text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-full font-bold">
                                {req.repaymentMonths}mo plan
                              </span>
                            )}
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${req.advanceType === 'medical' ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-indigo-600 bg-indigo-50 border-indigo-100'}`}>
                              {req.advanceType === 'medical' ? 'Medical' : 'Salary'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-1">{req.reason}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {new Date(req.submittedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="shrink-0">{getStatusBadge(req)}</div>
                      </div>

                      {/* Installment Progress (only when approved) */}
                      {req.repaymentMonths && (req.status === 'approved' || req.status === 'deducted') && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                            <span>
                              {language === 'te' ? 'వాయిదాల పురోగతి' : 'Installment Progress'}
                            </span>
                            <span className={isActive ? 'text-teal-600' : 'text-slate-400'}>
                              {paid}/{totalInstall} {language === 'te' ? 'చెల్లించారు' : 'paid'}
                              {isActive && req.monthlyInstallment && (
                                <span className="ml-1 text-slate-400">
                                  (₹{req.monthlyInstallment.toLocaleString('en-IN')}/mo)
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${req.status === 'deducted' ? 'bg-emerald-500' : 'bg-teal-500'}`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50/30 rounded-full blur-3xl pointer-events-none -mt-16 -mr-16" />
      </div>
    </div>
  );
}
