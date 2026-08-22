import { BurmeseVoiceAvatar, TranscriptSegment } from '../types';
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
      // Tiny silent mp3 data URI to warm up audio subsystem
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      audio.volume = 1.0;
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

  // Final Empty Safe Blob to prevent crashes
  const fallbackBlob = new Blob([], { type: 'audio/mpeg' });
  return {
    blob: fallbackBlob,
    blobUrl: '',
    mimeType: 'audio/mpeg',
  };
}

/**
 * Play authentic spoken Myanmar speech directly from reliable Myanmar audio streams
 * 100% Real Burmese Audio Stream (Google TTS / Neural stream). ZERO dummy oscillators.
 */
export const playMyanmarAudio = (text: string, speed: number = 1.0): Promise<boolean> => {
  return new Promise((resolve, reject) => {
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

    const normalized = normalizeMyanmarForTTS(clean);
    const audioUrl = `/api/stream-tts?text=${encodeURIComponent(normalized)}&speedMultiplier=${speed}`;

    const audio = getSharedPreviewAudio();
    audio.src = audioUrl;
    audio.volume = 1.0;
    audio.muted = false;
    audio.playbackRate = Math.max(0.5, Math.min(2.0, speed || 1.0));

    currentActiveAudio = audio;

    audio.onended = () => {
      if (currentActiveAudio === audio) {
        currentActiveAudio = null;
      }
      resolve(true);
    };

    audio.onerror = (e) => {
      console.warn('Audio streaming error on internal endpoint, attempting direct proxy fallback:', e);
      // Secondary fallback to Google TTS direct endpoint
      const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=my&client=tw-ob&q=${encodeURIComponent(
        normalized.slice(0, 180)
      )}`;
      audio.src = fallbackUrl;
      audio.play().then(() => resolve(true)).catch((err) => {
        if (currentActiveAudio === audio) currentActiveAudio = null;
        reject(err);
      });
    };

    audio.play().catch((err) => {
      console.error('Audio playback failed:', err);
      if (currentActiveAudio === audio) {
        currentActiveAudio = null;
      }
      reject(err);
    });
  });
};

/**
 * Authentic Natural Myanmar Speech Synthesis Engine for previewing voice models
 * 100% Real Human / Neural Speech (Edge Neural TTS / Direct Myanmar Audio Stream)
 * - Male: my-MM-ThihaNeural
 * - Female: my-MM-NilarNeural
 * - Instant synchronous stream initiation to prevent browser Autoplay blocks
 */
export async function playVoicePreview({
  voice,
  pitchOffsetHz = 0,
  speedMultiplier = 1.0,
  customText,
  onEnded,
}: {
  voice: BurmeseVoiceAvatar;
  pitchOffsetHz: number;
  speedMultiplier: number;
  customText?: string;
  onEnded?: () => void;
}): Promise<{ stop: () => void }> {
  // 1. Immediately unlock and resume AudioContext within user gesture loop
  await unlockAudioContext();

  // Stop any previously playing audio
  if (currentActiveAudio) {
    try {
      currentActiveAudio.pause();
      currentActiveAudio.currentTime = 0;
    } catch {}
    currentActiveAudio = null;
  }

  const rawText = customText || voice.samplePhraseBurmese;
  const normalizedText = normalizeMyanmarForTTS(rawText);

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
    if (onEnded) onEnded();
  };

  const audio = getSharedPreviewAudio();
  currentActiveAudio = audio;

  // Direct server stream endpoint for instant playback without gesture drop
  const streamUrl = `/api/stream-tts?text=${encodeURIComponent(
    normalizedText
  )}&gender=${encodeURIComponent(voice.gender)}&voiceId=${encodeURIComponent(
    voice.id
  )}&voiceName=${encodeURIComponent(voice.voiceName || voice.voiceModel || '')}&pitchOffset=${pitchOffsetHz}&speedMultiplier=${speedMultiplier}`;

  audio.src = streamUrl;
  audio.volume = 1.0;
  audio.muted = false;
  audio.playbackRate = Math.max(0.5, Math.min(2.0, (voice.baseRate || 1.0) * (speedMultiplier || 1.0)));

  audio.onended = () => {
    if (currentActiveAudio === audio) currentActiveAudio = null;
    if (!isStopped && onEnded) onEnded();
  };

  audio.onerror = async () => {
    if (isStopped) return;
    console.warn('Direct stream error, attempting pre-synthesized blob fallback...');
    try {
      const result = await generateBurmeseAudioBlob({
        text: normalizedText,
        voice,
        pitchOffsetHz,
        speedMultiplier,
      });
      if (result.blobUrl && !isStopped) {
        audio.src = result.blobUrl;
        await audio.play();
        return;
      }
    } catch (fallbackErr) {
      console.error('All audio fallbacks failed:', fallbackErr);
    }
    if (currentActiveAudio === audio) currentActiveAudio = null;
    if (!isStopped && onEnded) onEnded();
  };

  try {
    await audio.play();
  } catch (playErr) {
    console.warn('Initial stream play() rejected, trying direct Blob fallback:', playErr);
    try {
      const result = await generateBurmeseAudioBlob({
        text: normalizedText,
        voice,
        pitchOffsetHz,
        speedMultiplier,
      });
      if (result.blobUrl && !isStopped) {
        audio.src = result.blobUrl;
        await audio.play();
      }
    } catch (finalErr) {
      console.error('Final play error:', finalErr);
      if (onEnded) onEnded();
    }
  }

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
