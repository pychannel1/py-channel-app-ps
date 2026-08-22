import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export interface EdgeTTSSynthesizeOptions {
  text: string;
  voiceName: string; // 'my-MM-ThihaNeural' | 'my-MM-NilarNeural'
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
  const { text, voiceName, pitchHz = 0, rateMultiplier = 1.0 } = options;

  // Strict Voice Selection Guard
  const targetVoice =
    voiceName && voiceName.includes('Thiha')
      ? 'my-MM-ThihaNeural'
      : voiceName && voiceName.includes('Nilar')
      ? 'my-MM-NilarNeural'
      : voiceName || 'my-MM-ThihaNeural';

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

  return new Promise<Buffer>((resolve, reject) => {
    const audioChunks: Buffer[] = [];
    let isDone = false;

    // Fast 6-second timeout to quickly fallback to Google Neural TTS if Edge websocket has latency
    const timeout = setTimeout(() => {
      if (!isDone) {
        isDone = true;
        if (audioChunks.length > 0) {
          resolve(Buffer.concat(audioChunks));
        } else {
          reject(new Error(`Edge TTS synthesis timed out for voice ${targetVoice}`));
        }
      }
    }, 6000);

    audioStream.on('data', (chunk: Buffer) => {
      audioChunks.push(chunk);
    });

    audioStream.on('end', () => {
      if (!isDone) {
        isDone = true;
        clearTimeout(timeout);
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
        if (audioChunks.length > 0) {
          resolve(Buffer.concat(audioChunks));
        } else {
          reject(err);
        }
      }
    });
  });
}
