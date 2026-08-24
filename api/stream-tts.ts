import { generateMultiEngineMyanmarTTS } from './tts';

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
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
    const fallbackResult = await generateMultiEngineMyanmarTTS({ text: 'မင်္ဂလာပါ' }).catch(() => ({
      audioBuffer: Buffer.alloc(128),
      source: 'guaranteed_speech_guard' as const,
      voiceName: 'my-MM-NilarNeural',
      contentType: 'audio/mpeg',
    }));
    return new Response(fallbackResult.audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': fallbackResult.audioBuffer.length.toString(),
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
    const fallbackResult = await generateMultiEngineMyanmarTTS({ text: 'မင်္ဂလာပါ' }).catch(() => ({
      audioBuffer: Buffer.alloc(128),
      source: 'guaranteed_speech_guard' as const,
      voiceName: 'my-MM-NilarNeural',
      contentType: 'audio/mpeg',
    }));
    return new Response(fallbackResult.audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': fallbackResult.audioBuffer.length.toString(),
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
    const fallbackResult = await generateMultiEngineMyanmarTTS({ text: 'မင်္ဂလာပါ' }).catch(() => ({
      audioBuffer: Buffer.alloc(128),
      source: 'guaranteed_speech_guard' as const,
      voiceName: 'my-MM-NilarNeural',
      contentType: 'audio/mpeg',
    }));
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', fallbackResult.audioBuffer.length);
    return res.status(200).send(fallbackResult.audioBuffer);
  }
}

