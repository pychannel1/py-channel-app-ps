import { synthesizeWithEdgeTTS } from '../src/server/edgeTTS';

/**
 * Fail-Proof Multi-Engine Myanmar Voice AI Pipeline (Edge Neural TTS + Multi-Provider Fallbacks)
 * Provides a reliable, sequentially executed TTS synthesis handler across 3+ independent TTS providers.
 */

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
  source: 'edge_neural' | 'streamelements_edge' | 'google_tts' | 'youdao_cdn';
  voiceName: string;
  contentType: string;
}

/**
 * Executes a sequential fail-proof Multi-Engine Myanmar TTS generation
 */
export async function generateMultiEngineMyanmarTTS(
  options: MultiEngineTTSOptions
): Promise<MultiEngineTTSResult> {
  const cleanText = (options.text || 'မင်္ဂလာပါ').trim().substring(0, 800);
  const voiceParam = options.voice || options.voiceName || '';
  const voiceIdParam = options.voiceId || '';
  const genderParam = (options.voiceGender || '').toLowerCase();

  let isMale = false;
  if (genderParam === 'male' || genderParam === 'm') {
    isMale = true;
  } else if (genderParam === 'female' || genderParam === 'f') {
    isMale = false;
  } else if (voiceParam.includes('Thiha') || voiceIdParam.includes('male')) {
    isMale = true;
  } else if (voiceParam.includes('Nilar') || voiceIdParam.includes('female')) {
    isMale = false;
  }

  const selectedVoice = isMale ? 'my-MM-ThihaNeural' : 'my-MM-NilarNeural';
  const pitchHz = typeof options.pitchOffset === 'number' ? options.pitchOffset : (isMale ? -18 : 8);
  const speed = typeof options.speed === 'number' ? options.speed : 1.0;

  // 1. Primary Engine: Real Microsoft Edge Neural Voice (Thiha = Male, Nilar = Female)
  try {
    const edgeAudio = await synthesizeWithEdgeTTS({
      text: cleanText,
      voiceName: selectedVoice,
      gender: isMale ? 'male' : 'female',
      pitchHz,
      rateMultiplier: speed,
    });

    if (edgeAudio && edgeAudio.length > 50) {
      return {
        audioBuffer: edgeAudio,
        source: 'edge_neural',
        voiceName: selectedVoice,
        contentType: 'audio/mpeg',
      };
    }
  } catch (e) {
    console.warn('Primary Edge Neural TTS failed, switching to StreamElements/Google...', e);
  }

  // 2. Secondary Engine: StreamElements Edge Neural Proxy
  try {
    const edgeUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(
      selectedVoice
    )}&text=${encodeURIComponent(cleanText.substring(0, 500))}`;
    const edgeRes = await fetch(edgeUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
      },
    });

    if (edgeRes.ok) {
      const audioData = await edgeRes.arrayBuffer();
      if (audioData.byteLength > 100) {
        return {
          audioBuffer: Buffer.from(audioData),
          source: 'streamelements_edge',
          voiceName: selectedVoice,
          contentType: 'audio/mpeg',
        };
      }
    }
  } catch (e) {
    console.warn('Secondary StreamElements Edge TTS failed, switching to Google TTS...', e);
  }

  // 3. Tertiary Engine: Google Speech Stream Proxy
  try {
    const gUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=my&client=tw-ob&q=${encodeURIComponent(
      cleanText
    )}`;
    const gRes = await fetch(gUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
      },
    });

    if (gRes.ok) {
      const gAudio = await gRes.arrayBuffer();
      if (gAudio.byteLength > 100) {
        return {
          audioBuffer: Buffer.from(gAudio),
          source: 'google_tts',
          voiceName: selectedVoice,
          contentType: 'audio/mpeg',
        };
      }
    }
  } catch (e) {
    console.warn('Tertiary Google TTS failed, switching to Dict Youdao...', e);
  }

  // 4. Fallback: Dict Voice CDN Proxy
  try {
    const fallbackUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(cleanText)}&le=my`;
    const fbRes = await fetch(fallbackUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    if (fbRes.ok) {
      const fbAudio = await fbRes.arrayBuffer();
      if (fbAudio.byteLength > 50) {
        return {
          audioBuffer: Buffer.from(fbAudio),
          source: 'youdao_cdn',
          voiceName: selectedVoice,
          contentType: 'audio/mpeg',
        };
      }
    }
  } catch (e) {
    console.warn('Dict CDN TTS failed:', e);
  }

  // 5. Ultimate Fallback: Google Translate GTX Endpoint
  try {
    const gtxUrl = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=my&q=${encodeURIComponent(
      cleanText
    )}`;
    const gtxRes = await fetch(gtxUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    if (gtxRes.ok) {
      const gtxAudio = await gtxRes.arrayBuffer();
      if (gtxAudio.byteLength > 50) {
        return {
          audioBuffer: Buffer.from(gtxAudio),
          source: 'google_tts',
          voiceName: selectedVoice,
          contentType: 'audio/mpeg',
        };
      }
    }
  } catch (e) {
    console.error('Final fallback failed:', e);
  }

  throw new Error('All Myanmar TTS fallback engines failed to generate audio');
}

