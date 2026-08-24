import React, { useState, useEffect, useRef } from 'react';
import { TranscriptSegment, BurmeseVoiceAvatar, ClonedVoiceProfile } from '../types';
import { BURMESE_VOICE_AVATARS } from '../data/burmeseVoices';
import { normalizeMyanmarForTTS } from '../utils/myanmarTextNormalizer';
import { playVoicePreview } from '../services/audioService';
import { isVoiceCloneAccessible } from '../services/authService';
import {
  Copy,
  Check,
  Play,
  Square,
  Mic,
  Sliders,
  Volume2,
  Sparkles,
  CheckCircle2,
  Clock,
  Wand2,
  Wind,
  UserCheck,
  Headphones,
  ClipboardPaste,
  FileText,
  RefreshCw,
  Trash2,
  AlertCircle,
  HelpCircle,
  Radio,
  ShieldCheck,
} from 'lucide-react';

interface Step3MyanmarVoiceProps {
  segments: TranscriptSegment[];
  selectedVoiceId: string;
  pitchOffset: number; // -30 to +30 Hz
  speedMultiplier: number; // 0.8 to 1.4
  isSynthesizingVoice: boolean;
  isPlayingPreview: boolean;
  userEmail?: string;
  isAdminAuthenticated?: boolean;
  showVoiceClone?: boolean;
  clonedVoices?: ClonedVoiceProfile[];
  onSelectVoice: (voiceId: string) => void;
  onChangePitch: (pitch: number) => void;
  onChangeSpeed: (speed: number) => void;
  onUpdateMyanmarSegment: (id: string, text: string) => void;
  onUpdateAllMyanmarSegments?: (texts: string[]) => void;
  onPlayVoicePreview: (customText?: string, specificVoice?: BurmeseVoiceAvatar) => void;
  onStopVoicePreview: () => void;
  onStartVoiceSynthesis: () => void;
}

/**
 * Smart parser function to extract Myanmar sentences from JSON Array, JSON Object,
 * numbered list, timestamped lines, or plain newline-separated text.
 */
