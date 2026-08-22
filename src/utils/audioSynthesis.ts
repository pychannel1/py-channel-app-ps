import { BurmeseVoiceAvatar, TranscriptSegment } from '../types';
import { normalizeMyanmarForTTS } from './myanmarTextNormalizer';

let audioCtx: AudioContext | null = null;

/**
 * Robust Audio Unlock for Web Audio API (Browser Autoplay Policy Compliance)
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

/**
 * Direct Client-Side Real Myanmar Audio Stream Fallback
 * Plays authentic spoken Myanmar speech directly from Google TTS API endpoints.
 * ZERO synthetic oscillator beeps.
 */
async function playDirectMyanmarAudioFallback(
  text: string,
  rate: number,
  onEnded?: () => void
): Promise<{ stop: () => void }> {
  const clean = text.slice(0, 180);
  const encoded = encodeURIComponent(clean);
  const urls = [
    `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=my&client=tw-ob`,
    `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=my&q=${encoded}`,
    `https://translate.google.com.sg/translate_tts?ie=UTF-8&q=${encoded}&tl=my&client=tw-ob`,
  ];

  let audioEl: HTMLAudioElement | null = null;
  let isCancelled = false;

  for (const url of urls) {
    if (isCancelled) break;
    try {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.playbackRate = Math.max(0.75, Math.min(1.5, rate || 1.0));
      audio.src = url;

      const playPromise = new Promise<boolean>((resolve) => {
        audio.oncanplaythrough = () => resolve(true);
        audio.onerror = () => resolve(false);
        // Timeout in 3.5s to try next mirror
        setTimeout(() => resolve(false), 3500);
      });

      const canPlay = await playPromise;
      if (canPlay && !isCancelled) {
        audioEl = audio;
        audio.onended = () => {
          if (onEnded) onEnded();
        };
        await audio.play();
        break;
      }
    } catch {
      // Continue to next mirror
    }
  }

  // If HTML5 Audio was blocked, attempt standard Web Speech API with Myanmar language
  if (!audioEl && !isCancelled && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'my-MM';
      utterance.rate = Math.max(0.75, Math.min(1.5, rate || 1.0));
      utterance.onend = () => {
        if (onEnded) onEnded();
      };
      utterance.onerror = () => {
        if (onEnded) onEnded();
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      if (onEnded) onEnded();
    }
  }

  return {
    stop: () => {
      isCancelled = true;
      if (audioEl) {
        try {
          audioEl.pause();
          audioEl.currentTime = 0;
        } catch {}
        audioEl = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (onEnded) onEnded();
    },
  };
}

/**
 * Authentic Natural Myanmar Speech Synthesis Engine
 * 100% Real Human / Neural Speech (Edge Neural TTS / Google Myanmar TTS)
 * - Male: my-MM-ThihaNeural
 * - Female: my-MM-NilarNeural
 * - All dummy oscillator nodes completely removed.
 */
export async function playVoicePreview({
  voice,
  pitchOffsetHz,
  speedMultiplier,
  customText,
  onEnded,
}: {
  voice: BurmeseVoiceAvatar;
  pitchOffsetHz: number; // -30 to +30 Hz
  speedMultiplier: number;
  customText?: string;
  onEnded?: () => void;
}): Promise<{ stop: () => void }> {
  // 1. Immediately unlock and resume AudioContext within user gesture loop
  const ctx = await unlockAudioContext();
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (e) {
      console.warn('Could not resume AudioContext on gesture:', e);
    }
  }

  const rawText = customText || voice.samplePhraseBurmese;
  // Apply Phonetic & Text Normalization for spoken Myanmar
  const normalizedText = normalizeMyanmarForTTS(rawText);

  let isStopped = false;
  let currentAudioSource: AudioBufferSourceNode | null = null;
  let fallbackStop: (() => void) | null = null;

  const stopAll = () => {
    isStopped = true;
    if (currentAudioSource) {
      try {
        currentAudioSource.stop();
        currentAudioSource.disconnect();
      } catch {}
      currentAudioSource = null;
    }
    if (fallbackStop) {
      fallbackStop();
      fallbackStop = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (onEnded) onEnded();
  };

  try {
    // 2. Request authentic Neural Burmese Speech from server endpoint
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

    if (resp.ok && !isStopped) {
      const data = await resp.json();
      if (data.audioBase64) {
        // Convert Base64 data URL to ArrayBuffer for Web Audio decoding
        const base64Data = data.audioBase64.includes(',')
          ? data.audioBase64.split(',')[1]
          : data.audioBase64;
        const binaryString = window.atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));

        if (isStopped) return { stop: stopAll };

        // Setup Web Audio Node Graph with studio clarity
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        const effectiveRate = Math.max(
          0.7,
          Math.min(1.5, (voice.baseRate || 1.0) * (speedMultiplier || 1.0))
        );
        source.playbackRate.setValueAtTime(effectiveRate, ctx.currentTime);

        const isMale = voice.gender === 'male' || (voice.voiceModel && voice.voiceModel.includes('Thiha'));

        // Vocal warmth filter (Male: 220Hz warmth, Female: 380Hz)
        const warmthFilter = ctx.createBiquadFilter();
        warmthFilter.type = 'peaking';
        warmthFilter.frequency.setValueAtTime(isMale ? 220 : 380, ctx.currentTime);
        warmthFilter.Q.setValueAtTime(1.0, ctx.currentTime);
        warmthFilter.gain.setValueAtTime(isMale ? 2.5 : 1.0, ctx.currentTime);

        // Vocal presence & clarity filter
        const presenceFilter = ctx.createBiquadFilter();
        presenceFilter.type = 'highshelf';
        presenceFilter.frequency.setValueAtTime(3200, ctx.currentTime);
        presenceFilter.gain.setValueAtTime(1.8, ctx.currentTime);

        // Dynamics Compressor for clean, broadcast-level audio
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-12, ctx.currentTime);
        compressor.knee.setValueAtTime(6, ctx.currentTime);
        compressor.ratio.setValueAtTime(2.8, ctx.currentTime);
        compressor.attack.setValueAtTime(0.005, ctx.currentTime);
        compressor.release.setValueAtTime(0.12, ctx.currentTime);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(1.2, ctx.currentTime);

        source.connect(warmthFilter);
        warmthFilter.connect(presenceFilter);
        presenceFilter.connect(compressor);
        compressor.connect(gainNode);
        gainNode.connect(ctx.destination);

        currentAudioSource = source;

        source.onended = () => {
          if (!isStopped && onEnded) {
            onEnded();
          }
        };

        source.start(ctx.currentTime);

        return {
          stop: stopAll,
        };
      }
    }
  } catch (err) {
    console.warn('Server TTS fetch error, switching to direct client-side speech stream:', err);
  }

  // 3. Fallback: Pure Real Myanmar Speech Audio Stream (ZERO synthetic oscillators)
  const directPlayback = await playDirectMyanmarAudioFallback(
    normalizedText,
    speedMultiplier,
    onEnded
  );
  fallbackStop = directPlayback.stop;

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
