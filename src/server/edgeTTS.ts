import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export interface EdgeTTSSynthesizeOptions {
  text: string;
  voiceName?: string; // 'my-MM-ThihaNeural' | 'my-MM-NilarNeural'
  gender?: 'male' | 'female' | string;
  pitchHz?: number;  // Subtle natural pitch adjustment (-6Hz to +6Hz)
  rateMultiplier?: number; // 0.85 to 1.35
}

/**
 * Splits raw Burmese text into safe, naturally paced sentence chunks
 * for high-speed synthesis without WebSocket frame limits.
 */
function splitBurmeseTextIntoChunks(rawText: string, maxChunkLength = 180): string[] {
  const clean = rawText.trim();
  if (!clean) return [];

  // Split on Burmese sentence terminators (။), commas (၊), newlines, and punctuation
  const parts = clean.split(/([။၊\n\r!?.…]+)/);
  const chunks: string[] = [];
  let current = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (current.length + part.length <= maxChunkLength) {
      current += part;
    } else {
      if (current.trim()) chunks.push(current.trim());
      if (part.length > maxChunkLength) {
        // Sub-split very long sentences
        for (let j = 0; j < part.length; j += maxChunkLength) {
          const sub = part.slice(j, j + maxChunkLength).trim();
          if (sub) chunks.push(sub);
        }
        current = '';
      } else {
        current = part;
      }
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 0);
}

/**
 * Synthesize a single Burmese text chunk with Microsoft Edge Neural Voice
 */
async function synthesizeSingleEdgeChunk(
  chunkText: string,
  targetVoice: 'my-MM-ThihaNeural' | 'my-MM-NilarNeural',
  pitchHz: number = 0,
  rateMultiplier: number = 1.0
): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(targetVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

  // Keep pitch within subtle natural human bounds (-6Hz to +6Hz) to strictly prevent robotic/metallic sounds
  const safePitch = Math.max(-6, Math.min(6, Math.round(pitchHz || 0)));
  const pitchStr = safePitch >= 0 ? `+${safePitch}Hz` : `${safePitch}Hz`;

  const safeRate = Math.max(0.75, Math.min(1.4, Number(rateMultiplier) || 1.0));
  const ratePercent = Math.round((safeRate - 1.0) * 100);
  const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

  const { audioStream } = tts.toStream(chunkText, {
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
    }, 10000);

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
        // If audio chunks were already received before stream closed, resolve with the audio data
        if (audioChunks.length > 0) {
          resolve(Buffer.concat(audioChunks));
        } else {
          // If error is "no turn.end received" but error happened before any data, report clean error
          reject(err);
        }
      }
    });
  });
}

/**
 * High-Fidelity Microsoft Edge Neural Burmese TTS Engine
 * Crystal clear natural human speech - strictly eliminates robotic/mechanical tone:
 * - Male: 'my-MM-ThihaNeural' (သဘာဝကျသော အမျိုးသားအသံစစ်စစ်)
 * - Female: 'my-MM-NilarNeural' (ကြည်လင်သော အမျိုးသမီးအသံစစ်စစ်)
 */
export async function synthesizeWithEdgeTTS(options: EdgeTTSSynthesizeOptions): Promise<Buffer> {
  const { text, voiceName, gender, pitchHz = 0, rateMultiplier = 1.0 } = options;
  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('Text cannot be empty for TTS synthesis');
  }

  // Strict Voice & Gender Mapping Guard
  let targetVoice: 'my-MM-ThihaNeural' | 'my-MM-NilarNeural' = 'my-MM-NilarNeural';
  if (gender === 'male' || (typeof voiceName === 'string' && voiceName.includes('Thiha'))) {
    targetVoice = 'my-MM-ThihaNeural';
  } else if (gender === 'female' || (typeof voiceName === 'string' && voiceName.includes('Nilar'))) {
    targetVoice = 'my-MM-NilarNeural';
  } else if (typeof voiceName === 'string' && voiceName.toLowerCase().includes('male')) {
    targetVoice = voiceName.toLowerCase().includes('female') ? 'my-MM-NilarNeural' : 'my-MM-ThihaNeural';
  }

  // If text is short (< 200 chars), synthesize in a single pass
  if (cleanText.length <= 200) {
    return await synthesizeSingleEdgeChunk(cleanText, targetVoice, pitchHz, rateMultiplier);
  }

  // For long scripts (10-minute recaps), split into natural Myanmar sentence chunks
  const sentenceChunks = splitBurmeseTextIntoChunks(cleanText, 180);
  if (sentenceChunks.length === 0) sentenceChunks.push(cleanText);

  // Synthesize chunks with batching (up to 4 in parallel for zero latency)
  const batchSize = 4;
  const collectedBuffers: Buffer[] = [];

  for (let i = 0; i < sentenceChunks.length; i += batchSize) {
    const batch = sentenceChunks.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((chunk) => synthesizeSingleEdgeChunk(chunk, targetVoice, pitchHz, rateMultiplier))
    );

    for (let j = 0; j < batchResults.length; j++) {
      const res = batchResults[j];
      if (res.status === 'fulfilled' && res.value && res.value.length > 50) {
        collectedBuffers.push(res.value);
      } else {
        console.warn(`Chunk synthesis fallback for "${batch[j].substring(0, 30)}..."`);
      }
    }
  }

  if (collectedBuffers.length > 0) {
    return Buffer.concat(collectedBuffers);
  }

  // Fallback single attempt on first 200 chars
  return await synthesizeSingleEdgeChunk(cleanText.substring(0, 200), targetVoice, pitchHz, rateMultiplier);
}



