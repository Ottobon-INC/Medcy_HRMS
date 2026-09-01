import React from 'react';
import { LogOut } from 'lucide-react';
import { Employee } from '../../types';
import SmsLogo from '../SmsLogo';

interface AppHeaderProps {
  currentUser: Employee;
  onOpenProfile: () => void;
  onLogout: () => void;
  onLogoClick?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentUser,
  onOpenProfile,
  onLogout,
  onLogoClick
}) => {
  const getAvatarInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2);
  };

  const isAdmin = currentUser.role === 'admin';

  return (
    <header id="global-portal-header" className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40 no-print">
      <div className="w-full mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        
        {/* Brand / Logo Area */}
        <div className="flex items-center gap-3">
          <SmsLogo 
            className="cursor-pointer" 
            onClick={onLogoClick} 
          />
          
          <div className="hidden sm:block h-6 w-px bg-slate-200" />
          
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
            {isAdmin ? 'Clinic Administrator' : 'Staff Portal'}
          </span>
        </div>

        {/* Global Controls & User Profile */}
        <div className="flex items-center gap-4">
          
          {/* Active User Avatar & Trigger */}
          <button
            id="user-profile-btn"
            onClick={onOpenProfile}
            title="My Profile & Security Settings"
            className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100 p-1 sm:py-1.5 sm:pl-2.5 sm:pr-4 rounded-full border border-slate-200/70 hover:border-slate-300 transition-all cursor-pointer shadow-sm hover:shadow"
          >
            <div className="bg-teal-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0">
              {getAvatarInitials(currentUser.name)}
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold text-slate-800 block leading-tight">{currentUser.name}</span>
              <span className="text-[9px] text-slate-400 font-medium block leading-none mt-0.5">{currentUser.id}</span>
            </div>
          </button>

          {/* Logout Action */}
          <button
            id="logout-btn"
            onClick={onLogout}
            title="Sign Out"
            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-100"
          >
            <LogOut className="w-4 h-4" />
          </button>

        </div>
      </div>
    </header>
  );
};

export default AppHeader;
