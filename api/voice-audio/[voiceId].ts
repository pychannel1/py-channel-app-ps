import { generateMultiEngineMyanmarTTS } from '../_ttsCore';
import { BURMESE_VOICE_AVATARS } from '../../src/data/burmeseVoices';

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const pathParts = url.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    const pathVoiceId = (lastPart && lastPart !== '[voiceId]' && lastPart !== 'voice-audio') ? lastPart : '';

    const voiceId = url.searchParams.get('voiceId') || url.searchParams.get('voice_id') || pathVoiceId || 'voice-male-bb';
    const matchedVoice = BURMESE_VOICE_AVATARS.find((v) => v.id === voiceId) ||
      BURMESE_VOICE_AVATARS.find((v) => v.code.toLowerCase() === voiceId.toLowerCase());

    const defaultText = matchedVoice?.samplePhraseBurmese || 'မင်္ဂလာပါ ရုပ်ရှင်ဇာတ်လမ်းပြော စတူဒီယိုမှ ကြိုဆိုပါသည်';
    const text = (url.searchParams.get('text') || url.searchParams.get('sampleText') || defaultText).trim();
    const gender = url.searchParams.get('gender') || matchedVoice?.gender || (voiceId.includes('female') ? 'female' : 'male');
    const speed = Number(url.searchParams.get('speedMultiplier') || url.searchParams.get('rate') || url.searchParams.get('speed')) || (matchedVoice?.baseRate || 1.0);
    const pitchOffset = Number(url.searchParams.get('pitchOffset') || url.searchParams.get('pitch')) || 0;
    const basePitchHz = url.searchParams.get('basePitchHz') ? Number(url.searchParams.get('basePitchHz')) : matchedVoice?.basePitchHz;

    const result = await generateMultiEngineMyanmarTTS({
      text,
      voiceGender: gender,
      voiceName: matchedVoice?.voiceName || (gender === 'male' ? 'my-MM-ThihaNeural' : 'my-MM-NilarNeural'),
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
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
        'Accept-Ranges': 'bytes',
        'X-TTS-Engine': result.source,
        'X-TTS-Voice': result.voiceName,
      },
    });
  } catch (err: any) {
    const fallback = await generateMultiEngineMyanmarTTS({ text: 'မင်္ဂလာပါ' }).catch(() => ({
      audioBuffer: Buffer.alloc(128),
      source: 'guaranteed_speech_guard' as const,
      voiceName: 'my-MM-ThihaNeural',
      contentType: 'audio/mpeg',
    }));
    return new Response(fallback.audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': fallback.audioBuffer.length.toString(),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=604800',
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
    const rawVoiceId = req.query?.voiceId || req.query?.voice_id || req.query?.id || (req.url ? req.url.split('?')[0].split('/').pop() : '') || 'voice-male-bb';
    const voiceId = String(rawVoiceId || 'voice-male-bb').trim();

    const matchedVoice = BURMESE_VOICE_AVATARS.find((v) => v.id === voiceId) ||
      BURMESE_VOICE_AVATARS.find((v) => v.code.toLowerCase() === voiceId.toLowerCase());

    const defaultText = matchedVoice?.samplePhraseBurmese || 'မင်္ဂလာပါ ရုပ်ရှင်ဇာတ်လမ်းပြော စတူဒီယိုမှ ကြိုဆိုပါသည်';
    const text = String(req.query?.text || req.body?.text || defaultText).trim();
    const gender = String(req.query?.gender || req.body?.gender || matchedVoice?.gender || (voiceId.includes('female') ? 'female' : 'male'));
    const speed = Number(req.query?.speedMultiplier || req.query?.rate || req.query?.speed || req.body?.speedMultiplier || matchedVoice?.baseRate || 1.0);
    const pitchOffset = Number(req.query?.pitchOffset || req.query?.pitch || req.body?.pitchOffset || 0);
    const basePitchHz = (req.query?.basePitchHz || req.body?.basePitchHz) ? Number(req.query?.basePitchHz || req.body?.basePitchHz) : matchedVoice?.basePitchHz;

    const result = await generateMultiEngineMyanmarTTS({
      text,
      voiceGender: gender,
      voiceName: matchedVoice?.voiceName || (gender === 'male' ? 'my-MM-ThihaNeural' : 'my-MM-NilarNeural'),
      voiceId,
      speed,
      pitchOffset,
      basePitchHz,
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', result.audioBuffer.length);
    return res.status(200).send(result.audioBuffer);
  } catch (err: any) {
    console.error('voice-audio/[voiceId] error (safe fallback applied):', err);
    const fallback = await generateMultiEngineMyanmarTTS({ text: 'မင်္ဂလာပါ' }).catch(() => ({
      audioBuffer: Buffer.alloc(128),
      source: 'guaranteed_speech_guard' as const,
      voiceName: 'my-MM-ThihaNeural',
      contentType: 'audio/mpeg',
    }));
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', fallback.audioBuffer.length);
    return res.status(200).send(fallback.audioBuffer);
  }
}
