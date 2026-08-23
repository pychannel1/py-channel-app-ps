import { generateMultiEngineMyanmarTTS } from './tts';

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      text = 'မင်္ဂလာပါ',
      gender = 'female',
      voiceName,
      voiceModel,
      voiceId,
      pitchOffset = 0,
      speedMultiplier = 1.0,
      basePitchHz,
    } = body;

    const result = await generateMultiEngineMyanmarTTS({
      text: String(text).trim(),
      voiceGender: gender,
      voiceName: voiceName || voiceModel,
      voiceId,
      pitchOffset: Number(pitchOffset) || 0,
      speed: Number(speedMultiplier) || 1.0,
      basePitchHz: basePitchHz ? Number(basePitchHz) : undefined,
    });

    const base64 = result.audioBuffer.toString('base64');

    return new Response(
      JSON.stringify({
        success: true,
        source: result.source,
        voiceName: result.voiceName,
        gender,
        voiceId,
        mimeType: 'audio/mpeg',
        audioBase64: `data:audio/mpeg;base64,${base64}`,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Synthesis failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).end();
  }

  try {
    const {
      text = 'မင်္ဂလာပါ',
      gender = 'female',
      voiceName,
      voiceModel,
      voiceId,
      pitchOffset = 0,
      speedMultiplier = 1.0,
      basePitchHz,
    } = req.body || {};

    const result = await generateMultiEngineMyanmarTTS({
      text: String(text).trim(),
      voiceGender: gender,
      voiceName: voiceName || voiceModel,
      voiceId,
      pitchOffset: Number(pitchOffset) || 0,
      speed: Number(speedMultiplier) || 1.0,
      basePitchHz: basePitchHz ? Number(basePitchHz) : undefined,
    });

    const base64 = result.audioBuffer.toString('base64');

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      success: true,
      source: result.source,
      voiceName: result.voiceName,
      gender,
      voiceId,
      mimeType: 'audio/mpeg',
      audioBase64: `data:audio/mpeg;base64,${base64}`,
    });
  } catch (err: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ error: err.message || 'Synthesis failed' });
  }
}
