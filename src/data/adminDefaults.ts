import { AdminConfig } from '../types';

export const STRICT_TRANSLATION_SYSTEM_PROMPT = `You are an expert Myanmar translator for movie recaps. Translate the given English transcript segments accurately and completely into fluent, natural Myanmar. Do not truncate, alter meaning, or output broken sentences.

CRITICAL TRANSLATION & SCRIPT DIRECTIVES:
1. STRICT SENTENCE-BY-SENTENCE ACCURACY:
   - Faithfully translate every dialogue line and narration segment into natural spoken Myanmar.
   - Do NOT summarize, skip lines, truncate sentences, alter the storyline, or invent/hallucinate scenes.
   - Match the exact context, emotion, and character intent of the source English dialogue.

2. PURE SPOKEN BURMESE WITH PROSODIC NATURAL PACING:
   - Use natural spoken Burmese conversational endings and particles: "တယ်", "ပါတယ်", "သွားတယ်", "ဖြစ်သွားတယ်", "လိုက်တယ်", "နေတယ်", "ရတော့မယ်", "ပေါ့နော်".
   - Strictly prohibit archaic formal written grammar (e.g. NEVER use "သည်", "ပေသည်", "သတည်း", "လျက်", "ရာတွင်", "၌", "၏").
   - Insert Burmese comma (၊) for natural 80-120ms breathing pauses and Burmese full stop (။) for cadence closure.

3. STRICT JSON SCHEMA OUTPUT:
   Return ONLY a clean JSON object containing the translations array without markdown backticks or commentary.`;

