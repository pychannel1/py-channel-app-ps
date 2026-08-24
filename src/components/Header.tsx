import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  User,
  KeyRound,
  Crown,
  ChevronDown,
  Menu,
  Languages,
  Sparkles,
  Receipt,
  FileText,
  Download,
  Headphones,
  LogOut,
} from 'lucide-react';
import { StudioMode, VipSubscriptionInfo } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { isAdminUser } from '../services/authService';

interface HeaderProps {
  mode: StudioMode;
  onToggleMode: (mode: StudioMode) => void;
  userEmail: string;
  usedCredits: number;
  totalCredits: number;
  vipInfo: VipSubscriptionInfo;
  hasAssemblyKey?: boolean;
  hasGeminiKey?: boolean;
  onOpenSettings: (tab?: 'api' | 'vip') => void;
  onOpenAdminPortal: () => void;
  isAdminAuthenticated: boolean;
  onOpenSidebar: () => void;
  onOpenTranscriptHub?: () => void;
  onOpenOrders?: () => void;
  onOpenDownloads?: () => void;
  onOpenSupport?: () => void;
  onOpenProfile?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onToggleMode,
  userEmail,
  usedCredits,
  totalCredits,
  vipInfo,
  hasAssemblyKey = false,
  hasGeminiKey = false,
  onOpenSettings,
  onOpenAdminPortal,
  isAdminAuthenticated,
  onOpenSidebar,
  onOpenTranscriptHub,
  onOpenOrders,
  onOpenDownloads,
  onOpenSupport,
  onOpenProfile,
  onLogout,
}) => {
  const { language, t } = useLanguage();
  const isVipActive = vipInfo.status === 'active_vip';
  const isVipPending = vipInfo.status === 'pending';

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [logoClickCount, setLogoClickCount] = useState(0);

  // Calculate API Keys status
  const apiKeysCount = (hasAssemblyKey ? 1 : 0) + (hasGeminiKey ? 1 : 0);
  const isAllKeysReady = apiKeysCount === 2;

  // Easter egg: 5 rapid clicks on logo opens Admin Master Portal
  const handleLogoClick = () => {
    setLogoClickCount((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        onOpenAdminPortal();
        return 0;
      }
      return next;
    });

    // Reset click count after 3 seconds if user stops clicking
    setTimeout(() => {
      setLogoClickCount(0);
    }, 3000);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 glass-panel bg-slate-950/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Section: Sidebar Drawer Menu Button & Brand */}
        <div className="flex items-center gap-2 sm:gap-3.5">
          {/* Sidebar Drawer Toggle Button */}
          <button
            id="header-sidebar-drawer-btn"
            type="button"
            onClick={onOpenSidebar}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm group"
            title={language === 'mm' ? 'မနူးစာရင်း ဖွင့်မည် (Menu)' : 'Open Menu & Workspaces'}
            aria-label="Open Sidebar Menu"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 group-hover:text-amber-400 transition-colors" />
          </button>

          {/* Brand & Logo with 5-Click Secret Admin Trigger */}
          <div
            onClick={handleLogoClick}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none group"
            title="pY Channel AI Recap Studio (Click 5 times for Admin Portal)"
          >
            <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 shadow-lg shadow-amber-500/20 ring-1 ring-white/20 group-hover:scale-105 transition-transform flex-shrink-0">
              <Film className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-amber-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-base lg:text-lg font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
                  pY Channel
                  <span className="hidden xs:inline-block text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-indigo-500/20 border border-amber-500/30 text-amber-300 font-mono font-medium">
                    AI RECAP
                  </span>
                  {isAdminUser(userEmail, isAdminAuthenticated) && (
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-black font-bold font-mono">
                      ADMIN
                    </span>
                  )}
                </h1>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-burmese hidden md:block">
                {t.appSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: Language Switcher Toggle + User Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Header Language Switcher Toggle Button (Myanmar / ENG) */}
          <LanguageToggle variant="compact" />

          {/* Bring Your Own API Keys Button */}
          <button
            id="header-api-keys-btn"
            type="button"
            onClick={() => onOpenSettings('api')}
            className={`hidden md:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer shadow-sm ${
              isAllKeysReady
                ? 'bg-emerald-950/70 hover:bg-emerald-900/80 border-emerald-500/40 text-emerald-300'
                : apiKeysCount === 1
                ? 'bg-amber-950/70 hover:bg-amber-900/80 border-amber-500/40 text-amber-300'
                : 'bg-slate-900/90 hover:bg-slate-800 border-white/10 text-slate-200 hover:text-amber-300'
            }`}
            title="Configure your own AssemblyAI & Gemini API Keys"
          >
            <KeyRound className={`w-3.5 h-3.5 ${isAllKeysReady ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="font-sans font-semibold">API Keys</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold ${
                isAllKeysReady
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : apiKeysCount === 1
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border border-white/10'
              }`}
            >
              {isAllKeysReady ? '✓ Ready' : apiKeysCount === 1 ? '1/2' : 'Setup'}
            </span>
          </button>

          {/* Settings & VIP Button */}
          <button
            id="header-user-settings-btn"
            type="button"
            onClick={() => onOpenSettings('vip')}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-xs text-slate-200 hover:text-amber-300 font-medium transition-all cursor-pointer shadow-sm"
            title="Settings & VIP Subscription"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline font-burmese">{t.buyVipPlans}</span>
            <span className="sm:hidden font-mono font-bold text-amber-400">VIP</span>
          </button>

          {/* Admin Direct Access Button (Only for Admin) */}
          {isAdminUser(userEmail, isAdminAuthenticated) && (
            <button
              onClick={onOpenAdminPortal}
              className="hidden lg:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30 font-bold transition-all cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          )}

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="header-profile-dropdown-btn"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-1.5 py-1 pr-1.5 rounded-xl hover:bg-white/5 transition-all cursor-pointer border border-transparent hover:border-white/10"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white ring-1 ring-white/20 font-bold text-xs shadow-md flex-shrink-0">
                {isVipActive ? <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-200" /> : <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </div>
              <div className="text-left hidden xl:block">
                <div className="text-xs font-medium text-slate-200 truncate max-w-[140px]" title={userEmail}>
                  {userEmail}
                </div>
                <div className="text-[10px] text-amber-400/90 font-mono">
                  {isVipActive
                    ? vipInfo.planId === 'unlimited_pro'
                      ? '👑 Unlimited Pro'
                      : vipInfo.planId === 'standard'
                      ? '⭐ Standard (70/mo)'
                      : vipInfo.planId === 'basic'
                      ? '⚡ Basic (30/mo)'
                      : '👑 VIP Active'
                    : isVipPending
                    ? '⏳ Pending'
                    : 'Free: 2/day'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-950/95 border border-white/15 shadow-2xl p-2 z-50 backdrop-blur-xl animate-fadeIn">
                <div className="p-3 border-b border-white/10">
                  <div className="text-xs font-semibold text-white truncate">{userEmail}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    {isVipActive ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                        {vipInfo.planName || '👑 VIP Member'}
                      </span>
                    ) : isVipPending ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/40">
                        ⏳ Verification Pending
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                        {t.freePlanBadge}
                      </span>
                    )}
                  </div>
                </div>

                <div className="py-1 space-y-1">
                  {/* Profile & Account Details */}
                  {onOpenProfile && (
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all text-left cursor-pointer"
                    >
                      <User className="w-4 h-4 text-sky-400" />
                      <span className={language === 'mm' ? 'font-burmese' : 'font-sans'}>{t.profile}</span>
                    </button>
                  )}

                  {/* Transcript Hub */}
                  {onOpenTranscriptHub && (
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onOpenTranscriptHub();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all text-left cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span className={language === 'mm' ? 'font-burmese' : 'font-sans'}>{t.transcriptHub}</span>
                    </button>
                  )}

                  {/* Orders */}
                  {onOpenOrders && (
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onOpenOrders();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all text-left cursor-pointer"
                    >
                      <Receipt className="w-4 h-4 text-amber-400" />
                      <span className={language === 'mm' ? 'font-burmese' : 'font-sans'}>{t.orders}</span>
                    </button>
                  )}

                  {/* Downloads */}
                  {onOpenDownloads && (
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onOpenDownloads();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all text-left cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span className={language === 'mm' ? 'font-burmese' : 'font-sans'}>{t.downloads}</span>
                    </button>
                  )}

                  {/* VIP Plans */}
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      onOpenSettings('vip');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all text-left cursor-pointer"
                  >
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span className={language === 'mm' ? 'font-burmese' : 'font-sans'}>{t.buyVipPlans}</span>
                  </button>

                  {/* Customer Support */}
                  {onOpenSupport && (
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onOpenSupport();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-all text-left cursor-pointer"
                    >
                      <Headphones className="w-4 h-4 text-emerald-400" />
                      <span className={language === 'mm' ? 'font-burmese' : 'font-sans'}>{t.support}</span>
                    </button>
                  )}

                  {/* Admin Portal (Strictly for Admin only) */}
                  {isAdminUser(userEmail, isAdminAuthenticated) && (
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onOpenAdminPortal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 rounded-xl transition-all text-left cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      <span>{t.adminPortal}</span>
                    </button>
                  )}

                  {/* Logout */}
                  {onLogout && (
                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all text-left cursor-pointer border-t border-white/5 mt-1"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span className={language === 'mm' ? 'font-burmese' : 'font-sans'}>{t.logout}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
