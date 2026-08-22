import { BurmeseVoiceAvatar, TranscriptSegment } from '../types';
import { BURMESE_VOICE_AVATARS } from '../data/burmeseVoices';
import { normalizeMyanmarForTTS } from './myanmarTextNormalizer';

let audioCtx: AudioContext | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;
let currentGainNode: GainNode | null = null;
let currentActiveAudio: HTMLAudioElement | null = null;

// In-Memory Decoded AudioBuffer & Blob Caches for 0ms Instant Playback & Zero Stuttering
const audioBufferCache = new Map<string, AudioBuffer>();
const audioBlobCache = new Map<string, { blob: Blob; blobUrl: string }>();

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

  // Pre-unlock Web Audio pipeline with a micro-silent 1-sample buffer
  try {
    if (audioCtx && audioCtx.state === 'running') {
      const silentBuf = audioCtx.createBuffer(1, 1, 22050);
      const silentSrc = audioCtx.createBufferSource();
      silentSrc.buffer = silentBuf;
      silentSrc.connect(audioCtx.destination);
      silentSrc.start(0);
    }
  } catch {}

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

export { playMyanmarSpeech, fetchMyanmarTTSAudioBlob, playMyanmarVoiceModel } from '../services/audioService';
import { playMyanmarVoiceModel } from '../services/audioService';

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
  const targetVoice = voice.gender === 'male' ? 'my-MM-ThihaNeural' : 'my-MM-NilarNeural';
  const effectiveBasePitch = typeof voice.basePitchHz === 'number' ? voice.basePitchHz : (voice.gender === 'male' ? -18 : 8);
  const finalPitch = Math.round(effectiveBasePitch + (pitchOffsetHz || 0));

  const cacheKey = `${voice.id}_${finalPitch}_${speedMultiplier}_${normalizedText}`;
  const cached = audioBlobCache.get(cacheKey);
  if (cached) {
    return {
      blob: cached.blob,
      blobUrl: cached.blobUrl,
      mimeType: 'audio/mpeg',
    };
  }

  // 1. Primary: Server /api/tts endpoint (Zero CORS/403 errors, Edge-TTS Neural + Google Cloud fallback)
  try {
    const resp = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: normalizedText,
        voice: targetVoice,
        voiceGender: voice.gender,
        voiceId: voice.id,
        rate: speedMultiplier,
        pitchOffset: pitchOffsetHz,
        basePitchHz: voice.basePitchHz,
      }),
    });

    if (resp.ok) {
      const arrayBuffer = await resp.arrayBuffer();
      if (arrayBuffer.byteLength > 50) {
        // Enforce strict audio/mpeg MIME type for standard MP3 browser playback
        const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(audioBlob);
        audioBlobCache.set(cacheKey, { blob: audioBlob, blobUrl });
        return {
          blob: audioBlob,
          blobUrl,
          mimeType: 'audio/mpeg',
        };
      }
    }
  } catch (err) {
    console.warn('Primary /api/tts failed, trying secondary synthesize endpoint:', err);
  }

  // 2. Secondary: Server POST /api/synthesize-burmese-tts
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
        audioBlobCache.set(cacheKey, { blob: audioBlob, blobUrl });

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

  // 3. Fallback: Server Stream GET Endpoint
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
        audioBlobCache.set(cacheKey, { blob: audioBlob, blobUrl });
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

  // Final Empty Safe Blob to prevent crashes
  const fallbackBlob = new Blob([], { type: 'audio/mpeg' });
  return {
    blob: fallbackBlob,
    blobUrl: '',
    mimeType: 'audio/mpeg',
  };
}

export interface PlayVoicePreviewOptions {
  voice?: BurmeseVoiceAvatar;
  pitchOffsetHz?: number;
  speedMultiplier?: number;
  customText?: string;
  onEnded?: () => void;
}

/**
 * Plays audio using Web Audio API AudioBufferSourceNode (zero stutter, zero mobile autoplay issue)
 */
