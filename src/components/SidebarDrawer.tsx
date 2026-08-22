import React from 'react';
import {
  Film,
  FileText,
  Crown,
  Receipt,
  Download,
  User,
  Headphones,
  LogOut,
  X,
  Sparkles,
  ChevronRight,
  Shield,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { VipSubscriptionInfo } from '../types';

export type SidebarNavItem =
  | 'studio'
  | 'transcript-hub'
  | 'buy-vip'
  | 'orders'
  | 'downloads'
  | 'profile'
  | 'support'
  | 'logout';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeItem: SidebarNavItem;
  onSelectItem: (item: SidebarNavItem) => void;
  userEmail: string;
  vipInfo: VipSubscriptionInfo;
  isAdminAuthenticated: boolean;
  onOpenAdminPortal: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeItem,
  onSelectItem,
  userEmail,
  vipInfo,
  isAdminAuthenticated,
  onOpenAdminPortal,
}) => {
  const { t, language } = useLanguage();
  const isVipActive = vipInfo.status === 'active_vip';
  const isVipPending = vipInfo.status === 'pending';

  if (!isOpen) return null;

  const navItems = [
    {
      id: 'studio' as SidebarNavItem,
      icon: Film,
      labelMm: 'စတူဒီယို (Studio)',
      labelEn: 'Studio',
      badge: 'Main',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'transcript-hub' as SidebarNavItem,
      icon: FileText,
      labelMm: 'စာသားမှတ်တမ်းခန်း',
      labelEn: 'Transcript Hub',
      badge: 'AI Hub',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      id: 'buy-vip' as SidebarNavItem,
      icon: Crown,
      labelMm: 'VIP အဆင့်မြှင့်မည်',
      labelEn: 'Buy VIP / Plans',
      badge: 'Hot 🔥',
      badgeColor: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/40',
    },
    {
      id: 'orders' as SidebarNavItem,
      icon: Receipt,
      labelMm: 'ပြေစာစစ်ဆေးမှု',
      labelEn: 'Orders & Subscriptions',
      badge: isVipPending ? 'Pending' : undefined,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    {
      id: 'downloads' as SidebarNavItem,
      icon: Download,
      labelMm: 'ရယူပြီးသောဖိုင်များ',
      labelEn: 'Downloads',
    },
    {
      id: 'profile' as SidebarNavItem,
      icon: User,
      labelMm: 'အကောင့်အချက်အလက်',
      labelEn: 'Profile',
    },
    {
      id: 'support' as SidebarNavItem,
      icon: Headphones,
      labelMm: 'အကူအညီရယူရန်',
      labelEn: 'Customer Support',
      badge: '24/7',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
  ];

  const handleSelect = (id: SidebarNavItem) => {
    onSelectItem(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <aside
        id="sidebar-drawer-panel"
        className="absolute inset-y-0 left-0 max-w-full flex w-80 sm:w-88 flex-col bg-slate-950/95 border-r border-white/10 shadow-2xl backdrop-blur-2xl z-50 animate-slideInLeft"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 ring-1 ring-white/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 font-sans">
                pY Channel
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                  v3.0
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-burmese">
                {language === 'mm' ? 'ရုပ်ရှင်ဇာတ်လမ်းပြော စတူဒီယို' : 'Movie Recap AI Studio'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-sidebar-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top: Language Switcher Toggle (Placed in Sidebar Header) */}
        <div className="p-3.5 border-b border-white/10 bg-slate-950/40">
          <LanguageToggle variant="sidebar" />
        </div>

        {/* User Status Card */}
        <div className="p-3.5 mx-3.5 my-2.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-bold text-xs shadow-sm flex-shrink-0">
                {isVipActive ? <Crown className="w-4 h-4 text-slate-950" /> : <User className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{userEmail}</p>
                <p className="text-[10px] text-amber-400 font-mono">
                  {isVipActive ? vipInfo.planName || '👑 VIP Member' : isVipPending ? '⏳ Verification Pending' : 'Free Plan (2/day)'}
                </p>
              </div>
            </div>
            {isVipActive ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-mono flex-shrink-0">
                VIP
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleSelect('buy-vip')}
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all font-sans cursor-pointer flex-shrink-0"
              >
                Upgrade
              </button>
            )}
          </div>
        </div>

        {/* Nav Items List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 custom-scrollbar">
          <div className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            {language === 'mm' ? 'ပင်မ အခန်းကဏ္ဍများ' : 'Workspace & Menus'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeItem === item.id;
            const label = language === 'mm' ? item.labelMm : item.labelEn;

            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer group ${
                  active
                    ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-transparent border border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/10'
                    : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      active
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-800/80 text-slate-400 group-hover:text-amber-300 group-hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className={language === 'mm' ? 'font-burmese' : 'font-sans font-medium'}>
                    {label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border font-mono ${
                        item.badgeColor || 'bg-slate-800 text-slate-300 border-white/10'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform ${
                      active ? 'text-amber-400 translate-x-0.5' : 'text-slate-600 opacity-40 group-hover:opacity-100'
                    }`}
                  />
                </div>
              </button>
            );
          })}

          {/* Admin Master Portal Link (If authenticated) */}
          {isAdminAuthenticated && (
            <div className="pt-2">
              <button
                type="button"
                id="sidebar-nav-admin"
                onClick={() => {
                  onClose();
                  onOpenAdminPortal();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 transition-all text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-black flex items-center justify-center font-bold">
                    <KeyRound className="w-3.5 h-3.5" />
                  </div>
                  <span>{language === 'mm' ? 'Admin စီမံခန့်ခွဲမှု' : 'Admin Master Portal'}</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500 text-black">
                  ROOT
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Drawer Footer with Logout Action */}
        <div className="p-3.5 border-t border-white/10 bg-slate-900/60 space-y-2">
          <button
            type="button"
            id="sidebar-nav-logout"
            onClick={() => handleSelect('logout')}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-rose-300 hover:text-rose-200 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-500/20 hover:border-rose-500/40 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4 text-rose-400" />
              <span className={language === 'mm' ? 'font-burmese' : 'font-sans'}>
                {t.logout}
              </span>
            </div>
            <span className="text-[10px] text-rose-400/80 font-mono">Sign out</span>
          </button>
        </div>
      </aside>
    </div>
  );
};