export function parseMyanmarScriptInput(rawInput: string): string[] {
  const trimmed = rawInput.trim();
  if (!trimmed) return [];

  // 1. Try Parsing as JSON (Array or Object)
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      const parsed = JSON.parse(trimmed);

      // If it's a direct array of strings or objects
      if (Array.isArray(parsed)) {
        const extracted = parsed.map((item) => {
          if (typeof item === 'string') return item.trim();
          if (typeof item === 'object' && item !== null) {
            return (item.myanmarText || item.text || item.translation || item.script || item.content || '').toString().trim();
          }
          return String(item).trim();
        }).filter(Boolean);

        if (extracted.length > 0) return extracted;
      }

      // If it's an object with keys like { translations: [...], recap: [...], segments: [...], script: [...] }
      if (typeof parsed === 'object' && parsed !== null) {
        const candidateKeys = ['translations', 'recap', 'segments', 'script', 'lines', 'data', 'subtitles', 'result'];
        for (const key of candidateKeys) {
          if (Array.isArray(parsed[key])) {
            const extracted = parsed[key].map((item: any) => {
              if (typeof item === 'string') return item.trim();
              if (typeof item === 'object' && item !== null) {
                return (item.myanmarText || item.text || item.translation || item.script || '').toString().trim();
              }
              return String(item).trim();
            }).filter(Boolean);

            if (extracted.length > 0) return extracted;
          }
        }
      }
    } catch {
      // Not valid JSON, continue to regex extraction
    }
  }

  // 2. Check for Markdown codeblock JSON (```json ... ```)
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (Array.isArray(parsed)) {
        const extracted = parsed.map((item) => (typeof item === 'string' ? item : item.myanmarText || item.text || '')).filter(Boolean);
        if (extracted.length > 0) return extracted;
      }
    } catch {}
  }

  // 3. Line-by-line parsing (handles timestamps [00:00 - 00:05], numbering 1., 2., etc.)
  const rawLines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const parsedLines: string[] = [];

  for (const line of rawLines) {
    // Strip timestamp prefixes like [00:00 - 00:05] or (00:00-00:05) or 00:00 -> 00:05
    let cleaned = line
      .replace(/^\[?\d{1,2}:\d{2}(?::\d{2})?\s*[-–—>]\s*\d{1,2}:\d{2}(?::\d{2})?\]?\s*[:-]?\s*/, '')
      .replace(/^\(?\d{1,2}:\d{2}\s*[-–—>]\s*\d{1,2}:\d{2}\)?\s*[:-]?\s*/, '')
      // Strip numbering prefixes like "1.", "1)", "#1", "Line 1:"
      .replace(/^(?:#?\d+[\.\)\:\-]|Line\s*\d+[\:\-]|\bSegment\s*\d+[\:\-])\s*/i, '')
      // Strip outer quotes if any
      .replace(/^["'“”](.*)["'“”]$/, '$1')
      .trim();

    if (cleaned.length > 0) {
      parsedLines.push(cleaned);
    }
  }

  // If we only have 1 large block of text with Myanmar sentence delimiters (။)
  if (parsedLines.length === 1 && parsedLines[0].includes('။') && parsedLines[0].length > 80) {
    const sentences = parsedLines[0]
      .split('။')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s + '။');
    if (sentences.length > 1) {
      return sentences;
    }
  }

  return parsedLines.length > 0 ? parsedLines : [trimmed];
}

export const Step3MyanmarVoice: React.FC<Step3MyanmarVoiceProps> = ({
  segments,
  selectedVoiceId,
  pitchOffset,
  speedMultiplier,
  isSynthesizingVoice,
  isPlayingPreview,
  userEmail,
  isAdminAuthenticated,
  showVoiceClone,
  clonedVoices = [],
  onSelectVoice,
  onChangePitch,
  onChangeSpeed,
  onUpdateMyanmarSegment,
  onUpdateAllMyanmarSegments,
  onPlayVoicePreview,
  onStopVoicePreview,
  onStartVoiceSynthesis,
}) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [pastedStatus, setPastedStatus] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [showNormalizedPreview, setShowNormalizedPreview] = useState(false);
  const [playingSegmentId, setPlayingSegmentId] = useState<string | null>(null);
  const [auditioningVoiceId, setAuditioningVoiceId] = useState<string | null>(null);

  // Check if voice cloning is accessible (Admin-only or Secret Flag)
  const isCloneAccessible = isVoiceCloneAccessible(userEmail, isAdminAuthenticated, showVoiceClone);
  const activeClones = isCloneAccessible ? clonedVoices.filter((c) => c.isActiveInStudio !== false) : [];

  // Full Script Text Area State
  const [fullScriptInput, setFullScriptInput] = useState<string>('');
  const [isBulkEditing, setIsBulkEditing] = useState<boolean>(false);
  const [pasteNotice, setPasteNotice] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize or synchronize full script text area with segments
  useEffect(() => {
    if (!isBulkEditing) {
      const combined = segments
        .map((s) => (s.myanmarText ? s.myanmarText.trim() : ''))
        .filter(Boolean)
        .join('\n\n');
      setFullScriptInput(combined);
    }
  }, [segments, isBulkEditing]);

  useEffect(() => {
    if (!isPlayingPreview) {
      setPlayingSegmentId(null);
      setAuditioningVoiceId(null);
    }
  }, [isPlayingPreview]);

  // Derive selected voice (either standard or cloned)
  const matchedClone = activeClones.find((c) => c.id === selectedVoiceId);
  const selectedVoice: BurmeseVoiceAvatar = matchedClone
    ? {
        id: matchedClone.id,
        code: 'CLONE',
        nameBurmese: matchedClone.nameBurmese,
        nameEnglish: matchedClone.nameEnglish,
        gender: matchedClone.gender,
        basePitch: matchedClone.basePitch || 0,
        basePitchHz: matchedClone.basePitchHz || 0,
        pitchHz: matchedClone.basePitchHz || 0,
        baseRate: matchedClone.baseRate || matchedClone.baseRateMultiplier || 1.0,
        speedMultiplier: matchedClone.baseRateMultiplier || 1.0,
        voiceName: matchedClone.gender === 'male' ? 'my-MM-ThihaNeural' : 'my-MM-NilarNeural',
        avatarColor: matchedClone.gender === 'male' ? 'from-amber-600 to-orange-700' : 'from-purple-600 to-pink-600',
        toneCategory: `${matchedClone.timbreCategory || matchedClone.timbreStyle || 'Cloned'} • Neural Cloned`,
        samplePhraseBurmese:
          matchedClone.samplePhraseBurmese ||
          'မင်္ဂလာပါ ရုပ်ရှင်ဇာတ်လမ်းပြော စတူဒီယိုမှ ကြိုဆိုပါသည်',
        category: 'Cloned',
      }
    : BURMESE_VOICE_AVATARS.find((v) => v.id === selectedVoiceId) || BURMESE_VOICE_AVATARS[0];

  // Copy Myanmar Script (Formatted with timestamps)
  const handleCopyMyanmarScript = () => {
    const fullText = segments
      .map((s) => `[${s.start} - ${s.end}] ${s.myanmarText || s.sourceText}`)
      .join('\n');
    navigator.clipboard.writeText(fullText);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  // Direct Clipboard Paste Action Button
  const handleDirectPasteFromClipboard = async () => {
    try {
      let clipboardText = '';
      if (navigator.clipboard && navigator.clipboard.readText) {
        clipboardText = await navigator.clipboard.readText();
      }

      if (!clipboardText) {
        // Focus textarea to allow manual paste if clipboard permission is restricted
        if (textareaRef.current) {
          textareaRef.current.focus();
          setPasteNotice('ကျေးဇူးပြု၍ Ctrl+V (သို့) Command+V ဖြင့် စာသားကူးထည့်ပါ');
          setTimeout(() => setPasteNotice(''), 3000);
        }
        return;
      }

      processAndSyncScriptText(clipboardText);
      setPastedStatus('✓ Clipboard မှ စာသားများ အောင်မြင်စွာ ကူးထည့်ပြီးပါပြီ');
      setTimeout(() => setPastedStatus(null), 3000);
    } catch {
      // Fallback
      if (textareaRef.current) {
        textareaRef.current.focus();
        setPasteNotice('ကျေးဇူးပြု၍ စာသားကွက်ထဲတွင် နှိပ်၍ Paste ချပါ');
        setTimeout(() => setPasteNotice(''), 3000);
      }
    }
  };

  // Process raw text, parse lines, and sync with segments immediately
  const processAndSyncScriptText = (rawText: string) => {
    setFullScriptInput(rawText);
    const parsedLines = parseMyanmarScriptInput(rawText);

    if (parsedLines.length > 0) {
      if (onUpdateAllMyanmarSegments) {
        onUpdateAllMyanmarSegments(parsedLines);
      } else {
        // Fallback per-segment update
        parsedLines.forEach((line, idx) => {
          if (segments[idx]) {
            onUpdateMyanmarSegment(segments[idx].id, line);
          }
        });
      }
    }
  };

  // Handle direct typing in the textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setIsBulkEditing(true);
    setFullScriptInput(val);

    // Debounced or direct sync
    const parsed = parseMyanmarScriptInput(val);
    if (parsed.length > 0) {
      if (onUpdateAllMyanmarSegments) {
        onUpdateAllMyanmarSegments(parsed);
      } else {
        parsed.forEach((line, idx) => {
          if (segments[idx]) {
            onUpdateMyanmarSegment(segments[idx].id, line);
          }
        });
      }
    }
  };

  const handleTextareaBlur = () => {
    setIsBulkEditing(false);
  };

  // Format / Clean text
  const handleFormatScript = () => {
    const parsed = parseMyanmarScriptInput(fullScriptInput);
    if (parsed.length > 0) {
      const formatted = parsed.join('\n\n');
      setFullScriptInput(formatted);
      if (onUpdateAllMyanmarSegments) {
        onUpdateAllMyanmarSegments(parsed);
      }
      setPastedStatus('✓ စာကြောင်းများကို စနစ်တကျ ပြန်လည်စီစဉ်ပြီးပါပြီ');
      setTimeout(() => setPastedStatus(null), 2500);
    }
  };

  // Clear Script
  const handleClearScript = () => {
    if (window.confirm('မြန်မာဘာသာပြန် စာသားအားလုံးကို ရှင်းလင်းဖျက်ထုတ်မှာ သေချာပါသလား?')) {
      setFullScriptInput('');
      if (onUpdateAllMyanmarSegments) {
        onUpdateAllMyanmarSegments([]);
      }
    }
  };

  // Calculate parsed valid sentences count
  const validLines = parseMyanmarScriptInput(fullScriptInput);
  const activeScriptCount = validLines.length > 0 ? validLines.length : segments.filter((s) => s.myanmarText?.trim()).length;

  const activeControllerRef = useRef<{ stop: () => void } | null>(null);
  const [isPlayingDirectPreview, setIsPlayingDirectPreview] = useState(false);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (activeControllerRef.current) {
        activeControllerRef.current.stop();
        activeControllerRef.current = null;
      }
    };
  }, []);

  const stopActiveAudio = () => {
    if (activeControllerRef.current) {
      activeControllerRef.current.stop();
      activeControllerRef.current = null;
    }
    if (window.currentAudio) {
      try {
        window.currentAudio.pause();
        window.currentAudio.currentTime = 0;
      } catch {}
      window.currentAudio = null;
    }
    setIsPlayingDirectPreview(false);
    setAuditioningVoiceId(null);
    setPlayingSegmentId(null);
    onStopVoicePreview();
  };

  const handlePlaySegmentPreview = async (segment: TranscriptSegment) => {
    if (playingSegmentId === segment.id && (isPlayingDirectPreview || isPlayingPreview)) {
      stopActiveAudio();
      return;
    }

    stopActiveAudio();
    setPlayingSegmentId(segment.id);
    setAuditioningVoiceId(null);
    setIsPlayingDirectPreview(true);

    const targetText = segment.myanmarText || segment.sourceText || selectedVoice.samplePhraseBurmese;
    try {
      const controller = await playVoicePreview({
        voice: selectedVoice,
        pitchOffsetHz: pitchOffset,
        speedMultiplier: speedMultiplier,
        customText: targetText,
        onEnded: () => {
          setIsPlayingDirectPreview(false);
          setPlayingSegmentId(null);
          activeControllerRef.current = null;
        },
      });
      activeControllerRef.current = controller;
    } catch (err) {
      console.warn('Segment preview error:', err);
      setIsPlayingDirectPreview(false);
      setPlayingSegmentId(null);
    }
  };

  const handleAuditionVoice = async (e: React.MouseEvent, voice: BurmeseVoiceAvatar) => {
    e.stopPropagation();
    if (auditioningVoiceId === voice.id && (isPlayingDirectPreview || isPlayingPreview)) {
      stopActiveAudio();
      return;
    }

    stopActiveAudio();
    setAuditioningVoiceId(voice.id);
    setPlayingSegmentId(null);
    setIsPlayingDirectPreview(true);
    onSelectVoice(voice.id);

    try {
      const controller = await playVoicePreview({
        voice,
        pitchOffsetHz: pitchOffset,
        speedMultiplier: speedMultiplier,
        customText: voice.samplePhraseBurmese,
        onEnded: () => {
          setIsPlayingDirectPreview(false);
          setAuditioningVoiceId(null);
          activeControllerRef.current = null;
        },
      });
      activeControllerRef.current = controller;
    } catch (err) {
      console.warn('Voice audition error:', err);
      setIsPlayingDirectPreview(false);
      setAuditioningVoiceId(null);
    }
  };

  const handleToggleMainPreview = async () => {
    if (isPlayingDirectPreview || isPlayingPreview) {
      stopActiveAudio();
      return;
    }

    stopActiveAudio();
    setIsPlayingDirectPreview(true);

    const firstSegmentText = segments[0]?.myanmarText?.trim() || selectedVoice.samplePhraseBurmese;
    try {
      const controller = await playVoicePreview({
        voice: selectedVoice,
        pitchOffsetHz: pitchOffset,
        speedMultiplier: speedMultiplier,
        customText: firstSegmentText,
        onEnded: () => {
          setIsPlayingDirectPreview(false);
          activeControllerRef.current = null;
        },
      });
      activeControllerRef.current = controller;
    } catch (err) {
      console.warn('Main preview error:', err);
      setIsPlayingDirectPreview(false);
    }
  };

  const filteredVoices = BURMESE_VOICE_AVATARS.filter((v) => {
    if (genderFilter === 'male') return v.gender === 'male';
    if (genderFilter === 'female') return v.gender === 'female';
    return true;
  });

  const maleCount = BURMESE_VOICE_AVATARS.filter((v) => v.gender === 'male').length;
  const femaleCount = BURMESE_VOICE_AVATARS.filter((v) => v.gender === 'female').length;

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
              မြန်မာအသံ ထည့်သွင်းရန် Video ဖိုင် မတင်ရသေးပါ။ Step 1 တွင် Video ဖိုင်ကို အရင်တင်ပြီး Audio Extraction ပြုလုပ်ပေးပါ။
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Title and Action Buttons */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 font-mono text-xs font-semibold border border-purple-500/30">
                STEP 3
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                မြန်မာဘာသာပြန် စစ်ဆေးခြင်းနှင့် အသံရွေးချယ်မှု (Review Script & Select Voice)
              </h2>
            </div>
            <p className="text-sm text-slate-300 font-burmese mt-1">
              Phonetic Normalizer နှင့် သဘာဝကျသော အသက်ရှူသံအနားပေး (Prosody Pause) ပါဝင်သော မြန်မာ AI Voice Models ၄၀ (Male ၂၀ / Female ၂၀) ထဲမှ ရွေးချယ်ပါ။
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Paste Action Button */}
            <button
              id="paste-myanmar-script-btn"
              type="button"
              onClick={handleDirectPasteFromClipboard}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-bold transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95 border border-amber-300/40"
              title="Clipboard ထဲမှ Gemini ဘာသာပြန်စာသားများကို အလိုအလျောက် Paste ချမည်"
            >
              <ClipboardPaste className="w-4 h-4" />
              <span>📋 Paste Script (စာသားကူးထည့်မည်)</span>
            </button>

            {/* Copy Script Button */}
            <button
              id="copy-myanmar-script-btn"
              type="button"
              onClick={handleCopyMyanmarScript}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all cursor-pointer shadow-md active:scale-95"
            >
              {copiedScript ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Script Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Script</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DIRECT PASTE & EDITABLE MYANMAR SCRIPT BOX (GEMINI TEXTAREA) */}
      {/* ========================================================================= */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-purple-500/30 bg-slate-950/80 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center text-white shadow-md">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-burmese">
                  မြန်မာဘာသာပြန် စာသားအပြည့်အစုံ ရိုက်ထည့်/ပြင်ဆင်ရန် (Myanmar Recap Script Editor)
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-burmese mt-0.5">
                Gemini မှ ဘာသာပြန်ထားသော စာသားများ (သို့မဟုတ် JSON Array) ကို ဤနေရာတွင် တိုက်ရိုက် Paste ချနိုင်ပြီး စာလုံးပေါင်းများကို စိတ်ကြိုက် ပြင်ဆင်နိုင်ပါသည်
              </p>
            </div>
          </div>

          {/* Green Status Badge */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {activeScriptCount > 0 ? (
              <span
                id="myanmar-script-ready-badge"
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-burmese flex items-center gap-1.5 shadow-md shadow-emerald-950/40 animate-fadeIn"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>✅ စာသား {activeScriptCount} ကြောင်း အသင့်ရှိပါသည်</span>
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-amber-950/70 border border-amber-500/40 text-amber-300 font-burmese flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>စာသား ထည့်သွင်းရန် လိုအပ်ပါသည်</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Notice Messages */}
        {pastedStatus && (
          <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-burmese flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{pastedStatus}</span>
          </div>
        )}

        {pasteNotice && (
          <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-burmese flex items-center gap-2 animate-fadeIn">
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{pasteNotice}</span>
          </div>
        )}

        {/* Big Editable Textarea */}
        <div className="relative">
          <textarea
            id="myanmar-script-direct-textarea"
            ref={textareaRef}
            rows={7}
            value={fullScriptInput}
            onChange={handleTextareaChange}
            onBlur={handleTextareaBlur}
            placeholder="Gemini မှ ကူးယူလာသော မြန်မာဘာသာပြန် စာသားများ (သို့မဟုတ် JSON) ကို ဤနေရာတွင် Paste ချပါ..."
            className="w-full bg-slate-950/90 rounded-xl p-4 text-xs sm:text-sm text-purple-100 placeholder:text-slate-500 border border-purple-500/30 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-none resize-y font-burmese leading-relaxed shadow-inner transition-all"
          />

          {/* Bottom Bar inside Editor Box */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span>Lines: <strong className="text-purple-300">{activeScriptCount}</strong></span>
              <span>Characters: <strong className="text-slate-300">{fullScriptInput.length}</strong></span>
              <span className="hidden sm:inline text-slate-500">| Smart JSON & Line Parser Active</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFormatScript}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-[11px] font-burmese transition-all flex items-center gap-1 cursor-pointer"
                title="Format into clean paragraph blocks"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Format Lines</span>
              </button>

              <button
                type="button"
                onClick={handleClearScript}
                className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-[11px] font-burmese transition-all flex items-center gap-1 cursor-pointer"
                title="Clear all script text"
              >
                <Trash2 className="w-3 h-3" />
                <span>ရှင်းလင်းမည်</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Phonetic & Prosody Feature Banner */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/50 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
            <Wand2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-purple-300 font-burmese flex items-center gap-2">
              <span>Phonetic & Text Normalization အသက်ဝင်နေပါသည်</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono border border-purple-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-slate-300 font-burmese text-[11px] mt-0.5">
              နံပါတ်များ (ဥပမာ: 1, 2, 2025) နှင့် အင်္ဂလိပ်စာလုံးများ (AI, FBI, Boss) ကို မြန်မာစကားပြောသံအဖြစ် အလိုအလျောက် ပြောင်းလဲဖတ်ကြားပေးပါသည်။
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowNormalizedPreview(!showNormalizedPreview)}
          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-200 border border-purple-500/30 text-[11px] font-mono transition-all flex-shrink-0 cursor-pointer"
        >
          {showNormalizedPreview ? 'Hide TTS Phonetics' : '🔍 View TTS Phonetics'}
        </button>
      </div>

      {/* 2. Timeline Segment Sync Review Box (မြန်မာဘာသာပြန် Timeline စစ်ဆေးရန်) */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-purple-400 animate-pulse"></span>
            <h3 className="text-base font-bold text-slate-100 font-burmese">
              Timeline Segment အလိုက် စစ်ဆေးရန် (Synced Segments - {segments.length})
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Wind className="w-4 h-4 text-cyan-400" />
            <span>Prosody Respiration: 50ms - 200ms</span>
          </div>
        </div>

        {/* Segments list in scrollable container */}
        <div className="max-h-[360px] overflow-y-auto space-y-3.5 pr-2 custom-scrollbar">
          {segments.map((segment, idx) => {
            const normalized = normalizeMyanmarForTTS(segment.myanmarText || segment.sourceText);
            const isSegmentAuditioning = playingSegmentId === segment.id && (isPlayingDirectPreview || isPlayingPreview);

            return (
              <div
                key={segment.id}
                className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                  isSegmentAuditioning
                    ? 'bg-purple-950/40 border-purple-500/60 ring-1 ring-purple-500/40'
                    : 'bg-slate-900/85 border-white/5 hover:border-purple-500/30'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono px-2.5 py-0.5 rounded-lg bg-slate-800 text-purple-300 border border-purple-500/20 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    {segment.start} &rarr; {segment.end}
                  </span>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handlePlaySegmentPreview(segment)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                        isSegmentAuditioning
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-slate-800 hover:bg-slate-700 text-purple-200 border border-purple-500/30'
                      }`}
                    >
                      {isSegmentAuditioning ? (
                        <>
                          <Square className="w-3 h-3 fill-current" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current" />
                          <span>▶ Listen Line</span>
                        </>
                      )}
                    </button>
                    <span className="text-slate-400 text-xs font-mono font-semibold">
                      #{idx + 1}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-mono italic truncate">
                  Source: {segment.sourceText}
                </div>

                <textarea
                  rows={2}
                  value={segment.myanmarText || ''}
                  onChange={(e) => onUpdateMyanmarSegment(segment.id, e.target.value)}
                  className="w-full bg-slate-950/90 rounded-xl p-3 text-xs sm:text-sm text-purple-100 border border-purple-500/25 focus:border-purple-400 focus:outline-none resize-none font-burmese leading-relaxed shadow-inner"
                  placeholder="မြန်မာဘာသာပြန် စာသားကို ဤနေရာတွင် ရေးသားပြင်ဆင်ပါ..."
                />

                {showNormalizedPreview && (
                  <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/20 text-xs text-purple-300 font-burmese">
                    <span className="font-mono text-[10px] uppercase text-purple-400 block font-bold mb-0.5">
                      Phonetic Spoken Output:
                    </span>
                    {normalized}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SELECT VOICE - 40 MODELS GRID (အသံရွေးချယ်ပါ - ၄၀ Models) */}
      {/* ========================================================================= */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-purple-500/20 bg-slate-950/70 shadow-2xl space-y-5">
        {/* SECRET ADMIN ONLY: CUSTOM CLONED NEURAL VOICES */}
        {isCloneAccessible && activeClones.length > 0 && (
          <div className="p-4 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-purple-950/40 space-y-3 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shadow-sm">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-200 font-burmese flex items-center gap-2">
                    <span>👑 Secret Admin Cloned Voices (သီးသန့် Clone အသံများ)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                      {activeClones.length} ACTIVE
                    </span>
                  </h4>
                  <p className="text-[11px] text-amber-400/80 font-burmese">
                    Admin သီးသန့် Audio Profile ဖြင့် Clone ပြုလုပ်ထားသော Neural Voices များ
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {activeClones.map((clone) => {
                const isSelected = clone.id === selectedVoiceId;
                const isMale = clone.gender === 'male';
                const isAuditioning = auditioningVoiceId === clone.id && (isPlayingDirectPreview || isPlayingPreview);
                const cloneVoiceAvatar: BurmeseVoiceAvatar = {
                  id: clone.id,
                  code: 'CLONE',
                  nameBurmese: clone.nameBurmese,
                  nameEnglish: clone.nameEnglish,
                  gender: clone.gender,
                  basePitch: clone.basePitch || 0,
                  basePitchHz: clone.basePitchHz || 0,
                  pitchHz: clone.basePitchHz || 0,
                  baseRate: clone.baseRate || clone.baseRateMultiplier || 1.0,
                  speedMultiplier: clone.baseRateMultiplier || 1.0,
                  voiceName: clone.gender === 'male' ? 'my-MM-ThihaNeural' : 'my-MM-NilarNeural',
                  avatarColor: isMale ? 'from-amber-600 to-orange-700' : 'from-purple-600 to-pink-600',
                  toneCategory: `${clone.timbreCategory || clone.timbreStyle || 'Cloned'} • Custom Profile`,
                  samplePhraseBurmese: clone.samplePhraseBurmese || 'မင်္ဂလာပါ ရုပ်ရှင်ဇာတ်လမ်းပြော စတူဒီယိုမှ ကြိုဆိုပါသည်',
                  category: 'Cloned',
                };

                return (
                  <div
                    key={clone.id}
                    onClick={() => onSelectVoice(clone.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 relative ${
                      isSelected
                        ? 'bg-amber-950/70 border-amber-400 ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/20'
                        : 'bg-slate-900/90 border-amber-500/30 hover:border-amber-400/60 hover:bg-slate-800/90'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-full bg-gradient-to-tr ${
                          isMale ? 'from-amber-500 to-orange-600' : 'from-pink-500 to-purple-600'
                        } flex items-center justify-center font-extrabold text-white text-[11px] shadow-md border border-amber-300/40 flex-shrink-0`}
                      >
                        🎙️
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs font-bold truncate font-burmese ${
                              isSelected ? 'text-amber-200' : 'text-slate-100'
                            }`}
                          >
                            {clone.nameBurmese}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold bg-amber-950 text-amber-300 border border-amber-500/40 flex-shrink-0">
                            {isMale ? 'ကျား' : 'မ'}
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-300/80 truncate font-mono">
                          {clone.timbreCategory || 'Neural Profile'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <button
                        type="button"
                        onClick={(e) => handleAuditionVoice(e, cloneVoiceAvatar)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-burmese flex items-center gap-1.5 transition-all cursor-pointer ${
                          isAuditioning
                            ? 'bg-red-600 hover:bg-red-500 text-white font-bold animate-pulse'
                            : isSelected
                            ? 'bg-amber-600 hover:bg-amber-500 text-black font-bold shadow-md shadow-amber-500/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isAuditioning ? (
                          <>
                            <Square className="w-3 h-3 fill-current" />
                            <span>ရပ်တန့်မည်</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>▶ စမ်းနားထောင်မည်</span>
                          </>
                        )}
                      </button>

                      {isSelected && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                          SELECTED
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-burmese flex items-center gap-2">
                <span>အသံရွေးချယ်ပါ (Select Voice - 40 Models)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 font-mono border border-purple-500/30">
                  40 VOICES
                </span>
              </h3>
              <p className="text-xs text-slate-300 font-burmese mt-0.5">
                အမျိုးသား AI Models ၂၀ နှင့် အမျိုးသမီး AI Models ၂၀ ထဲမှ သင့်တော်ရာ စရိုက်လက္ခဏာကို ရွေးချယ်ပါ
              </p>
            </div>
          </div>

          {/* Pill Filter Tabs: All (40) / Male (20) / Female (20) */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-purple-500/30 text-xs self-start sm:self-auto shadow-sm">
            <button
              type="button"
              onClick={() => setGenderFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all font-burmese cursor-pointer flex items-center gap-1.5 ${
                genderFilter === 'all'
                  ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>အားလုံး (All - {BURMESE_VOICE_AVATARS.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('male')}
              className={`px-3 py-1.5 rounded-lg transition-all font-burmese cursor-pointer flex items-center gap-1.5 ${
                genderFilter === 'male'
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>👨 အမျိုးသား (Male - {maleCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setGenderFilter('female')}
              className={`px-3 py-1.5 rounded-lg transition-all font-burmese cursor-pointer flex items-center gap-1.5 ${
                genderFilter === 'female'
                  ? 'bg-pink-600 text-white font-bold shadow-md shadow-pink-600/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>👩 အမျိုးသမီး (Female - {femaleCount})</span>
            </button>
          </div>
        </div>

        {/* 40 Voice Models Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[380px] overflow-y-auto pr-1.5 custom-scrollbar">
          {filteredVoices.map((voice) => {
            const isSelected = voice.id === selectedVoiceId;
            const isMale = voice.gender === 'male';
            const isAuditioning = auditioningVoiceId === voice.id && (isPlayingDirectPreview || isPlayingPreview);

            return (
              <div
                key={voice.id}
                id={`voice-card-${voice.code.toLowerCase()}-${voice.id}`}
                onClick={() => onSelectVoice(voice.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 relative group ${
                  isSelected
                    ? 'bg-purple-950/60 border-purple-400 ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/25'
                    : 'bg-slate-900/80 border-white/10 hover:border-purple-500/40 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {/* Avatar Code Circle (Male = Blue, Female = Pink/Purple) */}
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-tr ${voice.avatarColor} flex items-center justify-center font-extrabold text-white text-xs shadow-md border ${
                      isMale ? 'border-blue-300/40 shadow-blue-500/20' : 'border-pink-300/40 shadow-pink-500/20'
                    } flex-shrink-0`}
                  >
                    {voice.code}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs font-bold truncate font-burmese ${
                          isSelected ? 'text-purple-200' : 'text-slate-200 group-hover:text-white'
                        }`}
                      >
                        {voice.nameBurmese} ({voice.code})
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold flex-shrink-0 ${
                          isMale
                            ? 'bg-blue-950/80 text-blue-300 border border-blue-500/30'
                            : 'bg-pink-950/80 text-pink-300 border border-pink-500/30'
                        }`}
                      >
                        {isMale ? 'ကျား' : 'မ'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 font-burmese">
                      {voice.toneCategory}
                    </p>
                  </div>
                </div>

                {/* Quick Audition Button for all 40 voices */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <button
                    type="button"
                    onClick={(e) => handleAuditionVoice(e, voice)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-burmese flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                      isAuditioning
                        ? 'bg-red-600 hover:bg-red-500 text-white font-bold animate-pulse'
                        : isSelected
                        ? 'bg-purple-600 hover:bg-purple-500 text-white font-semibold'
                        : 'bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/25'
                    }`}
                  >
                    {isAuditioning ? (
                      <>
                        <Square className="w-3 h-3 fill-current" />
                        <span>ရပ်တန့်မည်</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>▶ စမ်းနားထောင်မည်</span>
                      </>
                    )}
                  </button>

                  {isSelected && (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-purple-400 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                      SELECTED
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Pitch Offset & Voice Tuning Controls */}
        <div className="pt-4 border-t border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              <h4 className="text-sm font-bold text-white font-burmese">
                Voice Tuning Controls (အသံချိန်ညှိမှု)
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-burmese text-purple-300 font-semibold px-2.5 py-1 rounded-lg bg-purple-950/70 border border-purple-500/30 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                ရွေးချယ်ထားသော အသံ: {selectedVoice.nameBurmese} ({selectedVoice.code} - {selectedVoice.gender === 'male' ? 'ကျား' : 'မ'})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Slider 1: ဝါး/ကြည် (Pitch Offset) Slider (-30Hz to +30Hz) */}
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/90 border border-purple-500/20 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="pitch-offset-slider"
                  className="font-burmese font-semibold text-slate-200 flex items-center gap-1.5"
                >
                  <span>ဝါး/ကြည် (Pitch Offset)</span>
                  <span className="text-[10px] text-purple-400 font-mono">(-30Hz to +30Hz)</span>
                </label>
                <span className="font-mono font-bold text-purple-300 px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/30">
                  {pitchOffset > 0 ? `+${pitchOffset}` : pitchOffset} Hz
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 font-burmese">ဝါး/နက် (Deep)</span>
                <input
                  id="pitch-offset-slider"
                  type="range"
                  min={-30}
                  max={30}
                  step={1}
                  value={pitchOffset}
                  onChange={(e) => onChangePitch(Number(e.target.value))}
                  className="flex-1 accent-purple-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <span className="text-[10px] text-slate-400 font-burmese">ကြည်/စူး (Crisp)</span>
              </div>
            </div>

            {/* Slider 2: Speed / Pacing Multiplier */}
            <div className="space-y-2 p-3.5 rounded-xl bg-slate-900/90 border border-purple-500/20 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="voice-speed-slider"
                  className="font-burmese font-semibold text-slate-200 flex items-center gap-1.5"
                >
                  <span>အမြန်နှုန်း (Pacing Multiplier)</span>
                  <span className="text-[10px] text-purple-400 font-mono">(0.8x to 1.4x)</span>
                </label>
                <span className="font-mono font-bold text-purple-300 px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/30">
                  {speedMultiplier.toFixed(2)}x
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 font-mono">0.8x</span>
                <input
                  id="voice-speed-slider"
                  type="range"
                  min={0.8}
                  max={1.4}
                  step={0.05}
                  value={speedMultiplier}
                  onChange={(e) => onChangeSpeed(Number(e.target.value))}
                  className="flex-1 accent-purple-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <span className="text-[10px] text-slate-400 font-mono">1.4x</span>
              </div>
            </div>
          </div>

          {/* Sample phrase preview & Preview Button */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono text-purple-400 font-bold">
                <Headphones className="w-3.5 h-3.5" />
                <span>Sample Spoken Phrase ({selectedVoice.nameBurmese}):</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 font-burmese truncate mt-1">
                "{selectedVoice.samplePhraseBurmese}"
              </p>
            </div>

            <button
              id="voice-preview-btn"
              type="button"
              onClick={handleToggleMainPreview}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer flex-shrink-0 shadow-lg ${
                (isPlayingDirectPreview || isPlayingPreview) && !playingSegmentId && !auditioningVoiceId
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                  : 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white border border-purple-400/40 shadow-purple-600/30'
              }`}
            >
              {(isPlayingDirectPreview || isPlayingPreview) && !playingSegmentId && !auditioningVoiceId ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>ရပ်တန့်မည်</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>▶ အသံစမ်းနားထောင်မည်</span>
                </>
              )}
            </button>
          </div>

          {/* Action Button: Step 3: အသံဖန်တီးမည် ▶ */}
          <button
            id="step-3-synthesize-voice-btn"
            disabled={isSynthesizingVoice}
            onClick={onStartVoiceSynthesis}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:via-fuchsia-500 hover:to-indigo-500 text-white font-bold text-sm sm:text-base tracking-wide shadow-xl shadow-purple-600/35 border border-purple-300/40 flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSynthesizingVoice ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin text-purple-200" />
                <span className="font-burmese">အသံဖိုင်ကို ပေါင်းစပ်ထုတ်လုပ်နေပါသည်...</span>
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5" />
                <span>Step 3: အသံဖန်တီးမည် ▶</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