/**
 * Standard Web Request/Response and Vercel Serverless Function Handler (api/tts.ts)
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const { text, voiceGender = 'female', speed = 1.0, pitchOffset = 0, basePitchHz, voice, voiceName, voiceId } = body;
    const cleanText = (text || 'မင်္ဂလာပါ').trim().substring(0, 1000);

    const result = await generateMultiEngineMyanmarTTS({
      text: cleanText,
      voiceGender,
      voice,
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
        'Cache-Control': 'public, max-age=86400',
        'X-TTS-Engine': result.source,
        'X-TTS-Voice': result.voiceName,
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'TTS generation error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const text = url.searchParams.get('text') || 'မင်္ဂလာပါ';
    const voiceGender = url.searchParams.get('gender') || url.searchParams.get('voiceGender') || 'female';
    const speed = Number(url.searchParams.get('rate') || url.searchParams.get('speed')) || 1.0;
    const pitchOffset = Number(url.searchParams.get('pitch') || url.searchParams.get('pitchOffset')) || 0;

    const result = await generateMultiEngineMyanmarTTS({
      text,
      voiceGender,
      speed,
      pitchOffset,
    });

    return new Response(result.audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': result.audioBuffer.length.toString(),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'TTS stream error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

// Standard Vercel Serverless Function export (Node runtime)
export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  try {
    const text = (req.method === 'POST' ? req.body?.text : req.query?.text) || 'မင်္ဂလာပါ';
    const voiceGender = (req.method === 'POST' ? (req.body?.voiceGender || req.body?.gender) : (req.query?.gender || req.query?.voiceGender)) || 'female';
    const voice = (req.method === 'POST' ? req.body?.voice : req.query?.voice) || '';
    const voiceName = (req.method === 'POST' ? req.body?.voiceName : req.query?.voiceName) || '';
    const voiceId = (req.method === 'POST' ? req.body?.voiceId : req.query?.voiceId) || '';
    const speed = Number(req.method === 'POST' ? (req.body?.speed ?? req.body?.rate) : (req.query?.speed ?? req.query?.rate)) || 1.0;
    const pitchOffset = Number(req.method === 'POST' ? req.body?.pitchOffset : req.query?.pitchOffset) || 0;
    const basePitchHz = req.method === 'POST' ? req.body?.basePitchHz : (req.query?.basePitchHz ? Number(req.query.basePitchHz) : undefined);

    const result = await generateMultiEngineMyanmarTTS({
      text: String(text).trim(),
      voiceGender: String(voiceGender),
      voice: String(voice),
      voiceName: String(voiceName),
      voiceId: String(voiceId),
      speed,
      pitchOffset,
      basePitchHz,
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', result.audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(result.audioBuffer);
  } catch (error: any) {
    console.error('Vercel serverless TTS error:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: error.message || 'TTS generation failed' });
  }
}
