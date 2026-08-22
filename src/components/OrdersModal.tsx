import React from 'react';
import {
  Receipt,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Crown,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { VipSubscriptionInfo, PlanTierId } from '../types';
import { getPlanById } from '../data/pricingPlans';

interface OrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  vipInfo: VipSubscriptionInfo;
  onOpenUpgradeModal: () => void;
}

export const OrdersModal: React.FC<OrdersModalProps> = ({
  isOpen,
  onClose,
  vipInfo,
  onOpenUpgradeModal,
}) => {
  const { language, t } = useLanguage();

  if (!isOpen) return null;

  const isVipActive = vipInfo.status === 'active_vip';
  const isPending = vipInfo.status === 'pending';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-950/95 border border-white/15 shadow-2xl overflow-hidden backdrop-blur-2xl animate-fadeIn my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className={language === 'mm' ? 'font-burmese' : 'font-sans'}>
                  {t.orders}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {isVipActive ? 'Active VIP' : isPending ? 'Pending' : 'Free Tier'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-burmese">
                {language === 'mm'
                  ? 'VIP ဝယ်ယူမှု ပြေစာများနှင့် အစီအစဉ်သက်တမ်း စစ်ဆေးခြင်း'
                  : 'Check VIP subscriptions, payment slips & order verification status'}
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
          {/* Current Active Plan Summary */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{vipInfo.planName || 'Free Plan'}</h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'mm' ? 'လက်ရှိအသုံးပြုနေသော အဆင့်' : 'Current Active Tier'}
                  </p>
                </div>
              </div>

              {isVipActive ? (
                <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{language === 'mm' ? 'အတည်ပြုပြီး' : 'Verified'}</span>
                </span>
              ) : isPending ? (
                <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{language === 'mm' ? 'စစ်ဆေးဆဲ' : 'Pending'}</span>
                </span>
              ) : (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                  {language === 'mm' ? 'အခမဲ့ အဆင့်' : 'Free Tier'}
                </span>
              )}
            </div>

            {/* Quota & Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/10 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/60">
                <span className="text-slate-500 block text-[10px]">
                  {language === 'mm' ? 'ကျန်ရှိသော အကြိမ်ရေ' : 'Quota Remaining'}
                </span>
                <span className="font-bold text-amber-300 font-mono text-sm">
                  {isVipActive
                    ? `${vipInfo.monthlyRemaining || 70} Recaps`
                    : `${vipInfo.dailyFreeRemaining || 2} / Day`}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60">
                <span className="text-slate-500 block text-[10px]">
                  {language === 'mm' ? 'ငွေပေးချေမှုပုံစံ' : 'Payment Method'}
                </span>
                <span className="font-semibold text-slate-200 uppercase font-mono">
                  {vipInfo.paymentMethod ? vipInfo.paymentMethod : 'N/A (Free)'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 col-span-2 sm:col-span-1">
                <span className="text-slate-500 block text-[10px]">
                  {language === 'mm' ? 'စတင်ခွင့်ပြုသည့်ရက်' : 'Approved Date'}
                </span>
                <span className="font-semibold text-slate-200 font-mono">
                  {vipInfo.approvedAt || 'Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Slip Reference & History */}
          {vipInfo.transactionRef && (
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'mm' ? 'နောက်ဆုံး ငွေလွှဲပြေစာ အချက်အလက်' : 'Last Transaction Slip'}</span>
              </h4>
              <div className="flex items-center justify-between text-xs font-mono bg-slate-950 p-2.5 rounded-xl border border-white/5">
                <span className="text-slate-400">Ref Code:</span>
                <span className="text-amber-400 font-bold">{vipInfo.transactionRef}</span>
              </div>
            </div>
          )}

          {/* Upgrade / Renew CTA */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenUpgradeModal();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Crown className="w-4 h-4 text-slate-950" />
              <span>
                {language === 'mm'
                  ? 'VIP အစီအစဉ်များကြည့်ရှုပြီး အဆင့်မြှင့်မည်'
                  : 'View VIP Pricing & Upgrade Now'}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
