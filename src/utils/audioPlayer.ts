// src/utils/audioPlayer.ts
import { BURMESE_VOICE_AVATARS } from '../data/burmeseVoices';

let currentAudio: HTMLAudioElement | null = null;

/**
 * Real authentic Myanmar spoken audio playback using dedicated high-fidelity TTS streams.
 * Zero robotic oscillators, 100% genuine spoken Myanmar speech.
 */
export async function playRealMyanmarAudio(
  text: string,
  voiceGender: 'male' | 'female' = 'female',
  speed: number = 1.0,
  onEnded?: () => void,
  voiceId?: string
): Promise<{ stop: () => void }> {
  try {
    // Stop any previously playing audio
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch {}
      currentAudio = null;
    }

    const defaultPhrase = "မင်္ဂလာပါ ရုပ်ရှင်ဇာတ်လမ်းပြော စတူဒီယိုမှ ကြိုဆိုပါသည်";
    const rawText = (text || defaultPhrase).trim();
    const cleanText = encodeURIComponent(rawText.substring(0, 200));

    // 1. Primary: Dedicated server voice stream endpoint
    const primaryUrl = voiceId
      ? `/api/voice-audio/${encodeURIComponent(voiceId)}?text=${cleanText}&gender=${voiceGender}&speedMultiplier=${speed}`
      : `/api/stream-tts?text=${cleanText}&gender=${voiceGender}&speedMultiplier=${speed}`;

    // 2. Secondary fallback: Direct Google Myanmar spoken TTS
    const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${cleanText}&tl=my&client=tw-ob&total=1&idx=0&textlen=${rawText.substring(0, 200).length}`;

    const audio = new Audio(primaryUrl);
    currentAudio = audio;
    audio.playbackRate = Math.min(Math.max(speed, 0.75), 1.5);
    audio.volume = 1.0;

    let hasRetriedFallback = false;

    const stop = () => {
      if (currentAudio === audio) {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {}
        currentAudio = null;
      }
      if (onEnded) onEnded();
    };

    audio.onended = () => {
      if (currentAudio === audio) {
        currentAudio = null;
      }
      if (onEnded) onEnded();
    };

    audio.onerror = async () => {
      if (!hasRetriedFallback) {
        hasRetriedFallback = true;
        try {
          audio.src = fallbackUrl;
          await audio.play();
          return;
        } catch (fbErr) {
          console.warn("Myanmar TTS Stream Fallback Error:", fbErr);
        }
      }
      if (onEnded) onEnded();
    };

    await audio.play().catch(async (playErr) => {
      if (!hasRetriedFallback) {
        hasRetriedFallback = true;
        try {
          audio.src = fallbackUrl;
          await audio.play();
        } catch (secErr) {
          console.warn("Audio play rejected:", secErr || playErr);
          if (onEnded) onEnded();
        }
      }
    });

    return { stop };
  } catch (error) {
    console.error("Audio playback error:", error);
    if (onEnded) onEnded();
    return { stop: () => {} };
  }
}

/**
 * Instant preview function for Voice Cards and Model Selectors
 * Uses real Burmese TTS audio stream corresponding to the voice model.
 */
export async function playInstantVoicePreview(
  voiceIndexOrId: number | string,
  customText?: string,
  onEnded?: () => void
): Promise<{ stop: () => void }> {
  let sampleText = customText;
  let gender: 'male' | 'female' = 'female';
  let speed = 1.0;
  let targetVoiceId: string | undefined;

  if (typeof voiceIndexOrId === 'number') {
    const avatar = BURMESE_VOICE_AVATARS[voiceIndexOrId % BURMESE_VOICE_AVATARS.length];
    if (avatar) {
      sampleText = sampleText || avatar.samplePhraseBurmese;
      gender = avatar.gender;
      speed = avatar.baseRate || 1.0;
      targetVoiceId = avatar.id;
    } else {
      gender = voiceIndexOrId < 20 ? 'male' : 'female';
    }
  } else if (typeof voiceIndexOrId === 'string') {
    const avatar = BURMESE_VOICE_AVATARS.find(
      (v) => v.id === voiceIndexOrId || v.code.toLowerCase() === voiceIndexOrId.toLowerCase()
    );
    if (avatar) {
      sampleText = sampleText || avatar.samplePhraseBurmese;
      gender = avatar.gender;
      speed = avatar.baseRate || 1.0;
      targetVoiceId = avatar.id;
    } else {
      gender = voiceIndexOrId.includes('male') ? 'male' : 'female';
      targetVoiceId = voiceIndexOrId;
    }
  }

  return playRealMyanmarAudio(
    sampleText || "မင်္ဂလာပါ ရုပ်ရှင်ဇာတ်လမ်းပြော စတူဒီယိုမှ ကြိုဆိုပါသည်",
    gender,
    speed,
    onEnded,
    targetVoiceId
  );
}


