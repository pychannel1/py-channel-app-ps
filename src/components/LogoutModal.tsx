import React from 'react';
import { LogOut, X, AlertTriangle, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLogout: () => void;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onClose,
  onConfirmLogout,
}) => {
  const { language, t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-md rounded-3xl bg-slate-950/95 border border-white/15 shadow-2xl overflow-hidden backdrop-blur-2xl animate-fadeIn my-8 p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
          <LogOut className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-white font-sans">
            {language === 'mm' ? 'အကောင့်ထွက်ခွာရန် သေချာပါသလား?' : 'Are you sure you want to log out?'}
          </h3>
          <p className="text-xs text-slate-400 font-burmese leading-relaxed">
            {language === 'mm'
              ? 'အကောင့်ထွက်လိုက်ပါက အသုံးပြုဆဲ Session ပြီးဆုံးမည်ဖြစ်ပြီး စတင်မျက်နှာပြင်သို့ ပြန်လည်ရောက်ရှိပါမည်။'
              : 'Logging out will end your current active studio session and clear authorization credentials.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 transition-colors cursor-pointer"
          >
            {language === 'mm' ? 'မထွက်ပါ (Cancel)' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onConfirmLogout();
            }}
            className="py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
          >
            {language === 'mm' ? 'အကောင့်ထွက်မည် (Logout)' : 'Yes, Logout'}
          </button>
        </div>
      </div>
    </div>
  );
};
