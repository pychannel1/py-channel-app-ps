import React from 'react';
import {
  Headphones,
  X,
  Send,
  Phone,
  Mail,
  HelpCircle,
  ExternalLink,
  MessageSquare,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  const { language, t } = useLanguage();

  if (!isOpen) return null;

  const faqs = [
    {
      qMm: 'VIP အဆင့်မြှင့်ထားသော အကောင့် ဘယ်အချိန်မှာ အတည်ပြုပေးပါသလဲ?',
      qEn: 'How long does VIP plan verification take?',
      aMm: 'KBZPay သို့မဟုတ် WavePay ပြေစာ တင်ပြီးသည်နှင့် Admin Team မှ ၅ မိနစ်မှ ၁၅ မိနစ်အတွင်း အတည်ပြုပေးပါသည်။',
      aEn: 'Verification is typically completed within 5-15 minutes after submitting your payment slip.',
    },
    {
      qMm: 'AssemblyAI နှင့် Gemini API Key ထည့်သွင်းခြင်း မဖြစ်မနေ လိုအပ်ပါသလား?',
      qEn: 'Is bringing your own API keys mandatory?',
      aMm: 'VIP Member များသည် စနစ်၏ Master Server API များကို အခမဲ့ အသုံးပြုနိုင်ပြီး မိမိကိုယ်ပိုင် API Key လည်း ထည့်သွင်း အသုံးပြုနိုင်ပါသည်။',
      aEn: 'VIP Members can utilize our high-speed Master Server APIs without entering their own keys.',
    },
    {
      qMm: 'မြန်မာအသံ အသံထွက် ကောင်းမွန်အောင် ဘယ်လို ပြင်ဆင်ရမလဲ?',
      qEn: 'How to optimize Burmese voice pronunciation?',
      aMm: 'Step 3 တွင် Burmese Script Editor မှတစ်ဆင့် အသံထွက်မှားသော စကားလုံးများကို ပြင်ဆင်နိုင်ပြီး Pitch နှင့် Speed ကို ညှိနိုင်ပါသည်။',
      aEn: 'You can fine-tune text spelling in Step 3 editor and adjust pitch/speed sliders in real-time.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-950/95 border border-white/15 shadow-2xl overflow-hidden backdrop-blur-2xl animate-fadeIn my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className={language === 'mm' ? 'font-burmese' : 'font-sans'}>
                  {t.support}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  24/7 Available
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-burmese">
                {language === 'mm'
                  ? 'အသုံးပြုရာတွင် အခက်အခဲရှိပါက တိုက်ရိုက် ဆက်သွယ် မေးမြန်းနိုင်ပါသည်'
                  : 'Get quick assistance with VIP subscriptions, recaps, and API setup'}
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
        <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Quick Contact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="https://t.me/pychannel_support"
              target="_blank"
              rel="noreferrer"
              className="p-4 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-white/10 hover:border-sky-500/40 transition-all flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors">
                  Telegram Official
                </h4>
                <p className="text-[11px] text-slate-400 font-mono">@pychannel_support</p>
              </div>
            </a>

            <a
              href="tel:+959790000000"
              className="p-4 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-white/10 hover:border-purple-500/40 transition-all flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                  Viber Support
                </h4>
                <p className="text-[11px] text-slate-400 font-mono">+95 9 790 000 000</p>
              </div>
            </a>
          </div>

          {/* Email Support Card */}
          <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-300 font-mono">support@pychannel.com</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Email Support</span>
          </div>

          {/* FAQs */}
          <div className="space-y-2.5 pt-2">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-sans">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'mm' ? 'မကြာခဏ မေးလေ့ရှိသော မေးခွန်းများ' : 'Frequently Asked Questions'}</span>
            </h4>

            <div className="space-y-2">
              {faqs.map((faq, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5 space-y-1.5">
                  <p className="text-xs font-semibold text-amber-300">
                    {language === 'mm' ? faq.qMm : faq.qEn}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed font-burmese">
                    {language === 'mm' ? faq.aMm : faq.aEn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
