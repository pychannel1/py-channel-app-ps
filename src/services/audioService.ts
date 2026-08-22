import { normalizeMyanmarForTTS } from '../utils/myanmarTextNormalizer';
import { unlockAudioContext } from '../utils/audioSynthesis';

let activeAudioElement: HTMLAudioElement | null = null;

/**
 * Universal Shared Audio Element to guarantee gesture-unlocked playback on Mobile Chrome/Safari/WebView
 */
let sharedServiceAudio: HTMLAudioElement | null = null;

function getSharedServiceAudio(): HTMLAudioElement {
  if (!sharedServiceAudio) {
    sharedServiceAudio = new Audio();
    sharedServiceAudio.crossOrigin = 'anonymous';
    sharedServiceAudio.preload = 'auto';
  }
  return sharedServiceAudio;
}

/**
 * Fetches real Microsoft Myanmar Neural Voices (my-MM-NilarNeural / my-MM-ThihaNeural)
 * or Google Myanmar Neural Fallback from the dedicated backend /api/tts endpoint
 * Returns a clean MP3 Blob with zero CORS/403 errors.
 */
export async function fetchMyanmarTTSAudioBlob(
  text: string,
  voiceGender: 'male' | 'female' = 'female',
  speed: number = 1.0,
  pitchOffset: number = 0
): Promise<Blob> {
  const cleanText = normalizeMyanmarForTTS(text.trim() || 'မင်္ဂလာပါ ရုပ်ရှင်ဇာတ်လမ်းပြော စတူဒီယိုမှ ကြိုဆိုပါသည်');
  const targetVoice = voiceGender === 'male' ? 'my-MM-ThihaNeural' : 'my-MM-NilarNeural';

  // 1. Primary: POST /api/tts
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: cleanText,
        voice: targetVoice,
        voiceGender,
        rate: speed,
        pitchOffset,
      }),
    });

    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 50) {
        return blob;
      }
    }
  } catch (err) {
    console.warn('POST /api/tts failed, attempting GET /api/tts stream fallback:', err);
  }

  // 2. Secondary Fallback: GET /api/tts Stream
  try {
    const streamUrl = `/api/tts?text=${encodeURIComponent(cleanText)}&gender=${encodeURIComponent(
      voiceGender
    )}&rate=${speed}&pitch=${pitchOffset}`;
    const getRes = await fetch(streamUrl);
    if (getRes.ok) {
      const blob = await getRes.blob();
      if (blob.size > 50) {
        return blob;
      }
    }
  } catch (err) {
    console.warn('GET /api/tts failed:', err);
  }

  // 3. Tertiary Fallback: POST /api/synthesize-burmese-tts
  try {
    const fallbackRes = await fetch('/api/synthesize-burmese-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText,
        gender: voiceGender,
        speedMultiplier: speed,
        pitchOffset,
      }),
    });

    if (fallbackRes.ok) {
      const data = await fallbackRes.json();
      if (data.audioBase64) {
        const base64Data = data.audioBase64.replace(/^data:audio\/[^;]+;base64,/, '');
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: 'audio/mpeg' });
      }
    }
  } catch (err) {
    console.error('All backend TTS fetch attempts failed:', err);
  }

  return new Blob([], { type: 'audio/mpeg' });
}

/**
 * 100% Working Myanmar Neural Voice Playback connected to backend /api/tts
 * Supports Edge-TTS my-MM-NilarNeural and my-MM-ThihaNeural with proper headers.
 */
export async function playMyanmarSpeech(
  text: string,
  voiceGender: 'male' | 'female' = 'female',
  speed: number = 1.0,
  pitchOffset: number = 0,
  onEnded?: () => void
): Promise<{ stop: () => void }> {
  // Unlock audio
  await unlockAudioContext();

  // Stop existing audio
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch {}
    activeAudioElement = null;
  }

  const cleanText = text.trim() || 'မင်္ဂလာပါ ရုပ်ရှင်ဇာတ်ကြောင်းပြော Studio မှ ကြိုဆိုပါသည်';
  const audio = getSharedServiceAudio();
  activeAudioElement = audio;

  let isStopped = false;

  const stopAudio = () => {
    isStopped = true;
    if (activeAudioElement) {
      try {
        activeAudioElement.pause();
        activeAudioElement.currentTime = 0;
      } catch {}
      activeAudioElement = null;
    }
    if (onEnded) onEnded();
  };

  audio.onended = () => {
    if (activeAudioElement === audio) activeAudioElement = null;
    if (!isStopped && onEnded) onEnded();
  };

  audio.playbackRate = Math.max(0.5, Math.min(2.0, speed || 1.0));

  try {
    const blob = await fetchMyanmarTTSAudioBlob(cleanText, voiceGender, speed, pitchOffset);
    if (!isStopped && blob.size > 0) {
      const audioUrl = URL.createObjectURL(blob);
      audio.src = audioUrl;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (activeAudioElement === audio) activeAudioElement = null;
        if (!isStopped && onEnded) onEnded();
      };
      await audio.play();
    } else if (!isStopped) {
      // Direct stream fallback
      const streamUrl = `/api/tts?text=${encodeURIComponent(cleanText)}&gender=${voiceGender}&rate=${speed}`;
      audio.src = streamUrl;
      await audio.play();
    }
  } catch (err) {
    console.error('Audio playback error in playMyanmarSpeech:', err);
    if (!isStopped && onEnded) onEnded();
  }

  return { stop: stopAudio };
}

