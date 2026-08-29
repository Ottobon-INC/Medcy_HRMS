import React, { useState } from 'react';
import { KeyRound, Mail, Eye, EyeOff } from 'lucide-react';
import { Employee } from '../types';
import SmsLogo from './SmsLogo';

interface LoginScreenProps {
  language?: string;
  employees: Employee[];
  onLoginSuccess: (employee: Employee) => void;
}

export default function LoginScreen({ employees, onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const loginText = {
    subtitle: "Please sign in to your HR Portal account.",
    quickDemo: "Select a Profile to log in instantly:",
    orEmail: "Or enter credentials below:",
    emailLabel: "Email Address",
    passLabel: "Password",
    btnIn: "Sign In",
    errInvalid: "Invalid email or password. Hint: password is 'password'",
    errInactive: "Your account is inactive. Please contact your administrator.",
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill all fields');
      return;
    }

    const matched = employees.find(
      (emp) => emp.email.toLowerCase() === email.trim().toLowerCase() && (emp.password || 'password') === password
    );

    if (matched) {
      if (matched.status === 'inactive') {
        setError(loginText.errInactive);
      } else {
        onLoginSuccess(matched);
      }
    } else {
      setError(loginText.errInvalid);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 font-sans antialiased">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col p-6 sm:p-10 md:p-12 space-y-8">
        
        {/* Portal Header */}
        <div className="text-center space-y-4 flex flex-col items-center">
          <SmsLogo className="justify-center" textSize="text-2xl sm:text-3xl font-black" />
          <div className="pt-2 text-center">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              MEDCY HEALTH TECH HRMS PORTAL
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {loginText.subtitle}
          </p>
        </div>

        {/* Form Details */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div id="login-error-msg" className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-bold rounded-xl text-center">
              {error}
            </div>
          )}

          {/* Email input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {loginText.emailLabel}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                <Mail className="w-4 h-4" />
              </span>
              <input
                id="login-email-input"
                type="email"
                placeholder="name@vizagivf.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all text-slate-700"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {loginText.passLabel}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                <KeyRound className="w-4 h-4" />
              </span>
              <input
                id="login-password-input"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-teal-500 focus:bg-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 transition-all text-slate-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="login-submit-btn"
            type="submit"
            className="w-full py-3 sm:py-3.5 bg-teal-600 hover:bg-teal-700 active:scale-98 transition-all text-white rounded-xl text-xs font-bold tracking-wider uppercase shadow-md shadow-teal-600/10 cursor-pointer"
          >
            {loginText.btnIn}
          </button>
        </form>

      </div>
    </div>
  );
}
