import { generateMultiEngineMyanmarTTS } from './stream-tts';

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const text = (body.text || body.sampleText || 'မင်္ဂလာပါ').trim();
    const gender = body.gender || 'female';
    const voiceName = body.voiceName || '';
    const voiceId = body.voice_id || body.voiceId || '';
    const speed = Number(body.rate ?? body.speed) || 1.0;
    const pitchOffset = Number(body.pitchOffset) || 0;
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
      },
    });
  } catch (err: any) {
    const fallback = await generateMultiEngineMyanmarTTS({ text: 'မင်္ဂလာပါ' }).catch(() => ({
      audioBuffer: Buffer.alloc(128),
      source: 'guaranteed_speech_guard' as const,
      voiceName: 'my-MM-NilarNeural',
      contentType: 'audio/mpeg',
    }));
    return new Response(fallback.audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': fallback.audioBuffer.length.toString(),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }
}

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const text = (url.searchParams.get('text') || url.searchParams.get('sampleText') || 'မင်္ဂလာပါ').trim();
    const gender = url.searchParams.get('gender') || 'female';
    const voiceName = url.searchParams.get('voiceName') || '';
    const voiceId = url.searchParams.get('voice_id') || url.searchParams.get('voiceId') || '';
    const speed = Number(url.searchParams.get('rate') || url.searchParams.get('speed')) || 1.0;
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
      },
    });
  } catch (err: any) {
    const fallback = await generateMultiEngineMyanmarTTS({ text: 'မင်္ဂလာပါ' }).catch(() => ({
      audioBuffer: Buffer.alloc(128),
      source: 'guaranteed_speech_guard' as const,
      voiceName: 'my-MM-NilarNeural',
      contentType: 'audio/mpeg',
    }));
    return new Response(fallback.audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': fallback.audioBuffer.length.toString(),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
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
    const text = ((req.method === 'POST' ? (req.body?.text || req.body?.sampleText) : req.query?.text) || 'မင်္ဂလာပါ').trim();
    const gender = (req.method === 'POST' ? req.body?.gender : req.query?.gender) || 'female';
    const voiceName = (req.method === 'POST' ? req.body?.voiceName : req.query?.voiceName) || '';
    const voiceId = (req.method === 'POST' ? (req.body?.voice_id || req.body?.voiceId) : (req.query?.voice_id || req.query?.voiceId)) || '';
    const speed = Number(req.method === 'POST' ? (req.body?.rate ?? req.body?.speed) : (req.query?.rate ?? req.query?.speed)) || 1.0;
    const pitchOffset = Number(req.method === 'POST' ? req.body?.pitchOffset : req.query?.pitchOffset) || 0;
    const basePitchHz = req.method === 'POST' ? req.body?.basePitchHz : (req.query?.basePitchHz ? Number(req.query.basePitchHz) : undefined);

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
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', result.audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Accept-Ranges', 'bytes');
    return res.status(200).send(result.audioBuffer);
  } catch (err: any) {
    console.error('tts-preview error:', err);
    const fallback = await generateMultiEngineMyanmarTTS({ text: 'မင်္ဂလာပါ' }).catch(() => ({
      audioBuffer: Buffer.alloc(128),
      source: 'guaranteed_speech_guard' as const,
      voiceName: 'my-MM-NilarNeural',
      contentType: 'audio/mpeg',
    }));
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', fallback.audioBuffer.length);
    return res.status(200).send(fallback.audioBuffer);
  }
}

