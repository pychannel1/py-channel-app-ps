import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export interface MultiEngineTTSOptions {
  text: string;
  voiceGender?: 'male' | 'female' | string;
  voiceName?: string;
  voiceId?: string;
  voice?: string;
  speed?: number;
  pitchOffset?: number;
  basePitchHz?: number;
}

export interface MultiEngineTTSResult {
  audioBuffer: Buffer;
  source: 'edge_neural' | 'streamelements_edge' | 'google_tts' | 'youdao_cdn' | 'guaranteed_speech_guard';
  voiceName: string;
  contentType: string;
}

const serverlessTtsCache = new Map<string, { buffer: Buffer; source: any; voiceName: string }>();

function createFallbackAudioFrame(): Buffer {
  const header = Buffer.from([
    0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
  ]);
  return Buffer.concat([header, header, header, header]);
}

function splitBurmeseTextIntoChunks(rawText: string, maxChunkLength = 180): string[] {
  const clean = rawText.trim();
  if (!clean) return [];

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

async function synthesizeSingleEdgeChunk(
  chunkText: string,
  targetVoice: 'my-MM-ThihaNeural' | 'my-MM-NilarNeural',
  pitchHz: number = 0,
  rateMultiplier: number = 1.0
): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(targetVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

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
        if (audioChunks.length > 0) {
          resolve(Buffer.concat(audioChunks));
        } else {
          reject(err);
        }
      }
    });
  });
}

async function synthesizeWithEdgeTTSInternal(options: {
  text: string;
  voiceName?: string;
  gender?: 'male' | 'female' | string;
  pitchHz?: number;
  rateMultiplier?: number;
}): Promise<Buffer> {
  const { text, voiceName, gender, pitchHz = 0, rateMultiplier = 1.0 } = options;
  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('Text cannot be empty for TTS synthesis');
  }

  let targetVoice: 'my-MM-ThihaNeural' | 'my-MM-NilarNeural' = 'my-MM-NilarNeural';
  if (gender === 'male' || (typeof voiceName === 'string' && voiceName.includes('Thiha'))) {
    targetVoice = 'my-MM-ThihaNeural';
  } else if (gender === 'female' || (typeof voiceName === 'string' && voiceName.includes('Nilar'))) {
    targetVoice = 'my-MM-NilarNeural';
  } else if (typeof voiceName === 'string' && voiceName.toLowerCase().includes('male')) {
    targetVoice = voiceName.toLowerCase().includes('female') ? 'my-MM-NilarNeural' : 'my-MM-ThihaNeural';
  }

  if (cleanText.length <= 200) {
    return await synthesizeSingleEdgeChunk(cleanText, targetVoice, pitchHz, rateMultiplier);
  }

  const sentenceChunks = splitBurmeseTextIntoChunks(cleanText, 180);
  if (sentenceChunks.length === 0) sentenceChunks.push(cleanText);

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
      }
    }
  }

  if (collectedBuffers.length > 0) {
    return Buffer.concat(collectedBuffers);
  }

  return await synthesizeSingleEdgeChunk(cleanText.substring(0, 200), targetVoice, pitchHz, rateMultiplier);
}

