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

    const testResp = await testClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello! Reply with 'OK'",
    });

    if (testResp && testResp.text) {
      return res.json({
        success: true,
        message: "Gemini API ချိတ်ဆက်မှု အောင်မြင်ပါသည်",
      });
    } else {
      return res.status(400).json({
        success: false,
        error: "Gemini API မှ တုံ့ပြန်မှု မရရှိပါ။ API Key ကို စစ်ဆေးပေးပါ။",
      });
    }
  } catch (error: any) {
    console.error("Gemini API key verification error:", error);
    return res.status(400).json({
      success: false,
      error: error.message || "Invalid Gemini API Key. ချိတ်ဆက်မှု မအောင်မြင်ပါ။",
    });
  }
});

// Translation Endpoint using Gemini Flash models for Burmese Movie Recap Script
app.post("/api/translate-recap", async (req, res) => {
  try {
    const {
      segments,
      style = "cinematic_hype",
      targetTone = "exciting",
      apiKey,
      customSystemPrompt,
      model = "gemini-2.5-flash",
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

    const prompt = `Translate and adapt the following ${segments.length} transcript segments into Burmese Movie Recap script:
${JSON.stringify(segments.map(s => ({ id: s.id, time: `${s.start} - ${s.end}`, text: s.sourceText })), null, 2)}`;

    // Validate model name to ensure valid Gemini model
    const allowedModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-3.7-flash"];
    const chosenModel = allowedModels.includes(model) ? model : "gemini-2.5-flash";

    const response = await ai.models.generateContent({
      model: chosenModel,
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const responseText = response.text || "{}";
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Clean possible markdown codeblocks
      const cleaned = responseText.replace(/```json\n?|\n?```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    res.json({
      success: true,
      translations: parsed.translations || parsed,
      modelUsed: chosenModel,
    });
  } catch (error: any) {
    console.error("Gemini translation error:", error);
    res.status(500).json({
      error: error.message || "Failed to translate transcript with Gemini AI",
    });
  }
});

// AssemblyAI Transcription proxy endpoint with audio upload and polling support
app.post("/api/transcribe-assembly", async (req, res) => {
  try {
    const { apiKey, audioUrl, audioBase64, languageCode = "auto" } = req.body;
    const key = apiKey || process.env.ASSEMBLYAI_API_KEY;

    if (!key || key.startsWith("aai_demo_")) {
      // If demo key or no key, return simulated high-retention segments
      return res.json({
        success: true,
        isDemo: true,
        message: "Demo mode transcribed successfully",
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

    // Submit transcription job
    const transcriptResp = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        authorization: key,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        audio_url: finalAudioUrl,
        language_code: languageCode === "auto" ? undefined : languageCode,
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

    // Poll for completion (up to 45 seconds)
    let completedData: any = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
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

    // Convert AssemblyAI sentences / utterances to segments
    const segments: any[] = [];
    if (completedData.utterances && completedData.utterances.length > 0) {
      completedData.utterances.forEach((u: any, idx: number) => {
        const startSec = u.start / 1000;
        const endSec = u.end / 1000;
        const formatTime = (s: number) => {
          const mins = Math.floor(s / 60).toString().padStart(2, '0');
          const secs = Math.floor(s % 60).toString().padStart(2, '0');
          const ms = Math.floor((s % 1) * 1000).toString().padStart(3, '0');
          return `00:${mins}:${secs}.${ms}`;
        };
        segments.push({
          id: `aai-seg-${idx + 1}`,
          start: formatTime(startSec),
          end: formatTime(endSec),
          startMs: u.start,
          endMs: u.end,
          sourceText: u.text,
          myanmarText: '',
          speaker: `Speaker ${u.speaker || 'A'}`,
          stretchRatio: 1.0,
        });
      });
    } else if (completedData.words && completedData.words.length > 0) {
      // Chunk words into ~7-10 words per sentence segment
      const chunkSize = 8;
      for (let i = 0; i < completedData.words.length; i += chunkSize) {
        const chunk = completedData.words.slice(i, i + chunkSize);
        const startMs = chunk[0].start;
        const endMs = chunk[chunk.length - 1].end;
        const formatTime = (ms: number) => {
          const s = ms / 1000;
          const mins = Math.floor(s / 60).toString().padStart(2, '0');
          const secs = Math.floor(s % 60).toString().padStart(2, '0');
          const msec = Math.floor(ms % 1000).toString().padStart(3, '0');
          return `00:${mins}:${secs}.${msec}`;
        };
        segments.push({
          id: `aai-seg-${Math.floor(i / chunkSize) + 1}`,
          start: formatTime(startMs),
          end: formatTime(endMs),
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
        end: '00:00:10.000',
        startMs: 1000,
        endMs: 10000,
        sourceText: completedData.text || 'Dialogue transcribed from video audio.',
        myanmarText: '',
        speaker: 'Speaker A',
        stretchRatio: 1.0,
      });
    }

    res.json({
      success: true,
      segments,
      text: completedData.text,
    });
  } catch (error: any) {
    console.error("AssemblyAI error:", error);
    res.status(500).json({ error: error.message || "AssemblyAI request failed" });
  }
});

// Helper function to synthesize Burmese audio buffer (Edge TTS -> Google Myanmar TTS)
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
  const selectedVoiceName = isMale ? "my-MM-ThihaNeural" : "my-MM-NilarNeural";
  const effectiveBasePitch = typeof basePitchHz === "number" ? basePitchHz : (isMale ? -18 : 8);
  const finalPitchHz = Math.round(effectiveBasePitch + (Number(pitchOffset) || 0));

  // 1. Try Microsoft Edge Neural TTS with 3s timeout
  try {
    const audioBuffer = await synthesizeWithEdgeTTS({
      text: text.trim(),
      voiceName: selectedVoiceName,
      pitchHz: finalPitchHz,
      rateMultiplier: Number(speedMultiplier) || 1.0,
    });

    if (audioBuffer && audioBuffer.length > 50) {
      return { buffer: audioBuffer, source: "edge_neural_tts", voiceName: selectedVoiceName };
    }
  } catch (edgeErr) {
    console.warn("Edge Neural TTS fallback to Google Myanmar engine:", edgeErr);
  }

  // 2. Fallback to Google Myanmar TTS Proxy
  const splitIntoTTSChunks = (str: string, maxLength = 100): string[] => {
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

  const textChunks = splitIntoTTSChunks(text.trim());
  const audioBuffers: Buffer[] = [];

  for (const chunk of textChunks) {
    if (!chunk.trim()) continue;
    const endpoints = [
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=my&client=tw-ob`,
      `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(chunk)}&le=my`,
      `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=my&q=${encodeURIComponent(chunk)}`,
      `https://translate.google.com.sg/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=my&client=tw-ob`,
    ];

    let chunkBuffer: Buffer | null = null;
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
            chunkBuffer = Buffer.from(arrayBuffer);
            break;
          }
        }
      } catch (err) {
        // Try next endpoint
      }
    }

    if (chunkBuffer) {
      audioBuffers.push(chunkBuffer);
    }
  }

  if (audioBuffers.length > 0) {
    return {
      buffer: Buffer.concat(audioBuffers),
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
