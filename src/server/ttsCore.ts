import { synthesizeWithEdgeTTS } from './edgeTTS';

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

// In-memory serverless cache
const serverlessTtsCache = new Map<string, { buffer: Buffer; source: any; voiceName: string }>();

// Minimal valid silent MP3 frame buffer (104 bytes valid MPEG-1 Layer 3 audio frame)
export function createFallbackAudioFrame(): Buffer {
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

/**
 * Executes a sequential fail-proof Multi-Engine Myanmar TTS generation
 */
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
    const edgeAudio = await synthesizeWithEdgeTTS({
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
