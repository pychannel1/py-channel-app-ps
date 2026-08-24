import React, { useState, useEffect } from 'react';
import { TranscriptSegment } from '../types';
import {
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Bot,
  KeyRound,
  AlertCircle,
  X,
  Clock,
  Edit3,
  ArrowRight,
  Code,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Languages,
} from 'lucide-react';

interface Step2SourceTextProps {
  segments: TranscriptSegment[];
  onUpdateSegment: (id: string, newSourceText: string) => void;
  onUpdateMyanmarSegment?: (id: string, text: string) => void;
  onTranslateWithDirectGeminiApi: () => void;
  onSubmitExternalGeminiJson: (translations: any) => void;
  isTranslating: boolean;
  isModalOpen: boolean;
  onOpenModal: () => void;
  onCloseModal: () => void;
  geminiApiKey: string;
  onSaveGeminiKey: (key: string) => void;
}

export const Step2SourceText: React.FC<Step2SourceTextProps> = ({
  segments,
  onUpdateSegment,
  onUpdateMyanmarSegment,
  onTranslateWithDirectGeminiApi,
  onSubmitExternalGeminiJson,
  isTranslating,
  isModalOpen,
  onOpenModal,
  onCloseModal,
  geminiApiKey,
  onSaveGeminiKey,
}) => {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Dedicated Gemini Key management inside Step 2
  const [localGeminiKey, setLocalGeminiKey] = useState(geminiApiKey);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);
  const [keyStatusMsg, setKeyStatusMsg] = useState('');
  const [isKeyValid, setIsKeyValid] = useState(Boolean(geminiApiKey && geminiApiKey.trim().length > 10));
  const [missingGeminiAlert, setMissingGeminiAlert] = useState(false);

  useEffect(() => {
    setLocalGeminiKey(geminiApiKey);
    const valid = Boolean(geminiApiKey && geminiApiKey.trim().length > 10);
    setIsKeyValid(valid);
    if (valid) {
      setMissingGeminiAlert(false);
    }
  }, [geminiApiKey]);

  const handleDirectTranslateClick = () => {
    setMissingGeminiAlert(false);
    onTranslateWithDirectGeminiApi();
  };

  const handleTestAndSaveKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = localGeminiKey.trim();

    if (!cleanKey) {
      setIsKeyValid(false);
      setKeyStatusMsg('API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။');
      return;
    }

    setIsVerifyingKey(true);
    setKeyStatusMsg('');

    try {
      const response = await fetch('/api/test-gemini-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsKeyValid(true);
        setMissingGeminiAlert(false);
        setKeyStatusMsg('✓ Gemini API ချိတ်ဆက်မှု အောင်မြင်ပြီး သိမ်းဆည်းပါပြီ');
        onSaveGeminiKey(cleanKey);
      } else {
        setIsKeyValid(false);
        setKeyStatusMsg(data.error || 'API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။');
      }
    } catch {
      setIsKeyValid(false);
      setKeyStatusMsg('API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။');
    } finally {
      setIsVerifyingKey(false);
    }
  };

  // Generate full prompt tailored for copy-paste into Gemini App with strict expert translation instruction
  const generateGeminiAppPrompt = () => {
    const lines = segments
      .map((s, i) => `[Segment ${i + 1}] (${s.id}) (${s.start} - ${s.end})\nSource: ${s.sourceText}`)
      .join('\n\n');

    return `SYSTEM INSTRUCTION:
You are an expert Myanmar translator for movie recaps. Translate the given English transcript segments accurately and completely into fluent, natural Myanmar. Do not truncate, alter meaning, or output broken sentences.

CRITICAL TRANSLATION & FIDELITY INSTRUCTIONS:
1. STRICT SENTENCE-BY-SENTENCE TRANSLATION:
   - Faithfully translate every English segment into clean, natural spoken Myanmar.
   - Do NOT summarize, truncate, cut off sentences, omit context, alter the story, or hallucinate random dialogue.
   - Maintain the precise meaning, context, and tone of the original dialogue/narration.
2. PURE SPOKEN BURMESE WITH PROPER PUNCTUATION:
   - Use natural spoken Burmese conversational particles ("တယ်", "ပါတယ်", "သွားတယ်", "ဖြစ်သွားတယ်", "လိုက်တယ်", "နေတယ်", "ရတော့မယ်", "ပေါ့နော်").
   - Prohibit archaic formal written words ("သည်", "၏", "၌", "သတည်း", "လျက်").
   - Insert Burmese comma (၊) and Burmese full stop (။) for natural cadence and breathing pauses.
3. OUTPUT FORMAT:
   Return ONLY a valid JSON object matching this schema with all segment IDs preserved:
{
  "translations": [
${segments.map((s) => `    { "id": "${s.id}", "myanmarText": "သဘာဝကျသော စကားပြော ဇာတ်လမ်းရီကပ် မြန်မာဘာသာပြန် စာသား..." }`).join(',\n')}
  ]
}

TRANSCRIPT SEGMENTS TO TRANSLATE:
${lines}
`;
  };

  const handleOpenGeminiAppDirectly = () => {
    const promptText = generateGeminiAppPrompt();
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
    // Open Gemini Web App in new tab
    window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');
    // Open the JSON Import modal in the studio
    onOpenModal();
  };

  const handleCopyPrompt = () => {
    const promptText = generateGeminiAppPrompt();
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleCopyRawScript = () => {
    const rawText = segments.map((s) => `[${s.start} - ${s.end}] ${s.sourceText}`).join('\n');
    navigator.clipboard.writeText(rawText);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleSubmitJson = () => {
    setJsonError(null);
    if (!jsonInput.trim()) {
      setJsonError('ကျေးဇူးပြု၍ Gemini App မှ ရရှိသော JSON စာသားကို ထည့်သွင်းပေးပါ');
      return;
    }

    try {
      // Clean possible markdown backticks
      let cleaned = jsonInput.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleaned);
      let list: any[] = [];

      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (parsed.translations && Array.isArray(parsed.translations)) {
        list = parsed.translations;
      } else if (typeof parsed === 'object') {
        list = Object.entries(parsed).map(([k, v]) => ({ id: k, myanmarText: typeof v === 'string' ? v : (v as any).myanmarText }));
      } else {
        throw new Error('JSON structure must contain an array or a "translations" key.');
      }

      if (list.length === 0) {
        throw new Error('No translated lines found in the JSON.');
      }

      onSubmitExternalGeminiJson(list);
      onCloseModal();
    } catch (err: any) {
      setJsonError(`JSON Error: ${err.message || 'Invalid JSON format'}`);
    }
  };

  if (segments.length === 0) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-amber-500/30 text-center space-y-5 bg-slate-950/80 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white font-burmese">
              ကျေးဇူးပြု၍ ဗီဒီယို အရင်တင်ပါ (Please Upload Video First)
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto font-burmese">
              စာသားများ ထုတ်ယူရန် Video ဖိုင် မတင်ရသေးပါ။ Step 1 တွင် Video ဖိုင်ကို အရင်တင်ပြီး Audio Extraction ပြုလုပ်ပေးပါ။
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-xs font-semibold border border-amber-500/30">
                STEP 2
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                မူရင်းစာသားနှင့် မြန်မာဘာသာပြန် စစ်ဆေးပါ (Source Text & Translation Options)
              </h2>
            </div>
            <p className="text-sm text-slate-300 font-burmese mt-1">
              ဗီဒီယိုမှ ရရှိထားသော English စကားပြော စာသားများနှင့် မြန်မာဘာသာပြန်များကို စစ်ဆေးပြင်ဆင်ပြီး လိုအပ်သော ဘာသာပြန်စနစ်ကို ရွေးချယ်ပါ။
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="copy-full-prompt-top-btn"
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-medium transition-all cursor-pointer shadow-sm"
            >
              {copiedPrompt ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Prompt Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>📋 Copy Strict Prompt</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Segments Review Box & Translation Path Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Timestamped Source Segments & Matched Translation Box */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 border border-white/10 flex flex-col h-[600px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <Languages className="w-4 h-4 text-amber-400" />
                Source Transcript & Myanmar Alignment ({segments.length} Segments)
              </h3>
            </div>
            <button
              id="copy-raw-script-btn"
              onClick={handleCopyRawScript}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedScript ? 'Copied' : 'Copy Raw Text'}</span>
            </button>
          </div>

          {/* Scrollable list of aligned segments */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {segments.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No segments extracted. Please go back to Step 1.
              </div>
            ) : (
              segments.map((segment, idx) => (
                <div
                  key={segment.id}
                  className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-amber-500/40 transition-all space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 flex items-center gap-1 border border-amber-500/20">
                      <Clock className="w-3 h-3" />
                      {segment.start} &rarr; {segment.end}
                    </span>
                    <div className="flex items-center gap-2">
                      {segment.myanmarText && segment.myanmarText.trim().length > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 text-[10px] flex items-center gap-1 font-mono">
                          <Check className="w-2.5 h-2.5" /> Translated
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
                          Ready for Translation
                        </span>
                      )}
                      <span className="text-slate-400 text-[10px] flex items-center gap-1">
                        <Edit3 className="w-3 h-3" /> #{idx + 1}
                      </span>
                    </div>
                  </div>

                  {/* English Source Dialogue Box */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                      <span>🇬🇧 Source English Dialogue:</span>
                    </div>
                    <textarea
                      rows={2}
                      value={segment.sourceText}
                      onChange={(e) => onUpdateSegment(segment.id, e.target.value)}
                      className="w-full bg-slate-950/80 rounded-lg p-2.5 text-xs text-slate-200 border border-white/10 focus:border-amber-500/50 focus:outline-none resize-none font-sans leading-relaxed"
                      placeholder="Enter or edit source text..."
                    />
                  </div>

                  {/* Matched Myanmar Translation Box */}
                  {segment.myanmarText && segment.myanmarText.trim().length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-white/5">
                      <div className="flex items-center justify-between text-[10px] text-amber-400 font-semibold font-burmese">
                        <span>🇲🇲 မြန်မာဘာသာပြန် ဇာတ်ကြောင်းပြော (Matching Myanmar Narration):</span>
                      </div>
                      <textarea
                        rows={2}
                        value={segment.myanmarText}
                        onChange={(e) => {
                          if (onUpdateMyanmarSegment) {
                            onUpdateMyanmarSegment(segment.id, e.target.value);
                          }
                        }}
                        className="w-full bg-amber-950/20 rounded-lg p-2.5 text-xs text-amber-100 border border-amber-500/30 focus:border-amber-400 focus:outline-none resize-none font-burmese leading-relaxed"
                        placeholder="မြန်မာဘာသာပြန် စာသား..."
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Translation Path (ရွေးချယ်ခွင့် ၂ မျိုး) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 bg-slate-950/70 shadow-xl flex-1 flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">
                  Translation Options (ဘာသာပြန် နည်းလမ်း ရွေးချယ်ပါ)
                </h3>
              </div>
              <p className="text-xs text-slate-300 font-burmese leading-relaxed mb-4">
                ရုပ်ရှင်ဇာတ်လမ်းအနှစ်ချုပ် (Movie Recap) အဖြစ် တိကျမှန်ကန်သော မြန်မာစကားပြော ဘာသာပြန်ရန် အောက်ပါ ခလုတ် ၂ ခုထဲမှ ရွေးချယ်ပါ:
              </p>

              <div className="space-y-4">
                {/* Button 1 (ထိပ်ဆုံး): Gemini App မှ တစ်ဆင့် ဘာသာပြန်မည် */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-purple-500/30 hover:border-purple-400/60 shadow-lg shadow-purple-950/30 transition-all space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <ExternalLink className="w-4 h-4 text-purple-400" />
                      Option 1: Gemini Web/App (အခမဲ့)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-500/40 font-mono">
                      FREE COPY-PASTE
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 font-burmese leading-relaxed">
                    အချိန်ကိုက် ဘာသာပြန်ရန် Strict System Prompt ကို Auto-copy လုပ်ပေးပြီး Gemini App/Web တွင် အသုံးပြုရန် JSON response ကူးထည့်နိုင်သည့် Modal ပွင့်လာမည်။
                  </p>

                  <button
                    id="gemini-app-path-btn"
                    onClick={handleOpenGeminiAppDirectly}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 hover:from-purple-600 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-purple-600/30 border border-purple-400/40 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] group"
                  >
                    <ExternalLink className="w-4 h-4 text-purple-200 group-hover:scale-110 transition-transform" />
                    <span>Gemini App မှ တဆင့်ဘာသာပြန်မည် (Auto-Copy & Open)</span>
                    <ArrowRight className="w-3.5 h-3.5 text-purple-300" />
                  </button>

                  {copiedPrompt && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-burmese flex items-center justify-center gap-1.5 animate-fadeIn">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Strict Prompt စာသားကို Auto-Copy ကူးယူပြီးပါပြီ။ Gemini App တွင် Paste (Ctrl+V) ချ၍ မေးမြန်းနိုင်ပါသည်။</span>
                    </div>
                  )}
                </div>

                {/* Button 2 (အောက်ဆုံး): Gemini API Key ဖြင့် ဆက်သွားမည် & Dedicated Input Box */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/60 via-slate-900/90 to-indigo-950/50 border border-purple-500/40 hover:border-purple-400/70 shadow-lg shadow-purple-950/40 transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-purple-400" />
                      Option 2: Direct Gemini API (1-Click)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30 font-mono">
                      {isKeyValid ? '✓ READY' : 'KEY REQUIRED'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 font-burmese leading-relaxed">
                    အပြင်ထွက်စရာမလိုဘဲ သိမ်းဆည်းထားသော Gemini API Key ဖြင့် တိုက်ရိုက်ခေါ်ယူပြီး တိကျမှန်ကန်သော မြန်မာဘာသာပြန်ဖြင့် Step 3 သို့ ချက်ချင်း အလိုအလျောက် သွားပါမည်။
                  </p>

                  {/* Missing Gemini Key Warning Alert */}
                  {missingGeminiAlert && (
                    <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 flex items-center gap-2 text-red-200 text-xs font-burmese animate-fadeIn">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span className="font-semibold">
                        ကျေးဇူးပြု၍ သင်၏ Google Gemini API Key ကို အရင် ထည့်သွင်းပေးပါ (သို့မဟုတ် အထက်ပါ Option 1 ဖြင့် Gemini Web/App တွင် အခမဲ့ ဘာသာပြန်နိုင်ပါသည်)
                      </span>
                    </div>
                  )}

                  {/* 1-Click Direct Translate Button */}
                  <button
                    id="gemini-api-direct-translate-btn"
                    disabled={isTranslating}
                    onClick={handleDirectTranslateClick}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-xl shadow-purple-600/35 border border-purple-300/40 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTranslating ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin text-purple-200" />
                        <span className="font-burmese">AI တိကျစွာ ဘာသာပြန်နေပါသည်...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-purple-200" />
                        <span>Gemini API Key ဖြင့် ဆက်သွားမည် ▶</span>
                      </>
                    )}
                  </button>

                  {/* Dedicated Gemini API Key In-Step Config Box */}
                  <div className="pt-2 border-t border-purple-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-purple-200 font-medium">
                        <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                        <span>🔑 Gemini API Key Configuration</span>
                      </div>
                      {isKeyValid && (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-burmese font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Gemini API အသင့်ရှိပါသည်</span>
                        </span>
                      )}
                    </div>

                    <form onSubmit={handleTestAndSaveKey} className="space-y-2">
                      <div className="relative">
                        <input
                          id="step2-gemini-key-input"
                          type={showKeyInput ? 'text' : 'password'}
                          value={localGeminiKey}
                          onChange={(e) => setLocalGeminiKey(e.target.value)}
                          placeholder="Paste your Gemini API Key (AIzaSy...)"
                          className="w-full bg-slate-950/90 rounded-xl px-3 py-2 pr-16 text-xs text-white border border-purple-500/30 focus:border-purple-400 focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeyInput(!showKeyInput)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                        >
                          {showKeyInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {keyStatusMsg && (
                        <div
                          className={`text-[11px] flex items-center gap-1 font-burmese ${
                            isKeyValid ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {isKeyValid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          <span>{keyStatusMsg}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-0.5">
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-purple-400 hover:underline flex items-center gap-0.5"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span>Get Free Key (Google AI Studio)</span>
                        </a>

                        <button
                          type="submit"
                          disabled={isVerifyingKey}
                          className="px-3 py-1.5 rounded-lg bg-purple-700/80 hover:bg-purple-600 text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm border border-purple-400/30 disabled:opacity-50"
                        >
                          {isVerifyingKey ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>စစ်ဆေးနေသည်...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3 h-3" />
                              <span>Test & Save Key</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-purple-500/20 text-[11px] text-slate-400 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span>Unicode စံနှုန်းနှင့် ရုပ်ရှင်ဇာတ်လမ်းပြော အသံနေအထားကို အလိုအလျောက် ချိန်ညှိပေးပါသည်။</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL / POPUP: Gemini App Prompt & JSON Import */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel-glow w-full max-w-2xl rounded-2xl border border-amber-500/40 p-6 space-y-5 bg-slate-950/95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-amber-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">
                  Gemini App Prompt & JSON Import (Unicode / Zawgyi)
                </h3>
              </div>
              <button
                id="close-gemini-modal-btn"
                onClick={onCloseModal}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step A: Copy Pre-formatted Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span>၁။ Gemini App သို့ ပေးပို့ရမည့် Strict Prompt</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    id="modal-open-gemini-web-btn"
                    type="button"
                    onClick={handleOpenGeminiAppDirectly}
                    className="px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Gemini App ဖွင့်မည် (Auto-Copy)</span>
                  </button>
                  <button
                    id="modal-copy-prompt-btn"
                    type="button"
                    onClick={handleCopyPrompt}
                    className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPrompt ? 'Copied!' : 'Copy Strict Prompt'}</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  rows={5}
                  value={generateGeminiAppPrompt()}
                  className="w-full bg-slate-900/90 rounded-xl p-3 text-xs font-mono text-slate-300 border border-white/10 select-all"
                />
              </div>
              <p className="text-[11px] text-slate-400 font-burmese">
                အထက်ပါ စာသားများကို ကူးယူ၍{' '}
                <a
                  href="https://gemini.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 underline hover:text-amber-300"
                >
                  gemini.google.com
                </a>{' '}
                တွင် ထည့်သွင်းပြီး မေးမြန်းပါ။
              </p>
            </div>

            {/* Step B: Paste JSON */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-emerald-400" />
                  <span>၂။ Gemini App မှ ပြန်လည်ရရှိသော JSON ကို ထည့်ပါ</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const sample = {
                      translations: segments.map((s) => ({
                        id: s.id,
                        myanmarText: s.myanmarText || 'သဘာဝကျသော စကားပြော ဇာတ်လမ်းရီကပ် မြန်မာစာသား...',
                      })),
                    };
                    setJsonInput(JSON.stringify(sample, null, 2));
                  }}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  Fill Sample JSON
                </button>
              </div>

              <textarea
                rows={6}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={`{\n  "translations": [\n    {\n      "id": "${segments[0]?.id || 'seg-1'}",\n      "myanmarText": "မြန်မာဘာသာပြန် စာသား..."\n    }\n  ]\n}`}
                className="w-full bg-slate-900/90 rounded-xl p-3 text-xs font-mono text-emerald-300 placeholder-slate-600 border border-emerald-500/30 focus:border-emerald-500 focus:outline-none"
              />

              {jsonError && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <span>{jsonError}</span>
                </div>
              )}
            </div>

            {/* Modal Submit Button */}
            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={onCloseModal}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel (မလုပ်တော့ပါ)
              </button>
              <button
                id="submit-translation-json-btn"
                type="button"
                onClick={handleSubmitJson}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Submit Translation ▶</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