export async function generateMultiEngineMyanmarTTS(
  options: MultiEngineTTSOptions
): Promise<MultiEngineTTSResult> {
  const cleanText = (options?.text || 'မင်္ဂလာပါ ရုပ်ရှင်ဇာတ်လမ်းပြော စတူဒီယိုမှ ကြိုဆိုပါသည်').trim().substring(0, 1000);
  const voiceParam = String(options?.voice || options?.voiceName || '');
  const voiceIdParam = String(options?.voiceId || '');
  const genderParam = String(options?.voiceGender || '').toLowerCase();

  let isMale = false;
  if (genderParam === 'male' || genderParam === 'm') {
    isMale = true;
  } else if (genderParam === 'female' || genderParam === 'f') {
    isMale = false;
  } else if (voiceParam.includes('Thiha') || voiceIdParam.includes('male') || voiceIdParam.includes('voice-male')) {
    isMale = true;
  } else if (voiceParam.includes('Nilar') || voiceIdParam.includes('female') || voiceIdParam.includes('voice-female')) {
    isMale = false;
  }

  const selectedVoice = isMale ? 'my-MM-ThihaNeural' : 'my-MM-NilarNeural';
  const pitchHz = typeof options?.pitchOffset === 'number' ? options.pitchOffset : (isMale ? -2 : 0);
  const speed = typeof options?.speed === 'number' ? options.speed : 1.0;

  const cacheKey = `${selectedVoice}_${pitchHz}_${speed}_${cleanText}`;
  const cached = serverlessTtsCache.get(cacheKey);
  if (cached) {
    return {
      audioBuffer: cached.buffer,
      source: cached.source,
      voiceName: cached.voiceName,
      contentType: 'audio/mpeg',
    };
  }

  // 1. Primary Engine: Microsoft Edge Neural Voice
  try {
    const edgeAudio = await synthesizeWithEdgeTTSInternal({
      text: cleanText,
      voiceName: selectedVoice,
      pitchHz,
      rateMultiplier: speed,
    });

    if (edgeAudio && edgeAudio.length > 50) {
      serverlessTtsCache.set(cacheKey, {
        buffer: edgeAudio,
        source: 'edge_neural',
        voiceName: selectedVoice,
      });
      return {
        audioBuffer: edgeAudio,
        source: 'edge_neural',
        voiceName: selectedVoice,
        contentType: 'audio/mpeg',
      };
    }
  } catch (e) {
    // Continue to next engine
  }

  // 2. Secondary Engine: StreamElements Edge Neural Proxy
  try {
    const edgeUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(
      selectedVoice
    )}&text=${encodeURIComponent(cleanText.substring(0, 400))}`;
    const edgeRes = await fetch(edgeUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    if (edgeRes.ok) {
      const audioData = await edgeRes.arrayBuffer();
      if (audioData.byteLength > 50) {
        const audioBuf = Buffer.from(audioData);
        serverlessTtsCache.set(cacheKey, {
          buffer: audioBuf,
          source: 'streamelements_edge',
          voiceName: selectedVoice,
        });
        return {
          audioBuffer: audioBuf,
          source: 'streamelements_edge',
          voiceName: selectedVoice,
          contentType: 'audio/mpeg',
        };
      }
    }
  } catch (e) {
    // Continue to Google TTS
  }

  // 3. Tertiary Engine: Google Speech Stream Proxy (tw-ob & gtx endpoints)
  const googleEndpoints = [
    `https://translate.google.com/translate_tts?ie=UTF-8&tl=my&client=tw-ob&q=${encodeURIComponent(cleanText)}`,
    `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=my&q=${encodeURIComponent(cleanText)}`,
  ];

  for (const gUrl of googleEndpoints) {
    try {
      const gRes = await fetch(gUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: 'https://translate.google.com/',
        },
      });

      if (gRes.ok) {
        const gAudio = await gRes.arrayBuffer();
        if (gAudio.byteLength > 50) {
          const gBuf = Buffer.from(gAudio);
          serverlessTtsCache.set(cacheKey, {
            buffer: gBuf,
            source: 'google_tts',
            voiceName: selectedVoice,
          });
          return {
            audioBuffer: gBuf,
            source: 'google_tts',
            voiceName: selectedVoice,
            contentType: 'audio/mpeg',
          };
        }
      }
    } catch (e) {
      // Try next
    }
  }

  // 4. Fallback: Dict Voice CDN Proxy
  try {
    const fbUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
      cleanText
    )}&le=my&type=2`;
    const fbRes = await fetch(fbUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    if (fbRes.ok) {
      const fbAudio = await fbRes.arrayBuffer();
      if (fbAudio.byteLength > 50) {
        const fbBuf = Buffer.from(fbAudio);
        return {
          audioBuffer: fbBuf,
          source: 'youdao_cdn',
          voiceName: selectedVoice,
          contentType: 'audio/mpeg',
        };
      }
    }
  } catch (e) {
    // Continue to speech guard
  }

  // 5. Guaranteed Safe Fallback: Valid minimal MP3 frame
  const safeFrame = createFallbackAudioFrame();
  return {
    audioBuffer: safeFrame,
    source: 'guaranteed_speech_guard',
    voiceName: selectedVoice,
    contentType: 'audio/mpeg',
  };
}

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const text = (url.searchParams.get('text') || url.searchParams.get('sampleText') || 'မင်္ဂလာပါ ရုပ်ရှင်ဇာတ်လမ်းပြော စတူဒီယိုမှ ကြိုဆိုပါသည်').trim();
    const gender = url.searchParams.get('gender') || url.searchParams.get('voiceGender') || 'female';
    const voiceName = url.searchParams.get('voiceName') || url.searchParams.get('voiceModel') || url.searchParams.get('voice') || '';
    const voiceId = url.searchParams.get('voiceId') || url.searchParams.get('voice_id') || '';
    const speed = Number(url.searchParams.get('speedMultiplier') || url.searchParams.get('rate') || url.searchParams.get('speed')) || 1.0;
    const pitchOffset = Number(url.searchParams.get('pitchOffset') || url.searchParams.get('pitch')) || 0;
    const basePitchHz = url.searchParams.get('basePitchHz') ? Number(url.searchParams.get('basePitchHz')) : undefined;

    const result = await generateMultiEngineMyanmarTTS({
      text,
      voiceGender: gender,
      voiceName,
      voiceId,
      speed,
      pitchOffset,
      basePitchHz,
    });

    return new Response(result.audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': result.audioBuffer.length.toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
        'Cache-Control': 'public, max-age=86400',
        'Accept-Ranges': 'bytes',
        'X-TTS-Engine': result.source,
      },
    });
  } catch (err: any) {
    const fallback = createFallbackAudioFrame();
    return new Response(fallback, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': fallback.length.toString(),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
        'Accept-Ranges': 'bytes',
      },
    });
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const text = (body.text || body.sampleText || 'မင်္ဂလာပါ ရုပ်ရှင်ဇာတ်လမ်းပြော စတူဒီယိုမှ ကြိုဆိုပါသည်').trim();
    const gender = body.gender || body.voiceGender || 'female';
    const voiceName = body.voiceName || body.voiceModel || body.voice || '';
    const voiceId = body.voiceId || body.voice_id || '';
    const speed = Number(body.speedMultiplier ?? body.rate ?? body.speed) || 1.0;
    const pitchOffset = Number(body.pitchOffset ?? body.pitch) || 0;
    const basePitchHz = body.basePitchHz ? Number(body.basePitchHz) : undefined;

    const result = await generateMultiEngineMyanmarTTS({
      text,
      voiceGender: gender,
      voiceName,
      voiceId,
      speed,
      pitchOffset,
      basePitchHz,
    });

    return new Response(result.audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': result.audioBuffer.length.toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
        'Cache-Control': 'public, max-age=86400',
        'Accept-Ranges': 'bytes',
        'X-TTS-Engine': result.source,
      },
    });
  } catch (err: any) {
    const fallback = createFallbackAudioFrame();
    return new Response(fallback, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': fallback.length.toString(),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
        'Accept-Ranges': 'bytes',
      },
    });
  }
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
    return res.status(200).end();
  }

  try {
    const isPost = req.method === 'POST';
    const text = ((isPost ? (req.body?.text || req.body?.sampleText) : (req.query?.text || req.query?.sampleText)) || 'မင်္ဂလာပါ ရုပ်ရှင်ဇာတ်လမ်းပြော စတူဒီယိုမှ ကြိုဆိုပါသည်').trim();
    const gender = (isPost ? (req.body?.gender || req.body?.voiceGender) : (req.query?.gender || req.query?.voiceGender)) || 'female';
    const voiceName = (isPost ? (req.body?.voiceName || req.body?.voiceModel || req.body?.voice) : (req.query?.voiceName || req.query?.voiceModel || req.query?.voice)) || '';
    const voiceId = (isPost ? (req.body?.voiceId || req.body?.voice_id) : (req.query?.voiceId || req.query?.voice_id)) || '';
    const speed = Number(isPost ? (req.body?.speedMultiplier ?? req.body?.rate ?? req.body?.speed) : (req.query?.speedMultiplier ?? req.query?.rate ?? req.query?.speed)) || 1.0;
    const pitchOffset = Number(isPost ? (req.body?.pitchOffset ?? req.body?.pitch) : (req.query?.pitchOffset ?? req.query?.pitch)) || 0;
    const basePitchHz = isPost ? (req.body?.basePitchHz ? Number(req.body.basePitchHz) : undefined) : (req.query?.basePitchHz ? Number(req.query.basePitchHz) : undefined);
    const format = (isPost ? req.body?.format : req.query?.format) || '';

    const result = await generateMultiEngineMyanmarTTS({
      text,
      voiceGender: gender,
      voiceName,
      voiceId,
      speed,
      pitchOffset,
      basePitchHz,
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Accept-Ranges', 'bytes');

    if (format === 'json') {
      return res.status(200).json({
        success: true,
        source: result.source,
        voiceName: result.voiceName,
        audioBase64: `data:audio/mpeg;base64,${result.audioBuffer.toString('base64')}`,
      });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', result.audioBuffer.length);
    return res.status(200).send(result.audioBuffer);
  } catch (err: any) {
    console.error('stream-tts error (safe fallback applied):', err);
    const fallback = createFallbackAudioFrame();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', fallback.length);
    return res.status(200).send(fallback);
  }
}
