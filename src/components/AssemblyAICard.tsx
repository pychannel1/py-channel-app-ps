import React, { useState, useEffect } from 'react';
import { KeyRound, ChevronDown, ChevronUp, Eye, EyeOff, Save, CheckCircle2, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

interface AssemblyAICardProps {
  apiKey: string;
  onSaveKey: (key: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const AssemblyAICard: React.FC<AssemblyAICardProps> = ({
  apiKey,
  onSaveKey,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [inputVal, setInputVal] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    setInputVal(apiKey);
  }, [apiKey]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveKey(inputVal.trim());
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  const handleUseDemoKey = () => {
    const demoKey = 'aai_demo_' + Math.random().toString(36).substring(2, 10);
    setInputVal(demoKey);
    onSaveKey(demoKey);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  return (
    <div className="w-full mb-6 glass-panel rounded-2xl border border-amber-500/20 overflow-hidden transition-all duration-300 shadow-xl">
      {/* Header bar / Collapsible toggle */}
      <button
        id="assembly-card-toggle"
        onClick={onToggleCollapse}
        className="w-full flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-amber-950/40 via-slate-900/60 to-slate-900/40 hover:bg-slate-800/60 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                🔑 AssemblyAI API Key (English Speech-to-Text)
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/20">
                  ၁၀ မိနစ်စာ အထိ
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10">
                  [Local Storage]
                </span>
              </span>
              {apiKey ? (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Saved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-500/30">
                  <AlertCircle className="w-3 h-3 text-amber-400" /> Need Key / Demo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-burmese mt-0.5">
              အင်္ဂလိပ် အသံဖိုင်မှ အင်္ဂလိပ်စာသားများကို အချိန်မှတ် (English Timestamped Sentences) ဖြင့် ၁၀ မိနစ်စာအထိ တိကျစွာ ထုတ်ယူပေးပါသည်။
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-xs hidden sm:inline text-slate-400">
            {isCollapsed ? 'Show settings' : 'Hide settings'}
          </span>
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content */}
      {!isCollapsed && (
        <div className="p-4 sm:p-6 bg-slate-950/60 border-t border-white/5 space-y-4">
          <form onSubmit={handleSave} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  id="assembly-api-key-input"
                  type={showKey ? 'text' : 'password'}
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Enter AssemblyAI API Token (e.g. 7f98d41...)"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-mono text-slate-100 placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  id="save-assembly-key-btn"
                  type="submit"
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  {saveStatus === 'saved' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-950" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Key</span>
                    </>
                  )}
                </button>

                <button
                  id="demo-assembly-key-btn"
                  type="button"
                  onClick={handleUseDemoKey}
                  className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-medium transition-all"
                  title="Use Sample Demo Mode"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto Demo Key</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved securely in your browser's Local Storage. Never uploaded to public servers.</span>
              </div>
              <a
                href="https://www.assemblyai.com/dashboard/signup"
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:underline hover:text-amber-300"
              >
                Get free AssemblyAI Key &rarr;
              </a>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
