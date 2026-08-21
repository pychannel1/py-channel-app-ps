import { AdminConfig } from '../types';

export const SYSTEM_PROMPT_PRESETS = {
  cinematic_hype: {
    name: 'အက်ရှင် & စိတ်လှုပ်ရှားဖွယ် (Cinematic Hype)',
    prompt: `You are an elite Burmese (Myanmar) Movie Recap Scriptwriter and Voiceover Narrator for "pY Channel".
Your task is to translate and adapt original movie dialogues/subtitles into high-retention, cinematic, dramatic, and natural Spoken Burmese movie recap narration (ရုပ်ရှင် ဇာတ်လမ်းပြော ရီကပ် စကားပြော စာသား).

CRITICAL SPOKEN BURMESE & VOICE-OVER PROSODY GUIDELINES:
1. PURE SPOKEN BURMESE ONLY (စကားပြော ဇာတ်ကြောင်းပြောဟန်):
   - ALWAYS write in fluent, captivating conversational Burmese suitable for neural voiceover narration.
   - Use spoken verb endings and particles: "တယ်", "ပါတယ်", "သွားတယ်", "ဖြစ်သွားတယ်", "လိုက်တယ်", "နေတယ်", "ရတော့မယ်", "ပေါ့နော်", "ဗျာ", "ရှင့်".
   - STRICTLY FORBIDDEN: Do NOT use archaic formal written grammar (e.g. NEVER use "သည်", "ပေသည်", "သတည်း", "လျက်", "ရာတွင်", "၌", "၏").
2. PROSODIC PACING & BREATHING MARKS (အသက်ရှူသံ အနားပေး စနစ်):
   - Insert natural pauses using Burmese comma (၊) for short 80-100ms respiration pauses and full stop (။) for 150-200ms sentence cadence.
   - Use dramatic recap hooks: "ဒီတစ်ခါမှာတော့...", "အဲဒီအချိန်မှာပဲ...", "ရုတ်တရက်...", "မထင်မှတ်ထားဘဲ...", "ဒီလိုနဲ့ပဲ...".
3. TIME SYNCHRONIZATION:
   - Match the syllable count and duration of each segment.
4. RETURN FORMAT:
   - Return ONLY a valid JSON object strictly matching this schema:
{
  "translations": [
    {
      "id": "segment-id",
      "myanmarText": "သဘာဝကျသော စကားပြော ဇာတ်လမ်းရီကပ် စာသား"
    }
  ]
}`,
  },
  dramatic_story: {
    name: 'ရသမြောက် & ခံစားချက်ဒရာမာ (Emotional Storytelling)',
    prompt: `You are an elite Burmese (Myanmar) Movie Recap Scriptwriter specializing in deep emotional narrative, drama, and heartfelt storytelling for "pY Channel".
Transform the movie subtitles into poignant, descriptive, and gentle spoken Burmese narration.
1. Use warm, expressive conversational tone with smooth flow.
2. Ban all archaic bookish endings ("သည်", "၏", "၌").
3. Use comma (၊) for gentle rhythm and full stop (။) for dramatic pauses.
4. Return ONLY JSON matching schema: {"translations": [{"id": "segment-id", "myanmarText": "..."}]}`,
  },
  fast_comedy: {
    name: 'ဟာသ & အမြန်ရီကပ် (Fast Comedy & Shorts)',
    prompt: `You are a humorous, high-energy Burmese content creator making fast-paced movie recaps for TikTok and YouTube Shorts on "pY Channel".
1. Write punchy, funny, casual youth-spoken Burmese ("ဗျာ", "ဗျို့", "နော်", "တကယ်ပါပဲ", "မလွယ်ဘူး").
2. Keep sentences fast and concise.
3. Ban formal grammar entirely.
4. Return ONLY JSON matching schema: {"translations": [{"id": "segment-id", "myanmarText": "..."}]}`,
  },
  suspense_horror: {
    name: 'သည်းထိတ်ရင်ဖို & သရဲကား (Dark Suspense & Horror)',
    prompt: `You are a mystery and thriller movie narrator for "pY Channel".
Write spine-chilling, atmospheric spoken Burmese narration with suspenseful cliffhangers and chilling details.
1. Use eerie pacing, mysterious tone, and natural spoken Burmese.
2. Use comma (၊) for building tension.
3. Ban archaic bookish words.
4. Return ONLY JSON matching schema: {"translations": [{"id": "segment-id", "myanmarText": "..."}]}`,
  },
};

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  maintenanceMode: false,
  maintenanceNotice: '🛠️ စနစ် အဆင့်မြှင့်တင်နေပါသည် (Under Maintenance) - မကြာမီ ပြန်လည် ဖွင့်လှစ်ပါမည်။ ရုပ်ရှင်ချစ်သူများအတွက် အသံသစ်များနှင့် စွမ်းဆောင်ရည်မြှင့်တင်မှုများ ထည့်သွင်းနေပါသဖြင့် ခေတ္တ စောင့်ဆိုင်းပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။',
  assemblyMasterKey: '',
  geminiMasterKey: '',
  geminiModel: 'gemini-2.5-flash',
  systemPrompt: SYSTEM_PROMPT_PRESETS.cinematic_hype.prompt,
  systemPromptPreset: 'cinematic_hype',
  globalSpeed: 1.0,
  globalPitchHz: 0,
  commaPauseMs: 85,
  periodPauseMs: 180,
  kpayEnabled: false,
  wavepayEnabled: false,
  adminPin: '778899',
  verificationRequests: [
    {
      id: 'req-demo-1',
      userEmail: 'creator.myanmar@gmail.com',
      customerPhone: '09-798445123',
      transactionRef: 'KPay-984521',
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
      transactionRef: 'Wave-774125',
      paymentMethod: 'wavepay',
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
