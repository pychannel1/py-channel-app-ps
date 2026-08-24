import {
  playVoicePreview,
  generateBurmeseAudioBlob,
  unlockAudioContext,
  getAudioContext,
  generateSRT,
  downloadFile,
  PlayVoicePreviewOptions,
  GeneratedAudioResult,
} from '../utils/audioSynthesis';
import { BURMESE_VOICE_AVATARS } from '../data/burmeseVoices';
import { BurmeseVoiceAvatar } from '../types';

declare global {
  interface Window {
    currentAudio?: HTMLAudioElement | null;
  }
}

/**
 * Re-export core voice synthesis & preview engine
 */
export {
  playVoicePreview,
  generateBurmeseAudioBlob,
  unlockAudioContext,
  getAudioContext,
  generateSRT,
  downloadFile,
};
export type { PlayVoicePreviewOptions, GeneratedAudioResult };

/**
 * Direct forwarder to the unified playVoicePreview engine
 */
export async function playMyanmarVoiceModel(
  text: string,
  voiceOrGenderOrIndex?: string | number | BurmeseVoiceAvatar | any,
  speed: number = 1.0
): Promise<void> {
  const sampleText = text.trim() || 'မင်္ဂလာပါ ရုပ်ရှင်ဇာတ်လမ်းပြော စတူဒီယိုမှ ကြိုဆိုပါသည်';

  let targetVoice = BURMESE_VOICE_AVATARS[0];

  if (typeof voiceOrGenderOrIndex === 'object' && voiceOrGenderOrIndex !== null) {
    targetVoice = voiceOrGenderOrIndex;
  } else if (typeof voiceOrGenderOrIndex === 'number') {
    targetVoice = BURMESE_VOICE_AVATARS[voiceOrGenderOrIndex % BURMESE_VOICE_AVATARS.length] || BURMESE_VOICE_AVATARS[0];
  } else if (typeof voiceOrGenderOrIndex === 'string') {
    const found = BURMESE_VOICE_AVATARS.find((v) => v.id === voiceOrGenderOrIndex || v.code.toLowerCase() === voiceOrGenderOrIndex.toLowerCase());
    if (found) {
      targetVoice = found;
    } else {
      const isMale = voiceOrGenderOrIndex.toLowerCase().includes('male') || voiceOrGenderOrIndex.toLowerCase().includes('thiha');
      targetVoice = BURMESE_VOICE_AVATARS.find((v) => isMale ? v.gender === 'male' : v.gender === 'female') || BURMESE_VOICE_AVATARS[0];
    }
  }

  await playVoicePreview({
    voice: targetVoice,
    customText: sampleText,
    speedMultiplier: speed,
  });
}

/**
 * Unified Burmese TTS Audio Blob Generator
 */
export async function fetchMyanmarTTSAudioBlob(
  text: string,
  voiceGender: 'male' | 'female' = 'female',
  speed: number = 1.0,
  pitchOffset: number = 0
): Promise<Blob> {
  const targetVoice = BURMESE_VOICE_AVATARS.find((v) => v.gender === voiceGender) || BURMESE_VOICE_AVATARS[0];
  const result = await generateBurmeseAudioBlob({
    text,
    voice: targetVoice,
    pitchOffsetHz: pitchOffset,
    speedMultiplier: speed,
  });
  return result.blob;
}

/**
 * 100% Working Myanmar Neural Voice Playback using the Admin playVoicePreview engine
 */
export async function playMyanmarSpeech(
  text: string,
  voiceGender: 'male' | 'female' = 'female',
  speed: number = 1.0,
  pitchOffset: number = 0,
  onEnded?: () => void
): Promise<{ stop: () => void }> {
  const targetVoice = BURMESE_VOICE_AVATARS.find((v) => v.gender === voiceGender) || BURMESE_VOICE_AVATARS[0];
  return playVoicePreview({
    voice: targetVoice,
    customText: text,
    speedMultiplier: speed,
    pitchOffsetHz: pitchOffset,
    onEnded,
  });
}

/**
 * Direct forwarder to the unified Admin & User audio preview engine (playVoicePreview)
 * Zero robotic oscillators, 100% genuine spoken Myanmar speech.
 */
export async function playRealMyanmarAudio(
  text: string,
  voiceGender: 'male' | 'female' = 'female',
  speed: number = 1.0,
  onEnded?: () => void,
  voiceId?: string
): Promise<{ stop: () => void }> {
  let targetVoice = voiceId
    ? BURMESE_VOICE_AVATARS.find((v) => v.id === voiceId)
    : BURMESE_VOICE_AVATARS.find((v) => v.gender === voiceGender);

  if (!targetVoice) {
    targetVoice = BURMESE_VOICE_AVATARS[0];
  }

  return playVoicePreview({
    voice: targetVoice,
    customText: text || targetVoice.samplePhraseBurmese,
    speedMultiplier: speed,
    onEnded,
  });
}

/**
 * Instant preview function for Voice Cards and Model Selectors
 * Uses the exact same Admin playVoicePreview engine.
 */
export async function playInstantVoicePreview(
  voiceIndexOrId: number | string,
  customText?: string,
  onEnded?: () => void
): Promise<{ stop: () => void }> {
  let targetVoice =
    typeof voiceIndexOrId === 'number'
      ? BURMESE_VOICE_AVATARS[voiceIndexOrId % BURMESE_VOICE_AVATARS.length]
      : BURMESE_VOICE_AVATARS.find((v) => v.id === voiceIndexOrId || v.code.toLowerCase() === voiceIndexOrId.toLowerCase());

  if (!targetVoice) {
    targetVoice = BURMESE_VOICE_AVATARS[0];
  }

  return playVoicePreview({
    voice: targetVoice,
    customText: customText || targetVoice.samplePhraseBurmese,
    onEnded,
  });
}