export const SYSTEM_PROMPT_PRESETS = {
  cinematic_hype: {
    name: 'ရုပ်ရှင်ရီကပ် ဘာသာပြန်စနစ် (Accurate Myanmar Movie Recap)',
    prompt: STRICT_TRANSLATION_SYSTEM_PROMPT,
  },
  dramatic_story: {
    name: 'ရသမြောက် & ခံစားချက်ဒရာမာ (Emotional Cinematic Drama)',
    prompt: `You are an expert Myanmar translator for movie recaps. Translate the given English transcript segments accurately and completely into fluent, natural Myanmar. Do not truncate, alter meaning, or output broken sentences.
1. Translate accurately sentence by sentence without skipping narrative points.
2. Maintain a dramatic, heartfelt, and cinematic tone with captivating spoken Burmese particles.
3. Ban all archaic bookish endings ("သည်", "၏", "၌", "သတည်း").
4. Insert Burmese comma (၊) for gentle breathing pauses and full stop (။) for sentence closures.
5. Return ONLY JSON matching schema: {"translations": [{"id": "segment-id", "myanmarText": "..."}]}`,
  },
  fast_comedy: {
    name: 'ဟာသ & အမြန်ရီကပ် (Fast Comedy & Action Recap)',
    prompt: `You are an expert Myanmar translator for movie recaps. Translate the given English transcript segments accurately and completely into fluent, natural Myanmar. Do not truncate, alter meaning, or output broken sentences.
1. Write punchy, funny, highly engaging casual youth-spoken Burmese ("ဗျာ", "ဗျို့", "နော်", "တကယ်ပါပဲ", "မလွယ်ဘူး") with comedic timing.
2. Keep sentences fast, direct, and concise with natural pacing without altering the original plot.
3. Ban formal book grammar entirely.
4. Insert comma (၊) and full stop (။) for natural conversational breathing pauses.
5. Return ONLY JSON matching schema: {"translations": [{"id": "segment-id", "myanmarText": "..."}]}`,
  },
  suspense_horror: {
    name: 'သည်းထိတ်ရင်ဖို & သရဲကား (Dark Suspense & Horror Recap)',
    prompt: `You are an expert Myanmar translator for movie recaps. Translate the given English transcript segments accurately and completely into fluent, natural Myanmar. Do not truncate, alter meaning, or output broken sentences.
1. Translate accurately without hallucinations or narrative alterations.
2. Use eerie pacing, mysterious tension, and natural spoken Burmese.
3. Use comma (၊) for building dramatic suspense pauses and full stop (။) for closures.
4. Ban archaic bookish words.
5. Return ONLY JSON matching schema: {"translations": [{"id": "segment-id", "myanmarText": "..."}]}`,
  },
};

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  maintenanceMode: false,
  maintenanceNotice: '🛠️ စနစ် အဆင့်မြှင့်တင်နေပါသည် (Under Maintenance) - မကြာမီ ပြန်လည် ဖွင့်လှစ်ပါမည်။ ရုပ်ရှင်ချစ်သူများအတွက် အသံသစ်များနှင့် စွမ်းဆောင်ရည်မြှင့်တင်မှုများ ထည့်သွင်းနေပါသဖြင့် ခေတ္တ စောင့်ဆိုင်းပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။',
  assemblyMasterKey: '',
  geminiMasterKey: '',
  geminiModel: 'gemini-3.7-flash',
  systemPrompt: STRICT_TRANSLATION_SYSTEM_PROMPT,
  systemPromptPreset: 'cinematic_hype',
  globalSpeed: 1.0,
  globalPitchHz: 0,
  commaPauseMs: 85,
  periodPauseMs: 180,
  kpayEnabled: true,
  wavepayEnabled: false,
  adminPin: '778899',
  showVoiceClone: false, // Internal feature flag - hidden from standard users by default
  clonedVoices: [
    {
      id: 'clone-voice-host-1',
      code: 'CL1',
      nameEnglish: 'pY Host Master (Cloned)',
      nameBurmese: 'pY Channel ပင်တိုင်တင်ဆက်သူ (Cloned AI)',
      gender: 'male',
      voiceName: 'my-MM-ThihaNeural',
      voiceModel: 'my-MM-ThihaNeural',
      toneCategory: 'လျှို့ဝှက်ဆန်းကြယ် ရုပ်ရှင်ရီကပ် အထူးသံ (Admin Cloned)',
      description: 'ရုပ်ရှင်ရီကပ် ပင်တိုင်တင်ဆက်သူ၏ အသံနေအထားအတိုင်း အသံသြဇာနှင့် အသက်ရှူသံထိန်းညှိထားသော Cloned Voice Profile',
      basePitch: -0.06,
      basePitchHz: -4,
      baseRate: 1.02,
      avatarColor: 'from-amber-600 via-purple-600 to-indigo-700',
      samplePhraseBurmese: 'မင်္ဂလာပါ ခင်ဗျာ... pY Channel ရဲ့ သီးသန့် Cloned Voice စမ်းသပ်မှုမှ ကြိုဆိုပါတယ်။ ဇာတ်လမ်းရဲ့ အလှည့်အပြောင်းကို ဆက်လက် နားဆင်ပေးကြပါဦး။',
      timbreStyle: 'dramatic_cinematic',
      createdAt: 1724490000000,
      isActiveInStudio: true,
    },
  ],
  verificationRequests: [
    {
      id: 'req-demo-1',
      userEmail: 'pychannel1years@gmail.com',
      customerPhone: '09-778948352',
      transactionRef: 'KPay-8352',
      paymentMethod: 'kpay',
      planId: 'standard',
      amountMmk: 10000,
      submittedAt: '2026-08-21 14:20',
      status: 'pending',
    },
    {
      id: 'req-demo-2',
      userEmail: 'mgmg.recap@gmail.com',
      customerPhone: '09-952114789',
      transactionRef: 'KPay-4125',
      paymentMethod: 'kpay',
      planId: 'unlimited_pro',
      amountMmk: 20000,
      submittedAt: '2026-08-20 18:45',
      status: 'approved',
    },
  ],
};

const STORAGE_KEY = 'pychannel_admin_config_v2';

export function loadAdminConfig(): AdminConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ADMIN_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_ADMIN_CONFIG, ...parsed };
  } catch {
    return DEFAULT_ADMIN_CONFIG;
  }
}

export function saveAdminConfig(config: AdminConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save admin config to localStorage', e);
  }
}
