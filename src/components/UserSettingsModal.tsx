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
  Clock,
  FileCheck,
  Info,
  Star,
  Zap,
} from 'lucide-react';
import { VipSubscriptionInfo, PlanTierId, PaymentVerificationRequest } from '../types';
import { PRICING_PLANS, getPlanById } from '../data/pricingPlans';

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
  onNewVerificationRequest?: (request: PaymentVerificationRequest) => void;
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
  onNewVerificationRequest,
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
  // VIP Subscription Tab State (2-Tier Structure: Free vs Unlimited VIP 10,000 MMK)
  // ----------------------------------------------------
  const [selectedPlanId, setSelectedPlanId] = useState<PlanTierId>(
    vipInfo.planId && vipInfo.planId !== 'free' ? 'vip_unlimited' : 'vip_unlimited'
  );
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState<string | null>(vipInfo.slipImage || null);
  const [transactionRef, setTransactionRef] = useState<string>(vipInfo.transactionRef || '');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [isSubmittingSlip, setIsSubmittingSlip] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState('');
  const [copiedKpay, setCopiedKpay] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const selectedPlanData = getPlanById(selectedPlanId);

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
      setAssemblyMsg('API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။');
      return;
    }

    setIsVerifyingAssembly(true);
    setAssemblyStatus('idle');
    setAssemblyMsg('');

    try {
      const resp = await fetch('/api/test-assembly-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });
      const data = await resp.json();

      if (resp.ok && data.success) {
        setAssemblyStatus('success');
        setAssemblyMsg('✓ AssemblyAI API Key ချိတ်ဆက်မှု အောင်မြင်ပါသည်');
        onSaveAssemblyKey(cleanKey);
      } else {
        setAssemblyStatus('error');
        setAssemblyMsg(data.error || 'API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။');
      }
    } catch {
      setAssemblyStatus('error');
      setAssemblyMsg('API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။');
    } finally {
      setIsVerifyingAssembly(false);
    }
  };

  const handleTestAndSaveGemini = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = geminiInput.trim();

    if (!cleanKey) {
      setGeminiStatus('error');
      setGeminiMsg('API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။');
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
        setGeminiMsg(data.error || 'API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။');
      }
    } catch {
      setGeminiStatus('error');
      setGeminiMsg('API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။');
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

  const handleCopyKPayNumber = () => {
    navigator.clipboard.writeText('09778948352');
    setCopiedKpay(true);
    setTimeout(() => setCopiedKpay(false), 2000);
  };

  const handleSubmitVerification = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = transactionRef.trim();

    if (!slipPreviewUrl && !cleanRef) {
      alert('ကျေးဇူးပြု၍ ငွေလွှဲပြေစာ Screenshot ပုံ သို့မဟုတ် Transaction ID ၏ နောက်ဆုံး ၄ လုံး ထည့်သွင်းပေးပါ');
      return;
    }

    setIsSubmittingSlip(true);
    setSubmitSuccessMsg('');

    setTimeout(() => {
      setIsSubmittingSlip(false);
      const plan = getPlanById(selectedPlanId);
      const lastDigits = cleanRef.length > 4 ? cleanRef.slice(-4) : cleanRef || `${Math.floor(1000 + Math.random() * 9000)}`;

      const updatedInfo: VipSubscriptionInfo = {
        status: 'pending',
        planId: selectedPlanId,
        planName: `${plan.nameEnglish} (${plan.nameBurmese})`,
        dailyFreeRemaining: 0,
        maxDailyFree: 2,
        monthlyRemaining: plan.recapLimit,
        maxMonthlyLimit: plan.recapLimit,
        submittedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        transactionRef: `KPay-${lastDigits}`,
        slipImage: slipPreviewUrl || undefined,
        paymentMethod: 'kpay',
      };

      onUpdateVipInfo(updatedInfo);

      // Create and dispatch real verification request into admin database
      const newReq: PaymentVerificationRequest = {
        id: `req-${Date.now()}`,
        userEmail: userEmail || 'pychannel1years@gmail.com',
        customerPhone: customerPhone.trim() || '09778948352',
        transactionRef: `KPay-${lastDigits}`,
        paymentMethod: 'kpay',
        planId: selectedPlanId,
        amountMmk: plan.priceMmk,
        slipImageUrl: slipPreviewUrl || undefined,
        submittedAt: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: 'pending',
      };

      onNewVerificationRequest?.(newReq);
      setSubmitSuccessMsg('သင်၏ VIP လျှောက်ထားမှုကို စိစစ်နေပါသည် (၁၅ မိနစ်အတွင်း အတည်ပြုပေးပါမည်)');
    }, 1000);
  };

  const isVipActive = vipInfo.status === 'active_vip';
  const isVipPending = vipInfo.status === 'pending';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div
        id="user-settings-modal"
        className="glass-panel w-full max-w-4xl rounded-3xl border border-white/15 bg-slate-950/95 shadow-2xl p-4 sm:p-6 relative flex flex-col max-h-[94vh] overflow-y-auto"
      >
        {/* Header with Title and Close Button */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 ring-1 ring-white/20">
              {activeTab === 'vip' ? <Crown className="w-5 h-5 text-amber-200" /> : <KeyRound className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                pY Channel Pricing & Settings
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-white/10 text-slate-300 font-normal">
                  {userEmail}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-burmese">
                VIP စာရင်းသွင်းမှု အစီအစဉ်များနှင့် API ချိန်ညှိမှုများ
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
            <span>👑 VIP Pricing & Plans (အစီအစဉ်များ)</span>
            {isVipActive ? (
              <span className="text-[10px] bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                Active VIP
              </span>
            ) : isVipPending ? (
              <span className="text-[10px] bg-amber-950/90 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">
                Pending
              </span>
            ) : (
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
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
        {/* TAB 1: VIP SUBSCRIPTION & 4-TIER BILLING */}
        {/* ========================================================================= */}
        {activeTab === 'vip' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Current Active Status Banner */}
            <div
              className={`p-4 rounded-2xl border relative overflow-hidden ${
                isVipActive
                  ? 'bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-amber-900/30 border-amber-500/50 shadow-lg shadow-amber-500/10'
                  : isVipPending
                  ? 'bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-orange-950/30 border-amber-500/50 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900/80 border-white/10'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      isVipActive
                        ? 'bg-gradient-to-tr from-amber-400 to-orange-500 text-black shadow-md shadow-amber-500/30'
                        : isVipPending
                        ? 'bg-amber-500 text-black font-bold animate-pulse'
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
                        Current Account Status
                      </span>
                      {isVipActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-400 text-amber-300 uppercase tracking-widest font-mono">
                          👑 VIP Active
                        </span>
                      )}
                      {isVipPending && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-400 text-amber-300 uppercase tracking-widest font-mono">
                          ⏳ Pending Approval (စိစစ်ဆဲ)
                        </span>
                      )}
                      {!isVipActive && !isVipPending && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300 uppercase tracking-widest font-mono">
                          Tier 0: Free
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                      {isVipActive
                        ? `👑 ${vipInfo.planName || 'VIP Active'}`
                        : isVipPending
                        ? `⏳ သင်၏ VIP လျှောက်ထားမှုကို စိစစ်နေပါသည် (၁၅ မိနစ်အတွင်း အတည်ပြုပေးပါမည်)`
                        : 'Tier 0: Free Plan (တစ်ရက်လျှင် ၂ ပုဒ် အခမဲ့)'}
                    </h3>
                    <p className="text-xs text-slate-300 font-burmese mt-0.5">
                      {isVipActive
                        ? 'ရုပ်ရှင်ရီကပ် ထုတ်ယူခွင့် အပြည့်အစုံနှင့် မြန်မာ AI အသံ ၄၀ မျိုး အသုံးပြုခွင့် ရရှိထားပါသည်'
                        : isVipPending
                        ? 'ငွေလွှဲပြေစာအား Admin Master Control မှ စစ်ဆေးနေပါသည် (၁၅ မိနစ်အတွင်း အတည်ပြုပေးပါမည်)'
                        : 'အခမဲ့ စမ်းသပ်ခြင်းဖြင့် တစ်ရက်လျှင် ၂ ပုဒ် အခမဲ့ ပြုလုပ်ခွင့်ရရှိပြီး နေ့စဉ် အလိုအလျောက် Reset ပြုလုပ်ပေးပါသည်'}
                    </p>
                  </div>
                </div>

                {isVipPending && (
                  <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-medium self-start sm:self-center">
                    Ref: {vipInfo.transactionRef || 'Pending Slip'}
                  </div>
                )}
              </div>
            </div>

            {/* ------------------------------------------------------------------------- */}
            {/* 2-TIER PRICING CARDS LAYOUT (Free vs VIP Unlimited 10,000 MMK) */}
            {/* ------------------------------------------------------------------------- */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-burmese">
                    <Star className="w-4 h-4 text-amber-400" />
                    ရွေးချယ်နိုင်သော အစီအစဉ် ၂ မျိုး (Pricing Plans)
                  </h4>
                  <p className="text-xs text-slate-400 font-burmese">
                    အခမဲ့ စမ်းသပ်ခြင်း သို့မဟုတ် VIP အကန့်အသတ်မရှိ အစီအစဉ်ကို ရွေးချယ်ပါ
                  </p>
                </div>
                <span className="text-[11px] text-amber-400 font-mono font-bold bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
                  Official Rate ⚡
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PRICING_PLANS.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  const isFree = plan.id === 'free';
                  const isVip = plan.id === 'vip_unlimited';

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? isVip
                            ? 'bg-gradient-to-b from-amber-950/60 via-slate-900 to-slate-950 border-amber-500 shadow-2xl shadow-amber-500/20 ring-2 ring-amber-500/60 scale-[1.01]'
                            : 'bg-gradient-to-b from-slate-850 via-slate-900 to-slate-950 border-emerald-500 shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-500/50 scale-[1.01]'
                          : 'bg-slate-900/60 border-white/10 hover:border-white/25 hover:bg-slate-900/90'
                      }`}
                    >
                      {/* Top Badge */}
                      {plan.badge && (
                        <div className="absolute -top-3 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-slate-950 font-sans border border-amber-300">
                          {plan.badge}
                        </div>
                      )}

                      <div>
                        {/* Tier Title & Checkmark */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isVip ? (
                              <Crown className="w-5 h-5 text-amber-400" />
                            ) : (
                              <Zap className="w-5 h-5 text-emerald-400" />
                            )}
                            <span
                              className={`text-sm font-mono font-bold uppercase ${
                                isVip ? 'text-amber-400' : 'text-emerald-400'
                              }`}
                            >
                              {plan.nameEnglish}
                            </span>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? isVip
                                  ? 'border-amber-400 bg-amber-400 text-black'
                                  : 'border-emerald-400 bg-emerald-400 text-black'
                                : 'border-slate-600'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>

                        {/* Burmese Title */}
                        <div className="text-xs text-slate-300 font-burmese font-medium mt-1">
                          {plan.nameBurmese}
                        </div>

                        {/* Price Display */}
                        <div className="mt-3 flex items-baseline gap-1.5">
                          {isFree ? (
                            <span className="text-3xl font-extrabold text-white font-burmese">အခမဲ့</span>
                          ) : (
                            <>
                              <span className="text-3xl font-extrabold text-amber-300 font-sans">
                                {plan.priceMmk.toLocaleString()}
                              </span>
                              <span className="text-xs text-slate-300 font-burmese">ကျပ် / တစ်လ</span>
                            </>
                          )}
                        </div>

                        {/* Limit description highlight */}
                        <div
                          className={`mt-3 p-2.5 rounded-xl text-xs font-burmese ${
                            isVip
                              ? 'bg-amber-950/50 border border-amber-500/40 text-amber-200'
                              : 'bg-slate-800/70 border border-white/10 text-slate-300'
                          }`}
                        >
                          <strong>{plan.limitDescription}</strong>
                        </div>

                        {/* Feature Bullet List */}
                        <div className="mt-4 space-y-2 text-xs text-slate-300 font-burmese">
                          {plan.features.map((feat, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <CheckCircle2
                                className={`w-4 h-4 shrink-0 mt-0.5 ${
                                  isVip ? 'text-amber-400' : 'text-emerald-400'
                                }`}
                              />
                              <span className="leading-relaxed">{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Select Action Footer */}
                      <div className="mt-5 pt-3.5 border-t border-white/10 text-center">
                        <span
                          className={`text-xs font-bold font-burmese ${
                            isSelected
                              ? isVip
                                ? 'text-amber-300'
                                : 'text-emerald-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {isSelected ? '✓ ရွေးချယ်ထားပါသည်' : 'ရွေးချယ်ရန် နှိပ်ပါ'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ------------------------------------------------------------------------- */}
            {/* REAL KPAY PAYMENT DETAILS & SLIP SUBMISSION FORM */}
            {/* ------------------------------------------------------------------------- */}
            {selectedPlanData.isPaid ? (
              <div
                id="payment-summary-section"
                className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-slate-950 border border-amber-500/40 shadow-2xl space-y-5 animate-fadeIn"
              >
                {/* 1. Payment Summary Header */}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-amber-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                        VIP Unlimited Subscription Summary
                      </span>
                    </div>
                    <div className="text-base font-bold text-white font-burmese">
                      {selectedPlanData.nameEnglish} ({selectedPlanData.nameBurmese}) &bull; {selectedPlanData.priceDisplay}
                    </div>
                    <div className="text-xs text-slate-300 font-burmese">
                      {selectedPlanData.limitDescription} + မြန်မာ AI Voice Models ၄၀ စလုံး အပြည့်အစုံ
                    </div>
                  </div>

                  <div className="text-right sm:text-right bg-slate-950/80 px-4 py-2.5 rounded-xl border border-white/10 shrink-0">
                    <div className="text-[11px] text-slate-400 font-burmese">ပေးသွင်းရမည့် ပမာဏ:</div>
                    <div className="text-xl font-extrabold text-amber-300 font-sans">
                      10,000 MMK
                    </div>
                  </div>
                </div>

                {/* 2. Official KBZPay Payment Info Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-blue-950/40 border border-blue-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-blue-500/30">
                        KPay
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">KBZPay (KPay) ငွေလွှဲရန် အချက်အလက်များ</div>
                        <div className="text-[11px] text-blue-200 font-burmese">
                          အောက်ပါ KPay အကောင့်သို့ VIP Unlimited Plan တန်ဖိုး (10,000 MMK) တိုက်ရိုက် လွှဲပေးပါရန်
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-900/80 text-blue-300 border border-blue-400/40 font-mono">
                      Official Gateway
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Account Name */}
                    <div className="p-3.5 rounded-xl bg-slate-950/90 border border-white/10 space-y-1">
                      <span className="text-[11px] text-slate-400 font-burmese">KPay အကောင့်ပိုင်ရှင် အမည် (Account Name):</span>
                      <div className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
                        <span className="text-amber-400 font-extrabold text-base">Min Zaw</span>
                      </div>
                    </div>

                    {/* KPay Phone Number with Copy Button */}
                    <div className="p-3.5 rounded-xl bg-slate-950/90 border border-blue-500/30 flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[11px] text-slate-400 font-burmese">KPay ဖုန်းနံပါတ် (Phone Number):</span>
                        <div className="text-base font-mono font-bold text-amber-300 tracking-wider">
                          09778948352
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyKPayNumber}
                        className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-blue-600/30 shrink-0"
                      >
                        {copiedKpay ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-200" />
                            <span className="font-burmese">Copy ကူးပြီး</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-white" />
                            <span className="font-burmese">📋 Copy Number</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Slip Submission Form */}
                <form onSubmit={handleSubmitVerification} className="space-y-4 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-200 font-burmese flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-amber-400" />
                      ငွေလွှဲပြေစာ ပေးပို့အတည်ပြုလွှာ (Slip Submission Form):
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Customer Phone */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300 font-burmese">
                        ငွေလွှဲသူ ဖုန်းနံပါတ် (Sender Phone Number):
                      </label>
                      <input
                        type="text"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. 09-XXXXXXXXX"
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>

                    {/* Transaction ID / Last 4 Digits */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300 font-burmese">
                        KPay Transaction ID ၏ နောက်ဆုံး ၄ လုံး (Last 4 Digits):
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                        placeholder="e.g. 8352 သို့မဟုတ် 10293848352"
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Payment Slip Upload Box */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-300 font-burmese">
                      ငွေလွှဲပြေစာ Screenshot တင်ရန် (Payment Slip Screenshot):
                    </label>

                    <div className="border-2 border-dashed border-white/20 hover:border-amber-500/50 rounded-2xl p-4 text-center bg-slate-950/60 transition-all relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSlipFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />

                      {slipPreviewUrl ? (
                        <div className="flex flex-col items-center gap-2">
                          <img
                            src={slipPreviewUrl}
                            alt="Slip Preview"
                            className="max-h-40 rounded-lg border border-white/20 object-contain shadow-md"
                          />
                          <span className="text-xs text-emerald-400 font-burmese flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ပြေစာပုံ ထည့်သွင်းပြီးပါပြီ (ပုံပြောင်းရန် နှိပ်ပါ)</span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 py-3">
                          <Upload className="w-7 h-7 text-amber-400" />
                          <span className="text-xs text-slate-200 font-burmese font-medium">
                            ငွေလွှဲပြေစာ Screenshot ပုံကို ဤနေရာတွင် နှိပ်၍ ရွေးချယ်ပါ
                          </span>
                          <span className="text-[11px] text-slate-500">
                            PNG, JPG သို့မဟုတ် JPEG Image File
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {submitSuccessMsg && (
                    <div className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs font-burmese flex items-center gap-2.5 shadow-lg animate-fadeIn">
                      <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-spin" />
                      <div>
                        <strong>{submitSuccessMsg}</strong>
                        <div className="text-[11px] text-amber-300/80 mt-0.5">
                          Admin Master မှ စိစစ်အတည်ပြုပြီးပါက သင်၏ VIP Unlimited ဗီဒီယို ထုတ်ယူခွင့် ချက်ချင်း ပွင့်သွားပါမည်။
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Slip Button */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <div className="text-[11px] text-slate-400 font-burmese text-center sm:text-left">
                      * ပြေစာတင်ပြီးပါက Admin မှ ၁၅ မိနစ်အတွင်း စိစစ်ပြီး VIP စနစ် ဖွင့်ပေးပါမည်
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingSlip}
                      className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs shadow-lg shadow-amber-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmittingSlip ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span className="font-burmese">ပေးပို့နေပါသည်...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="font-burmese">
                            ငွေလွှဲပြေစာ ပေးပို့အတည်ပြုမည် (၁၀,၀၀၀ ကျပ်)
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Tier 0 Free Plan Active Info Card */
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300 font-burmese">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white">Free Plan (အခမဲ့ စမ်းသပ်ခြင်း)</div>
                    <div className="text-slate-400 text-[11px]">
                      တစ်ရက်လျှင် ၂ ပုဒ် အခမဲ့ ပြုလုပ်ခွင့် ရရှိထားပါသည်။ ၂၄ နာရီပြည့်တိုင်း အလိုအလျောက် Reset ပြုလုပ်ပေးပါသည်။
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPlanId('vip_unlimited')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer transition-all shrink-0"
                >
                  VIP Unlimited သို့ အဆင့်မြှင့်တင်ရန် နှိပ်ပါ
                </button>
              </div>
            )}
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
            pY Channel AI Recap Studio &bull; Version 3.0
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-white/15 transition-all cursor-pointer"
          >
            Done (ပိတ်မည်)
          </button>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="glass-panel p-6 rounded-3xl bg-slate-950 border border-white/20 max-w-sm w-full text-center space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-burmese">
                KBZPay QR Code
              </h3>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-xl">
              <div className="w-48 h-48 flex flex-col items-center justify-center bg-slate-100 rounded-xl p-2 text-slate-900">
                <QrCode className="w-32 h-32 text-slate-900" />
                <span className="text-[11px] font-mono font-bold mt-1">09778948352</span>
              </div>
            </div>

            <div className="text-xs text-slate-300 font-burmese">
              <div className="font-bold text-amber-400">Min Zaw</div>
              <div className="text-slate-400 mt-1">
                ပေးသွင်းရမည့် ငွေပမာဏ: <span className="text-white font-bold">{selectedPlanData.priceDisplay}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-white/10"
            >
              ပိတ်မည် (Close)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
