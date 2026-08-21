/**
 * Myanmar (Burmese) Phonetic & Text Normalization Engine
 * Converts numbers, acronyms, English loanwords, and punctuation into natural spoken Burmese phonetics
 * and prosodic phrase chunks with natural respiration pauses.
 */

// Common English Loanwords & Acronyms mapping to Spoken Burmese Phonetics
const ENGLISH_PHONETIC_MAP: Record<string, string> = {
  // Acronyms
  'ai': 'အေအိုင်',
  'a.i.': 'အေအိုင်',
  'fbi': 'အက်ဖ်ဘီအိုင်',
  'cia': 'စီအိုင်အေ',
  'swat': 'ဆွတ် အထူးတပ်ဖွဲ့',
  'vip': 'ဗွီအိုင်ပီ',
  'dna': 'ဒီအင်န်အေ',
  'ok': 'အိုကေ',
  'okay': 'အိုကေ',
  '3d': 'သရီးဒီ',
  '2d': 'တူးဒီ',
  '4k': 'ဖိုးကေ',
  'hd': 'အိတ်ချ်ဒီ',
  'usb': 'ယူအက်စ်ဘီ',
  'pc': 'ပီစီ',
  'gps': 'ဂျီပီအက်စ်',
  'id': 'အိုင်ဒီ',
  'cctv': 'စီစီတီဗွီ',
  'tv': 'တီဗွီ',
  'boss': 'ဘော့စ်',
  'channel': 'ချန်နယ်',
  'py channel': 'ပီဝိုင် ချန်နယ်',
  'py': 'ပီဝိုင်',
  'youtube': 'ယူကျုဘ်',
  'facebook': 'ဖေ့စ်ဘွတ်ခ်',
  'tiktok': 'တစ်တော့ခ်',
  'like': 'လိုက်ခ်',
  'subscribe': 'ဆပ်စခရိုက်ဘ်',
  'share': 'ရှယ်ယာ',
  'comment': 'ကွန်မန့်',
  'hack': 'ဟက်ခ်',
  'hacker': 'ဟက်ကာ',
  'robot': 'ရိုဘော့တ်',
  'cyborg': 'ဆိုင်ဘော့ဂ်',
  'cyber': 'ဆိုက်ဘာ',
  'drone': 'ဒရုန်း',
  'gun': 'ဂန်း',
  'drive': 'ဒရိုက်ဗ်',
  'system': 'စစ်စတမ်',
  'team': 'တီးမ်',
  'base': 'ဘေ့စ်',
  'code': 'ကုဒ်',
  'game': 'ဂိမ်း',
  'pro': 'ပရို',
  'king': 'ကင်း',
  'hero': 'ဟီးရိုး',
  'villain': 'ဗီလိန်',
  'virus': 'ဗိုင်းရပ်စ်',
  'data': 'ဒေတာ',
  'target': 'တာဂတ်',
  'agent': 'အေးဂျင့်',
  'bomb': 'ဗုံး',
  'car': 'ကား',
  'super': 'စူပါ',
  'monster': 'မွန်းစတား',
  'zombie': 'ဇွန်ဘီ',
  'level': 'လက်ဗယ်',
  'mission': 'မစ်ရှင်',
  'sniper': 'စနိုက်ပါ',
  'matrix': 'မက်ထရစ်',
  'action': 'အက်ရှင်',
  'recap': 'ရီကပ်',
  'movie': 'ရုပ်ရှင်',
  'trailer': 'ထရဲလား',
  'teaser': 'တီးဇား',
  'secret': 'လျှို့ဝှက်ချက်',
  'scene': 'ဇာတ်ဝင်ခန်း',
  'story': 'ဇာတ်လမ်း',
  'police': 'ရဲအဖွဲ့',
  'killer': 'လူသတ်သမား',
  'gangster': 'လူဆိုးဂိုဏ်း',
  'money': 'ပိုက်ဆံ',
  'diamond': 'စိန်',
  'gold': 'ရွှေ',
  'alien': 'ဂြိုဟ်သား',
  'space': 'အာကာသ',
  'magic': 'မှော်ပညာ',
};

// Burmese Digit to Word Mapping
const BURMESE_DIGITS: Record<string, string> = {
  '၀': 'သုည',
  '၁': 'တစ်',
  '၂': 'နှစ်',
  '၃': 'သုံး',
  '၄': 'လေး',
  '၅': 'ငါး',
  '၆': 'ခြောက်',
  '၇': 'ခုနစ်',
  '၈': 'ရှစ်',
  '၉': 'ကိုး',
};

