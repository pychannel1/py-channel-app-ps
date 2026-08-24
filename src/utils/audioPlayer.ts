// src/utils/audioPlayer.ts
import { BURMESE_VOICE_AVATARS } from '../data/burmeseVoices';
import { playVoicePreview } from './audioSynthesis';

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



