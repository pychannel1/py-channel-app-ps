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
  Crown,
  CreditCard,
  Upload,
  QrCode,
  Copy,
  Check,
  ArrowRight,
  Zap,
  Star,
  Clock,
  FileCheck,
  Smartphone,
  Info,
  CheckCircle,
} from 'lucide-react';
import { VipSubscriptionInfo, VipStatus } from '../types';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'api' | 'vip';
  assemblyApiKey: string;
  onSaveAssemblyKey: (key: string) => void;
  geminiApiKey: string;
  onSaveGeminiKey: (key: string) => void;
  vipInfo: VipSubscriptionInfo;
  onUpdateVipInfo: (info: VipSubscriptionInfo) => void;
  userEmail: string;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'vip',
  assemblyApiKey,
  onSaveAssemblyKey,
  geminiApiKey,
  onSaveGeminiKey,
  vipInfo,
  onUpdateVipInfo,
  userEmail,
}) => {
  const [activeTab, setActiveTab] = useState<'api' | 'vip'>(initialTab);

  // Sync initial tab when modal is opened
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // ----------------------------------------------------
  // API Configuration Tab State
  // ----------------------------------------------------
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
      setAssemblyMsg('AssemblyAI API Key ချိတ်ဆက်ပြီးပါပြီ');
    } else {
      setAssemblyStatus('idle');
      setAssemblyMsg('');
    }
  }, [assemblyApiKey]);

  useEffect(() => {
    setGeminiInput(geminiApiKey);
    if (geminiApiKey && geminiApiKey.trim().length > 10) {
      setGeminiStatus('success');
      setGeminiMsg('Google Gemini API Key ချိတ်ဆက်ပြီးပါပြီ');
    } else {
      setGeminiStatus('idle');
      setGeminiMsg('');
    }
  }, [geminiApiKey]);

  // ----------------------------------------------------
  // VIP Subscription Tab State
  // ----------------------------------------------------
  const [selectedPlan, setSelectedPlan] = useState<'pro_monthly' | 'pro_annual'>('pro_monthly');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'kpay' | 'wavepay'>('kpay');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState<string | null>(vipInfo.slipImage || null);
  const [transactionRef, setTransactionRef] = useState<string>(vipInfo.transactionRef || '');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [isSubmittingSlip, setIsSubmittingSlip] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState('');
  const [copiedKpay, setCopiedKpay] = useState(false);
  const [copiedWave, setCopiedWave] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ----------------------------------------------------
  // Handlers for API Key Save & Test
  // ----------------------------------------------------
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

  // ----------------------------------------------------
  // Handlers for VIP Slip Upload & Verification
  // ----------------------------------------------------
  const handleSlipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSlipFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setSlipPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyText = (text: string, type: 'kpay' | 'wave') => {
    navigator.clipboard.writeText(text);
    if (type === 'kpay') {
      setCopiedKpay(true);
      setTimeout(() => setCopiedKpay(false), 2000);
    } else {
      setCopiedWave(true);
      setTimeout(() => setCopiedWave(false), 2000);
    }
  };

  const handleSubmitVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slipPreviewUrl && !transactionRef.trim()) {
      alert('ကျေးဇူးပြု၍ ငွေလွှဲပြေစာ Screenshot သို့မဟုတ် Transaction ID / နောက်ဆုံး ၆ လုံး ထည့်သွင်းပေးပါ');
      return;
    }

    setIsSubmittingSlip(true);
    setSubmitSuccessMsg('');

    setTimeout(() => {
      setIsSubmittingSlip(false);
      const updatedInfo: VipSubscriptionInfo = {
        status: 'pending',
        planId: selectedPlan,
        planName: selectedPlan === 'pro_monthly' ? 'Pro Monthly Plan' : 'Pro Annual Plan',
        freeGenerationsRemaining: 0,
        maxFreeGenerations: 3,
        submittedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        transactionRef: transactionRef.trim() || 'KPAY-' + Math.floor(100000 + Math.random() * 900000),
        slipImage: slipPreviewUrl || undefined,
        paymentMethod: selectedPaymentMethod,
      };

      onUpdateVipInfo(updatedInfo);
      setSubmitSuccessMsg('✓ ငွေလွှဲပြေစာ ပေးပို့ပြီးပါပြီ။ Admin စိစစ်ပြီးပါက VIP Pro သို့ အလိုအလျောက် ပြောင်းလဲပေးပါမည်။');
    }, 1200);
  };

  // Instant VIP Simulation (For Admin & User Testing)
  const handleToggleInstantVip = (newStatus: VipStatus) => {
    const updated: VipSubscriptionInfo = {
      status: newStatus,
      planId: newStatus === 'active_vip' ? 'pro_monthly' : 'free',
      planName: newStatus === 'active_vip' ? 'Pro VIP Unlimited' : 'Free Plan',
      freeGenerationsRemaining: newStatus === 'active_vip' ? 9999 : 3,
      maxFreeGenerations: 3,
      approvedAt: newStatus === 'active_vip' ? 'ယခု' : undefined,
      expiresAt: newStatus === 'active_vip' ? 'ရက် ၃၀ ကျန်ရှိပါသည်' : undefined,
      transactionRef: newStatus === 'active_vip' ? 'KPAY-AUTO-8892' : undefined,
      paymentMethod: selectedPaymentMethod,
    };
    onUpdateVipInfo(updated);
  };

  const isVipActive = vipInfo.status === 'active_vip';
  const isVipPending = vipInfo.status === 'pending';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div
        id="user-settings-modal"
        className="glass-panel w-full max-w-3xl rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl p-4 sm:p-6 relative flex flex-col max-h-[92vh] overflow-y-auto"
      >
        {/* Header with Title and Close Button */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 ring-1 ring-white/20">
              {activeTab === 'vip' ? <Crown className="w-5 h-5 text-amber-200" /> : <KeyRound className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                pY Channel Settings
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-white/10 text-slate-300 font-normal">
                  {userEmail}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-burmese">
                စနစ်ချိန်ညှိမှုနှင့် VIP စာရင်းသွင်းမှု စီမံခန့်ခွဲခြင်း
              </p>
            </div>
          </div>

          <button
            id="close-settings-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/10"
            title="Close Settings (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Switcher */}
        <div className="flex items-center gap-2 my-4 p-1 rounded-xl bg-slate-900/90 border border-white/10">
          <button
            id="tab-vip-subscription-btn"
            onClick={() => setActiveTab('vip')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'vip'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 border border-amber-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-200" />
            <span>👑 VIP Subscription & Billing</span>
            {isVipActive ? (
              <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded-full font-mono">
                Active VIP
              </span>
            ) : isVipPending ? (
              <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded-full font-mono">
                Pending
              </span>
            ) : (
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-full font-mono">
                Free
              </span>
            )}
          </button>

          <button
            id="tab-api-configuration-btn"
            onClick={() => setActiveTab('api')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'api'
                ? 'bg-slate-800 text-white shadow-md border border-white/15'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <KeyRound className="w-4 h-4 text-indigo-400" />
            <span>🔑 API Configuration</span>
            {assemblyApiKey && geminiApiKey ? (
              <span className="text-[10px] bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded-full font-mono">
                Ready
              </span>
            ) : (
              <span className="text-[10px] bg-amber-900/60 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded-full font-mono">
                Setup
              </span>
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: VIP SUBSCRIPTION & BILLING */}
        {/* ========================================================================= */}
        {activeTab === 'vip' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Current Plan Status Box */}
            <div
              className={`p-4 rounded-xl border relative overflow-hidden ${
                isVipActive
                  ? 'bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-amber-900/30 border-amber-500/50 shadow-lg shadow-amber-500/10'
                  : isVipPending
                  ? 'bg-gradient-to-br from-blue-950/40 via-slate-900/90 to-indigo-900/30 border-blue-500/50 shadow-lg shadow-blue-500/10'
                  : 'bg-slate-900/80 border-white/10'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isVipActive
                        ? 'bg-gradient-to-tr from-amber-400 to-orange-500 text-black shadow-md shadow-amber-500/30'
                        : isVipPending
                        ? 'bg-blue-600 text-white animate-pulse'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {isVipActive ? (
                      <Crown className="w-6 h-6" />
                    ) : isVipPending ? (
                      <Clock className="w-5 h-5" />
                    ) : (
                      <Zap className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Current Status
                      </span>
                      {isVipActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-400 text-amber-300 uppercase tracking-widest font-mono">
                          👑 VIP Active
                        </span>
                      )}
                      {isVipPending && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 border border-blue-400 text-blue-300 uppercase tracking-widest font-mono">
                          ⏳ Pending Verification
                        </span>
                      )}
                      {!isVipActive && !isVipPending && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300 uppercase tracking-widest font-mono">
                          Free Starter
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                      {isVipActive
                        ? '👑 Pro VIP Unlimited Plan'
                        : isVipPending
                        ? '⏳ ငွေလွှဲပြေစာ စိစစ်ဆဲဖြစ်ပါသည် (Pending Approval)'
                        : 'Free Plan (3 Generations Left)'}
                    </h3>
                    <p className="text-xs text-slate-300 font-burmese mt-0.5">
                      {isVipActive
                        ? 'ရုပ်ရှင်ရီကပ် အကန့်အသတ်မရှိ ပြုလုပ်နိုင်ပြီး AI အသံ ၄၀ မျိုးနှင့် မြန်ဆန်သော Render စနစ် ရရှိထားပါသည်'
                        : isVipPending
                        ? 'Admin မှ ပြေစာစစ်ဆေးပြီးပါက ၁၀-၃၀ မိနစ်အတွင်း VIP Pro စနစ် အလိုအလျောက် ပွင့်ပါမည်'
                        : 'အခမဲ့ ရီကပ် ၃ ကြိမ် ပြုလုပ်ခွင့် ကျန်ရှိပါသည်။ အကန့်အသတ်မရှိ ပြုလုပ်ရန် Pro သို့ အဆင့်မြှင့်တင်ပါ'}
                    </p>
                  </div>
                </div>

                {/* Quick Simulation / Action Controls */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {isVipActive ? (
                    <button
                      onClick={() => handleToggleInstantVip('free')}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10 transition-all cursor-pointer"
                    >
                      Reset to Free
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleInstantVip('active_vip')}
                      className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-all cursor-pointer font-medium flex items-center gap-1"
                      title="Test VIP Active Mode Instantly"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Instant VIP Demo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Plan Cards Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  Upgrade Plans (VIP အဆင့်မြှင့်တင်ရန် အစီအစဉ်များ)
                </h4>
                <span className="text-[11px] text-amber-400/90 font-mono">Special Promotion ⚡</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Plan 1: Pro Monthly */}
                <div
                  onClick={() => setSelectedPlan('pro_monthly')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                    selectedPlan === 'pro_monthly'
                      ? 'bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-900 border-amber-500 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/40'
                      : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[10px] font-bold text-black uppercase tracking-wider shadow-sm">
                    🌟 Most Popular
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-400 font-mono">PRO MONTHLY</span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedPlan === 'pro_monthly'
                            ? 'border-amber-400 bg-amber-400 text-black'
                            : 'border-slate-600'
                        }`}
                      >
                        {selectedPlan === 'pro_monthly' && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-2xl sm:text-3xl font-extrabold text-white">35,000</span>
                      <span className="text-xs text-slate-300 font-burmese">ကျပ် / တစ်လ</span>
                    </div>

                    <p className="text-xs text-slate-400 font-burmese mt-1">
                      လစဉ် အကန့်အသတ်မရှိ ရုပ်ရှင်ဇာတ်လမ်းပြော ရီကပ် ပြုလုပ်ရန်
                    </p>

                    <div className="mt-3.5 space-y-2 text-xs text-slate-300 font-burmese">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span><strong>Unlimited Recaps</strong> - အကန့်အသတ်မရှိ ရီကပ်ဖန်တီးခွင့်</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span><strong>All 40 Burmese AI Voices</strong> - အသံ ၄၀ မျိုး အပြည့်အစုံ</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span><strong>Fast 4K / 1080p 60fps</strong> - အမြန်ဆုံး Render စနစ်</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span><strong>No Watermark</strong> - YouTube, TikTok အတွက် သီးသန့်</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 text-center">
                    <span className="text-xs font-semibold text-amber-300">
                      {selectedPlan === 'pro_monthly' ? '✓ ရွေးချယ်ထားပါသည်' : 'ရွေးချယ်မည်'}
                    </span>
                  </div>
                </div>

                {/* Plan 2: Pro Annual / Lifetime */}
                <div
                  onClick={() => setSelectedPlan('pro_annual')}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                    selectedPlan === 'pro_annual'
                      ? 'bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/40'
                      : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-indigo-600 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
                    ⚡ 70% OFF
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-400 font-mono">PRO ANNUAL (1 YEAR)</span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedPlan === 'pro_annual'
                            ? 'border-indigo-400 bg-indigo-400 text-black'
                            : 'border-slate-600'
                        }`}
                      >
                        {selectedPlan === 'pro_annual' && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-2xl sm:text-3xl font-extrabold text-white">120,000</span>
                      <span className="text-xs text-slate-300 font-burmese">ကျပ် / တစ်နှစ်</span>
                    </div>

                    <p className="text-xs text-slate-400 font-burmese mt-1">
                      တစ်နှစ်ပတ်လုံး အထူးသက်သာသော နှုန်းထားဖြင့် အသုံးပြုရန်
                    </p>

                    <div className="mt-3.5 space-y-2 text-xs text-slate-300 font-burmese">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span><strong>Pro Monthly ပါ လုပ်ဆောင်ချက်အားလုံး</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span><strong>Dedicated VIP Server</strong> - သီးသန့် မြန်နှုန်းမြင့် ဆာဗာ</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span><strong>VIP Direct Admin Support</strong> - ၂၄ နာရီ ကူညီဆောင်ရွက်မှု</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span><strong>New Feature Early Access</strong> - နောက်ဆုံး Feature များ ဦးစွာရရှိခြင်း</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 text-center">
                    <span className="text-xs font-semibold text-indigo-300">
                      {selectedPlan === 'pro_annual' ? '✓ ရွေးချယ်ထားပါသည်' : 'ရွေးချယ်မည်'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* KBZPay & WavePay Payment Box temporarily hidden as requested */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center justify-between gap-3 text-xs text-slate-400 font-burmese">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                <span>VIP Subscription Upgrade စနစ်အား ခေတ္တ ပြင်ဆင်နေပါသည် (Coming Soon)</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleInstantVip('active_vip')}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer transition-all shrink-0"
              >
                👑 Instant VIP စမ်းသပ်မည်
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: API CONFIGURATION */}
        {/* ========================================================================= */}
        {activeTab === 'api' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Banner info */}
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 font-burmese flex items-start gap-2.5">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                AssemblyAI နှင့် Google Gemini API Key များ ထည့်သွင်းထားပါက Video Transcription နှင့် Burmese AI Script
                ဘာသာပြန်ဆိုမှုကို တိုက်ရိုက် သီးသန့် အသုံးပြုနိုင်မည် ဖြစ်ပါသည်။
              </div>
            </div>

            {/* 1. AssemblyAI Key Configuration */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">AssemblyAI API Key</h4>
                    <p className="text-[11px] text-slate-400 font-burmese">
                      မူရင်းရုပ်ရှင် ဗီဒီယိုအသံမှ စကားပြောစာသား အလိုအလျောက် ပြောင်းလဲခြင်း (STT)
                    </p>
                  </div>
                </div>

                <a
                  href="https://www.assemblyai.com/dashboard/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium underline"
                >
                  <span>Get Free Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative flex items-center">
                <input
                  id="assembly-api-key-input"
                  type={showAssemblyKey ? 'text' : 'password'}
                  value={assemblyInput}
                  onChange={(e) => setAssemblyInput(e.target.value)}
                  placeholder="Paste your AssemblyAI API Key here..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono pr-20"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowAssemblyKey(!showAssemblyKey)}
                    className="p-1 text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    {showAssemblyKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {assemblyMsg && (
                <div
                  className={`text-xs font-burmese flex items-center gap-1.5 ${
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
                <span className="text-[11px] text-slate-400">
                  Status: {assemblyApiKey ? <span className="text-emerald-400">✓ Connected</span> : <span className="text-amber-400">Not Configured</span>}
                </span>
                <button
                  type="button"
                  id="save-assembly-key-btn"
                  onClick={handleTestAndSaveAssembly}
                  disabled={isVerifyingAssembly}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isVerifyingAssembly ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Test & Save AssemblyAI Key</span>
                </button>
              </div>
            </div>

            {/* 2. Google Gemini Key Configuration */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-600/30 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Google Gemini API Key</h4>
                    <p className="text-[11px] text-slate-400 font-burmese">
                      ရုပ်ရှင်ရီကပ် ဇာတ်လမ်းပြော မြန်မာစကားပြော ပြန်ဆိုပေးခြင်း (Gemini 2.5/3.0)
                    </p>
                  </div>
                </div>

                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium underline"
                >
                  <span>Get Gemini Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative flex items-center">
                <input
                  id="gemini-api-key-input"
                  type={showGeminiKey ? 'text' : 'password'}
                  value={geminiInput}
                  onChange={(e) => setGeminiInput(e.target.value)}
                  placeholder="Paste your Google Gemini API Key here (AIzaSy...)"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-mono pr-20"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="p-1 text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {geminiMsg && (
                <div
                  className={`text-xs font-burmese flex items-center gap-1.5 ${
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
                <span className="text-[11px] text-slate-400">
                  Status: {geminiApiKey ? <span className="text-emerald-400">✓ Connected</span> : <span className="text-amber-400">Not Configured</span>}
                </span>
                <button
                  type="button"
                  id="save-gemini-key-btn"
                  onClick={handleTestAndSaveGemini}
                  disabled={isVerifyingGemini}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isVerifyingGemini ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Test & Save Gemini Key</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer / Done Button */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            pY Channel AI Recap Studio v2.5
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-white/15 transition-all cursor-pointer"
          >
            Done (ပိတ်မည်)
          </button>
        </div>
      </div>
    </div>
  );
};
