import { BurmeseVoiceAvatar, TranscriptSegment } from '../types';
import { BURMESE_VOICE_AVATARS } from '../data/burmeseVoices';
import { normalizeMyanmarForTTS } from './myanmarTextNormalizer';

let audioCtx: AudioContext | null = null;
let currentActiveAudio: HTMLAudioElement | null = null;

/**
 * Universal Shared Audio Element to guarantee gesture-unlocked playback on Mobile Chrome/Safari/WebView
 */
let sharedPreviewAudio: HTMLAudioElement | null = null;

function getSharedPreviewAudio(): HTMLAudioElement {
  if (!sharedPreviewAudio) {
    sharedPreviewAudio = new Audio();
    sharedPreviewAudio.crossOrigin = 'anonymous';
    sharedPreviewAudio.preload = 'auto';
  }
  return sharedPreviewAudio;
}

/**
 * Robust Audio Unlock for Web Audio / HTML5 Audio (Browser Autoplay Compliance)
 * Ensures AudioContext is created and immediately resumed during user gestures.
 */
export async function unlockAudioContext(): Promise<AudioContext> {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (e) {
      console.warn('AudioContext resume exception:', e);
    }
  }

  // Pre-unlock shared HTML5 audio element
  try {
    const audio = getSharedPreviewAudio();
    if (!audio.src) {
      // Tiny silent wav data URI to warm up browser audio pipeline
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      audio.volume = 1.0;
      audio.muted = false;
      audio.play().catch(() => {});
      audio.pause();
    }
  } catch {}

  return audioCtx;
}

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch((e) => console.warn('AudioContext resume exception:', e));
  }
  return audioCtx;
}

export interface GeneratedAudioResult {
  blob: Blob;
  blobUrl: string;
  mimeType: string;
  durationSeconds?: number;
}

/**
 * Generates authentic Burmese Neural Speech as a persistent, playable Blob & Blob URL.
 * Strictly outputted with MIME type 'audio/mpeg' (MP3) or browser-supported container.
 */
