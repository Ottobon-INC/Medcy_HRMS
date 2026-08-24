import React, { useState } from 'react';
import { IndianRupee, CheckCircle2, XCircle, Clock, FileText, History, AlertCircle } from 'lucide-react';
import { Language, Employee, AdvanceRequest } from '../types';

interface AdminAdvanceApprovalsProps {
  language: Language;
  employees: Employee[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export default function AdminAdvanceApprovals({
  language,
  employees,
  onApprove,
  onReject
}: AdminAdvanceApprovalsProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'ledger'>('pending');

  const pendingRequests: { req: AdvanceRequest; empName: string; empId: string }[] = [];
  const ledgerRequests: { req: AdvanceRequest; empName: string; empId: string }[] = [];
  
  employees.forEach(emp => {
    emp.advanceRequests?.forEach(req => {
      if (req.status === 'pending') {
        pendingRequests.push({ req, empName: emp.name, empId: emp.id });
      } else {
        ledgerRequests.push({ req, empName: emp.name, empId: emp.id });
      }
    });
  });

  pendingRequests.sort((a, b) => new Date(b.req.submittedAt).getTime() - new Date(a.req.submittedAt).getTime());
  ledgerRequests.sort((a, b) => new Date(b.req.submittedAt).getTime() - new Date(a.req.submittedAt).getTime());

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-teal-700 rounded-full text-[10px] font-bold border border-teal-100 uppercase tracking-wider">
            Active
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full text-[10px] font-bold border border-rose-100 uppercase tracking-wider">
            Rejected
          </span>
        );
      case 'deducted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-100 uppercase tracking-wider">
            Cleared
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-50">
            <div>
              <h2 className="text-xl font-black text-slate-800">
                {language === 'te' ? 'అడ్వాన్స్ ఆమోదాలు & చరిత్ర' : 'Salary Advances & Ledger'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'te' ? 'ఉద్యోగుల అడ్వాన్స్ రిక్వెస్ట్‌లను రివ్యూ చేయండి.' : 'Review requests and track installment payments.'}
              </p>
            </div>
            
            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'pending' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Pending ({pendingRequests.length})
              </button>
              <button
                onClick={() => setActiveTab('ledger')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'ledger' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Ledger ({ledgerRequests.length})
              </button>
            </div>
          </div>

          {activeTab === 'pending' && (
            <>
              {pendingRequests.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center bg-slate-50 rounded-[24px] border border-slate-100/50 border-dashed">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">
                    {language === 'te' ? 'అన్నీ క్లియర్' : 'All caught up!'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {language === 'te' ? 'పెండింగ్‌లో ఎలాంటి అభ్యర్థనలు లేవు.' : 'There are no pending advance requests to review.'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pendingRequests.map(({ req, empName, empId }) => (
                    <div key={req.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-teal-200 hover:shadow-md transition-all group flex flex-col">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-teal-50 text-teal-700 w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0">
                            {empName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{empName}</h4>
                            <p className="text-[10px] text-slate-400 font-mono">{empId}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4 flex-1">
                        <div className="flex items-baseline gap-1 mb-2">
                          <IndianRupee className="w-4 h-4 text-slate-400" />
                          <span className="text-2xl font-black text-slate-800 tracking-tight">
                            {req.amount.toLocaleString('en-IN')}
                          </span>
                          {req.repaymentMonths && (
                            <span className="ml-1 text-[10px] font-bold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                              {req.repaymentMonths}mo plan
                            </span>
                          )}
                          <span className={`ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${req.advanceType === 'medical' ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-indigo-600 bg-indigo-50 border-indigo-100'}`}>
                            {req.advanceType === 'medical' ? 'Medical' : 'Salary'}
                          </span>
                        </div>
                        {req.repaymentMonths && req.monthlyInstallment && (
                          <div className="flex items-center gap-1.5 mb-2 text-[11px] font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-100">
                            <IndianRupee className="w-3 h-3" />
                            {req.monthlyInstallment.toLocaleString('en-IN')}/month × {req.repaymentMonths} months
                          </div>
                        )}
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl">
                          "{req.reason}"
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(req.submittedAt).toLocaleDateString()}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => onReject(req.id)}
                            className="p-2 text-rose-400 hover:text-white hover:bg-rose-500 rounded-lg transition-colors cursor-pointer"
                            title={language === 'te' ? 'తిరస్కరించండి' : 'Reject'}
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => onApprove(req.id)}
                            className="p-2 text-emerald-400 hover:text-white hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
                            title={language === 'te' ? 'ఆమోదించండి' : 'Approve'}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'ledger' && (
            <>
              {ledgerRequests.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center bg-slate-50 rounded-[24px] border border-slate-100/50 border-dashed">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                    <History className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">
                    {language === 'te' ? 'చరిత్ర లేదు' : 'No history yet'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {language === 'te' ? 'ఆమోదించబడిన లేదా తిరస్కరించబడిన అభ్యర్థనలు ఇక్కడ కనిపిస్తాయి.' : 'Approved or rejected requests will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-3 px-4">Employee</th>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4 text-right">Requested</th>
                          <th className="py-3 px-4 text-center">Timeline</th>
                          <th className="py-3 px-4 text-right text-emerald-600">Paid</th>
                          <th className="py-3 px-4 text-right text-rose-600">Balance</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerRequests.map(({ req, empName, empId }) => {
                          const totalInstall = req.repaymentMonths ?? 1;
                          const remaining = req.installmentsRemaining ?? 0;
                          const paidCount = totalInstall - remaining;
                          const monthly = req.monthlyInstallment ?? req.amount;
                          
                          let paidAmount = 0;
                          let balance = 0;
                          
                          if (req.status === 'approved') {
                            paidAmount = paidCount * monthly;
                            balance = req.amount - paidAmount;
                          } else if (req.status === 'deducted') {
                            paidAmount = req.amount;
                            balance = 0;
                          }

                          return (
                            <tr key={req.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-800">{empName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{empId}</div>
                              </td>
                              <td className="py-3 px-4 text-slate-500 font-mono">
                                {new Date(req.submittedAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4 text-right font-black text-slate-800">
                                <div>₹{req.amount.toLocaleString('en-IN')}</div>
                                <div className={`mt-0.5 text-[8px] font-bold uppercase tracking-wider ${req.advanceType === 'medical' ? 'text-rose-500' : 'text-indigo-500'}`}>
                                  {req.advanceType === 'medical' ? 'Medical' : 'Salary'}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {req.repaymentMonths ? (
                                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                                    {paidCount}/{totalInstall} months
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-emerald-600">
                                {req.status === 'rejected' ? '-' : `₹${paidAmount.toLocaleString('en-IN')}`}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-rose-600">
                                {req.status === 'rejected' ? '-' : `₹${balance.toLocaleString('en-IN')}`}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {getStatusBadge(req.status)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
