import React, { useState } from 'react';
import { ShieldAlert, KeyRound, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';

interface MaintenanceScreenProps {
  noticeText: string;
  adminPin: string;
  onAdminLogin: () => void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  noticeText,
  adminPin,
  onAdminLogin,
}) => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === adminPin.trim() || pinInput.trim() === '778899') {
      setErrorMsg('');
      onAdminLogin();
    } else {
      setErrorMsg('PIN Code မှားယွင်းနေပါသည်။ (Default: 778899)');
    }
  };

  return (
    <div className="min-h-screen bg-[#080b12] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Maintenance Card */}
      <div className="max-w-xl w-full glass-panel p-8 sm:p-10 rounded-3xl border border-amber-500/30 text-center relative z-10 shadow-2xl shadow-amber-500/10 space-y-6">
        {/* Animated Icon */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/20 animate-pulse">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-mono font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            SYSTEM MAINTENANCE IN PROGRESS
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            စနစ် အဆင့်မြှင့်တင်နေပါသည်
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-burmese leading-relaxed pt-2">
            {noticeText}
          </p>
        </div>

        {/* Feature Highlights being updated */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 text-left space-y-2.5 text-xs text-slate-300">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5 font-burmese">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            မကြာမီ ထည့်သွင်းပေးမည့် အင်္ဂါရပ်အသစ်များ:
          </div>
          <ul className="space-y-1.5 pl-6 list-disc text-slate-400 font-burmese">
            <li>မြန်မာ AI အသံသစ်များ ထပ်မံဖြည့်စွက်ခြင်း (40 Neural Burmese Voices)</li>
            <li>ဗီဒီယိုနှင့် စကားပြောချိန်ကိုက် အလိုအလျောက် ညှိပေးသည့် စနစ် အဆင့်မြှင့်တင်ခြင်း</li>
            <li>ပိုမိုမြန်ဆန်သော 1080p HD Video Render Engine တပ်ဆင်ခြင်း</li>
          </ul>
        </div>

        {/* Admin Login Secret Button */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">pY Channel Studio &bull; Safe Shield</span>
          <button
            type="button"
            onClick={() => setShowPinModal(true)}
            className="flex items-center gap-1.5 text-xs text-amber-400/80 hover:text-amber-300 transition-colors cursor-pointer py-1 px-2.5 rounded-lg hover:bg-white/5"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Admin Login</span>
          </button>
        </div>
      </div>

      {/* Admin PIN Dialog */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel w-full max-w-sm rounded-2xl border border-amber-500/40 p-6 space-y-4 bg-slate-950/95 shadow-2xl">
            <div className="flex items-center gap-2.5 text-amber-400">
              <KeyRound className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Admin Authentication</h3>
            </div>
            <p className="text-xs text-slate-400 font-burmese">
              Maintenance Mode ကို ကျော်လွန်၍ စနစ်သို့ ဝင်ရောက်ရန် Admin PIN Code ရိုက်ထည့်ပါ:
            </p>

            <form onSubmit={handleVerifyPin} className="space-y-3">
              <div>
                <input
                  type="password"
                  autoFocus
                  maxLength={10}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="Enter PIN (Default: 778899)"
                  className="w-full text-center text-lg tracking-widest font-mono py-2.5 px-4 rounded-xl bg-slate-900 border border-white/20 text-amber-300 focus:outline-none focus:border-amber-400"
                />
                {errorMsg && (
                  <p className="text-xs text-red-400 font-burmese mt-1 text-center">{errorMsg}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setPinInput('');
                    setErrorMsg('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  <span>Login</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
