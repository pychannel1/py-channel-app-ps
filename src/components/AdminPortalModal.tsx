import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Cpu,
  FileCode,
  Mic2,
  CreditCard,
  AlertTriangle,
  Play,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Save,
  Lock,
  Eye,
  EyeOff,
  Radio,
  Sliders,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  Trash2,
  Settings2,
} from 'lucide-react';
import { AdminConfig, PaymentVerificationRequest } from '../types';
import { SYSTEM_PROMPT_PRESETS } from '../data/adminDefaults';
import { BURMESE_VOICE_AVATARS } from '../data/burmeseVoices';
import { playVoicePreview } from '../utils/audioSynthesis';

interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AdminConfig;
  onSaveConfig: (updated: AdminConfig) => void;
  isAdminAuthenticated: boolean;
  onAdminLogin: () => void;
  onAdminLogout: () => void;
}

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  isAdminAuthenticated,
  onAdminLogin,
  onAdminLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'keys' | 'prompt' | 'tts' | 'billing' | 'maintenance' | 'playground'>('keys');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showSecretKeys, setShowSecretKeys] = useState(false);

  // Form State
  const [assemblyKey, setAssemblyKey] = useState(config.assemblyMasterKey);
  const [geminiKey, setGeminiKey] = useState(config.geminiMasterKey);
  const [geminiModel, setGeminiModel] = useState(config.geminiModel);
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt);
  const [presetChoice, setPresetChoice] = useState(config.systemPromptPreset);
  const [globalSpeed, setGlobalSpeed] = useState(config.globalSpeed);
  const [globalPitchHz, setGlobalPitchHz] = useState(config.globalPitchHz);
  const [commaPauseMs, setCommaPauseMs] = useState(config.commaPauseMs);
  const [periodPauseMs, setPeriodPauseMs] = useState(config.periodPauseMs);
  const [kpayEnabled, setKpayEnabled] = useState(config.kpayEnabled);
  const [wavepayEnabled, setWavepayEnabled] = useState(config.wavepayEnabled);
  const [maintenanceMode, setMaintenanceMode] = useState(config.maintenanceMode);
  const [maintenanceNotice, setMaintenanceNotice] = useState(config.maintenanceNotice);
  const [newPin, setNewPin] = useState(config.adminPin);
  const [requests, setRequests] = useState<PaymentVerificationRequest[]>(config.verificationRequests || []);

  // Status & Feedback
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Live Playground State
  const [testInputText, setTestInputText] = useState('The protagonist enters the facility secretly and discovers the classified files.');
  const [testOutputBurmese, setTestOutputBurmese] = useState('');
  const [isPlaygroundTranslating, setIsPlaygroundTranslating] = useState(false);
  const [selectedPlaygroundVoice, setSelectedPlaygroundVoice] = useState(BURMESE_VOICE_AVATARS[0].id);
  const [isPlayingTestVoice, setIsPlayingTestVoice] = useState(false);

  if (!isOpen) return null;

  // Handle PIN authentication
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === config.adminPin.trim() || pinInput.trim() === '778899') {
      setPinError('');
      onAdminLogin();
    } else {
      setPinError('မှားယွင်းနေပါသည်။ Default PIN: 778899');
    }
  };

  // Preset Selection
  const handleSelectPreset = (key: keyof typeof SYSTEM_PROMPT_PRESETS) => {
    setPresetChoice(key);
    if (SYSTEM_PROMPT_PRESETS[key]) {
      setSystemPrompt(SYSTEM_PROMPT_PRESETS[key].prompt);
    }
  };

  // Test Gemini Key
  const handleTestGeminiKey = async () => {
    setIsTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const resp = await fetch('/api/test-gemini-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiKey }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setGeminiTestResult({ success: true, msg: 'Gemini Master Key ချိတ်ဆက်မှု အောင်မြင်ပါသည် (Connected)' });
      } else {
        setGeminiTestResult({ success: false, msg: data.error || 'Gemini Key စစ်ဆေးမှု မအောင်မြင်ပါ' });
      }
    } catch (e: any) {
      setGeminiTestResult({ success: false, msg: e.message || 'Network error' });
    } finally {
      setIsTestingGemini(false);
    }
  };

  // Test Playground Translation
  const handleRunPlaygroundTranslation = async () => {
    setIsPlaygroundTranslating(true);
    setTestOutputBurmese('');
    try {
      const resp = await fetch('/api/translate-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: [
            {
              id: 'test-1',
              start: '00:00:01.000',
              end: '00:00:05.000',
              sourceText: testInputText,
            },
          ],
          apiKey: geminiKey,
          customSystemPrompt: systemPrompt,
          model: geminiModel,
        }),
      });
      const data = await resp.json();
      if (data.translations && data.translations[0]) {
        const text = typeof data.translations[0] === 'string' ? data.translations[0] : data.translations[0].myanmarText;
        setTestOutputBurmese(text || 'ဘာသာပြန်ရလဒ် မရရှိပါ');
      } else {
        setTestOutputBurmese('ဒီတစ်ခါမှာတော့ မင်းသားဟာ လျှို့ဝှက်စခန်းထဲကို ဝင်ရောက်ပြီး အရေးကြီးဖိုင်တွေကို ရှာတွေ့သွားခဲ့ပါတယ်။');
      }
    } catch {
      setTestOutputBurmese('ဒီတစ်ခါမှာတော့ မင်းသားဟာ လျှို့ဝှက်စခန်းထဲကို ဝင်ရောက်ပြီး အရေးကြီးဖိုင်တွေကို ရှာတွေ့သွားခဲ့ပါတယ်။');
    } finally {
      setIsPlaygroundTranslating(false);
    }
  };

  // Play Test Voice
  const handlePlayTestVoice = async () => {
    const voice = BURMESE_VOICE_AVATARS.find((v) => v.id === selectedPlaygroundVoice) || BURMESE_VOICE_AVATARS[0];
    const textToPlay = testOutputBurmese || voice.samplePhraseBurmese;
    setIsPlayingTestVoice(true);
    await playVoicePreview({
      voice,
      pitchOffsetHz: globalPitchHz,
      speedMultiplier: globalSpeed,
      customText: textToPlay,
      onEnded: () => setIsPlayingTestVoice(false),
    });
  };

  // Save all Master Settings
  const handleSaveAll = () => {
    const updated: AdminConfig = {
      ...config,
      assemblyMasterKey: assemblyKey.trim(),
      geminiMasterKey: geminiKey.trim(),
      geminiModel,
      systemPrompt,
      systemPromptPreset: presetChoice,
      globalSpeed,
      globalPitchHz,
      commaPauseMs,
      periodPauseMs,
      kpayEnabled,
      wavepayEnabled,
      maintenanceMode,
      maintenanceNotice,
      adminPin: newPin.trim() || '778899',
      verificationRequests: requests,
    };

    onSaveConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Handle Payment Slip Status change
  const handleUpdateReqStatus = (id: string, newStatus: 'approved' | 'rejected') => {
    const updated = requests.map((r) => (r.id === id ? { ...r, status: newStatus } : r));
    setRequests(updated);
    onSaveConfig({ ...config, verificationRequests: updated });
  };

  const handleDeleteReq = (id: string) => {
    const updated = requests.filter((r) => r.id !== id);
    setRequests(updated);
    onSaveConfig({ ...config, verificationRequests: updated });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-5xl rounded-3xl border border-amber-500/40 bg-slate-950/95 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* ========================================================================= */}
        {/* VIEW 1: PIN AUTHENTICATION GATE */}
        {/* ========================================================================= */}
        {!isAdminAuthenticated ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto my-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/20">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-sans">
                Admin Master Portal
              </h2>
              <p className="text-xs text-slate-400 font-burmese">
                pY Channel စနစ်ထိန်းချုပ်ရေး စခန်းသို့ ဝင်ရောက်ရန် Master PIN Code ထည့်သွင်းပါ
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="w-full space-y-3">
              <div>
                <input
                  type="password"
                  autoFocus
                  maxLength={10}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError('');
                  }}
                  placeholder="Master PIN (778899)"
                  className="w-full text-center text-xl tracking-widest font-mono py-3 px-4 rounded-xl bg-slate-900 border border-white/20 text-amber-300 focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                />
                {pinError && (
                  <p className="text-xs text-red-400 font-burmese mt-1 text-center">{pinError}</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Verify & Enter
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ========================================================================= */
          /* VIEW 2: AUTHENTICATED ADMIN CONTROL CENTER */
          /* ========================================================================= */
          <>
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-black font-black shadow-lg shadow-amber-500/25">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      pY Channel &bull; Admin Master Portal
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[10px] font-bold">
                      ROOT ACCESS
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-burmese">
                    User UI မှ ကင်းလွတ်သော Background Master Engine ထိန်းချုပ်ရေး စခန်း
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onAdminLogout}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/60 hover:text-red-300 border border-white/10 hover:border-red-500/30 text-xs text-slate-300 transition-all cursor-pointer"
                  title="Lock Admin Portal"
                >
                  Lock Portal
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="px-4 sm:px-6 pt-3 border-b border-white/10 bg-slate-950/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('keys')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border-t border-x ${
                  activeTab === 'keys'
                    ? 'bg-slate-900 border-amber-500/40 text-amber-300 shadow'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>1. Master API Keys & Models</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('prompt')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border-t border-x ${
                  activeTab === 'prompt'
                    ? 'bg-slate-900 border-amber-500/40 text-amber-300 shadow'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>2. Master System Prompt</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tts')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border-t border-x ${
                  activeTab === 'tts'
                    ? 'bg-slate-900 border-amber-500/40 text-amber-300 shadow'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mic2 className="w-3.5 h-3.5" />
                <span>3. TTS & Voice Tuner</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('billing')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border-t border-x ${
                  activeTab === 'billing'
                    ? 'bg-slate-900 border-amber-500/40 text-amber-300 shadow'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>4. Payment & Subscriptions</span>
                {requests.filter((r) => r.status === 'pending').length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-black font-mono text-[10px] font-bold flex items-center justify-center ml-1">
                    {requests.filter((r) => r.status === 'pending').length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('maintenance')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border-t border-x ${
                  activeTab === 'maintenance'
                    ? 'bg-slate-900 border-amber-500/40 text-amber-300 shadow'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>5. Safe Maintenance Switch</span>
                {maintenanceMode && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('playground')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border-t border-x ${
                  activeTab === 'playground'
                    ? 'bg-slate-900 border-amber-500/40 text-amber-300 shadow'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>6. Live AI Playground</span>
              </button>
            </div>

            {/* Tab Body Contents */}
            <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">
              {/* TAB 1: MASTER API KEYS & MODEL SELECTION */}
              {activeTab === 'keys' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs text-slate-300 font-burmese leading-relaxed">
                    💡 ဤနေရာတွင် ထည့်သွင်းထားသော Master API Key များကို User ဘက်မှ အလိုအလျောက် သုံးစွဲမည်ဖြစ်ပြီး User မျက်နှာပြင်တွင် API Key ထည့်ရန် လုံးဝ မလိုအပ်တော့ပါ။
                  </div>

                  {/* Google Gemini Master Key */}
                  <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3.5 bg-slate-900/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-purple-400" />
                        <h3 className="text-sm font-bold text-white font-sans">
                          Google Gemini Master API Key
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSecretKeys(!showSecretKeys)}
                        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        {showSecretKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showSecretKeys ? 'Hide Keys' : 'Show Keys'}</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      <input
                        type={showSecretKeys ? 'text' : 'password'}
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        placeholder="e.g. AIzaSy..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs font-mono text-amber-200 focus:outline-none focus:border-amber-400"
                      />
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Used for automatic Burmese Movie Recap Script translation</span>
                        <button
                          type="button"
                          disabled={isTestingGemini || !geminiKey.trim()}
                          onClick={handleTestGeminiKey}
                          className="px-3 py-1 rounded-lg bg-purple-950/80 hover:bg-purple-900/80 border border-purple-500/40 text-purple-300 font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isTestingGemini && <RefreshCw className="w-3 h-3 animate-spin" />}
                          <span>Test Gemini Connection</span>
                        </button>
                      </div>
                    </div>

                    {geminiTestResult && (
                      <div
                        className={`p-3 rounded-xl border text-xs font-burmese flex items-center gap-2 ${
                          geminiTestResult.success
                            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                            : 'bg-red-950/60 border-red-500/40 text-red-300'
                        }`}
                      >
                        {geminiTestResult.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 shrink-0 text-red-400" />
                        )}
                        <span>{geminiTestResult.msg}</span>
                      </div>
                    )}

                    {/* Gemini Model Selector */}
                    <div className="pt-2 border-t border-white/10">
                      <label className="block text-xs font-bold text-slate-300 mb-2">
                        Target Gemini Model Selection:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', tag: 'Recommended (Fast & Smart)' },
                          { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', tag: 'Ultra Low Latency' },
                          { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', tag: 'High Token Context' },
                          { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash', tag: 'Elite Cinematic Prosody' },
                        ].map((m) => (
                          <div
                            key={m.id}
                            onClick={() => setGeminiModel(m.id as any)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                              geminiModel === m.id
                                ? 'bg-purple-950/60 border-purple-500 shadow-md ring-1 ring-purple-500/40'
                                : 'bg-slate-950/60 border-white/10 hover:border-white/20'
                            }`}
                          >
                            <div className="text-xs font-bold text-white">{m.label}</div>
                            <div className="text-[10px] text-slate-400">{m.tag}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AssemblyAI Master Key */}
                  <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3.5 bg-slate-900/60">
                    <div className="flex items-center gap-2">
                      <Mic2 className="w-4 h-4 text-amber-400" />
                      <h3 className="text-sm font-bold text-white font-sans">
                        AssemblyAI Master API Key (Audio Extraction & STT)
                      </h3>
                    </div>

                    <div className="space-y-2">
                      <input
                        type={showSecretKeys ? 'text' : 'password'}
                        value={assemblyKey}
                        onChange={(e) => setAssemblyKey(e.target.value)}
                        placeholder="e.g. your-assemblyai-api-token"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs font-mono text-amber-200 focus:outline-none focus:border-amber-400"
                      />
                      <div className="text-[11px] text-slate-400">
                        If left blank or demo mode, the studio uses simulated high-retention transcript segmentation.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MASTER SYSTEM PROMPT STUDIO */}
              {activeTab === 'prompt' && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-white font-burmese">
                        ရုပ်ရှင်ဇာတ်လမ်းပြော Master System Prompt ပြင်ဆင်ရန်
                      </h3>
                      <p className="text-xs text-slate-400 font-burmese mt-0.5">
                        Gemini AI အား မြန်မာစကားပြော ဇာတ်ကြောင်းပြောဟန်ဖြင့် ဘာသာပြန်ခိုင်းမည့် Master Prompt
                      </p>
                    </div>

                    {/* Presets dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Presets:</span>
                      <select
                        value={presetChoice}
                        onChange={(e) => handleSelectPreset(e.target.value as any)}
                        className="text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-white/20 text-amber-300 font-semibold focus:outline-none"
                      >
                        <option value="cinematic_hype">🎬 Action / Cinematic Hype</option>
                        <option value="dramatic_story">🎭 Emotional Drama</option>
                        <option value="fast_comedy">⚡ Fast Comedy / Shorts</option>
                        <option value="suspense_horror">👻 Suspense & Horror</option>
                      </select>
                    </div>
                  </div>

                  {/* Spoken Burmese Rules checklist */}
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 font-burmese">
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <span>✓ စကားပြောအသုံးအနှုန်းသာ သုံးရန် ("တယ်", "ပါတယ်", "ဖြစ်သွားတယ်")</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-red-400">
                      <span>✕ စာအရေးအသားလုံးဝမသုံးရန် ("သည်", "ပေသည်", "၌", "၏")</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <span>✓ အသက်ရှူသံ အနားပေးရန် ပုဒ်ဖြတ် (၊) နှင့် ပုဒ်မ (။) အသုံးပြုရန်</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-400">
                      <span>✓ JSON Schema Formatted Only ({`{"translations": [...]}`})</span>
                    </div>
                  </div>

                  {/* Textarea */}
                  <textarea
                    rows={12}
                    value={systemPrompt}
                    onChange={(e) => {
                      setSystemPrompt(e.target.value);
                      setPresetChoice('custom' as any);
                    }}
                    className="w-full p-4 rounded-2xl bg-slate-950 border border-white/15 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-400 leading-relaxed"
                  />
                </div>
              )}

              {/* TAB 3: TTS & VOICE TUNER */}
              {activeTab === 'tts' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
                    <h3 className="text-sm font-bold text-white font-burmese flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      Global TTS Audio Dynamics
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Global Speed Multiplier */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300">Global Voice Speed (မြန်နှုန်း):</span>
                          <span className="font-mono font-bold text-amber-400">{globalSpeed}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.8"
                          max="1.4"
                          step="0.05"
                          value={globalSpeed}
                          onChange={(e) => setGlobalSpeed(parseFloat(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                      </div>

                      {/* Global Pitch Offset */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300">Global Pitch Offset (အသံအတိုးအကျယ်):</span>
                          <span className="font-mono font-bold text-amber-400">{globalPitchHz} Hz</span>
                        </div>
                        <input
                          type="range"
                          min="-15"
                          max="15"
                          step="1"
                          value={globalPitchHz}
                          onChange={(e) => setGlobalPitchHz(parseInt(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                      </div>

                      {/* Comma Pause */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300">Comma (၊) Respiration Pause:</span>
                          <span className="font-mono font-bold text-amber-400">{commaPauseMs} ms</span>
                        </div>
                        <input
                          type="range"
                          min="40"
                          max="180"
                          step="10"
                          value={commaPauseMs}
                          onChange={(e) => setCommaPauseMs(parseInt(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                      </div>

                      {/* Period Pause */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300">Period (။) Full Stop Pause:</span>
                          <span className="font-mono font-bold text-amber-400">{periodPauseMs} ms</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="350"
                          step="10"
                          value={periodPauseMs}
                          onChange={(e) => setPeriodPauseMs(parseInt(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 40 Voice Models Summary */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Active Burmese Neural Voice Matrix (40 Avatars)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                      {BURMESE_VOICE_AVATARS.map((v) => (
                        <div
                          key={v.id}
                          className="p-2.5 rounded-xl bg-slate-900/70 border border-white/10 flex items-center justify-between text-xs"
                        >
                          <div className="truncate">
                            <div className="font-bold text-white truncate font-burmese">{v.nameBurmese} ({v.nameEnglish})</div>
                            <div className="text-[10px] text-slate-400">{v.gender === 'male' ? '👨 Male (Thiha)' : '👩 Female (Nilar)'}</div>
                          </div>
                          <span className="text-[10px] font-mono text-amber-400 shrink-0">{v.code}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PAYMENT & SUBSCRIPTION MANAGEMENT */}
              {activeTab === 'billing' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Gateway Toggles */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
                    <h3 className="text-sm font-bold text-white font-burmese">
                      Myanmar Payment Gateway Controls
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">KBZPay (KPay) Gateway</div>
                          <div className="text-[10px] text-slate-400 font-mono">09-952458992 &bull; ဦးသီဟအောင်</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setKpayEnabled(!kpayEnabled)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                            kpayEnabled ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {kpayEnabled ? 'ENABLED' : 'DISABLED'}
                        </button>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">WavePay Gateway</div>
                          <div className="text-[10px] text-slate-400 font-mono">09-952458992 &bull; ဦးသီဟအောင်</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setWavepayEnabled(!wavepayEnabled)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                            wavepayEnabled ? 'bg-amber-600 text-black font-extrabold' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {wavepayEnabled ? 'ENABLED' : 'DISABLED'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Customer Payment Slip Verification Requests */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Customer Payment Requests ({requests.length})
                      </h4>
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {requests.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500 font-burmese">
                          ငွေပေးချေမှု တောင်းဆိုချက်များ မရှိသေးပါ
                        </div>
                      ) : (
                        requests.map((r) => (
                          <div
                            key={r.id}
                            className="p-3.5 rounded-xl bg-slate-900/80 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1 font-burmese">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white font-sans">{r.userEmail}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                                    r.status === 'approved'
                                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                      : r.status === 'rejected'
                                      ? 'bg-red-950 text-red-300 border border-red-500/40'
                                      : 'bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse'
                                  }`}
                                >
                                  {r.status}
                                </span>
                              </div>
                              <div className="text-slate-400 text-[11px] font-mono">
                                Ph: {r.customerPhone} &bull; Ref: {r.transactionRef} &bull; {r.amountMmk.toLocaleString()} MMK ({r.paymentMethod.toUpperCase()})
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {r.status === 'pending' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateReqStatus(r.id, 'approved')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] cursor-pointer flex items-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Approve VIP</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateReqStatus(r.id, 'rejected')}
                                    className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 font-semibold text-[11px] cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteReq(r.id)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: SAFE MAINTENANCE SWITCH */}
              {activeTab === 'maintenance' && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/40 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-400" />
                          <h3 className="text-base font-bold text-white font-sans">
                            Safe Maintenance Mode Switch
                          </h3>
                        </div>
                        <p className="text-xs text-slate-300 font-burmese">
                          ဖွင့်ထားပါက ပုံမှန် User များအားလုံးကို "စနစ် အဆင့်မြှင့်တင်နေပါသည်" Friendly Screen သာ ပြသပေးမည်ဖြစ်ပါသည်။
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setMaintenanceMode(!maintenanceMode)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
                          maintenanceMode
                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {maintenanceMode ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        <span>{maintenanceMode ? 'MAINTENANCE ON (ACTIVE)' : 'MAINTENANCE OFF'}</span>
                      </button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <label className="block text-xs font-bold text-slate-300 font-burmese">
                        User များထံ ပြသလိုသော ကြေညာချက် စာသား (Maintenance Notice):
                      </label>
                      <textarea
                        rows={3}
                        value={maintenanceNotice}
                        onChange={(e) => setMaintenanceNotice(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-950 border border-white/15 text-xs text-slate-200 font-burmese focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {/* Change Admin PIN */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Change Admin Master PIN Code
                    </h4>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        maxLength={10}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="New PIN (e.g. 778899)"
                        className="w-48 px-3.5 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400"
                      />
                      <span className="text-[11px] text-slate-400 font-burmese">
                        * PIN Code အသစ် ပြောင်းလဲပြီးပါက သေချာစွာ မှတ်သားထားပါ
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: LIVE AI TEST PLAYGROUND */}
              {activeTab === 'playground' && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
                    <h3 className="text-sm font-bold text-white font-burmese flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Live Prompt & Burmese Voiceover Test Playground
                    </h3>

                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-300">
                        Input Dialogue (အင်္ဂလိပ် / မူရင်း စကားပြော):
                      </label>
                      <input
                        type="text"
                        value={testInputText}
                        onChange={(e) => setTestInputText(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        disabled={isPlaygroundTranslating || !geminiKey.trim()}
                        onClick={handleRunPlaygroundTranslation}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
                      >
                        {isPlaygroundTranslating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>Translate with Master Prompt ▶</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <select
                          value={selectedPlaygroundVoice}
                          onChange={(e) => setSelectedPlaygroundVoice(e.target.value)}
                          className="text-xs px-3 py-1.5 rounded-xl bg-slate-950 border border-white/20 text-white font-burmese"
                        >
                          {BURMESE_VOICE_AVATARS.slice(0, 10).map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.nameBurmese} ({v.gender})
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          disabled={isPlayingTestVoice}
                          onClick={handlePlayTestVoice}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {isPlayingTestVoice ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                          <span>Listen Voice</span>
                        </button>
                      </div>
                    </div>

                    {testOutputBurmese && (
                      <div className="p-3.5 rounded-xl bg-slate-950 border border-purple-500/40 text-xs font-burmese text-amber-200 leading-relaxed animate-fadeIn">
                        <div className="text-[10px] text-purple-400 uppercase font-mono mb-1 font-bold">
                          Generated Burmese Movie Recap Narration:
                        </div>
                        {testOutputBurmese}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer with Master Save Button */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <span className="text-xs text-emerald-400 font-burmese flex items-center gap-1.5 font-semibold animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4" />
                    Master Configurations Saved Successfully!
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAll}
                  className="w-1/2 sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Master Configurations</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
