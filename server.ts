import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { synthesizeWithEdgeTTS } from "./src/server/edgeTTS";

dotenv.config();

const app = express();
const PORT = 3000;

// Permissive CORS and frame headers to prevent 403 Forbidden and iframe blocking
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.removeHeader("X-Frame-Options");
  res.setHeader("Content-Security-Policy", "frame-ancestors *;");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: "50mb" }));

// Lazy GoogleGenAI initializer
let aiClient: GoogleGenAI | null = null;
// Function to get Gemini client with optional custom user key or fallback to env
function getGeminiClient(customApiKey?: string): GoogleGenAI {
  const key = customApiKey || process.env.GEMINI_API_KEY || "";
  if (!customApiKey && aiClient) {
    return aiClient;
  }
  const client = new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
  if (!customApiKey) {
    aiClient = client;
  }
  return client;
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "pY Channel - AI Movie Recap Studio",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Test Gemini API Key endpoint
app.post("/api/test-gemini-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    const key = apiKey || process.env.GEMINI_API_KEY;

    if (!key || typeof key !== "string" || key.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "API Key မထည့်သွင်းရသေးပါ။ ကျေးဇူးပြု၍ Gemini API Key ထည့်ပေးပါ။",
      });
    }

    const testClient = new GoogleGenAI({
      apiKey: key.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const candidateModels = [
      "gemini-3.6-flash",
      "gemini-3.7-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-flash-latest",
    ];

    let lastError: any = null;
    let verifiedModel = "";

    for (const testModel of candidateModels) {
      try {
        const testResp = await testClient.models.generateContent({
          model: testModel,
          contents: "Hello! Reply with 'OK'",
        });

        if (testResp && (testResp.text || testResp.candidates)) {
          verifiedModel = testModel;
          break;
        }
      } catch (err: any) {
        lastError = err;
        // Continue to next candidate model if 404 or model unavailable
        continue;
      }
    }

    if (verifiedModel) {
      return res.json({
        success: true,
        message: `Gemini API ချိတ်ဆက်မှု အောင်မြင်ပါသည် (${verifiedModel})`,
        model: verifiedModel,
      });
    }

    throw lastError || new Error("Gemini API မှ တုံ့ပြန်မှု မရရှိပါ။ API Key ကို စစ်ဆေးပေးပါ။");
  } catch (error: any) {
    console.error("Gemini API verification error:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Invalid Gemini API Key. ချိတ်ဆက်မှု မအောင်မြင်ပါ။",
    });
  }
});