export async function generateBurmeseAudioBlob({
  text,
  voice,
  pitchOffsetHz = 0,
  speedMultiplier = 1.0,
}: {
  text: string;
  voice: BurmeseVoiceAvatar;
  pitchOffsetHz?: number;
  speedMultiplier?: number;
}): Promise<GeneratedAudioResult> {
  const normalizedText = normalizeMyanmarForTTS(text);

  // 1. Try server POST endpoint
  try {
    const resp = await fetch('/api/synthesize-burmese-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: normalizedText,
        voiceId: voice.id,
        gender: voice.gender,
        voiceName: voice.voiceName || voice.voiceModel,
        voiceModel: voice.voiceModel || voice.voiceName,
        basePitchHz: voice.basePitchHz,
        pitchOffset: pitchOffsetHz,
        speedMultiplier: speedMultiplier,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.audioBase64) {
        const base64Data = data.audioBase64.includes(',')
          ? data.audioBase64.split(',')[1]
          : data.audioBase64;
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Strict MP3 MIME type
        const audioBlob = new Blob([bytes.buffer], { type: 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(audioBlob);

        return {
          blob: audioBlob,
          blobUrl,
          mimeType: 'audio/mpeg',
        };
      }
    }
  } catch (err) {
    console.warn('Server TTS POST failed, trying server streaming fetch:', err);
  }

  // 2. Fallback: Server Stream GET Endpoint
  try {
    const streamUrl = `/api/stream-tts?text=${encodeURIComponent(
      normalizedText
    )}&gender=${encodeURIComponent(voice.gender)}&voiceId=${encodeURIComponent(
      voice.id
    )}&pitchOffset=${pitchOffsetHz}&speedMultiplier=${speedMultiplier}`;

    const streamResp = await fetch(streamUrl);
    if (streamResp.ok) {
      const arrayBuf = await streamResp.arrayBuffer();
      if (arrayBuf.byteLength > 50) {
        const audioBlob = new Blob([arrayBuf], { type: 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(audioBlob);
        return {
          blob: audioBlob,
          blobUrl,
          mimeType: 'audio/mpeg',
        };
      }
    }
  } catch (fallbackErr) {
    console.warn('Server stream fetch error:', fallbackErr);
  }

  // 3. Fallback: Multi-CDN Google Stream Fetch
  try {
    const cleanSlice = normalizedText.slice(0, 180).trim();
    const encoded = encodeURIComponent(cleanSlice);
    const googleStreamUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=my&q=${encoded}`;
    const directResp = await fetch(googleStreamUrl);
    if (directResp.ok) {
      const arrayBuf = await directResp.arrayBuffer();
      if (arrayBuf.byteLength > 50) {
        const audioBlob = new Blob([arrayBuf], { type: 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(audioBlob);
        return {
          blob: audioBlob,
          blobUrl,
          mimeType: 'audio/mpeg',
        };
      }
    }
  } catch (directErr) {
    console.warn('Multi-CDN Direct stream fetch error:', directErr);
  }

  // Final Empty Safe Blob to prevent crashes
  const fallbackBlob = new Blob([], { type: 'audio/mpeg' });
  return {
    blob: fallbackBlob,
    blobUrl: '',
    mimeType: 'audio/mpeg',
  };
}

/**
 * Builds multi-CDN streaming audio sources for zero-fail Myanmar audio playback
 */
function getMultiCdnMyanmarAudioUrls(
  text: string,
  voice?: BurmeseVoiceAvatar,
  speed: number = 1.0,
  pitchOffsetHz: number = 0
): string[] {
  const sampleText = text.trim() || 'မင်္ဂလာပါ ရုပ်ရှင်ဇာတ်လမ်းပြော စတူဒီယိုမှ ကြိုဆိုပါသည်';
  const encoded = encodeURIComponent(sampleText.substring(0, 180));
  const gender = voice?.gender || 'female';
  const voiceId = voice?.id || '';
  const voiceName = voice?.voiceName || voice?.voiceModel || '';

  return [
    // 1. Primary Multi-CDN Audio Source for zero-fail playback (Google Translate TTS)
    `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=my&q=${encoded}`,
    // 2. Fallback Multi-CDN Stream (Youdao Myanmar Audio Source)
    `https://dict.youdao.com/dictvoice?audio=${encoded}&le=my`,
    // 3. Fallback Multi-CDN Stream (Google Translate GTX)
    `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=my&q=${encoded}`,
    // 4. Server-Side Direct Stream Endpoint with Edge Neural Voice Engine
    `/api/stream-tts?text=${encoded}&gender=${gender}&voiceId=${voiceId}&voiceName=${encodeURIComponent(
      voiceName
    )}&pitchOffset=${pitchOffsetHz}&speedMultiplier=${speed}`,
  ];
}

/**
 * Play authentic spoken Myanmar speech directly with Multi-CDN Zero-Fail Audio Pipeline
 */
export const playMyanmarAudio = (text: string, speed: number = 1.0): Promise<boolean> => {
  return new Promise(async (resolve, reject) => {
    // Stop any previously playing audio
    if (currentActiveAudio) {
      try {
        currentActiveAudio.pause();
        currentActiveAudio.currentTime = 0;
      } catch {}
      currentActiveAudio = null;
    }

    const clean = text.trim();
    if (!clean) {
      resolve(true);
      return;
    }

    await unlockAudioContext();

    const normalized = normalizeMyanmarForTTS(clean);
    const urls = getMultiCdnMyanmarAudioUrls(normalized, undefined, speed);

    const audio = getSharedPreviewAudio();
    audio.volume = 1.0;
    audio.muted = false;
    audio.playbackRate = Math.max(0.5, Math.min(2.0, speed || 1.0));
    currentActiveAudio = audio;

    let urlIndex = 0;

    const tryNextUrl = () => {
      if (urlIndex >= urls.length) {
        if (currentActiveAudio === audio) currentActiveAudio = null;
        reject(new Error('All Multi-CDN Myanmar audio streams failed'));
        return;
      }

      const nextUrl = urls[urlIndex++];
      audio.src = nextUrl;

      audio.play().catch((playErr) => {
        console.warn(`Audio play failed for source index ${urlIndex - 1}, trying next source...`, playErr);
        tryNextUrl();
      });
    };

    audio.onended = () => {
      if (currentActiveAudio === audio) currentActiveAudio = null;
      resolve(true);
    };

    audio.onerror = () => {
      console.warn(`Audio error for source index ${urlIndex - 1}, trying next source...`);
      tryNextUrl();
    };

    tryNextUrl();
  });
};

export interface PlayVoicePreviewOptions {
  voice?: BurmeseVoiceAvatar;
  pitchOffsetHz?: number;
  speedMultiplier?: number;
  customText?: string;
  onEnded?: () => void;
}

/**
 * Authentic Natural Myanmar Speech Synthesis Engine for previewing all 40 voice models on mobile/desktop
 * - Supports both object signature ({ voice, pitchOffsetHz, speedMultiplier, customText, onEnded })
 *   and positional signature (text, voiceId, speed).
 * - Multi-CDN zero-fail audio pipeline.
 * - Zero dependency on window.speechSynthesis.
 */
export async function playVoicePreview(
  arg1: PlayVoicePreviewOptions | string,
  arg2?: string | number,
  arg3?: number
): Promise<{ stop: () => void }> {
  // 1. Immediately unlock and resume AudioContext within user touch/click gesture
  await unlockAudioContext();

  // Stop any previously playing audio
  if (currentActiveAudio) {
    try {
      currentActiveAudio.pause();
      currentActiveAudio.currentTime = 0;
    } catch {}
    currentActiveAudio = null;
  }

  // Parse arguments to support both signatures
  let targetVoice: BurmeseVoiceAvatar;
  let pitchOffsetHz = 0;
  let speedMultiplier = 1.0;
  let rawText = '';
  let onEndedCallback: (() => void) | undefined;

  if (typeof arg1 === 'string') {
    // Positional signature: (text, voiceId, speed)
    rawText = arg1;
    const voiceId = typeof arg2 === 'string' ? arg2 : '';
    speedMultiplier = typeof arg3 === 'number' ? arg3 : (typeof arg2 === 'number' ? arg2 : 1.0);
    targetVoice = BURMESE_VOICE_AVATARS.find((v) => v.id === voiceId) || BURMESE_VOICE_AVATARS[0];
  } else {
    // Object signature: ({ voice, pitchOffsetHz, speedMultiplier, customText, onEnded })
    const opts = arg1 || {};
    targetVoice = opts.voice || BURMESE_VOICE_AVATARS[0];
    pitchOffsetHz = opts.pitchOffsetHz || 0;
    speedMultiplier = opts.speedMultiplier || 1.0;
    rawText = opts.customText || targetVoice.samplePhraseBurmese;
    onEndedCallback = opts.onEnded;
  }

  const sampleText = rawText.trim() || targetVoice.samplePhraseBurmese || 'မင်္ဂလာပါ ရုပ်ရှင်ဇာတ်လမ်းပြော စတူဒီယိုမှ ကြိုဆိုပါသည်';
  const normalizedText = normalizeMyanmarForTTS(sampleText);

  let isStopped = false;

  const stopAll = () => {
    isStopped = true;
    if (sharedPreviewAudio) {
      try {
        sharedPreviewAudio.pause();
        sharedPreviewAudio.currentTime = 0;
      } catch {}
    }
    if (currentActiveAudio) {
      try {
        currentActiveAudio.pause();
        currentActiveAudio.currentTime = 0;
      } catch {}
      currentActiveAudio = null;
    }
    if (onEndedCallback) onEndedCallback();
  };

  const effectiveSpeed = Math.max(
    0.5,
    Math.min(2.0, (targetVoice.baseRate || 1.0) * (speedMultiplier || 1.0))
  );

  const urls = getMultiCdnMyanmarAudioUrls(
    normalizedText,
    targetVoice,
    effectiveSpeed,
    pitchOffsetHz
  );

  const audio = getSharedPreviewAudio();
  currentActiveAudio = audio;
  audio.volume = 1.0;
  audio.muted = false;
  audio.playbackRate = effectiveSpeed;

  let urlIndex = 0;

  const tryNextUrl = () => {
    if (isStopped) return;

    if (urlIndex >= urls.length) {
      // Fallback: try synthesizing genuine blob
      generateBurmeseAudioBlob({
        text: normalizedText,
        voice: targetVoice,
        pitchOffsetHz,
        speedMultiplier,
      })
        .then((res) => {
          if (res.blobUrl && !isStopped) {
            audio.src = res.blobUrl;
            audio.play().catch(() => {
              if (onEndedCallback) onEndedCallback();
            });
          } else {
            if (onEndedCallback) onEndedCallback();
          }
        })
        .catch(() => {
          if (onEndedCallback) onEndedCallback();
        });
      return;
    }

    const currentUrl = urls[urlIndex++];
    audio.src = currentUrl;

    audio.play().catch((err) => {
      console.warn(`Direct stream failed for index ${urlIndex - 1}, trying fallback audio synth...`, err);
      tryNextUrl();
    });
  };

  audio.onended = () => {
    if (currentActiveAudio === audio) currentActiveAudio = null;
    if (!isStopped && onEndedCallback) onEndedCallback();
  };

  audio.onerror = () => {
    if (!isStopped) {
      console.warn(`Audio stream error on index ${urlIndex - 1}, attempting next fallback stream...`);
      tryNextUrl();
    }
  };

  tryNextUrl();

  return {
    stop: stopAll,
  };
}

/**
 * Generate SRT subtitle string from segments
 */
export function generateSRT(segments: TranscriptSegment[]): string {
  return segments
    .map((seg, index) => {
      const startSRT = formatTimeToSRT(seg.start);
      const endSRT = formatTimeToSRT(seg.end);
      const text = seg.myanmarText || seg.sourceText;
      return `${index + 1}\n${startSRT} --> ${endSRT}\n${text}\n`;
    })
    .join('\n');
}

/**
 * Format "00:00:02.100" to "00:00:02,100"
 */
function formatTimeToSRT(timeStr: string): string {
  if (!timeStr) return '00:00:00,000';
  let formatted = timeStr.replace('.', ',');
  if (!formatted.includes(',')) formatted += ',000';
  const parts = formatted.split(':');
  if (parts.length === 2) {
    formatted = `00:${formatted}`;
  }
  return formatted;
}

/**
 * Helper to download file in browser
 */
export function downloadFile(content: string | Blob, fileName: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

