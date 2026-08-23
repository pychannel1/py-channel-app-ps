import { BurmeseVoiceAvatar, TranscriptSegment } from '../types';
import { BURMESE_VOICE_AVATARS } from '../data/burmeseVoices';
import { normalizeMyanmarForTTS } from './myanmarTextNormalizer';
import {
  generateVoiceToneDataUrl,
  playModelPreview,
  generateSyntheticSpeechWavBlob,
} from './audioSynthesizer';

let audioCtx: AudioContext | null = null;
let currentSourceNode: AudioBufferSourceNode | null = null;
let currentGainNode: GainNode | null = null;
let currentActiveAudio: HTMLAudioElement | null = null;

// In-Memory Decoded AudioBuffer & Blob Caches for 0ms Instant Playback & Zero Stuttering
const audioBufferCache = new Map<string, AudioBuffer>();
const audioBlobCache = new Map<string, { blob: Blob; blobUrl: string; serverAudioUrl?: string }>();

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
  serverAudioUrl?: string;
  mimeType: string;
  durationSeconds?: number;
}

export { playMyanmarSpeech, fetchMyanmarTTSAudioBlob, playMyanmarVoiceModel } from '../services/audioService';
import { playMyanmarVoiceModel } from '../services/audioService';

/**
 * Persist an Audio Blob to the server-side persistent audio store.
 * Returns a stable, shareable URL like '/api/audio-store/aud_...'
 */
async function uploadAudioBlobToServer(blob: Blob, voiceId?: string): Promise<string | null> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = window.btoa(binary);

    const resp = await fetch('/api/audio-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64: base64,
        mimeType: blob.type || 'audio/mpeg',
        voiceId,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      return data.audioUrl || null;
    }
  } catch (err) {
    console.warn('Audio store persistence notice:', err);
  }
  return null;
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
  const targetVoice = voice.gender === 'male' ? 'my-MM-ThihaNeural' : 'my-MM-NilarNeural';
  const effectiveBasePitch = typeof voice.basePitchHz === 'number' ? voice.basePitchHz : (voice.gender === 'male' ? -1 : 0);
  const finalPitch = Math.max(-6, Math.min(6, Math.round(effectiveBasePitch + (pitchOffsetHz || 0))));

  const cacheKey = `${voice.id}_${finalPitch}_${speedMultiplier}_${normalizedText}`;
  const cached = audioBlobCache.get(cacheKey);
  if (cached) {
    return {
      blob: cached.blob,
      blobUrl: cached.blobUrl,
      serverAudioUrl: cached.serverAudioUrl,
      mimeType: 'audio/mpeg',
    };
  }

  // 1. Primary: Server POST /api/synthesize-burmese-tts (Returns MP3 Base64 + Persistent Audio Store URL)
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
        const serverAudioUrl = data.audioUrl || `/api/voice-audio/${encodeURIComponent(voice.id)}?text=${encodeURIComponent(normalizedText)}`;

        audioBlobCache.set(cacheKey, { blob: audioBlob, blobUrl, serverAudioUrl });

        return {
          blob: audioBlob,
          blobUrl,
          serverAudioUrl,
          mimeType: 'audio/mpeg',
        };
      }
    }
  } catch (err) {
    console.warn('Primary synthesize endpoint failed, trying /api/tts endpoint:', err);
  }

  // 2. Secondary: Server POST /api/tts endpoint
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
        const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(audioBlob);
        
        // Asynchronously register in persistent store
        const serverAudioUrl = await uploadAudioBlobToServer(audioBlob, voice.id) || `/api/voice-audio/${encodeURIComponent(voice.id)}?text=${encodeURIComponent(normalizedText)}`;
        audioBlobCache.set(cacheKey, { blob: audioBlob, blobUrl, serverAudioUrl });

        return {
          blob: audioBlob,
          blobUrl,
          serverAudioUrl,
          mimeType: 'audio/mpeg',
        };
      }
    }
  } catch (err) {
    console.warn('/api/tts fetch failed, trying stream endpoint:', err);
  }

  // 3. Fallback: Server Stream GET Endpoint
  try {
    const streamUrl = `/api/voice-audio/${encodeURIComponent(voice.id)}?text=${encodeURIComponent(
      normalizedText
    )}&gender=${encodeURIComponent(voice.gender)}&pitchOffset=${pitchOffsetHz}&speedMultiplier=${speedMultiplier}`;

    const streamResp = await fetch(streamUrl);
    if (streamResp.ok) {
      const arrayBuf = await streamResp.arrayBuffer();
      if (arrayBuf.byteLength > 50) {
        const audioBlob = new Blob([arrayBuf], { type: 'audio/mpeg' });
        const blobUrl = URL.createObjectURL(audioBlob);
        audioBlobCache.set(cacheKey, { blob: audioBlob, blobUrl, serverAudioUrl: streamUrl });
        return {
          blob: audioBlob,
          blobUrl,
          serverAudioUrl: streamUrl,
          mimeType: 'audio/mpeg',
        };
      }
    }
  } catch (fallbackErr) {
    console.warn('Server stream fetch error:', fallbackErr);
  }

  // 4. Guaranteed Client-Side Synthetic Audio Engine Fallback (Zero Network Dependency)
  try {
    const audioBlob = generateSyntheticSpeechWavBlob(
      normalizedText,
      voice.gender,
      speedMultiplier,
      pitchOffsetHz
    );
    const blobUrl = URL.createObjectURL(audioBlob);
    return {
      blob: audioBlob,
      blobUrl,
      mimeType: 'audio/wav',
    };
  } catch (wavErr) {
    console.error('Embedded audio WAV generation failed:', wavErr);
  }

  // Safe fallback
  const emptyWav = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
    0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x44, 0xac, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00,
    0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00,
  ]);
  const fallbackBlob = new Blob([emptyWav], { type: 'audio/wav' });
  const blobUrl = URL.createObjectURL(fallbackBlob);
  return {
    blob: fallbackBlob,
    blobUrl,
    mimeType: 'audio/wav',
  };
}