// Translation Endpoint using Gemini Flash models for Burmese Movie Recap Script
// Fully supports up to 10 minutes of video segments with parallel chunk batching
app.post("/api/translate-recap", async (req, res) => {
  try {
    const {
      segments,
      style = "cinematic_hype",
      targetTone = "exciting",
      apiKey,
      customSystemPrompt,
      model = "gemini-3.7-flash",
    } = req.body;

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return res.status(400).json({ error: "No transcript segments provided" });
    }

    const ai = getGeminiClient(apiKey);
    const systemPrompt = customSystemPrompt || `You are an elite Burmese (Myanmar) Movie Recap Scriptwriter and Voiceover Narrator for "pY Channel".
Your task is to translate and adapt original movie dialogues/subtitles into high-retention, cinematic, dramatic, and natural Spoken Burmese movie recap narration (ရုပ်ရှင် ဇာတ်လမ်းပြော ရီကပ် စကားပြော စာသား).

CRITICAL SPOKEN BURMESE & VOICE-OVER PROSODY GUIDELINES:
1. PURE SPOKEN BURMESE ONLY (စကားပြော ဇာတ်ကြောင်းပြောဟန်):
   - ALWAYS write in fluent, captivating conversational Burmese suitable for neural voiceover narration.
   - Use spoken verb endings and particles: "တယ်", "ပါတယ်", "သွားတယ်", "ဖြစ်သွားတယ်", "လိုက်တယ်", "နေတယ်", "ရတော့မယ်", "ပေါ့နော်", "ဗျာ", "ရှင့်".
   - STRICTLY FORBIDDEN: Do NOT use archaic formal written grammar (e.g. NEVER use "သည်", "ပေသည်", "သတည်း", "လျက်", "ရာတွင်", "၌", "၏").
2. PROSODIC PACING & BREATHING MARKS (အသက်ရှူသံ အနားပေး စနစ်):
   - Insert natural pauses using Burmese comma (၊) for short 80-100ms respiration pauses and full stop (။) for 150-200ms sentence cadence.
   - Use dramatic recap hooks: "ဒီတစ်ခါမှာတော့...", "အဲဒီအချိန်မှာပဲ...", "ရုတ်တရက်...", "မထင်မှတ်ထားဘဲ...", "ဒီလိုနဲ့ပဲ...".
3. TIME SYNCHRONIZATION:
   - Match the syllable count and duration of each segment (${targetTone} recap pacing).
4. RETURN FORMAT:
   - Return ONLY a valid JSON object strictly matching this schema:
{
  "translations": [
    {
      "id": "segment-id",
      "myanmarText": "သဘာဝကျသော စကားပြော ဇာတ်လမ်းရီကပ် စာသား"
    }
  ]
}`;

    // Validate model name to ensure valid modern Gemini model
    const allowedModels = [
      "gemini-3.7-flash",
      "gemini-3.1-pro-preview",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
    ];
    const preferredModel = allowedModels.includes(model) ? model : "gemini-3.7-flash";
    const modelsToTry = [preferredModel, ...allowedModels.filter(m => m !== preferredModel)];

    // Helper function to translate a single batch of segments with fallback models
    async function translateBatch(batchSegments: any[]) {
      const prompt = `Translate and adapt the following ${batchSegments.length} English transcript segments into Burmese Movie Recap script:
${JSON.stringify(batchSegments.map(s => ({ id: s.id, time: `${s.start} - ${s.end}`, text: s.sourceText })), null, 2)}`;

      let batchResponseText = "";
      let lastErr: any = null;

      for (const candidate of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: candidate,
            contents: prompt,
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: "application/json",
              temperature: 0.7,
            },
          });

          if (response && response.text) {
            batchResponseText = response.text;
            break;
          }
        } catch (err) {
          lastErr = err;
          continue;
        }
      }

      if (!batchResponseText) {
        throw lastErr || new Error("Gemini translation returned empty response for segment batch");
      }

      let parsed;
      try {
        parsed = JSON.parse(batchResponseText);
      } catch {
        const cleaned = batchResponseText.replace(/```json\n?|\n?```/g, "").trim();
        parsed = JSON.parse(cleaned);
      }

      const list = parsed.translations || parsed;
      if (Array.isArray(list)) {
        return list;
      }
      return [];
    }

    // Split segments into batches of 15 segments for fast parallel translation up to 10 minutes (50-60 segments)
    const BATCH_SIZE = 15;
    const segmentBatches: any[][] = [];
    for (let i = 0; i < segments.length; i += BATCH_SIZE) {
      segmentBatches.push(segments.slice(i, i + BATCH_SIZE));
    }

    // Run parallel translation
    const batchResults = await Promise.all(
      segmentBatches.map(batch => translateBatch(batch))
    );

    const mergedTranslations: any[] = [];
    for (const batchRes of batchResults) {
      if (Array.isArray(batchRes)) {
        mergedTranslations.push(...batchRes);
      }
    }

    res.json({
      success: true,
      translations: mergedTranslations,
      modelUsed: preferredModel,
      totalSegments: segments.length,
    });
  } catch (error: any) {
    console.error("Gemini translation error:", error);
    res.status(500).json({
      error: error.message || "Failed to translate transcript with Gemini AI",
    });
  }
});

