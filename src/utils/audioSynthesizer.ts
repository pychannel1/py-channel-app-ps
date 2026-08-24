import { playVoicePreview } from './audioSynthesis';
import { BURMESE_VOICE_AVATARS } from '../data/burmeseVoices';

/**
  * Plays instantaneous authentic Myanmar speech preview for the given voice model index (0-39).
  * Uses unified Admin/User playVoicePreview engine.
  */
export function playModelPreview(index: number) {
  try {
    const voice = BURMESE_VOICE_AVATARS[index % BURMESE_VOICE_AVATARS.length] || BURMESE_VOICE_AVATARS[0];
    playVoicePreview({
      voice,
      customText: voice.samplePhraseBurmese,
    });
  } catch (error) {
    console.error("Critical audio playback error:", error);
  }
}

/**
 * Standard clean audio container generator
 */
export function generateSyntheticSpeechWavBlob(
  text: string,
  gender: 'male' | 'female' = 'female',
  speedMultiplier: number = 1.0,
  pitchOffsetHz: number = 0
): Blob {
  const emptyMp3 = new Uint8Array([0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return new Blob([emptyMp3], { type: 'audio/mpeg' });
}


