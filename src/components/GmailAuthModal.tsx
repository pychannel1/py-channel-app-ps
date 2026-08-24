import React, { useState } from 'react';
import {
  Mail,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  LogOut,
  User,
} from 'lucide-react';
import { UserAccount, ADMIN_EMAIL, getUserUsage } from '../services/authService';
import { useLanguage } from '../context/LanguageContext';

interface GmailAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onLoginSuccess: (account: UserAccount) => void;
}

export const GmailAuthModal: React.FC<GmailAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
}) => {
  const { language } = useLanguage();
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const currentUsage = getUserUsage(currentUser.email);

  const handleGoogleQuickLogin = (email: string, name: string) => {
    setIsProcessing(true);
    setErrorMsg('');

    setTimeout(() => {
      const account: UserAccount = {
        email: email.trim().toLowerCase(),
        name: name || email.split('@')[0],
        isGoogleUser: true,
        createdAt: Date.now(),
      };
      onLoginSuccess(account);
      setIsProcessing(false);
      onClose();
    }, 450);
  };

  const handleSubmitCustomEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = customEmail.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('ကျေးဇူးပြု၍ မှန်ကန်သော Gmail လိပ်စာ ထည့်သွင်းပေးပါ');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    setTimeout(() => {
      const account: UserAccount = {
        email: cleanEmail,
        name: customName.trim() || cleanEmail.split('@')[0],
        isGoogleUser: cleanEmail.endsWith('@gmail.com'),
        createdAt: Date.now(),
      };
      onLoginSuccess(account);
      setIsProcessing(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-md rounded-3xl bg-slate-950/95 border border-white/15 shadow-2xl overflow-hidden backdrop-blur-2xl animate-fadeIn my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-500 via-amber-500 to-blue-500 p-0.5 flex items-center justify-center shadow-lg">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Gmail အကောင့်ဖြင့် ဝင်ရောက်ပါ
              </h2>
              <p className="text-xs text-slate-400 font-burmese">
                ဗီဒီယိုဖန်တီးမှုအရေအတွက် မှတ်တမ်းတင်ရန်
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Currently logged-in account status card */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-mono font-semibold">
                လက်ရှိ ဝင်ထားသော အကောင့်
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                {currentUsage.videosGenerated} / 2 Videos Used
              </span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                {currentUser.email.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{currentUser.email}</p>
                <p className="text-[11px] text-slate-400 font-burmese">
                  {currentUsage.videosGenerated < 2
                    ? `အခမဲ့ ဖန်တီးခွင့် ${2 - currentUsage.videosGenerated} ပုဒ် ကျန်ရှိပါသည်`
                    : 'အခမဲ့ ၂ ပုဒ် ကန့်သတ်ချက် ပြည့်သွားပါပြီ'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick 1-Click Google Login Button */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-300 font-burmese">
              အောက်ပါ ခလုတ်ဖြင့် Google / Gmail ဝင်ရောက်ပါ:
            </div>

            <button
              type="button"
              id="google-signin-one-click-btn"
              disabled={isProcessing}
              onClick={() => handleGoogleQuickLogin('myanmar.creator@gmail.com', 'Myanmar Creator')}
              className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-3 transition-all cursor-pointer border border-slate-200 active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google / Gmail</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-slate-950 px-3 text-[11px] text-slate-500 uppercase font-mono">
              သို့မဟုတ် Gmail ရိုက်ထည့်ပါ
            </span>
          </div>

          {/* Custom Gmail Input Form */}
          <form onSubmit={handleSubmitCustomEmail} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-burmese">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>သင်၏ Gmail လိပ်စာ (Unique Gmail Address):</span>
              </label>
              <input
                type="email"
                required
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="w-full bg-slate-900 rounded-xl px-3.5 py-2.5 text-xs text-white border border-white/15 focus:border-amber-500 focus:outline-none font-mono"
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 font-burmese">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>Login & Track My Usage (အကောင့်ဝင်မည်)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Policy info */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-[11px] text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span className="font-burmese leading-relaxed">
              အခမဲ့ အသုံးပြုသူတိုင်းအတွက် ဗီဒီယို ၂ ပုဒ် အခမဲ့ ဖန်တီးခွင့်ပေးထားပါသည်။ အကောင့်တစ်ခုစီ၏ အသုံးပြုမှုကို သီးခြားစီ မှန်ကန်စွာ သိမ်းဆည်းထားပါသည်။
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
