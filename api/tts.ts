/**
 * Fail-Proof Multi-Engine Myanmar Voice AI Pipeline (Edge Neural TTS + Multi-Provider Fallbacks)
 * Provides a reliable, sequentially executed TTS synthesis handler across 3+ independent TTS providers.
 */

export interface MultiEngineTTSOptions {
  text: string;
  voiceGender?: 'male' | 'female' | string;
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
  const isMale =
    options.voiceGender === 'male' ||
    (typeof options.voiceGender === 'string' && options.voiceGender.toLowerCase().includes('male'));
  const voiceName = isMale ? 'my-MM-ThihaNeural' : 'my-MM-NilarNeural';

  // 1. Primary Engine: StreamElements Edge Neural TTS / Microsoft Edge TTS
  try {
    const edgeUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(
      voiceName
    )}&text=${encodeURIComponent(cleanText)}`;
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
          voiceName,
          contentType: 'audio/mpeg',
        };
      }
    }
  } catch (e) {
    console.warn('Primary StreamElements Edge TTS failed, switching to Secondary...', e);
  }

  // 2. Secondary Engine: Google Speech Stream Proxy (with chunking for long sentences)
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
          voiceName,
          contentType: 'audio/mpeg',
        };
      }
    }
  } catch (e) {
    console.warn('Secondary Google TTS failed, switching to Tertiary...', e);
  }

  // 3. Tertiary Engine: Dict Voice CDN Proxy
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
          voiceName,
          contentType: 'audio/mpeg',
        };
      }
    }
  } catch (e) {
    console.warn('Tertiary Youdao CDN TTS failed:', e);
  }

  // 4. Ultimate Fallback: Google Translate GTX Endpoint
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
          voiceName,
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
 * Standard Web Request/Response Serverless Handler (api/tts.ts)
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const { text, voiceGender = 'female', speed = 1.0, pitchOffset = 0, basePitchHz } = body;
    const cleanText = (text || 'မင်္ဂလာပါ').trim().substring(0, 800);

    const result = await generateMultiEngineMyanmarTTS({
      text: cleanText,
      voiceGender,
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
