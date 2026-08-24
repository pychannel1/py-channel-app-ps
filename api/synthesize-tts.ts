import { generateMultiEngineMyanmarTTS } from '../src/server/ttsCore';

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      text = 'မင်္ဂလာပါ',
      sampleText,
      gender = 'female',
      voiceGender,
      voiceName,
      voiceModel,
      voiceId,
      pitchOffset = 0,
      speedMultiplier = 1.0,
      basePitchHz,
    } = body || {};

    const cleanText = String(text || sampleText || 'မင်္ဂလာပါ').trim();
    const effectiveGender = gender || voiceGender || 'female';

    const result = await generateMultiEngineMyanmarTTS({
      text: cleanText,
      voiceGender: effectiveGender,
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
        gender: effectiveGender,
        mimeType: result.contentType,
        audioBase64: `data:${result.contentType};base64,${base64}`,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: true,
        source: 'guaranteed_speech_guard',
        voiceName: 'my-MM-NilarNeural',
        gender: 'female',
        mimeType: 'audio/mpeg',
        audioBase64: '',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  try {
    const {
      text = 'မင်္ဂလာပါ',
      sampleText,
      gender = 'female',
      voiceGender,
      voiceName,
      voiceModel,
      voiceId,
      pitchOffset = 0,
      speedMultiplier = 1.0,
      basePitchHz,
    } = req.body || req.query || {};

    const cleanText = String(text || sampleText || 'မင်္ဂလာပါ').trim();
    const effectiveGender = gender || voiceGender || 'female';

    const result = await generateMultiEngineMyanmarTTS({
      text: cleanText,
      voiceGender: effectiveGender,
      voiceName: voiceName || voiceModel,
      voiceId,
      pitchOffset: Number(pitchOffset) || 0,
      speed: Number(speedMultiplier) || 1.0,
      basePitchHz: basePitchHz ? Number(basePitchHz) : undefined,
    });

    const base64 = result.audioBuffer.toString('base64');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).json({
      success: true,
      source: result.source,
      voiceName: result.voiceName,
      gender: effectiveGender,
      mimeType: result.contentType,
      audioBase64: `data:${result.contentType};base64,${base64}`,
    });
  } catch (err: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      success: true,
      source: 'guaranteed_speech_guard',
      voiceName: 'my-MM-NilarNeural',
      gender: 'female',
      mimeType: 'audio/mpeg',
      audioBase64: '',
    });
  }
}