// AssemblyAI Transcription proxy endpoint with audio upload and polling support
// Enforces pure English speech-to-text extraction up to 10 minutes
app.post("/api/transcribe-assembly", async (req, res) => {
  try {
    const { apiKey, audioUrl, audioBase64, languageCode = "en" } = req.body;
    const key = apiKey || process.env.ASSEMBLYAI_API_KEY;

    if (!key || key.startsWith("aai_demo_")) {
      // 10-Minute Full English Sample Segments for Demo/Test Mode
      const sample10MinSegments = [
        {
          id: 'aai-seg-1',
          start: '00:00:02.000',
          end: '00:00:18.500',
          startMs: 2000,
          endMs: 18500,
          sourceText: 'In the year 2154, humanity discovered that time is not a straight line, but a shattered mirror scattered across parallel realities.',
          myanmarText: '',
          speaker: 'Narrator',
          stretchRatio: 1.0,
        },
        {
          id: 'aai-seg-2',
          start: '00:00:19.000',
          end: '00:00:38.200',
          startMs: 19000,
          endMs: 38200,
          sourceText: 'Meet Captain Alex Mercer, the only surviving pilot of the Chronos Initiative who holds the quantum cipher to save Earth.',
          myanmarText: '',
          speaker: 'Narrator',
          stretchRatio: 1.0,
        },
        {
          id: 'aai-seg-3',
          start: '00:00:39.000',
          end: '00:01:05.400',
          startMs: 39000,
          endMs: 65400,
          sourceText: 'Warning, anomaly detected in Sector 7. The timeline rift is expanding at an alarming exponential velocity.',
          myanmarText: '',
          speaker: 'AI System',
          stretchRatio: 1.0,
        },
        {
          id: 'aai-seg-4',
          start: '00:01:06.000',
          end: '00:01:32.000',
          startMs: 66000,
          endMs: 92000,
          sourceText: 'We only have one shot at this. If the tachyon reactor collapses, three billion lives will be erased from history forever.',
          myanmarText: '',
          speaker: 'Alex Mercer',
          stretchRatio: 1.0,
        },
        {
          id: 'aai-seg-5',
          start: '00:01:33.000',
          end: '00:02:00.000',
          startMs: 93000,
          endMs: 120000,
          sourceText: 'As Alex breached the dimensional threshold, shadow operatives from the Void Syndicate ambushed the vanguard station.',
          myanmarText: '',
          speaker: 'Narrator',
          stretchRatio: 1.0,
        },
        {
          id: 'aai-seg-6',
          start: '00:02:01.000',
          end: '00:02:30.000',
          startMs: 121000,
          endMs: 150000,
          sourceText: 'Plasma bolts lit up the abandoned hyperlane as our protagonist executed a breathtaking anti-gravity maneuver.',
          myanmarText: '',
          speaker: 'Narrator',
          stretchRatio: 1.0,
        },
        {
          id: 'aai-seg-7',
          start: '00:02:31.000',
          end: '00:03:00.000',
          startMs: 151000,
          endMs: 180000,
          sourceText: 'You cannot rewrite destiny, Captain. The collapse of humanity was written into the fabric of the universe.',
          myanmarText: '',
          speaker: 'Void Leader',
          stretchRatio: 1.0,
        },
        {
          id: 'aai-seg-8',
          start: '00:03:01.000',
          end: '00:03:35.000',
          startMs: 181000,
          endMs: 215000,
          sourceText: 'Alex smiled through the dust, activated the overload sequence, and dove headfirst into the temporal vortex.',
          myanmarText: '',
          speaker: 'Narrator',
          stretchRatio: 1.0,
        },
        {
          id: 'aai-seg-9',
          start: '00:03:36.000',
          end: '00:04:10.000',
          startMs: 216000,
          endMs: 250000,
          sourceText: 'Traveling through twenty years of forgotten memories, he witnessed the origins of the catastrophic planetary disaster.',
          myanmarText: '',
          speaker: 'Narrator',
          stretchRatio: 1.0,
        },
        {
          id: 'aai-seg-10',
          start: '00:04:11.000',
          end: '00:04:45.000',
          startMs: 251000,
          endMs: 285000,
          sourceText: 'It turned out the council president was the traitor who sabotaged the orbital shield all along.',
          myanmarText: '',
          speaker: 'Narrator',
          stretchRatio: 1.0,
        },
        {
          id: 'aai-seg-11',
          start: '00:04:46.000',
          end: '00:05:20.000',
          startMs: 286000,
          endMs: 320000,
          sourceText: 'Armed with the ultimate evidence, Alex orchestrated an audacious cyber heist inside the high-security orbital citadel.',
          myanmarText: '',
          speaker: 'Narrator',
          stretchRatio: 1.0,
        },
        {
          id: 'aai-seg-12',
          start: '00:05:21.000',
          end: '00:05:55.000',
          startMs: 321000,
          endMs: 355000,
          sourceText: 'Every security firewall dissolved under his quantum algorithms, triggering an emergency lockdown across the city.',
          myanmarText: '',
          speaker: 'Narrator',
          stretchRatio: 1.0,
        },
        {
          id: 'aai-seg-13',
          start: '00:05:56.000',
          end: '00:06:30.000',
          startMs: 356000,
          endMs: 390000,
          sourceText: 'The countdown reached its final 30 seconds. One wrong keystroke would obliterate the entire continent.',
          myanmarText: '',
          speaker: 'Narrator',
          stretchRatio: 1.0,
        },
        {
          id: 'aai-seg-14',
          start: '00:06:31.000',
          end: '00:07:05.000',
          startMs: 391000,
          endMs: 425000,
          sourceText: 'With sheer willpower and determination, Alex successfully rerouted the emergency power grid.',
          myanmarText: '',
          speaker: 'Narrator',
          stretchRatio: 1.0,
        },
        {
          id: 'aai-seg-15',
          start: '00:07:06.000',
          end: '00:07:45.000',
          startMs: 426000,
          endMs: 465000,
          sourceText: 'A massive wave of pure blue light swept across the horizon, sealing the temporal fractures forever.',
          myanmarText: '',
          speaker: 'Narrator',
          stretchRatio: 1.0,
        },
        {
          id: 'aai-seg-16',
          start: '00:07:46.000',
          end: '00:08:25.000',
          startMs: 466000,
          endMs: 505000,
          sourceText: 'Dawn broke over the rebuilt megalopolis, and the people looked up into the skies with renewed hope.',
          myanmarText: '',
          speaker: 'Narrator',
          stretchRatio: 1.0,
        },
        {
          id: 'aai-seg-17',
          start: '00:08:26.000',
          end: '00:09:10.000',
          startMs: 506000,
          endMs: 550000,
          sourceText: 'Though no monuments bore his name, the legendary pilot watched quietly from the shadows, ready for the next mission.',
          myanmarText: '',
          speaker: 'Narrator',
          stretchRatio: 1.0,
        },
        {
          id: 'aai-seg-18',
          start: '00:09:11.000',
          end: '00:10:00.000',
          startMs: 551000,
          endMs: 600000,
          sourceText: 'This concludes today magnificent 10-minute cinematic journey. Thank you for watching, and remember to like, share, and subscribe to pY Channel!',
          myanmarText: '',
          speaker: 'Narrator',
          stretchRatio: 1.0,
        },
      ];

      return res.json({
        success: true,
        isDemo: true,
        segments: sample10MinSegments,
        message: "10-minute English transcription demo loaded successfully",
      });
    }

    let finalAudioUrl = audioUrl;

    // If audioBase64 is provided, upload it to AssemblyAI first
    if (audioBase64 && !audioUrl) {
      const buffer = Buffer.from(audioBase64, "base64");
      const uploadResp = await fetch("https://api.assemblyai.com/v2/upload", {
        method: "POST",
        headers: {
          authorization: key,
          "content-type": "application/octet-stream",
        },
        body: buffer,
      });

      if (!uploadResp.ok) {
        const errText = await uploadResp.text();
        return res.status(uploadResp.status).json({ error: `AssemblyAI upload failed: ${errText}` });
      }

      const uploadData = await uploadResp.json();
      finalAudioUrl = uploadData.upload_url;
    }

    if (!finalAudioUrl) {
      return res.status(400).json({ error: "No audio URL or audio data provided for transcription." });
    }

    // Submit transcription job explicitly enforcing English language (language_code: "en")
    const transcriptResp = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: key,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        audio_url: finalAudioUrl,
        language_code: "en", // Strictly transcribe in English
        speaker_labels: true,
        punctuate: true,
        format_text: true,
      }),
    });

    if (!transcriptResp.ok) {
      const errText = await transcriptResp.text();
      return res.status(transcriptResp.status).json({ error: `AssemblyAI transcript request failed: ${errText}` });
    }

    const transcriptData = await transcriptResp.json();
    const transcriptId = transcriptData.id;

    // Poll for completion (up to 120 seconds to comfortably support full 10-minute audio)
    let completedData: any = null;
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const pollResp = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { authorization: key },
      });
      if (pollResp.ok) {
        const pollData = await pollResp.json();
        if (pollData.status === "completed") {
          completedData = pollData;
          break;
        } else if (pollData.status === "error") {
          return res.status(400).json({ error: pollData.error || "AssemblyAI transcription error" });
        }
      }
    }

    if (!completedData) {
      return res.json({
        success: true,
        partial: true,
        message: "Transcription in progress",
        transcriptId,
      });
    }

    // Convert AssemblyAI sentences / utterances to segments with clean 00:MM:SS.mmm timestamps
    const segments: any[] = [];
    const formatTimeFromMs = (ms: number) => {
      const s = ms / 1000;
      const mins = Math.floor(s / 60).toString().padStart(2, '0');
      const secs = Math.floor(s % 60).toString().padStart(2, '0');
      const msec = Math.floor(ms % 1000).toString().padStart(3, '0');
      return `00:${mins}:${secs}.${msec}`;
    };

    if (completedData.utterances && completedData.utterances.length > 0) {
      completedData.utterances.forEach((u: any, idx: number) => {
        segments.push({
          id: `aai-seg-${idx + 1}`,
          start: formatTimeFromMs(u.start),
          end: formatTimeFromMs(u.end),
          startMs: u.start,
          endMs: u.end,
          sourceText: u.text,
          myanmarText: '',
          speaker: `Speaker ${u.speaker || 'A'}`,
          stretchRatio: 1.0,
        });
      });
    } else if (completedData.words && completedData.words.length > 0) {
      // Chunk words into natural ~10-14 words per sentence segment
      const chunkSize = 12;
      for (let i = 0; i < completedData.words.length; i += chunkSize) {
        const chunk = completedData.words.slice(i, i + chunkSize);
        const startMs = chunk[0].start;
        const endMs = chunk[chunk.length - 1].end;
        segments.push({
          id: `aai-seg-${Math.floor(i / chunkSize) + 1}`,
          start: formatTimeFromMs(startMs),
          end: formatTimeFromMs(endMs),
          startMs,
          endMs,
          sourceText: chunk.map((w: any) => w.text).join(' '),
          myanmarText: '',
          speaker: 'Speaker A',
          stretchRatio: 1.0,
        });
      }
    } else {
      segments.push({
        id: 'aai-seg-1',
        start: '00:00:01.000',
        end: '00:10:00.000',
        startMs: 1000,
        endMs: 600000,
        sourceText: completedData.text || 'Dialogue transcribed from video audio in English.',
        myanmarText: '',
        speaker: 'Speaker A',
        stretchRatio: 1.0,
      });
    }

    res.json({
      success: true,
      segments,
      text: completedData.text,
      language: 'en',
    });
  } catch (error: any) {
    console.error("AssemblyAI error:", error);
    res.status(500).json({ error: error.message || "AssemblyAI request failed" });
  }
});

