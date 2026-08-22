import React from 'react';
import {
  User,
  X,
  Crown,
  Mail,
  Shield,
  CreditCard,
  KeyRound,
  Calendar,
  Sparkles,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { VipSubscriptionInfo } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  vipInfo: VipSubscriptionInfo;
  usedCredits: number;
  totalCredits: number;
  onOpenSettings: (tab?: 'api' | 'vip') => void;
  onLogout: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  vipInfo,
  usedCredits,
  totalCredits,
  onOpenSettings,
  onLogout,
}) => {
  const { language, t } = useLanguage();

  if (!isOpen) return null;

  const isVipActive = vipInfo.status === 'active_vip';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-950/95 border border-white/15 shadow-2xl overflow-hidden backdrop-blur-2xl animate-fadeIn my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className={language === 'mm' ? 'font-burmese' : 'font-sans'}>
                  {t.profile}
                </span>
                {isVipActive && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                    VIP
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 font-burmese">
                {language === 'mm'
                  ? 'အသုံးပြုသူ အကောင့်အချက်အလက်များနှင့် ကန့်သတ်ချက်များ'
                  : 'User account details, quotas, and preferences'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* User Profile Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-white/10 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold shadow-md ring-2 ring-white/10">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate">{userEmail}</h3>
              </div>
              <p className="text-xs text-amber-400 font-mono mt-0.5">
                {isVipActive ? vipInfo.planName || '👑 VIP Member' : 'Free Tier (2 Recaps/Day)'}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
              <span className="text-slate-400 text-[11px] block">
                {language === 'mm' ? 'အသုံးပြုပြီး အကြိမ်ရေ' : 'Recaps Used'}
              </span>
              <span className="text-base font-bold text-white font-mono">{usedCredits}</span>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1">
              <span className="text-slate-400 text-[11px] block">
                {language === 'mm' ? 'လက်ကျန် အကြိမ်ရေ' : 'Quota Remaining'}
              </span>
              <span className="text-base font-bold text-amber-300 font-mono">
                {isVipActive ? vipInfo.monthlyRemaining || 70 : '2 / Day'}
              </span>
            </div>
          </div>

          {/* Action Links */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings('vip');
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>{language === 'mm' ? 'VIP အစီအစဉ်များ စီမံမည်' : 'Manage VIP Subscription'}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSettings('api');
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <span>{language === 'mm' ? 'API Keys ဆက်တင်များ' : 'Configure Custom API Keys'}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Logout button */}
          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/20 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{t.logout}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
