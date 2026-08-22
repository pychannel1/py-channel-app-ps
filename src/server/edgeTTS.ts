import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export interface EdgeTTSSynthesizeOptions {
  text: string;
  voiceName?: string; // 'my-MM-ThihaNeural' | 'my-MM-NilarNeural'
  gender?: 'male' | 'female' | string;
  pitchHz?: number;  // e.g. -10 to -30 Hz for male, 0 to +20 Hz for female
  rateMultiplier?: number; // e.g. 1.05
}

/**
 * High-Fidelity Microsoft Edge Neural Burmese TTS Engine
 * Connects directly to Microsoft Edge Neural Voice Service
 * - Male: 'my-MM-ThihaNeural' (-10Hz to -30Hz)
 * - Female: 'my-MM-NilarNeural' (0Hz to +20Hz)
 */
export async function synthesizeWithEdgeTTS(options: EdgeTTSSynthesizeOptions): Promise<Buffer> {
  const { text, voiceName, gender, pitchHz = 0, rateMultiplier = 1.0 } = options;

  // Strict Voice & Gender Mapping Guard
  let targetVoice = 'my-MM-NilarNeural';
  if (gender === 'male' || (typeof voiceName === 'string' && voiceName.includes('Thiha'))) {
    targetVoice = 'my-MM-ThihaNeural';
  } else if (gender === 'female' || (typeof voiceName === 'string' && voiceName.includes('Nilar'))) {
    targetVoice = 'my-MM-NilarNeural';
  } else if (typeof voiceName === 'string' && voiceName.toLowerCase().includes('male')) {
    targetVoice = voiceName.toLowerCase().includes('female') ? 'my-MM-NilarNeural' : 'my-MM-ThihaNeural';
  }

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(targetVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    // Format Prosody & Pitch string (+5Hz, -15Hz)
    const pitchStr = pitchHz >= 0 ? `+${Math.round(pitchHz)}Hz` : `${Math.round(pitchHz)}Hz`;
    const ratePercent = Math.round((rateMultiplier - 1.0) * 100);
    const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

    const { audioStream } = tts.toStream(text, {
      pitch: pitchStr,
      rate: rateStr,
    });

    return await new Promise<Buffer>((resolve, reject) => {
      const audioChunks: Buffer[] = [];
      let isDone = false;

      const cleanup = () => {
        try {
          (tts as any)._ws?.close();
        } catch {}
      };

      // 9-second timeout to allow comfortable synthesis while guarding against hangs
      const timeout = setTimeout(() => {
        if (!isDone) {
          isDone = true;
          cleanup();
          if (audioChunks.length > 0) {
            resolve(Buffer.concat(audioChunks));
          } else {
            reject(new Error(`Edge TTS synthesis timed out for voice ${targetVoice}`));
          }
        }
      }, 9000);

      audioStream.on('data', (chunk: Buffer) => {
        audioChunks.push(chunk);
      });

      audioStream.on('end', () => {
        if (!isDone) {
          isDone = true;
          clearTimeout(timeout);
          cleanup();
          if (audioChunks.length > 0) {
            resolve(Buffer.concat(audioChunks));
          } else {
            reject(new Error(`Empty audio stream received for voice ${targetVoice}`));
          }
        }
      });

      audioStream.on('error', (err: Error) => {
        if (!isDone) {
          isDone = true;
          clearTimeout(timeout);
          cleanup();
          if (audioChunks.length > 0) {
            resolve(Buffer.concat(audioChunks));
          } else {
            reject(err);
          }
        }
      });
    });
  } catch (err: any) {
    throw new Error(`Edge TTS setup failure: ${err.message || err}`);
  }
}