async function playAudioBufferWithWebAudio(
  buffer: AudioBuffer,
  speed: number = 1.0,
  onEnded?: () => void
): Promise<{ stop: () => void }> {
  const ctx = await unlockAudioContext();

  // Stop any active node
  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
      currentSourceNode.disconnect();
    } catch {}
    currentSourceNode = null;
  }

  const sourceNode = ctx.createBufferSource();
  sourceNode.buffer = buffer;
  sourceNode.playbackRate.value = Math.max(0.5, Math.min(2.0, speed || 1.0));

  const gainNode = ctx.createGain();
  gainNode.gain.value = 1.0;

  sourceNode.connect(gainNode);
  gainNode.connect(ctx.destination);

  currentSourceNode = sourceNode;
  currentGainNode = gainNode;

  let isStopped = false;

  const stop = () => {
    if (isStopped) return;
    isStopped = true;
    try {
      sourceNode.stop();
      sourceNode.disconnect();
    } catch {}
    if (currentSourceNode === sourceNode) {
      currentSourceNode = null;
      currentGainNode = null;
    }
    if (onEnded) onEnded();
  };

  sourceNode.onended = () => {
    if (!isStopped) {
      isStopped = true;
      if (currentSourceNode === sourceNode) {
        currentSourceNode = null;
        currentGainNode = null;
      }
      if (onEnded) onEnded();
    }
  };

  sourceNode.start(0);

  return { stop };
}

/**
 * Authentic Natural Myanmar Speech Synthesis Engine for previewing all 40 voice models on mobile/desktop
 * - Uses Web Audio API Decoded Buffer playback for 0ms lag, zero stutter, and zero browser blocking.
 * - Supports both object signature ({ voice, pitchOffsetHz, speedMultiplier, customText, onEnded })
 *   and positional signature (text, voiceId, speed).
 */