const LATIN_DIGITS: Record<string, string> = {
  '0': 'သုည',
  '1': 'တစ်',
  '2': 'နှစ်',
  '3': 'သုံး',
  '4': 'လေး',
  '5': 'ငါး',
  '6': 'ခြောက်',
  '7': 'ခုနစ်',
  '8': 'ရှစ်',
  '9': 'ကိုး',
};

/**
 * Convert small or large integers into natural spoken Burmese number text
 */
export function convertNumberToBurmeseSpoken(numStr: string): string {
  const num = parseInt(numStr, 10);
  if (isNaN(num)) return numStr;

  if (num === 0) return 'သုည';
  if (num === 1) return 'တစ်';
  if (num === 2) return 'နှစ်';
  if (num === 3) return 'သုံး';
  if (num === 4) return 'လေး';
  if (num === 5) return 'ငါး';
  if (num === 6) return 'ခြောက်';
  if (num === 7) return 'ခုနစ်';
  if (num === 8) return 'ရှစ်';
  if (num === 9) return 'ကိုး';
  if (num === 10) return 'ဆယ်';
  if (num === 11) return 'ဆယ့်တစ်';
  if (num === 12) return 'ဆယ့်နှစ်';
  if (num === 13) return 'ဆယ့်သုံး';
  if (num === 14) return 'ဆယ့်လေး';
  if (num === 15) return 'ဆယ့်ငါး';
  if (num === 16) return 'ဆယ့်ခြောက်';
  if (num === 17) return 'ဆယ့်ခုနစ်';
  if (num === 18) return 'ဆယ့်ရှစ်';
  if (num === 19) return 'ဆယ့်ကိုး';
  if (num === 20) return 'နှစ်ဆယ်';
  if (num === 30) return 'သုံးဆယ်';
  if (num === 40) return 'လေးဆယ်';
  if (num === 50) return 'ငါးဆယ်';
  if (num === 60) return 'ခြောက်ဆယ်';
  if (num === 70) return 'ခုနစ်ဆယ်';
  if (num === 80) return 'ရှစ်ဆယ်';
  if (num === 90) return 'ကိုးဆယ်';
  if (num === 100) return 'တစ်ရာ';
  if (num === 1000) return 'တစ်ထောင်';
  if (num === 10000) return 'တစ်သောင်း';
  if (num === 100000) return 'တစ်သိန်း';
  if (num === 1000000) return 'တစ်သန်း';

  // 21 - 99
  if (num > 20 && num < 100) {
    const tens = Math.floor(num / 10);
    const units = num % 10;
    const tensMap: Record<number, string> = {
      2: 'နှစ်ဆယ့်',
      3: 'သုံးဆယ့်',
      4: 'လေးဆယ့်',
      5: 'ငါးဆယ့်',
      6: 'ခြောက်ဆယ့်',
      7: 'ခုနစ်ဆယ့်',
      8: 'ရှစ်ဆယ့်',
      9: 'ကိုးဆယ့်',
    };
    return `${tensMap[tens]}${units > 0 ? LATIN_DIGITS[units.toString()] : ''}`;
  }

  // 101 - 999
  if (num > 100 && num < 1000) {
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    const hundredsPrefix = hundreds === 1 ? 'တစ်ရာ' : `${LATIN_DIGITS[hundreds.toString()]}ရာ`;
    if (remainder === 0) return hundredsPrefix;
    return `${hundredsPrefix} ${convertNumberToBurmeseSpoken(remainder.toString())}`;
  }

  // 1000 - 9999 (e.g. Years: 2025 -> နှစ်ထောင့်နှစ်ဆယ့်ငါး)
  if (num >= 1000 && num <= 9999) {
    const thousands = Math.floor(num / 1000);
    const rem = num % 1000;
    const prefix = thousands === 1 ? 'တစ်ထောင့်' : `${LATIN_DIGITS[thousands.toString()]}ထောင့်`;
    if (rem === 0) return thousands === 1 ? 'တစ်ထောင်' : `${LATIN_DIGITS[thousands.toString()]}ထောင်`;
    return `${prefix}${convertNumberToBurmeseSpoken(rem.toString())}`;
  }

  // Fallback: digit by digit spoken
  return numStr
    .split('')
    .map((d) => LATIN_DIGITS[d] || BURMESE_DIGITS[d] || d)
    .join(' ');
}

