import React from 'react';
import {
  Crown,
  X,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface LimitReachedModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  onOpenUpgradeModal: () => void;
  onOpenGmailModal: () => void;
}

export const LimitReachedModal: React.FC<LimitReachedModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  onOpenUpgradeModal,
  onOpenGmailModal,
}) => {
  const { language } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-md rounded-3xl bg-slate-950/95 border border-amber-500/40 shadow-2xl overflow-hidden backdrop-blur-2xl animate-fadeIn my-8">
        {/* Header */}
        <div className="p-6 text-center bg-gradient-to-b from-amber-500/15 to-transparent border-b border-white/10 space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
            <Crown className="w-7 h-7" />
          </div>

          <div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              FREE LIMIT REACHED (2/2 VIDEOS)
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight mt-2">
              အခမဲ့ ဗီဒီယို ဖန်တီးခွင့် ၂ ပုဒ် ပြည့်သွားပါပြီ
            </h2>
            <p className="text-xs text-slate-300 font-burmese mt-1">
              အကောင့်: <span className="font-mono text-amber-300 font-bold">{userEmail}</span>
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2 text-xs text-slate-300 font-burmese leading-relaxed">
            <p>
              Free Plan အသုံးပြုသူများအတွက် သတ်မှတ်ထားသော အခမဲ့ ၂ ပုဒ် ကန့်သတ်ချက် ပြည့်သွားပါသဖြင့် ဆက်လက်ဖန်တီးနိုင်ရန် VIP Plan သို့ အဆင့်မြှင့်တင်ပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။
            </p>
            <div className="pt-2 border-t border-white/10 space-y-1 text-slate-200">
              <div className="flex items-center gap-2 text-amber-300">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Unlimited 1080p HD Video Rendering</span>
              </div>
              <div className="flex items-center gap-2 text-amber-300">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>မြန်မာအသံ ၄၀ မျိုး အကန့်အသတ်မရှိ အသုံးပြုခွင့်</span>
              </div>
              <div className="flex items-center gap-2 text-amber-300">
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>မြန်နှုန်းမြင့် Gemini & Neural TTS Direct Server</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              id="upgrade-from-limit-modal-btn"
              onClick={() => {
                onClose();
                onOpenUpgradeModal();
              }}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs sm:text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Crown className="w-4 h-4 text-slate-950" />
              <span>VIP Plan အဆင့်မြှင့်တင်မည် (Upgrade VIP)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenGmailModal();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs border border-white/10 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>အခြား Gmail အကောင့်သို့ ပြောင်းလဲအသုံးပြုမည်</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