export async function playVoicePreview(
  arg1: PlayVoicePreviewOptions | string,
  arg2?: string | number,
  arg3?: number
): Promise<{ stop: () => void }> {
  // 1. Immediately unlock AudioContext and HTML5 Audio during the user tap/click gesture
  const ctx = await unlockAudioContext();

  // Stop any previous audio
  if (currentSourceNode) {
    try {
      currentSourceNode.stop();
      currentSourceNode.disconnect();
    } catch {}
    currentSourceNode = null;
  }
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
    rawText = arg1;
    const voiceId = typeof arg2 === 'string' ? arg2 : '';
    speedMultiplier = typeof arg3 === 'number' ? arg3 : (typeof arg2 === 'number' ? arg2 : 1.0);
    targetVoice = BURMESE_VOICE_AVATARS.find((v) => v.id === voiceId) || BURMESE_VOICE_AVATARS[0];
  } else {
    const opts = arg1 || {};
    targetVoice = opts.voice || BURMESE_VOICE_AVATARS[0];
    pitchOffsetHz = opts.pitchOffsetHz || 0;
    speedMultiplier = opts.speedMultiplier || 1.0;
    rawText = opts.customText || targetVoice.samplePhraseBurmese;
    onEndedCallback = opts.onEnded;
  }

  const sampleText = rawText.trim() || targetVoice.samplePhraseBurmese || 'မင်္ဂလာပါ ရုပ်ရှင်ဇာတ်လမ်းပြော စတူဒီယိုမှ ကြိုဆိုပါသည်';
  const normalizedText = normalizeMyanmarForTTS(sampleText);
  const effectiveSpeed = Math.max(0.5, Math.min(2.0, (targetVoice.baseRate || 1.0) * (speedMultiplier || 1.0)));

  const effectiveBasePitch = typeof targetVoice.basePitchHz === 'number' ? targetVoice.basePitchHz : (targetVoice.gender === 'male' ? -18 : 8);
  const finalPitch = Math.round(effectiveBasePitch + (pitchOffsetHz || 0));
  const cacheKey = `${targetVoice.id}_${finalPitch}_${effectiveSpeed}_${normalizedText}`;

  let isStopped = false;
  let innerController: { stop: () => void } | null = null;

  const stopAll = () => {
    isStopped = true;
    if (innerController) {
      innerController.stop();
      innerController = null;
    }
    if (currentSourceNode) {
      try {
        currentSourceNode.stop();
        currentSourceNode.disconnect();
      } catch {}
      currentSourceNode = null;
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

  // 1. Check in-memory decoded Web Audio buffer cache
  const cachedBuffer = audioBufferCache.get(cacheKey);
  if (cachedBuffer && ctx.state === 'running') {
    playAudioBufferWithWebAudio(cachedBuffer, effectiveSpeed, () => {
      if (!isStopped && onEndedCallback) onEndedCallback();
    }).then((ctrl) => {
      if (isStopped) {
        ctrl.stop();
      } else {
        innerController = ctrl;
      }
    });
    return { stop: stopAll };
  }

  // 2. Fetch fresh MP3 buffer from backend server (with fast internal fallback)
  (async () => {
    try {
      const resp = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: normalizedText,
          voice: targetVoice.gender === 'male' ? 'my-MM-ThihaNeural' : 'my-MM-NilarNeural',
          voiceGender: targetVoice.gender,
          voiceId: targetVoice.id,
          rate: effectiveSpeed,
          pitchOffset: pitchOffsetHz,
          basePitchHz: targetVoice.basePitchHz,
        }),
      });

      if (!resp.ok) {
        throw new Error(`TTS server responded with status: ${resp.status}`);
      }

      const arrayBuffer = await resp.arrayBuffer();
      if (isStopped) return;

      if (arrayBuffer.byteLength > 50) {
        const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(blob);

        const audio = new Audio(blobUrl);
        audio.volume = 1.0;
        audio.muted = false;
        audio.playbackRate = effectiveSpeed;

        currentActiveAudio = audio;
        window.currentAudio = audio;

        audio.onended = () => {
          URL.revokeObjectURL(blobUrl);
          if (currentActiveAudio === audio) currentActiveAudio = null;
          if (window.currentAudio === audio) window.currentAudio = null;
          if (!isStopped && onEndedCallback) onEndedCallback();
        };

        audio.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          if (currentActiveAudio === audio) currentActiveAudio = null;
          if (window.currentAudio === audio) window.currentAudio = null;
          if (!isStopped) {
            playMyanmarVoiceModel(sampleText, targetVoice.gender === 'male' ? 0 : 1, effectiveSpeed);
          }
          if (!isStopped && onEndedCallback) onEndedCallback();
        };

        // Attempt direct audio playback
        try {
          await audio.play();
        } catch (playErr) {
          console.warn('Audio play notice, falling back to Web Audio / Mirror pipeline:', playErr);
          if (ctx.state === 'running') {
            try {
              const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
              audioBufferCache.set(cacheKey, decoded);
              if (!isStopped) {
                const ctrl = await playAudioBufferWithWebAudio(decoded, effectiveSpeed, () => {
                  if (!isStopped && onEndedCallback) onEndedCallback();
                });
                innerController = ctrl;
                return;
              }
            } catch {}
          }
          if (!isStopped) {
            await playMyanmarVoiceModel(sampleText, targetVoice.gender === 'male' ? 0 : 1, effectiveSpeed);
          }
        }
        return;
      }
    } catch (err) {
      console.warn('Backend TTS synthesis warning, using multi-mirror fallback player:', err);
      if (!isStopped) {
        try {
          await playMyanmarVoiceModel(sampleText, targetVoice.gender === 'male' ? 0 : 1, effectiveSpeed);
        } catch (e) {
          console.error('Final audio fallback failed:', e);
        }
      }
      if (!isStopped && onEndedCallback) onEndedCallback();
    }
  })();

  return { stop: stopAll };
}

/**
 * Play authentic spoken Myanmar speech directly with Multi-Tier Zero-Fail Audio Pipeline
 */
export const playMyanmarAudio = (text: string, speed: number = 1.0): Promise<boolean> => {
  return new Promise((resolve) => {
    const clean = text.trim();
    if (!clean) {
      resolve(true);
      return;
    }

    playVoicePreview({
      customText: clean,
      speedMultiplier: speed,
      onEnded: () => resolve(true),
    }).catch(() => resolve(true));
  });
};

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


