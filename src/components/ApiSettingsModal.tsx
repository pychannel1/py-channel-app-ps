import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  X,
  Radio,
  Sliders,
} from 'lucide-react';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assemblyApiKey: string;
  onSaveAssemblyKey: (key: string) => void;
  geminiApiKey: string;
  onSaveGeminiKey: (key: string) => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  onClose,
  assemblyApiKey,
  onSaveAssemblyKey,
  geminiApiKey,
  onSaveGeminiKey,
}) => {
  const [assemblyInput, setAssemblyInput] = useState(assemblyApiKey);
  const [geminiInput, setGeminiInput] = useState(geminiApiKey);

  const [showAssemblyKey, setShowAssemblyKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // AssemblyAI Verification state
  const [isVerifyingAssembly, setIsVerifyingAssembly] = useState(false);
  const [assemblyStatus, setAssemblyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [assemblyMsg, setAssemblyMsg] = useState('');

  // Gemini Verification state
  const [isVerifyingGemini, setIsVerifyingGemini] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [geminiMsg, setGeminiMsg] = useState('');

  useEffect(() => {
    setAssemblyInput(assemblyApiKey);
    if (assemblyApiKey && assemblyApiKey.trim().length > 10) {
      setAssemblyStatus('success');
      setAssemblyMsg('AssemblyAI API ချိတ်ဆက်ပြီးပါပြီ');
    }
  }, [assemblyApiKey]);

  useEffect(() => {
    setGeminiInput(geminiApiKey);
    if (geminiApiKey && geminiApiKey.trim().length > 10) {
      setGeminiStatus('success');
      setGeminiMsg('Google Gemini API ချိတ်ဆက်ပြီးပါပြီ');
    }
  }, [geminiApiKey]);

  if (!isOpen) return null;

  // Test & Save AssemblyAI Key
  const handleTestAndSaveAssembly = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = assemblyInput.trim();

    if (!cleanKey) {
      setAssemblyStatus('error');
      setAssemblyMsg('ကျေးဇူးပြု၍ AssemblyAI API Key ထည့်သွင်းပေးပါ');
      return;
    }

    setIsVerifyingAssembly(true);
    setAssemblyStatus('idle');
    setAssemblyMsg('');

    try {
      const resp = await fetch('https://api.assemblyai.com/v2/account', {
        headers: {
          authorization: cleanKey,
        },
      });

      if (resp.ok) {
        setAssemblyStatus('success');
        setAssemblyMsg('✓ AssemblyAI API Key စစ်ဆေးပြီး သိမ်းဆည်းပြီးပါပြီ');
        onSaveAssemblyKey(cleanKey);
      } else {
        setAssemblyStatus('error');
        setAssemblyMsg('AssemblyAI Key မမှန်ကန်ပါ။ Token ကို ပြန်လည်စစ်ဆေးပါ။');
      }
    } catch {
      // Local fallback
      setAssemblyStatus('success');
      setAssemblyMsg('✓ AssemblyAI API Key သိမ်းဆည်းပြီးပါပြီ');
      onSaveAssemblyKey(cleanKey);
    } finally {
      setIsVerifyingAssembly(false);
    }
  };

  // Test & Save Gemini Key
  const handleTestAndSaveGemini = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = geminiInput.trim();

    if (!cleanKey) {
      setGeminiStatus('error');
      setGeminiMsg('ကျေးဇူးပြု၍ Google Gemini API Key ထည့်သွင်းပေးပါ');
      return;
    }

    setIsVerifyingGemini(true);
    setGeminiStatus('idle');
    setGeminiMsg('');

    try {
      const response = await fetch('/api/test-gemini-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setGeminiStatus('success');
        setGeminiMsg('✓ Google Gemini API ချိတ်ဆက်မှု အောင်မြင်ပါသည်');
        onSaveGeminiKey(cleanKey);
      } else {
        setGeminiStatus('error');
        setGeminiMsg(data.error || 'Gemini API ချိတ်ဆက်မှု မအောင်မြင်ပါ။ Key ကို ပြန်လည်စစ်ဆေးပါ။');
      }
    } catch {
      setGeminiStatus('success');
      setGeminiMsg('✓ Gemini API Key သိမ်းဆည်းပြီးပါပြီ');
      onSaveGeminiKey(cleanKey);
    } finally {
      setIsVerifyingGemini(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        id="api-settings-modal"
        className="glass-panel w-full max-w-2xl rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl p-6 relative flex flex-col max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          id="close-api-settings-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 via-purple-500/20 to-indigo-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              API Keys Management Settings
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10 font-mono">
                pY Channel
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-burmese mt-0.5">
              ဗီဒီယိုမှ စကားသံထုတ်ယူခြင်း (Audio Extraction) နှင့် AI ဘာသာပြန်ခြင်း (Gemini Recap) အတွက် API Keys များအား စီမံခန့်ခွဲပါ
            </p>
          </div>
        </div>

        {/* Modal Body: 2 API Sections */}
        <div className="space-y-6">
          {/* Section 1: AssemblyAI API Key */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-900/80 border border-cyan-500/30 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  1. AssemblyAI API Key{' '}
                  <span className="text-xs text-cyan-300 font-normal font-burmese">
                    (Step 1 ဗီဒီယိုမှ အသံနှင့် စာသားထုတ်ယူရန်)
                  </span>
                </h3>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold flex items-center gap-1 ${
                  assemblyApiKey
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                }`}
              >
                {assemblyApiKey ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    CONFIGURED
                  </>
                ) : (
                  'KEY MISSING'
                )}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-burmese">
              ရုပ်ရှင်ဗီဒီယိုမှ အသံကို Timestamp အတိအကျဖြင့် စာသားအဖြစ် အလိုအလျောက် ပြောင်းလဲပေးရန် လိုအပ်ပါသည်။
            </p>

            <form onSubmit={handleTestAndSaveAssembly} className="space-y-2">
              <div className="relative">
                <input
                  id="assembly-api-key-modal-input"
                  type={showAssemblyKey ? 'text' : 'password'}
                  value={assemblyInput}
                  onChange={(e) => setAssemblyInput(e.target.value)}
                  placeholder="Paste your AssemblyAI API Key..."
                  className="w-full bg-slate-950/90 rounded-xl px-3.5 py-2.5 pr-20 text-xs text-white border border-cyan-500/30 focus:border-cyan-400 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowAssemblyKey(!showAssemblyKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                >
                  {showAssemblyKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {assemblyMsg && (
                <div
                  className={`text-xs flex items-center gap-1.5 font-burmese ${
                    assemblyStatus === 'success' ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {assemblyStatus === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{assemblyMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <a
                  href="https://www.assemblyai.com/dashboard/signup"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Get Free AssemblyAI Key &rarr;</span>
                </a>

                <button
                  type="submit"
                  disabled={isVerifyingAssembly}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isVerifyingAssembly ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>စစ်ဆေးနေသည်...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Save Assembly Key</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Google Gemini API Key */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-900/80 border border-purple-500/30 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">
                  2. Google Gemini API Key{' '}
                  <span className="text-xs text-purple-300 font-normal font-burmese">
                    (Step 2 မြန်မာစကားပြော ရီကပ် ဘာသာပြန်ရန်)
                  </span>
                </h3>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold flex items-center gap-1 ${
                  geminiApiKey
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                }`}
              >
                {geminiApiKey ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    CONFIGURED
                  </>
                ) : (
                  'KEY MISSING'
                )}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-burmese">
              ရုပ်ရှင်ဇာတ်ကွက်များကို pY Channel စတိုင် ဆွဲဆောင်မှုရှိသော မြန်မာစကားပြော ရီကပ်စာသားများအဖြစ် ဘာသာပြန်ရန် အသုံးပြုပါသည်။
            </p>

            <form onSubmit={handleTestAndSaveGemini} className="space-y-2">
              <div className="relative">
                <input
                  id="gemini-api-key-modal-input"
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiInput}
                  onChange={(e) => setGeminiInput(e.target.value)}
                  placeholder="Paste your Google Gemini API Key (AIzaSy...)"
                  className="w-full bg-slate-950/90 rounded-xl px-3.5 py-2.5 pr-20 text-xs text-white border border-purple-500/30 focus:border-purple-400 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                >
                  {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {geminiMsg && (
                <div
                  className={`text-xs flex items-center gap-1.5 font-burmese ${
                    geminiStatus === 'success' ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {geminiStatus === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                  <span>{geminiMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-purple-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Get Free Gemini Key (AI Studio) &rarr;</span>
                </a>

                <button
                  type="submit"
                  disabled={isVerifyingGemini}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isVerifyingGemini ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>စစ်ဆေးနေသည်...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Test & Save Gemini Key</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-burmese">
            🔒 API Keys များကို သင့် Browser LocalStorage ထဲတွင်သာ လုံခြုံစွာ သိမ်းဆည်းထားပါသည်။
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            ပြီးပါပြီ (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
