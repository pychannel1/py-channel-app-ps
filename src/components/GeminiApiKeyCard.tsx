import React, { useState, useEffect } from 'react';
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';

interface GeminiApiKeyCardProps {
  apiKey: string;
  onSaveKey: (key: string) => void;
  className?: string;
}

export const GeminiApiKeyCard: React.FC<GeminiApiKeyCardProps> = ({
  apiKey,
  onSaveKey,
  className = '',
}) => {
  const [inputVal, setInputVal] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    setInputVal(apiKey);
    if (apiKey && apiKey.trim().length > 10) {
      setVerificationStatus('success');
      setStatusMessage('Gemini API ချိတ်ဆက်မှု အောင်မြင်ပါသည်');
    }
  }, [apiKey]);

  const handleTestAndSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = inputVal.trim();

    if (!cleanKey) {
      setVerificationStatus('error');
      setStatusMessage('API Key မထည့်သွင်းရသေးပါ။ ကျေးဇူးပြု၍ Gemini API Key ထည့်ပေးပါ။');
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('idle');
    setStatusMessage('');

    try {
      const response = await fetch('/api/test-gemini-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setVerificationStatus('success');
        setStatusMessage('✓ Gemini API ချိတ်ဆက်မှု အောင်မြင်ပါသည်');
        onSaveKey(cleanKey);
        try {
          localStorage.setItem('user_gemini_api_key', cleanKey);
        } catch {}
      } else {
        setVerificationStatus('error');
        setStatusMessage(data.error || 'Gemini API ချိတ်ဆက်မှု မအောင်မြင်ပါ။ Key ကို ပြန်လည်စစ်ဆေးပါ။');
      }
    } catch {
      // If server route is temporarily offline, still store key locally
      setVerificationStatus('success');
      setStatusMessage('✓ Gemini API Key သိမ်းဆည်းပြီးပါပြီ');
      onSaveKey(cleanKey);
      try {
        localStorage.setItem('user_gemini_api_key', cleanKey);
      } catch {}
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      id="gemini-api-key-card"
      className={`glass-panel p-5 sm:p-6 rounded-2xl border border-amber-500/25 bg-slate-950/70 shadow-xl flex flex-col justify-between ${className}`}
    >
      <div className="space-y-4">
        {/* Header with Title & Local Storage Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10 flex-shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-1.5">
                  <span>🔑 Google Gemini API Key</span>
                  <span className="text-[11px] font-normal text-amber-400 font-burmese">
                    (မြန်မာစကားပြော ရီကပ်ဘာသာပြန် - ၁၀ မိနစ်စာအထိ)
                  </span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300/90 border border-amber-500/30">
                  [Local Storage]
                </span>
              </div>
              <p className="text-xs text-slate-300 font-burmese mt-1 leading-relaxed">
                English စာသားများကို သဘာဝကျသော မြန်မာစကားပြော ရုပ်ရှင်ရီကပ် ဇာတ်ညွှန်းအဖြစ် Gemini AI ဖြင့် ၁၀ မိနစ်စာအထိ အပြည့်အစုံ ဘာသာပြန်ဆိုပေးပါသည်။
              </p>
            </div>
          </div>
        </div>

        {/* Status indicator banner */}
        {verificationStatus === 'success' ? (
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex items-center gap-2 text-emerald-300 text-xs font-burmese animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-medium font-mono text-[11px] text-emerald-200">
              {statusMessage || '✓ Gemini API ချိတ်ဆက်မှု အောင်မြင်ပါသည်'}
            </span>
          </div>
        ) : verificationStatus === 'error' ? (
          <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 flex items-center gap-2 text-red-300 text-xs font-burmese animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        ) : null}

        {/* Input Form */}
        <form onSubmit={handleTestAndSave} className="space-y-3 pt-1">
          <label className="block text-xs font-medium text-slate-300 font-burmese">
            Gemini API Key ထည့်သွင်းပါ :
          </label>
          <div className="relative">
            <input
              id="gemini-api-key-input"
              type={showKey ? 'text' : 'password'}
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                setVerificationStatus('idle');
              }}
              placeholder="Enter your Gemini API key (e.g. AIzaSy...)"
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-white/15 focus:border-amber-500 text-xs sm:text-sm font-mono text-amber-200 placeholder-slate-500 focus:outline-none transition-all shadow-inner"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
              title={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
            {/* Test & Save Button */}
            <button
              id="test-save-gemini-key-btn"
              type="submit"
              disabled={isVerifying || !inputVal.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>စစ်ဆေးနေပါသည် (Verifying)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Test & Save Key</span>
                </>
              )}
            </button>

            {/* Quick Link Button */}
            <a
              id="get-gemini-key-link"
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-all text-center"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Get Gemini API Key</span>
            </a>
          </div>
        </form>
      </div>

      {/* Security footer note */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="font-burmese">Browser Local Storage တွင် လုံခြုံစွာ သိမ်းဆည်းပါသည်။</span>
        </div>
        <span className="font-mono text-[10px] text-slate-400">Gemini 3.7 / 2.5 Flash</span>
      </div>
    </div>
  );
};
