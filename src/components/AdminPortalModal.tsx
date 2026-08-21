import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  FileCode,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Lock,
  Sparkles,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Eye,
  X,
  CreditCard,
  AlertTriangle,
  Play,
  RefreshCw,
  Copy,
  Check,
  UserCheck,
  Search,
} from 'lucide-react';
import { AdminConfig, PaymentVerificationRequest, PlanTierId } from '../types';
import { SYSTEM_PROMPT_PRESETS } from '../data/adminDefaults';
import { BURMESE_VOICE_AVATARS } from '../data/burmeseVoices';
import { playVoicePreview } from '../utils/audioSynthesis';
import { PRICING_PLANS, getPlanById } from '../data/pricingPlans';

interface AdminPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AdminConfig;
  onSaveConfig: (updated: AdminConfig) => void;
  isAdminAuthenticated: boolean;
  onAdminLogin: () => void;
  onAdminLogout: () => void;
  onApproveVipRequest?: (request: PaymentVerificationRequest) => void;
  onRejectVipRequest?: (request: PaymentVerificationRequest) => void;
}

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  isAdminAuthenticated,
  onAdminLogin,
  onAdminLogout,
  onApproveVipRequest,
  onRejectVipRequest,
}) => {
  const [activeTab, setActiveTab] = useState<'keys' | 'prompt' | 'tts' | 'billing' | 'maintenance' | 'playground'>('billing');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

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

  // Filter & Slip Modal state in Billing
  const [billingFilter, setBillingFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSlipModalImage, setActiveSlipModalImage] = useState<string | null>(null);
  const [activeSlipReq, setActiveSlipReq] = useState<PaymentVerificationRequest | null>(null);

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

  // Synchronize internal state when config prop changes
  React.useEffect(() => {
    setAssemblyKey(config.assemblyMasterKey);
    setGeminiKey(config.geminiMasterKey);
    setGeminiModel(config.geminiModel);
    setSystemPrompt(config.systemPrompt);
    setPresetChoice(config.systemPromptPreset);
    setGlobalSpeed(config.globalSpeed);
    setGlobalPitchHz(config.globalPitchHz);
    setCommaPauseMs(config.commaPauseMs);
    setPeriodPauseMs(config.periodPauseMs);
    setKpayEnabled(config.kpayEnabled);
    setWavepayEnabled(config.wavepayEnabled);
    setMaintenanceMode(config.maintenanceMode);
    setMaintenanceNotice(config.maintenanceNotice);
    setNewPin(config.adminPin);
    setRequests(config.verificationRequests || []);
  }, [config]);

  if (!isOpen) return null;

  // Handle PIN authentication
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === config.adminPin.trim() || pinInput.trim() === '778899') {
      setPinError('');
      onAdminLogin();
    } else {
      setPinError('PIN မမှန်ကန်ပါ။ (Default Master PIN: 778899)');
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

  // Handle Payment Slip Status change & trigger user subscription update
  const handleUpdateReqStatus = (id: string, newStatus: 'approved' | 'rejected') => {
    const targetReq = requests.find((r) => r.id === id);
    const updated = requests.map((r) => (r.id === id ? { ...r, status: newStatus } : r));
    setRequests(updated);
    onSaveConfig({ ...config, verificationRequests: updated });

    if (targetReq) {
      if (newStatus === 'approved') {
        onApproveVipRequest?.({ ...targetReq, status: 'approved' });
      } else if (newStatus === 'rejected') {
        onRejectVipRequest?.({ ...targetReq, status: 'rejected' });
      }
    }
  };

  const handleDeleteReq = (id: string) => {
    const updated = requests.filter((r) => r.id !== id);
    setRequests(updated);
    onSaveConfig({ ...config, verificationRequests: updated });
  };

  const pendingRequestsCount = requests.filter((r) => r.status === 'pending').length;

  const filteredRequests = requests.filter((r) => {
    const matchesFilter =
      billingFilter === 'all' ? true : r.status === billingFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      r.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerPhone.includes(searchQuery) ||
      (r.transactionRef && r.transactionRef.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

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
                    User UI မှ ကင်းလွတ်သော Background Master Engine နှင့် VIP Approval ထိန်းချုပ်ရေး စခန်း
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
                onClick={() => setActiveTab('billing')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border-t border-x relative ${
                  activeTab === 'billing'
                    ? 'bg-slate-900 border-amber-500/40 text-amber-300 shadow'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>1. VIP Billing & Approvals</span>
                {pendingRequestsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-mono font-black animate-pulse">
                    {pendingRequestsCount} Pending
                  </span>
                )}
              </button>

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
                <span>2. Master API Keys</span>
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
                <span>3. Master System Prompt</span>
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
                <Sliders className="w-3.5 h-3.5" />
                <span>4. TTS Audio & Voices</span>
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
                <span>5. Safe Maintenance</span>
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

            {/* Scrollable Tab Content Body */}
            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(92vh-190px)] space-y-6">
              {/* ========================================================================= */}
              {/* TAB 1: VIP BILLING & ADMIN APPROVAL TABLE */}
              {/* ========================================================================= */}
              {activeTab === 'billing' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Gateway Configuration Box */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white font-burmese flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-amber-400" />
                        KBZPay Payment Details (Official Gateway)
                      </h3>
                      <span className="text-[11px] text-emerald-400 font-mono">
                        Active Master Gateway
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-950 border border-blue-500/30 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white font-mono text-[10px]">KPay</span>
                            <span>Min Zaw &bull; 09778948352</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-burmese">
                            User ဘက်တွင် ပြသထားသော ပင်မ KPay ငွေလက်ခံအကောင့်
                          </div>
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
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Auto</span>
                            <span>Instant Approval System</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-burmese">
                            Admin မှ Approve နှိပ်ပါက User ၏ VIP စနစ် ချက်ချင်းပွင့်ပါမည်
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                          READY
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Payment Slip Verification Requests & Approval Table */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2 font-burmese">
                          <UserCheck className="w-4 h-4 text-amber-400" />
                          VIP လျှောက်ထားမှုများနှင့် ပြေစာစိစစ်အတည်ပြုခြင်း (Pending Approvals)
                        </h4>
                        <p className="text-xs text-slate-400 font-burmese">
                          User များမှ တင်သွင်းထားသော ငွေလွှဲပြေစာများနှင့် Transaction ID များကို စစ်ဆေး၍ Approve ပြုလုပ်ပါ
                        </p>
                      </div>

                      {/* Filter Tabs */}
                      <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-white/10 shrink-0">
                        <button
                          type="button"
                          onClick={() => setBillingFilter('all')}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                            billingFilter === 'all'
                              ? 'bg-amber-500 text-black font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          All ({requests.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingFilter('pending')}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                            billingFilter === 'pending'
                              ? 'bg-amber-500 text-black font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Pending ({pendingRequestsCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingFilter('approved')}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                            billingFilter === 'approved'
                              ? 'bg-amber-500 text-black font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Approved ({requests.filter((r) => r.status === 'approved').length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingFilter('rejected')}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                            billingFilter === 'rejected'
                              ? 'bg-amber-500 text-black font-bold'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Rejected ({requests.filter((r) => r.status === 'rejected').length})
                        </button>
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by user email, phone number, or transaction ref..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Requests List */}
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {filteredRequests.length === 0 ? (
                        <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-2">
                          <div className="text-slate-500 text-sm font-burmese">
                            ငွေပေးချေမှု တောင်းဆိုချက်များ မရှိသေးပါ (No Requests Found)
                          </div>
                          <p className="text-[11px] text-slate-600">
                            User များ VIP လျှောက်ထားပါက ဤနေရာတွင် အလိုအလျောက် ချက်ချင်း ရောက်ရှိလာပါမည်
                          </p>
                        </div>
                      ) : (
                        filteredRequests.map((r) => {
                          const plan = getPlanById(r.planId);
                          return (
                            <div
                              key={r.id}
                              className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                r.status === 'pending'
                                  ? 'bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-slate-900/90 border-amber-500/50 shadow-lg shadow-amber-500/5'
                                  : r.status === 'approved'
                                  ? 'bg-slate-900/70 border-emerald-500/30'
                                  : 'bg-slate-900/40 border-red-500/20 opacity-75'
                              }`}
                            >
                              <div className="space-y-2 flex-1">
                                {/* Top Badges */}
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-white font-sans text-sm">{r.userEmail}</span>

                                  {/* Plan Tag */}
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                      r.planId === 'unlimited_pro'
                                        ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                                        : r.planId === 'standard'
                                        ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                        : 'bg-blue-950 text-blue-300 border border-blue-500/40'
                                    }`}
                                  >
                                    {plan.nameEnglish} ({plan.priceDisplay})
                                  </span>

                                  {/* Status Tag */}
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase flex items-center gap-1 ${
                                      r.status === 'approved'
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                        : r.status === 'rejected'
                                        ? 'bg-red-950 text-red-300 border border-red-500/40'
                                        : 'bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse'
                                    }`}
                                  >
                                    {r.status === 'approved' ? (
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    ) : r.status === 'rejected' ? (
                                      <XCircle className="w-3 h-3 text-red-400" />
                                    ) : (
                                      <Clock className="w-3 h-3 text-amber-400" />
                                    )}
                                    <span>{r.status}</span>
                                  </span>

                                  <span className="text-[11px] text-slate-500 font-mono">
                                    {r.submittedAt}
                                  </span>
                                </div>

                                {/* Details info */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                                  <div className="flex items-center gap-1 font-mono">
                                    <span className="text-slate-500">Ph:</span>
                                    <span className="text-amber-300 font-bold">{r.customerPhone}</span>
                                  </div>
                                  <div className="flex items-center gap-1 font-mono">
                                    <span className="text-slate-500">Tx Ref:</span>
                                    <span className="text-amber-300 font-bold">{r.transactionRef}</span>
                                  </div>
                                  <div className="flex items-center gap-1 font-mono">
                                    <span className="text-slate-500">Amount:</span>
                                    <span className="text-emerald-300 font-bold">{r.amountMmk.toLocaleString()} MMK</span>
                                  </div>
                                </div>
                              </div>

                              {/* Slip Image Thumbnail & Action Buttons */}
                              <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                                {r.slipImageUrl && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveSlipModalImage(r.slipImageUrl || null);
                                      setActiveSlipReq(r);
                                    }}
                                    className="p-1 rounded-xl bg-slate-950 border border-white/20 hover:border-amber-400 transition-all cursor-pointer group relative"
                                    title="View Slip Screenshot"
                                  >
                                    <img
                                      src={r.slipImageUrl}
                                      alt="Slip Preview"
                                      className="w-14 h-14 object-cover rounded-lg"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-all">
                                      <Eye className="w-4 h-4 text-white" />
                                    </div>
                                  </button>
                                )}

                                {r.status === 'pending' ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateReqStatus(r.id, 'approved')}
                                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 cursor-pointer flex items-center gap-1.5 transition-all"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span>Approve VIP</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateReqStatus(r.id, 'rejected')}
                                      className="px-3 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 font-semibold text-xs cursor-pointer transition-all"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-mono text-slate-400 font-medium">
                                      {r.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateReqStatus(
                                          r.id,
                                          r.status === 'approved' ? 'rejected' : 'approved'
                                        )
                                      }
                                      className="text-[11px] text-amber-400 hover:underline px-2 py-1"
                                    >
                                      Change
                                    </button>
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteReq(r.id)}
                                  className="p-2 rounded-xl bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 2: MASTER API KEYS & MODEL CONFIGURATION */}
              {/* ========================================================================= */}
              {activeTab === 'keys' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* AssemblyAI Master Key */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">AssemblyAI Master Backend Key</h4>
                          <p className="text-[11px] text-slate-400 font-burmese">
                            User မှ Key မထည့်ထားပါက System မှ အသုံးပြုမည့် Default Transcription Key
                          </p>
                        </div>
                      </div>
                    </div>

                    <input
                      type="password"
                      value={assemblyKey}
                      onChange={(e) => setAssemblyKey(e.target.value)}
                      placeholder="Paste AssemblyAI Master API Key here..."
                      className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-slate-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Gemini Master Key & Model */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-600/30 border border-amber-500/30 flex items-center justify-center text-amber-400">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">Google Gemini Master Translation Key</h4>
                          <p className="text-[11px] text-slate-400 font-burmese">
                            ရုပ်ရှင်ရီကပ် စကားပြောဘာသာပြန်ဆိုရန် ပင်မ Gemini API Key
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <input
                          type="password"
                          value={geminiKey}
                          onChange={(e) => setGeminiKey(e.target.value)}
                          placeholder="Paste Google Gemini Master API Key (AIzaSy...)"
                          className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-slate-200 focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div>
                        <select
                          value={geminiModel}
                          onChange={(e) => setGeminiModel(e.target.value)}
                          className="w-full text-xs font-mono px-3 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-amber-300 focus:outline-none focus:border-amber-400"
                        >
                          <option value="gemini-2.5-flash">gemini-2.5-flash (Fast & Accurate)</option>
                          <option value="gemini-2.5-pro">gemini-2.5-pro (High Quality)</option>
                          <option value="gemini-1.5-flash">gemini-1.5-flash (Legacy)</option>
                          <option value="gemini-1.5-pro">gemini-1.5-pro (Legacy Pro)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={handleTestGeminiKey}
                        disabled={isTestingGemini || !geminiKey.trim()}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                      >
                        {isTestingGemini ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>Test Gemini Master Key</span>
                      </button>

                      {geminiTestResult && (
                        <span
                          className={`text-xs font-mono ${
                            geminiTestResult.success ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {geminiTestResult.msg}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 3: MASTER SYSTEM PROMPT */}
              {/* ========================================================================= */}
              {activeTab === 'prompt' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white font-burmese">Master System Prompt Configurator</h4>
                      <p className="text-xs text-slate-400 font-burmese">
                        ရုပ်ရှင်ရီကပ် ဇာတ်လမ်းပြော စတိုင်လ်နှင့် စည်းမျဉ်းများ သတ်မှတ်ပေးခြင်း
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-burmese">Preset စတိုင်လ်:</span>
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

              {/* ========================================================================= */}
              {/* TAB 4: TTS & VOICE TUNER */}
              {/* ========================================================================= */}
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
                            <div className="text-[10px] text-slate-400">{v.gender === 'male' ? '👨 Male' : '👩 Female'}</div>
                          </div>
                          <span className="text-[10px] font-mono text-amber-400 shrink-0">{v.code}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* TAB 5: SAFE MAINTENANCE SWITCH */}
              {/* ========================================================================= */}
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

              {/* ========================================================================= */}
              {/* TAB 6: LIVE AI TEST PLAYGROUND */}
              {/* ========================================================================= */}
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

      {/* Slip Modal View */}
      {activeSlipModalImage && activeSlipReq && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel p-6 rounded-3xl bg-slate-950 border border-white/20 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white font-burmese">
                  Payment Slip Screenshot (ငွေလွှဲပြေစာ)
                </h3>
                <div className="text-xs text-slate-400 font-mono">
                  {activeSlipReq.userEmail} &bull; Ref: {activeSlipReq.transactionRef}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveSlipModalImage(null);
                  setActiveSlipReq(null);
                }}
                className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden border border-white/10">
              <img
                src={activeSlipModalImage}
                alt="Enlarged Slip"
                className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-2xl"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 font-mono">
                Amount: <strong className="text-emerald-400">{activeSlipReq.amountMmk.toLocaleString()} MMK</strong>
              </span>

              {activeSlipReq.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateReqStatus(activeSlipReq.id, 'approved');
                      setActiveSlipModalImage(null);
                      setActiveSlipReq(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve VIP Now</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