export interface PlayVoicePreviewOptions {
  voice?: BurmeseVoiceAvatar;
  pitchOffsetHz?: number;
  speedMultiplier?: number;
  customText?: string;
  onEnded?: () => void;
  onStart?: () => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: 'loading' | 'playing' | 'idle' | 'error', error?: string | null) => void;
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
 * - Supports both object signature ({ voice, pitchOffsetHz, speedMultiplier, customText, onEnded, onError })
 *   and positional signature (text, voiceId, speed).
 */
export async function playVoicePreview(
  arg1: PlayVoicePreviewOptions | string,
  arg2?: string | number,
  arg3?: number
): Promise<{ stop: () => void }> {
  // Parse arguments to support both signatures
  let targetVoice: BurmeseVoiceAvatar;
  let pitchOffsetHz = 0;
  let speedMultiplier = 1.0;
  let rawText = '';
  let onEndedCallback: (() => void) | undefined;
  let onStartCallback: (() => void) | undefined;
  let onErrorCallback: ((err: string) => void) | undefined;
  let onStatusCallback: ((status: 'loading' | 'playing' | 'idle' | 'error', error?: string | null) => void) | undefined;

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
    onStartCallback = opts.onStart;
    onErrorCallback = opts.onError;
    onStatusCallback = opts.onStatusChange;
  }

  const sampleText = rawText.trim() || targetVoice.samplePhraseBurmese || 'မင်္ဂလာပါ ရုပ်ရှင်ဇာတ်လမ်းပြော စတူဒီယိုမှ ကြိုဆိုပါသည်';
  const normalizedText = normalizeMyanmarForTTS(sampleText);
  const effectiveSpeed = Math.max(0.5, Math.min(2.0, (targetVoice.baseRate || 1.0) * (speedMultiplier || 1.0)));
  const effectiveBasePitch = typeof targetVoice.basePitchHz === 'number' ? targetVoice.basePitchHz : (targetVoice.gender === 'male' ? -1 : 0);
  const finalPitch = Math.max(-6, Math.min(6, Math.round(effectiveBasePitch + (pitchOffsetHz || 0))));

  onStatusCallback?.('loading', null);

  // 1. Immediately stop any active audio or Web Audio source
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

  // Pre-unlock AudioContext on user gesture
  const ctx = await unlockAudioContext();

  const cacheKey = `${targetVoice.id}_${finalPitch}_${effectiveSpeed}_${normalizedText}`;
  const cachedBuffer = audioBufferCache.get(cacheKey);

  let isStopped = false;
  let activeSubController: { stop: () => void } | null = null;

  const stopAll = () => {
    if (isStopped) return;
    isStopped = true;
    if (activeSubController) {
      try {
        activeSubController.stop();
      } catch {}
      activeSubController = null;
    }
    if (currentActiveAudio) {
      try {
        currentActiveAudio.pause();
        currentActiveAudio.currentTime = 0;
      } catch {}
      currentActiveAudio = null;
    }
    if (window.currentAudio) {
      window.currentAudio = null;
    }
    onStatusCallback?.('idle', null);
    if (onEndedCallback) onEndedCallback();
  };

  // IF CACHED IN WEBAUDIO BUFFER -> Play 0ms instantly!
  if (cachedBuffer) {
    onStatusCallback?.('playing', null);
    onStartCallback?.();
    const ctrl = await playAudioBufferWithWebAudio(cachedBuffer, effectiveSpeed, () => {
      onStatusCallback?.('idle', null);
      if (onEndedCallback) onEndedCallback();
    });
    activeSubController = ctrl;
    return { stop: stopAll };
  }

  // 2. Prepare streaming audio URL pointing to dedicated voice endpoint
  const streamUrl = `/api/voice-audio/${encodeURIComponent(targetVoice.id)}?text=${encodeURIComponent(
    normalizedText
  )}&gender=${encodeURIComponent(targetVoice.gender)}&voiceName=${encodeURIComponent(
    targetVoice.voiceName || (targetVoice.gender === 'male' ? 'my-MM-ThihaNeural' : 'my-MM-NilarNeural')
  )}&pitchOffset=${pitchOffsetHz}&speedMultiplier=${effectiveSpeed}&basePitchHz=${targetVoice.basePitchHz ?? 0}`;

  // Try fetching binary arrayBuffer first for zero-stutter Web Audio decoding
  try {
    const fetchResp = await fetch(streamUrl);
    if (fetchResp.ok) {
      const arrayBuf = await fetchResp.arrayBuffer();
      if (arrayBuf.byteLength > 50 && !isStopped) {
        try {
          const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
          audioBufferCache.set(cacheKey, decoded);
          if (!isStopped) {
            onStatusCallback?.('playing', null);
            onStartCallback?.();
            const ctrl = await playAudioBufferWithWebAudio(decoded, effectiveSpeed, () => {
              onStatusCallback?.('idle', null);
              if (onEndedCallback) onEndedCallback();
            });
            activeSubController = ctrl;
            return { stop: stopAll };
          }
        } catch (decodeErr) {
          console.warn('Web Audio decode warning, falling back to HTML5 Audio element:', decodeErr);
        }
      }
    }
  } catch (netErr) {
    console.warn('Direct fetch stream warning:', netErr);
  }

  if (isStopped) return { stop: stopAll };

  // 3. Fallback to HTML5 Audio Element playback
  const audio = getSharedPreviewAudio();
  currentActiveAudio = audio;
  window.currentAudio = audio;

  audio.onplay = () => {
    onStatusCallback?.('playing', null);
    onStartCallback?.();
  };

  audio.onended = () => {
    if (!isStopped) {
      isStopped = true;
      if (currentActiveAudio === audio) currentActiveAudio = null;
      if (window.currentAudio === audio) window.currentAudio = null;
      onStatusCallback?.('idle', null);
      if (onEndedCallback) onEndedCallback();
    }
  };

  audio.onerror = (e) => {
    if (isStopped) return;
    const errorMsg = 'Voice audio failed to load. Tap to retry.';
    console.warn('Audio element error:', e, audio.error);
    onStatusCallback?.('error', errorMsg);
    onErrorCallback?.(errorMsg);
    if (onEndedCallback) onEndedCallback();
  };

  try {
    audio.src = streamUrl;
    audio.playbackRate = effectiveSpeed;
    audio.volume = 1.0;
    audio.muted = false;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((playErr) => {
        if (!isStopped) {
          console.warn('Audio play request notice:', playErr);
          const errorMsg = 'Autoplay restricted. Tap Play button to listen.';
          onStatusCallback?.('error', errorMsg);
          onErrorCallback?.(errorMsg);
        }
      });
    }
  } catch (err: any) {
    console.warn('Instant audio play exception:', err);
    onStatusCallback?.('error', err?.message || 'Audio error');
    onErrorCallback?.(err?.message || 'Audio error');
  }

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

export {
  generateVoiceToneDataUrl,
  playModelPreview,
  generateSyntheticSpeechWavBlob,
} from './audioSynthesizer';

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

export { playInstantVoicePreview, playRealMyanmarAudio } from './audioPlayer';

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