// In-Memory TTS Audio Buffer Cache for instant 0ms playback of voice previews and repeat lines
const ttsMemoryCache = new Map<string, { buffer: Buffer; source: string; voiceName: string; timestamp: number }>();
const MAX_TTS_CACHE_ENTRIES = 500;

// Helper function to synthesize Burmese audio buffer with High-Definition Microsoft Edge Neural TTS
async function generateBurmeseAudioBuffer({
  text,
  isMale = false,
  pitchOffset = 0,
  speedMultiplier = 1.0,
  basePitchHz,
}: {
  text: string;
  isMale?: boolean;
  pitchOffset?: number;
  speedMultiplier?: number;
  basePitchHz?: number;
}): Promise<{ buffer: Buffer; source: string; voiceName: string }> {
  const cleanText = text.trim();
  const selectedVoiceName = isMale ? "my-MM-ThihaNeural" : "my-MM-NilarNeural";
  // Keep pitch subtle and natural (-6Hz to +6Hz) to prevent metallic/robotic tone
  const effectiveBasePitch = typeof basePitchHz === "number" ? basePitchHz : (isMale ? -4 : 2);
  const finalPitchHz = Math.max(-8, Math.min(8, Math.round(effectiveBasePitch + (Number(pitchOffset) || 0))));
  const roundedSpeed = Math.max(0.75, Math.min(1.4, Math.round(Number(speedMultiplier || 1.0) * 100) / 100));

  const cacheKey = `${selectedVoiceName}_${finalPitchHz}_${roundedSpeed}_${cleanText}`;
  const cached = ttsMemoryCache.get(cacheKey);
  if (cached) {
    return { buffer: cached.buffer, source: `${cached.source}_cached`, voiceName: cached.voiceName };
  }

  // 1. Primary: Microsoft Edge Neural TTS Engine (96kbps MP3, human voice)
  try {
    const audioBuffer = await synthesizeWithEdgeTTS({
      text: cleanText,
      voiceName: selectedVoiceName,
      gender: isMale ? 'male' : 'female',
      pitchHz: finalPitchHz,
      rateMultiplier: roundedSpeed,
    });

    if (audioBuffer && audioBuffer.length > 50) {
      if (ttsMemoryCache.size >= MAX_TTS_CACHE_ENTRIES) {
        const firstKey = ttsMemoryCache.keys().next().value;
        if (firstKey) ttsMemoryCache.delete(firstKey);
      }
      ttsMemoryCache.set(cacheKey, {
        buffer: audioBuffer,
        source: "edge_neural_tts",
        voiceName: selectedVoiceName,
        timestamp: Date.now(),
      });
      return { buffer: audioBuffer, source: "edge_neural_tts", voiceName: selectedVoiceName };
    }
  } catch (edgeErr) {
    console.warn("Primary Edge Neural TTS failed, retrying with normalized parameters:", edgeErr);
  }

  // 1b. Retry Edge Neural TTS with default neutral prosody (0Hz pitch, 1.0 rate)
  try {
    const retryBuffer = await synthesizeWithEdgeTTS({
      text: cleanText,
      voiceName: selectedVoiceName,
      gender: isMale ? 'male' : 'female',
      pitchHz: 0,
      rateMultiplier: 1.0,
    });

    if (retryBuffer && retryBuffer.length > 50) {
      ttsMemoryCache.set(cacheKey, {
        buffer: retryBuffer,
        source: "edge_neural_tts_retry",
        voiceName: selectedVoiceName,
        timestamp: Date.now(),
      });
      return { buffer: retryBuffer, source: "edge_neural_tts_retry", voiceName: selectedVoiceName };
    }
  } catch (retryErr) {
    console.warn("Edge Neural TTS retry failed, falling back to Google Myanmar TTS proxy:", retryErr);
  }

  // 2. Fallback to Google Myanmar TTS Proxy
  const splitIntoTTSChunks = (str: string, maxLength = 80): string[] => {
    const parts = str.split(/([၊။\n!?]+)/);
    const chunks: string[] = [];
    let current = "";

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (current.length + p.length <= maxLength) {
        current += p;
      } else {
        if (current.trim()) chunks.push(current.trim());
        if (p.length > maxLength) {
          for (let j = 0; j < p.length; j += maxLength) {
            chunks.push(p.slice(j, j + maxLength).trim());
          }
          current = "";
        } else {
          current = p;
        }
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.filter((c) => c.length > 0);
  };

  const textChunks = splitIntoTTSChunks(cleanText);
  if (textChunks.length === 0) textChunks.push(cleanText);

  // Fetch all chunks in parallel for zero latency
  const chunkFetchPromises = textChunks.map(async (chunk) => {
    if (!chunk.trim()) return null;
    const endpoints = [
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=my&client=tw-ob`,
      `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=my&q=${encodeURIComponent(chunk)}`,
    ];

    for (const ttsUrl of endpoints) {
      try {
        const ttsResp = await fetch(ttsUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Referer: "https://translate.google.com/",
          },
        });

        if (ttsResp.ok) {
          const arrayBuffer = await ttsResp.arrayBuffer();
          if (arrayBuffer.byteLength > 50) {
            return Buffer.from(arrayBuffer);
          }
        }
      } catch {
        // Try next endpoint
      }
    }
    return null;
  });

  const fetchedChunks = await Promise.all(chunkFetchPromises);
  const validBuffers = fetchedChunks.filter((b): b is Buffer => b !== null && b.length > 0);

  if (validBuffers.length > 0) {
    const combined = Buffer.concat(validBuffers);
    if (ttsMemoryCache.size >= MAX_TTS_CACHE_ENTRIES) {
      const firstKey = ttsMemoryCache.keys().next().value;
      if (firstKey) ttsMemoryCache.delete(firstKey);
    }
    ttsMemoryCache.set(cacheKey, {
      buffer: combined,
      source: "google_myanmar_tts",
      voiceName: selectedVoiceName,
      timestamp: Date.now(),
    });
    return {
      buffer: combined,
      source: "google_myanmar_tts",
      voiceName: selectedVoiceName,
    };
  }

  throw new Error("Could not synthesize audio from any Burmese TTS engine");
}

// 1. Direct Audio Streaming GET Endpoint for Instant HTML5 Audio Playback & Voice Audition
app.get("/api/stream-tts", async (req, res) => {
  try {
    const text = typeof req.query.text === "string" ? req.query.text : "";
    if (!text || text.trim().length === 0) {
      return res.status(400).send("Text is required");
    }

    const gender = req.query.gender as string;
    const voiceName = (req.query.voiceName || req.query.voiceModel || req.query.voice) as string;
    const voiceId = req.query.voiceId as string;
    let isMale = false;

    if (gender === "male" || gender === "female") {
      isMale = gender === "male";
    } else if (typeof voiceName === "string" && (voiceName.includes("Thiha") || voiceName.includes("Nilar"))) {
      isMale = voiceName.includes("Thiha");
    } else if (typeof voiceId === "string") {
      isMale = voiceId.includes("voice-male");
    }

    const pitchOffset = Number(req.query.pitchOffset || req.query.pitch) || 0;
    const speedMultiplier = Number(req.query.speedMultiplier || req.query.rate || req.query.speed) || 1.0;
    const basePitchHz = req.query.basePitchHz ? Number(req.query.basePitchHz) : undefined;

    const result = await generateBurmeseAudioBuffer({
      text,
      isMale,
      pitchOffset,
      speedMultiplier,
      basePitchHz,
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", result.buffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Accept-Ranges", "bytes");
    res.send(result.buffer);
  } catch (error: any) {
    console.error("Audio stream error:", error);
    res.status(500).send(error.message || "Failed to stream audio");
  }
});

// 2. Dedicated Serverless TTS Endpoint (/api/tts - Supports POST & GET)
app.all("/api/tts", async (req, res) => {
  try {
    const text = (req.method === "POST" ? req.body?.text : req.query.text) || "";
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "Text is required for TTS synthesis" });
    }

    const voice = (req.method === "POST" ? (req.body?.voice || req.body?.voiceName || req.body?.voiceModel) : (req.query.voice || req.query.voiceName)) as string;
    const voiceGender = (req.method === "POST" ? (req.body?.voiceGender || req.body?.gender) : (req.query.voiceGender || req.query.gender)) as string;
    const voiceId = (req.method === "POST" ? req.body?.voiceId : req.query.voiceId) as string;
    const rate = Number(req.method === "POST" ? (req.body?.rate ?? req.body?.speed ?? req.body?.speedMultiplier) : (req.query.rate ?? req.query.speed ?? req.query.speedMultiplier)) || 1.0;
    const pitchOffset = Number(req.method === "POST" ? (req.body?.pitchOffset ?? req.body?.pitch) : (req.query.pitchOffset ?? req.query.pitch)) || 0;
    const basePitchHz = (req.method === "POST" ? req.body?.basePitchHz : req.query.basePitchHz) ? Number(req.method === "POST" ? req.body?.basePitchHz : req.query.basePitchHz) : undefined;
    const format = (req.method === "POST" ? req.body?.format : req.query.format) || "";

    let isMale = false;
    if (voiceGender === "male" || voiceGender === "female") {
      isMale = voiceGender === "male";
    } else if (typeof voice === "string" && (voice.includes("Thiha") || voice.includes("Nilar"))) {
      isMale = voice.includes("Thiha");
    } else if (typeof voiceId === "string") {
      isMale = voiceId.includes("voice-male");
    }

    const result = await generateBurmeseAudioBuffer({
      text,
      isMale,
      pitchOffset,
      speedMultiplier: rate,
      basePitchHz,
    });

    res.setHeader("Access-Control-Allow-Origin", "*");

    // If client requested JSON or format=json
    const acceptsJson = req.headers.accept?.includes("application/json") && format !== "audio" && format !== "mp3";
    if (format === "json" || (acceptsJson && format !== "binary")) {
      const audioBase64 = result.buffer.toString("base64");
      return res.json({
        success: true,
        source: result.source,
        voice: isMale ? "my-MM-ThihaNeural" : "my-MM-NilarNeural",
        voiceName: result.voiceName,
        gender: isMale ? "male" : "female",
        audioBase64: `data:audio/mpeg;base64,${audioBase64}`,
        rate,
      });
    }

    // Default: Clean audio/mpeg binary MP3 stream
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", result.buffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Accept-Ranges", "bytes");
    res.send(result.buffer);
  } catch (error: any) {
    console.error("TTS endpoint error (/api/tts):", error);
    res.status(500).json({ error: error.message || "TTS generation failed" });
  }
});

// 3. High-Fidelity Neural Burmese TTS Synthesis Endpoint (POST JSON)
app.post("/api/synthesize-burmese-tts", async (req, res) => {
  try {
    const {
      text,
      voiceId,
      pitchOffset = 0,
      speedMultiplier = 1.0,
      gender,
      voiceName,
      voiceModel,
      basePitchHz,
    } = req.body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "Text is required for TTS synthesis" });
    }

    let isMale = false;
    if (gender === "male" || gender === "female") {
      isMale = gender === "male";
    } else if (typeof voiceName === "string" && (voiceName.includes("Thiha") || voiceName.includes("Nilar"))) {
      isMale = voiceName.includes("Thiha");
    } else if (typeof voiceModel === "string" && (voiceModel.includes("Thiha") || voiceModel.includes("Nilar"))) {
      isMale = voiceModel.includes("Thiha");
    } else if (typeof voiceId === "string") {
      isMale = voiceId.includes("voice-male");
    }

    const effectiveBasePitch = typeof basePitchHz === "number" ? basePitchHz : (isMale ? -18 : 8);
    const finalPitchHz = Math.round(effectiveBasePitch + (Number(pitchOffset) || 0));

    const result = await generateBurmeseAudioBuffer({
      text,
      isMale,
      pitchOffset: finalPitchHz,
      speedMultiplier: Number(speedMultiplier) || 1.0,
      basePitchHz,
    });

    const audioBase64 = result.buffer.toString("base64");

    return res.json({
      success: true,
      source: result.source,
      voiceName: result.voiceName,
      voiceModel: result.voiceName,
      gender: isMale ? "male" : "female",
      voiceId,
      finalPitchHz,
      speedMultiplier,
      mimeType: "audio/mpeg",
      audioBase64: `data:audio/mpeg;base64,${audioBase64}`,
    });
  } catch (error: any) {
    console.error("Burmese TTS synthesis error:", error);
    res.status(500).json({ error: error.message || "Burmese TTS synthesis failed" });
  }
});

// 4. Dedicated Voice Preview Endpoint for Previewing 40 Voice Models (/api/tts-preview)
app.all("/api/tts-preview", async (req, res) => {
  try {
    const rawVoiceId = (req.method === "POST" ? (req.body?.voice_id || req.body?.voiceId) : (req.query?.voice_id || req.query?.voiceId)) as string || "";
    const rawText = (req.method === "POST" ? (req.body?.text || req.body?.sampleText) : (req.query?.text || req.query?.sampleText)) as string || "";
    const text = rawText.trim() || "မင်္ဂလာပါ ဇာတ်လမ်းစတင်ပါပြီ";

    const gender = (req.method === "POST" ? req.body?.gender : req.query?.gender) as string || "";
    const rate = Number(req.method === "POST" ? (req.body?.rate ?? req.body?.speed) : (req.query?.rate ?? req.query?.speed)) || 1.0;
    const pitchOffset = Number(req.method === "POST" ? req.body?.pitchOffset : req.query?.pitchOffset) || 0;

    let isMale = false;
    if (gender === "male" || gender === "female") {
      isMale = gender === "male";
    } else if (rawVoiceId) {
      if (rawVoiceId.includes("male") || rawVoiceId.startsWith("m-") || rawVoiceId.includes("Thiha")) {
        isMale = true;
      } else if (rawVoiceId.includes("female") || rawVoiceId.startsWith("f-") || rawVoiceId.includes("Nilar")) {
        isMale = false;
      }
    }

    const result = await generateBurmeseAudioBuffer({
      text,
      isMale,
      pitchOffset,
      speedMultiplier: rate,
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", result.buffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Accept-Ranges", "bytes");
    res.send(result.buffer);
  } catch (error: any) {
    console.error("TTS Preview endpoint error (/api/tts-preview):", error);
    res.status(500).json({ error: error.message || "TTS Preview failed" });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        cors: true,
        allowedHosts: true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`pY Channel Server running on http://localhost:${PORT}`);
  });
}

startServer();
