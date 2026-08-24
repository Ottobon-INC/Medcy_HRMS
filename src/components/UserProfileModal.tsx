import React, { useState } from 'react';
import { X, Lock, KeyRound, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import type { Employee } from '../types';

interface UserProfileModalProps {
  currentUser: Employee;
  onClose: () => void;
  onUpdatePassword: (newPassword: string) => Promise<void>;
  language: 'en' | 'te';
}

export default function UserProfileModal({ currentUser, onClose, onUpdatePassword, language }: UserProfileModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const t = {
    title: language === 'te' ? 'నా ప్రొఫైల్' : 'My Profile',
    changePwd: language === 'te' ? 'పాస్‌వర్డ్ మార్చండి' : 'Change Password',
    currentPwd: language === 'te' ? 'ప్రస్తుత పాస్‌వర్డ్' : 'Current Password',
    newPwd: language === 'te' ? 'కొత్త పాస్‌వర్డ్' : 'New Password',
    confirmPwd: language === 'te' ? 'పాస్‌వర్డ్ నిర్ధారించండి' : 'Confirm New Password',
    saveBtn: language === 'te' ? 'అప్‌డేట్ చేయండి' : 'Update Password',
    cancel: language === 'te' ? 'రద్దు చేయండి' : 'Cancel',
    errCurrent: language === 'te' ? 'ప్రస్తుత పాస్‌వర్డ్ తప్పు' : 'Current password is incorrect',
    errMismatch: language === 'te' ? 'కొత్త పాస్‌వర్డ్స్ సరిపోలడం లేదు' : 'New passwords do not match',
    errLength: language === 'te' ? 'పాస్‌వర్డ్ కనీసం 6 అక్షరాలు ఉండాలి' : 'Password must be at least 6 characters',
    successMsg: language === 'te' ? 'పాస్‌వర్డ్ విజయవంతంగా మార్చబడింది!' : 'Password updated successfully!'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validations
    if (currentPassword !== currentUser.password) {
      setError(t.errCurrent);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.errMismatch);
      return;
    }
    if (newPassword.length < 6) {
      setError(t.errLength);
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdatePassword(newPassword);
      setSuccess(t.successMsg);
      // Clear forms
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Auto close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl relative animate-scaleUp overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Close Button - Fixed at top right */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-black/10 hover:bg-black/20 text-white rounded-full backdrop-blur-md transition-colors z-50 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative overflow-y-auto w-full scroll-smooth scrollbar-hide">
          {/* Decorative Header - Scrolls with content */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-teal-500 to-emerald-600 z-0" />

          <div className="relative z-10 p-6 sm:p-8 pt-10">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-white rounded-full p-1.5 shadow-lg">
                <div className="w-full h-full bg-teal-600 rounded-full flex items-center justify-center text-3xl font-black text-white">
                {currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">{currentUser.name}</h2>
            <p className="text-slate-500 text-sm mt-1">{currentUser.designation}</p>
            <div className="inline-block mt-3 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full font-mono">
              {currentUser.id}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{language === 'te' ? 'ఈమెయిల్' : 'Email'}</span>
              <span className="text-sm font-semibold text-slate-700 break-all">{currentUser.email}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{language === 'te' ? 'ఫోన్' : 'Phone'}</span>
              <span className="text-sm font-semibold text-slate-700">{currentUser.phone || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{language === 'te' ? 'లింగం' : 'Gender'}</span>
              <span className="text-sm font-semibold text-slate-700 capitalize">{currentUser.gender || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{language === 'te' ? 'చేరిన తేదీ' : 'Joining Date'}</span>
              <span className="text-sm font-semibold text-slate-700">{new Date(currentUser.joiningDate).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{language === 'te' ? 'పాత్ర' : 'Role'}</span>
              <span className="text-sm font-semibold text-slate-700 capitalize">{currentUser.role}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{language === 'te' ? 'స్థితి' : 'Status'}</span>
              <span className={`text-xs font-bold capitalize px-2 py-0.5 rounded-md inline-block mt-0.5 ${currentUser.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {currentUser.status}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              <h3 className="font-bold text-slate-700">{t.changePwd}</h3>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-xl text-center">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold rounded-xl text-center">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.currentPwd}</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showCurrent ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.newPwd}</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.confirmPwd}</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? '...' : t.saveBtn}
              </button>
            </form>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