/**
 * Full Text Normalization for Spoken Burmese TTS:
 * 1. Expand ordinal numbers (1st, 2nd, 3rd, 1st time, etc.)
 * 2. Expand percentages (50% -> ငါးဆယ်ရာခိုင်နှုန်း)
 * 3. Convert all Arabic/Burmese numbers to natural spoken text
 * 4. Replace English words & acronyms with natural Burmese phonetics
 * 5. Smooth written Burmese grammar particles into colloquial spoken Burmese
 * 6. Format punctuation for rhythmic breath pauses
 */
export function normalizeMyanmarForTTS(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. Convert Ordinals & Percentages
  text = text.replace(/(\d+)\s*%/g, (_, num) => `${convertNumberToBurmeseSpoken(num)} ရာခိုင်နှုန်း`);
  text = text.replace(/1st/gi, 'ပထမ');
  text = text.replace(/2nd/gi, 'ဒုတိယ');
  text = text.replace(/3rd/gi, 'တတိယ');
  text = text.replace(/4th/gi, 'စတုတ္ထ');
  text = text.replace(/5th/gi, 'ပဉ္စမ');

  // 2. Burmese Digit Conversion (၀-၉ to spoken text)
  text = text.replace(/[၀-၉]+/g, (match) => {
    // Map burmese numerals to arabic digits first
    const arabic = match
      .split('')
      .map((c) => {
        const idx = '၀၁၂၃၄၅၆၇၈၉'.indexOf(c);
        return idx !== -1 ? idx.toString() : c;
      })
      .join('');
    return convertNumberToBurmeseSpoken(arabic);
  });

  // 3. Arabic Numbers to Spoken Burmese
  text = text.replace(/\b\d+\b/g, (match) => convertNumberToBurmeseSpoken(match));

  // 4. English Loanwords and Acronyms replacement (case-insensitive)
  // Match multi-word first (e.g. 'py channel')
  Object.keys(ENGLISH_PHONETIC_MAP)
    .sort((a, b) => b.length - a.length)
    .forEach((key) => {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      text = text.replace(regex, ENGLISH_PHONETIC_MAP[key]);
    });

  // 5. Written Burmese to Natural Spoken Burmese smoothing for TTS
  // E.g. formal "သည်" -> "တယ်", "၏" -> "ရဲ့", "၌" -> "မှာ", "လျက်" -> "ပြီး"
  text = text.replace(/\s+သည်\b/g, ' တယ်');
  text = text.replace(/\s+ပေသည်\b/g, ' ပါတယ်');
  text = text.replace(/\s+သတည်း\b/g, ' ပါပြီ');
  text = text.replace(/\s+၏\s+/g, ' ရဲ့ ');
  text = text.replace(/\s+၌\s+/g, ' မှာ ');
  text = text.replace(/\s+လျက်\s+/g, ' ပြီးတော့ ');
  text = text.replace(/\s+ရာတွင်\s+/g, ' တဲ့အခါမှာ ');

  // 6. Clean multiple spaces
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

export interface ProsodicPhrase {
  text: string;
  pauseDurationMs: number; // 80ms - 200ms natural respiration pause
  isSectionEnd: boolean;
}

/**
 * Splits normalized Burmese text into natural prosodic phrases based on
 * Burmese commas (၊) and full stops (။) with precise breath pause timings.
 */
export function splitIntoProsodicPhrases(rawText: string): ProsodicPhrase[] {
  const normalized = normalizeMyanmarForTTS(rawText);
  if (!normalized) return [];

  // Match segments separated by ၊ (comma pause ~100ms) or ။ (sentence stop ~200ms)
  const tokens = normalized.split(/([၊။,.\n!]+)/);
  const phrases: ProsodicPhrase[] = [];

  let currentChunk = '';

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === '၊' || token === ',') {
      if (currentChunk.trim()) {
        phrases.push({
          text: currentChunk.trim(),
          pauseDurationMs: 100, // Natural mid-sentence respiration pause
          isSectionEnd: false,
        });
        currentChunk = '';
      }
    } else if (token === '။' || token === '.' || token === '!' || token === '\n') {
      if (currentChunk.trim()) {
        phrases.push({
          text: currentChunk.trim(),
          pauseDurationMs: 200, // Full stop sentence cadence pause
          isSectionEnd: true,
        });
        currentChunk = '';
      }
    } else {
      currentChunk += token;
    }
  }

  if (currentChunk.trim()) {
    phrases.push({
      text: currentChunk.trim(),
      pauseDurationMs: 150,
      isSectionEnd: true,
    });
  }

  return phrases.length > 0 ? phrases : [{ text: normalized, pauseDurationMs: 100, isSectionEnd: true }];
}

