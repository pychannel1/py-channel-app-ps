import { generateMultiEngineMyanmarTTS } from './tts';

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const text = (url.searchParams.get('text') || 'မင်္ဂလာပါ').trim();
    const gender = url.searchParams.get('gender') || 'female';
    const voiceName = url.searchParams.get('voiceName') || url.searchParams.get('voiceModel') || url.searchParams.get('voice') || '';
    const voiceId = url.searchParams.get('voiceId') || '';
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
        'Cache-Control': 'public, max-age=86400',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (err: any) {
    return new Response(err.message || 'Stream error', {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).end();
  }

  try {
    const text = (req.query?.text || 'မင်္ဂလာပါ').trim();
    const gender = req.query?.gender || 'female';
    const voiceName = req.query?.voiceName || req.query?.voiceModel || req.query?.voice || '';
    const voiceId = req.query?.voiceId || '';
    const speed = Number(req.query?.speedMultiplier || req.query?.rate || req.query?.speed) || 1.0;
    const pitchOffset = Number(req.query?.pitchOffset || req.query?.pitch) || 0;
    const basePitchHz = req.query?.basePitchHz ? Number(req.query.basePitchHz) : undefined;

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
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', result.audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Accept-Ranges', 'bytes');
    return res.status(200).send(result.audioBuffer);
  } catch (err: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).send(err.message || 'Stream error');
  }
}
