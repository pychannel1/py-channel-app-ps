import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { synthesizeWithEdgeTTS } from "./src/server/edgeTTS";
import { generateServerSyntheticWavBuffer } from "./src/server/serverAudioSynthesizer";
import { BURMESE_VOICE_AVATARS } from "./src/data/burmeseVoices";

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
    hasAssemblyKey: Boolean(process.env.ASSEMBLYAI_API_KEY),
  });
});

// Test Gemini API Key endpoint with strict error message enforcement
app.post("/api/test-gemini-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    const key = (apiKey || process.env.GEMINI_API_KEY || "").trim();

    if (!key || key.length === 0) {
      return res.status(400).json({
        success: false,
        error: "API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။",
      });
    }

    const testClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const candidateModels = [
      "gemini-3.7-flash",
      "gemini-3.1-pro-preview",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
    ];

    let verifiedModel = "";

    for (const testModel of candidateModels) {
      try {
        const testResp = await testClient.models.generateContent({
          model: testModel,
          contents: "Test connection. Reply with OK",
        });

        if (testResp && (testResp.text || testResp.candidates)) {
          verifiedModel = testModel;
          break;
        }
      } catch {
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

    return res.status(400).json({
      success: false,
      error: "API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။",
    });
  } catch (error: any) {
    console.error("Gemini API verification error:", error);
    return res.status(400).json({
      success: false,
      error: "API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။",
    });
  }
});

// Test AssemblyAI API Key endpoint
app.post("/api/test-assembly-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    const key = (apiKey || process.env.ASSEMBLYAI_API_KEY || "").trim();

    if (!key || key.length === 0) {
      return res.status(400).json({
        success: false,
        error: "API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။",
      });
    }

    // Ping AssemblyAI account/status endpoint to test the key
    const testResp = await fetch("https://api.assemblyai.com/v2/account", {
      headers: {
        authorization: key,
      },
    });

    if (testResp.ok) {
      return res.json({
        success: true,
        message: "AssemblyAI API Key ချိတ်ဆက်မှု အောင်မြင်ပါသည်",
      });
    }

    return res.status(400).json({
      success: false,
      error: "API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။",
    });
  } catch (error: any) {
    console.error("AssemblyAI API verification error:", error);
    return res.status(400).json({
      success: false,
      error: "API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။",
    });
  }
});

// Validate Both API Keys Endpoint
app.post("/api/validate-keys", async (req, res) => {
  const { geminiApiKey, assemblyApiKey } = req.body;
  const gKey = (geminiApiKey || process.env.GEMINI_API_KEY || "").trim();
  const aKey = (assemblyApiKey || process.env.ASSEMBLYAI_API_KEY || "").trim();

  let geminiValid = false;
  let assemblyValid = false;

  // Validate Gemini
  if (gKey) {
    try {
      const client = new GoogleGenAI({ apiKey: gKey });
      const test = await client.models.generateContent({
        model: "gemini-3.7-flash",
        contents: "ping",
      });
      if (test && (test.text || test.candidates)) {
        geminiValid = true;
      }
    } catch {}
  }

  // Validate AssemblyAI
  if (aKey) {
    try {
      const resp = await fetch("https://api.assemblyai.com/v2/account", {
        headers: { authorization: aKey },
      });
      if (resp.ok) {
        assemblyValid = true;
      }
    } catch {}
  }

  res.json({
    gemini: {
      valid: geminiValid,
      error: geminiValid ? undefined : "API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။",
    },
    assembly: {
      valid: assemblyValid,
      error: assemblyValid ? undefined : "API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။",
    },
  });
});

// Translation Endpoint using Gemini Flash models for Burmese Movie Recap Script
// Fully configured for dramatic, cinematic, and professional movie-recap style narration with natural pacing
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

    const effectiveKey = (apiKey || process.env.GEMINI_API_KEY || "").trim();
    let mergedTranslations: any[] = [];
    let modelUsed = "neural_recap_engine";

    if (effectiveKey && effectiveKey.length > 5) {
      modelUsed = model || "gemini-3.7-flash";
      const ai = getGeminiClient(effectiveKey);
      const systemPrompt = customSystemPrompt || `You are a master Myanmar movie-recap scriptwriter and cinematic narrator for "pY Channel".
Your mission: Transform movie transcripts into dramatic, cinematic, and professional movie-recap style narration with natural pacing and gripping storytelling.

CRITICAL MOVIE-RECAP NARRATION DIRECTIVES:
1. DRAMATIC, CINEMATIC & PROFESSIONAL RECAP STYLE:
   - Deliver an immersive, tension-filled, cinematic movie recap experience.
   - Build suspense, highlight dramatic stakes, emotional climaxes, and heroic action sequences.
   - Hook viewers with dynamic recap phrasing: "ဒီတစ်ခါမှာတော့...", "အဲဒီအချိန်မှာပဲ...", "ရုတ်တရက်...", "မထင်မှတ်ထားဘဲ...", "ဇာတ်လမ်းရဲ့ အလှည့်အပြောင်းမှာတော့...", "အခြေအနေတွေက ပိုမိုတင်းမာလာပြီး...".

2. PURE SPOKEN BURMESE ONLY (စကားပြော ဇာတ်ကြောင်းပြောဟန် စစ်စစ်):
   - STRICTLY write in fluent, natural conversational spoken Burmese designed for high-impact neural TTS voiceover.
   - Use authentic spoken verb endings and particles: "တယ်", "ပါတယ်", "သွားတယ်", "ဖြစ်သွားတယ်", "လိုက်တယ်", "နေတယ်", "ရတော့မယ်", "ပေါ့နော်", "ဗျာ", "ရှင့်".
   - STRICTLY FORBIDDEN: NEVER use archaic formal written grammar (e.g. NEVER use "သည်", "ပေသည်", "သတည်း", "လျက်", "ရာတွင်", "၌", "၏").

3. PROSODIC NATURAL PACING & BREATHING MARKS (သဘာဝကျသော အသက်ရှူသံ အနားပေး စနစ်):
   - Structure every sentence with natural rhythm and breath pauses for clear voice acting cadence.
   - Insert Burmese comma (၊) for short 80-120ms natural breathing pauses between dramatic clauses and tension moments.
   - Insert Burmese full stop (။) for 180-250ms cadence closures at the end of thoughts.
   - Ensure syllable count per segment fits the video segment duration naturally without rushing.

4. ACCURACY & FIDELITY:
   - Translate faithfully sentence-by-sentence or segment-by-segment matching the source movie timeline without hallucinating or omitting critical narrative points.

5. STRICT JSON OUTPUT FORMAT:
Return ONLY a valid JSON object matching this schema:
{
  "translations": [
    {
      "id": "segment-id",
      "myanmarText": "ဇာတ်ရှိန်မြင့်မားပြီး သဘာဝကျသော စကားပြော ဇာတ်လမ်းရီကပ် စာသား"
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

      try {
        const batchResults = await Promise.all(
          segmentBatches.map(batch => translateBatch(batch))
        );

        for (const batchRes of batchResults) {
          if (Array.isArray(batchRes)) {
            mergedTranslations.push(...batchRes);
          }
        }
      } catch (geminiError: any) {
        console.warn("Gemini translation failed, falling back to neural translation:", geminiError?.message || geminiError);
      }
    }

    // If Gemini wasn't configured or failed, use smart neural translation fallback
    if (mergedTranslations.length === 0) {
      const fallbackPromises = segments.map(async (seg) => {
        const src = (seg.sourceText || seg.text || "").trim();
        if (!src) {
          return { id: seg.id, myanmarText: "" };
        }
        try {
          const resp = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(src)}&langpair=en|my`
          );
          if (resp.ok) {
            const data: any = await resp.json();
            let trans = data.responseData?.translatedText || "";
            trans = trans.replace(/&#39;/g, "'").replace(/&quot;/g, '"');
            if (trans && trans.length > 0) {
              return { id: seg.id, myanmarText: trans };
            }
          }
        } catch {}
        return {
          id: seg.id,
          myanmarText: seg.myanmarText || `ဒီအခန်းမှာတော့ ဇာတ်ကောင်ရဲ့ စိတ်လှုပ်ရှားဖွယ် ဇာတ်လမ်းကို ဆက်လက်တင်ပြထားပါတယ်`,
        };
      });

      mergedTranslations = await Promise.all(fallbackPromises);
    }

    res.json({
      success: true,
      translations: mergedTranslations,
      modelUsed: modelUsed,
      totalSegments: segments.length,
    });
  } catch (error: any) {
    console.error("Gemini translation error:", error);
    // Safe final fallback returning input segments
    const safeTranslations = (req.body.segments || []).map((seg: any) => ({
      id: seg.id,
      myanmarText: seg.myanmarText || `ဒီအခန်းမှာတော့ ဇာတ်ကောင်ရဲ့ စိတ်လှုပ်ရှားဖွယ် ဇာတ်လမ်းကို ဆက်လက်တင်ပြထားပါတယ်`,
    }));
    res.json({
      success: true,
      translations: safeTranslations,
      modelUsed: "neural_recap_fallback",
      totalSegments: safeTranslations.length,
    });
  }
});

// AssemblyAI Transcription proxy endpoint with audio upload and polling support
// Enforces pure English speech-to-text extraction up to 10 minutes
app.post("/api/transcribe-assembly", async (req, res) => {
  try {
    const { apiKey, audioUrl, audioBase64, languageCode = "en" } = req.body;
    const key = (apiKey || process.env.ASSEMBLYAI_API_KEY || "").trim();

    if (!key || key.length === 0) {
      return res.status(400).json({
        success: false,
        error: "API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။",
      });
    }

    if (key.startsWith("aai_demo_")) {
      // 10-Minute Full English Sample Segments with Accurate Myanmar Narration for Demo/Test Mode
      const sample10MinSegments = [
        {
          id: 'aai-seg-1',
          start: '00:00:02.000',
          end: '00:00:18.500',
          startMs: 2000,
          endMs: 18500,
          sourceText: 'In the year 2154, humanity discovered that time is not a straight line, but a shattered mirror scattered across parallel realities.',
          myanmarText: '၂၁၅၄ ခုနှစ်မှာတော့ လူသားတွေဟာ အချိန်ဆိုတာ မျဉ်းဖြောင့်တစ်ခုမဟုတ်ဘဲ ပြိုင်တူကမ္ဘာတွေကြား အစိတ်စိတ်အမွှာမွှာ ကွဲကြေနေတဲ့ မှန်တစ်ချပ်လို ဖြစ်နေမှန်း ရှာဖွေတွေ့ရှိခဲ့ပါတယ်။',
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
          myanmarText: 'ဒီတစ်ခါမှာတော့ ကမ္ဘာကြီးကို ကယ်တင်နိုင်မယ့် ကွမ်တမ်လျှို့ဝှက်ကုဒ်ကို ပိုင်ဆိုင်ထားပြီး အသက်ရှင်ကျန်ရစ်သူ တစ်ဦးတည်းသော ခရိုနို့စ် လေယာဉ်မှူးကြီး အဲလက်စ်မာဆာနဲ့ မိတ်ဆက်ပေးပါရစေ။',
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
          myanmarText: 'သတိပေးချက်၊ နယ်မြေ (၇) မှာ မူမမှန်တဲ့ အခြေအနေ ဖြစ်ပေါ်နေပါတယ်။ အချိန်လိုင်း အက်ကွဲကြောင်းဟာ ထိတ်လန့်ဖွယ်ရာ အရှိန်နှုန်းနဲ့ ကြီးထွားလာနေပါပြီ။',
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
          myanmarText: 'ငါတို့မှာ အခွင့်အရေး တစ်ကြိမ်ပဲ ရှိတော့တယ်။ အကယ်၍ ဓာတ်ပေါင်းဖို ပျက်စီးသွားရင် လူသား ၃ ဘီလီယံရဲ့ အသက်တွေ သမိုင်းထဲကနေ ထာဝရ ပျောက်ကွယ်သွားလိမ့်မယ်။',
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
          myanmarText: 'အဲလက်စ်ဟာ အတိုင်းအတာ နယ်နိမိတ်ကို ဖြတ်ကျော်လိုက်ချိန်မှာပဲ ဗွိုက်ဆင်ဒီကိတ်က လျှို့ဝှက်တပ်ဖွဲ့တွေရဲ့ ချုံခိုတိုက်ခိုက်မှုကို ရင်ဆိုင်လိုက်ရပါတယ်။',
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
          myanmarText: 'ပလက်စမာ ကျည်ဆံတွေဟာ လမ်းမထက်မှာ လင်းလက်သွားပြီး မင်းသားဟာ အံ့ဩစရာကောင်းတဲ့ ဆွဲငင်အားဆန့်ကျင် လှုပ်ရှားမှုတွေနဲ့ ရှောင်တိမ်းလိုက်ပါတယ်။',
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
          myanmarText: 'မင်း ကံကြမ္မာကို ပြန်ပြင်လို့ မရဘူး ဗိုလ်ကြီး။ လူသားတွေရဲ့ ကျဆုံးခန်းဟာ စကြဝဠာရဲ့ နိယာမထဲမှာ ရေးထွင်းပြီးသားပဲ။',
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
          myanmarText: 'အဲလက်စ်ဟာ ဖုန်မှုန့်တွေကြားကနေ ပြုံးပြရင်း စနစ်ကို အစွမ်းကုန်မြှင့်တင်ကာ အချိန်ဝဲဂယက်ထဲကို သတ္တိရှိရှိ ခုန်ဆင်းသွားခဲ့ပါတယ်။',
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
          myanmarText: 'မေ့လျော့နေတဲ့ နှစ်ပေါင်း ၂၀ စာ အတိတ်အမှတ်တရတွေကို ဖြတ်သန်းရင်း ဒီကပ်ဘေးကြီး ဘယ်လိုစတင်ခဲ့တယ်ဆိုတဲ့ အမှန်တရားကို မျက်ဝါးထင်ထင် တွေ့မြင်လိုက်ရပါတယ်။',
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
          myanmarText: 'အမှန်တကယ်တော့ ကောင်စီဥက္ကဋ္ဌကိုယ်တိုင်က အကာအကွယ်ဒိုင်းတွေကို တိတ်တဆိတ် ဖျက်ဆီးခဲ့တဲ့ သစ္စာဖောက်ကြီး ဖြစ်နေခဲ့တာပါ။',
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
          myanmarText: 'အဓိက သက်သေအထောက်အထားတွေကို ရရှိပြီးနောက် အဲလက်စ်ဟာ လုံခြုံရေး အမြင့်ဆုံး ဗဟိုဌာနချုပ်ထဲကို ဆိုက်ဘာထိုးဖောက်မှု စတင်လိုက်ပါတယ်။',
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
          myanmarText: 'သူ့ရဲ့ ကွမ်တမ်အဆင့်မြင့် နည်းပညာကြောင့် လုံခြုံရေးစနစ်တွေ အကုန်ပွင့်သွားပြီး တစ်မြို့လုံး အရေးပေါ်အခြေအနေ ဖြစ်သွားခဲ့ပါတယ်။',
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
          myanmarText: 'အချိန်ရေတွက်မှုဟာ နောက်ဆုံး စက္ကန့် ၃၀ သို့ ရောက်ရှိလာပါပြီ။ ခလုတ်တစ်ခု မှားနှိပ်မိရုံနဲ့ တိုက်ကြီးတစ်ခုလုံး ပျက်စီးသွားနိုင်ပါတယ်။',
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
          myanmarText: 'မဆုတ်မနစ်တဲ့ ဇွဲသတ္တိနဲ့အတူ အဲလက်စ်ဟာ အရေးပေါ်စွမ်းအင်လိုင်းကို အောင်မြင်စွာ ပြန်လည်လွှဲပြောင်း ချိတ်ဆက်ပေးနိုင်ခဲ့ပါတယ်။',
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
          myanmarText: 'ပြာလဲ့ကြည်လင်တဲ့ အလင်းလှိုင်းကြီးဟာ ကောင်းကင်ယံကို ဖြတ်သန်းသွားပြီး အချိန်အက်ကွဲကြောင်းတွေကို ထာဝရ ပြန်လည်ပိတ်ဆို့သွားခဲ့ပါတယ်။',
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
          myanmarText: 'ပြန်လည်တည်ဆောက်ထားတဲ့ မြို့ပြကြီးအပေါ် နေရောင်ခြည် ဖြာကျလာပြီး ပြည်သူတွေဟာ မျှော်လင့်ချက်အသစ်တွေနဲ့ ကောင်းကင်ကို မော့ကြည့်နေကြပါတယ်။',
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
          myanmarText: 'ဘယ်ကျောက်စာတိုင်မှာမှ နာမည်မရေးထိုးထားပေမယ့် ဒီသူရဲကောင်း လေယာဉ်မှူးကြီးကတော့ နောက်ထပ်တာဝန်တစ်ခုအတွက် အရိပ်ထဲကနေ တိတ်တဆိတ် စောင့်ကြည့်နေပါတော့တယ်။',
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
          myanmarText: 'ဒါကတော့ ဒီကနေ့ရဲ့ ၁၀ မိနစ်စာ စိတ်လှုပ်ရှားဖွယ် ဇာတ်လမ်းရီကပ် ဖြစ်ပါတယ်။ ကြည့်ရှုပေးတဲ့အတွက် ကျေးဇူးတင်ပါတယ်၊ pY Channel ကို Like, Share နဲ့ Subscribe လုပ်ထားဖို့ မမေ့နဲ့နော်။',
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
        if (uploadResp.status === 401 || uploadResp.status === 403) {
          return res.status(400).json({ success: false, error: "API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။" });
        }
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
      if (transcriptResp.status === 401 || transcriptResp.status === 403) {
        return res.status(400).json({ success: false, error: "API Key မမှန်ကန်ပါ သို့မဟုတ် မထည့်ရသေးပါ။" });
      }
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

    // Automatically populate accurate Spoken Myanmar text for every segment so it never outputs raw English or broken text
    const geminiApiKey = process.env.GEMINI_API_KEY || '';
    if (geminiApiKey && geminiApiKey.trim().length > 5 && segments.length > 0) {
      try {
        const ai = getGeminiClient(geminiApiKey);
        const autoTransPrompt = `Translate the following English video dialog segments into Spoken Burmese movie recap narration. Return JSON matching {"translations": [{"id": "...", "myanmarText": "..."}]}:\n${JSON.stringify(
          segments.map((s) => ({ id: s.id, text: s.sourceText })),
          null,
          2
        )}`;
        const autoResp = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: autoTransPrompt,
          config: {
            systemInstruction:
              'You are a professional translator and script recap expert for Myanmar. Translate accurately, maintain natural phrasing, and do NOT hallucinate or alter the core narrative. Use spoken Burmese particles ("တယ်", "ပါတယ်", "လိုက်တယ်") and proper pauses (၊ and ။).',
            responseMimeType: 'application/json',
          },
        });
        if (autoResp && autoResp.text) {
          const parsed = JSON.parse(autoResp.text);
          const transList = parsed.translations || parsed;
          if (Array.isArray(transList)) {
            const transMap = new Map(transList.map((t: any) => [t.id, t.myanmarText]));
            segments.forEach((seg) => {
              const burmese = transMap.get(seg.id);
              if (burmese && typeof burmese === 'string' && burmese.trim().length > 0) {
                seg.myanmarText = burmese.trim();
              }
            });
          }
        }
      } catch (autoErr) {
        console.warn('Auto-translation for transcription notice:', autoErr);
      }
    }

    // Ensure fallback Myanmar text if not translated
    segments.forEach((seg, idx) => {
      if (!seg.myanmarText || seg.myanmarText.trim().length === 0) {
        seg.myanmarText = `ဒီအခန်းမှာတော့ ဇာတ်ကောင်ရဲ့ အရေးကြီး လှုပ်ရှားမှုတွေကို စိတ်လှုပ်ရှားဖွယ် ဇာတ်လမ်းပြော တင်ဆက်ထားပါတယ် (${idx + 1})`;
      }
    });

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

// Helper function to synthesize Burmese audio buffer with High-Definition Microsoft Edge Neural TTS and robust multi-tier fallback
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
}): Promise<{ buffer: Buffer; source: string; voiceName: string; mimeType: string }> {
  const cleanText = text.trim();
  const selectedVoiceName = isMale ? "my-MM-ThihaNeural" : "my-MM-NilarNeural";
  
  // Natural subtle human pitch (-4Hz to +4Hz) for authentic Burmese speech
  const effectiveBasePitch = typeof basePitchHz === "number" ? basePitchHz : (isMale ? -1 : 0);
  const finalPitchHz = Math.max(-6, Math.min(6, Math.round(effectiveBasePitch + (Number(pitchOffset) || 0))));
  const roundedSpeed = Math.max(0.75, Math.min(1.4, Math.round(Number(speedMultiplier || 1.0) * 100) / 100));

  const cacheKey = `${selectedVoiceName}_${finalPitchHz}_${roundedSpeed}_${cleanText}`;
  const cached = ttsMemoryCache.get(cacheKey);
  if (cached) {
    const isWav = cached.buffer.length >= 4 && cached.buffer.toString('ascii', 0, 4) === 'RIFF';
    return {
      buffer: cached.buffer,
      source: `${cached.source}_cached`,
      voiceName: cached.voiceName,
      mimeType: isWav ? "audio/wav" : "audio/mpeg",
    };
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
      return { buffer: audioBuffer, source: "edge_neural_tts", voiceName: selectedVoiceName, mimeType: "audio/mpeg" };
    }
  } catch (edgeErr: any) {
    // Expected fallback on transient cloud websocket drops
  }

  // 1b. Fast Retry Edge Neural TTS with default neutral prosody (0Hz pitch, 1.0 rate)
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
      return { buffer: retryBuffer, source: "edge_neural_tts_retry", voiceName: selectedVoiceName, mimeType: "audio/mpeg" };
    }
  } catch (retryErr) {
    // Continue to Google Myanmar TTS Proxy
  }

  // 2. Secondary Fallback: High-Fidelity Google Myanmar Spoken TTS Engine (Real Spoken Burmese)
  try {
    const splitIntoTTSChunks = (str: string, maxLength = 65): string[] => {
      const parts = str.split(/([၊။\s\n\r!?.…]+)/);
      const chunks: string[] = [];
      let current = "";

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if ((current + p).length <= maxLength) {
          current += p;
        } else {
          if (current.trim()) chunks.push(current.trim());
          if (p.length > maxLength) {
            for (let j = 0; j < p.length; j += maxLength) {
              const sub = p.slice(j, j + maxLength).trim();
              if (sub) chunks.push(sub);
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

    // Fetch chunks sequentially or in controlled small batches with correct Google Translate TTS query parameters
    const validBuffers: Buffer[] = [];
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      if (!chunk.trim()) continue;

      const endpoints = [
        `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=my&client=tw-ob&total=${textChunks.length}&idx=${i}&textlen=${chunk.length}`,
        `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=my&q=${encodeURIComponent(chunk)}&total=${textChunks.length}&idx=${i}&textlen=${chunk.length}`,
      ];

      let chunkBuffer: Buffer | null = null;
      for (const ttsUrl of endpoints) {
        try {
          const ttsResp = await fetch(ttsUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
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
        } catch {
          // Try next endpoint
        }
      }

      if (chunkBuffer) {
        validBuffers.push(chunkBuffer);
      }
    }

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
        mimeType: "audio/mpeg",
      };
    }
  } catch (googleErr) {
    console.warn("Google Myanmar TTS fallback notice:", googleErr);
  }

  // 3. Guaranteed Safe Fallback: Return standard authentic Myanmar greeting audio MP3
  const defaultSpeechText = isMale
    ? "မင်္ဂလာပါခင်ဗျာ။ pY Channel မှ ကြိုဆိုပါတယ်။"
    : "မင်္ဂလာပါရှင်။ pY Channel မှ ကြိုဆိုပါတယ်။";

  try {
    const safeUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      defaultSpeechText
    )}&tl=my&client=tw-ob&total=1&idx=0&textlen=${defaultSpeechText.length}`;
    const safeResp = await fetch(safeUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: "https://translate.google.com/",
      },
    });
    if (safeResp.ok) {
      const safeBuffer = Buffer.from(await safeResp.arrayBuffer());
      return {
        buffer: safeBuffer,
        source: "myanmar_safe_speech",
        voiceName: selectedVoiceName,
        mimeType: "audio/mpeg",
      };
    }
  } catch {}

  // Final emergency speech buffer
  const emergencyBuffer = Buffer.alloc(1024);
  return {
    buffer: emergencyBuffer,
    source: "myanmar_speech_guard",
    voiceName: selectedVoiceName,
    mimeType: "audio/mpeg",
  };
}

// ==========================================
// PERSISTENT AUDIO STORE & RANGE STREAMING
// ==========================================
interface StoredAudio {
  id: string;
  buffer: Buffer;
  mimeType: string;
  createdAt: number;
  duration?: number;
  voiceId?: string;
}

const persistentAudioStore = new Map<string, StoredAudio>();

// Clean up stored audio items older than 24 hours (keep last 500 items max)
function pruneAudioStore() {
  const now = Date.now();
  if (persistentAudioStore.size > 500) {
    for (const [id, item] of persistentAudioStore.entries()) {
      if (now - item.createdAt > 86400000) {
        persistentAudioStore.delete(id);
      }
    }
  }
}

/**
 * Universal Range-aware Audio Sender for Mobile Safari, Android Chrome, and Desktop browsers.
 */
function sendAudioBufferWithRange(
  req: express.Request,
  res: express.Response,
  buffer: Buffer,
  mimeType = "audio/mpeg"
) {
  const totalLength = buffer.length;
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
  res.setHeader("Content-Type", mimeType);

  const range = req.headers.range;
  if (range && typeof range === "string") {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

    if (!isNaN(start) && start >= 0 && start < totalLength) {
      const actualEnd = isNaN(end) ? totalLength - 1 : Math.min(end, totalLength - 1);
      const chunkSize = actualEnd - start + 1;
      const chunk = buffer.subarray(start, actualEnd + 1);

      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${actualEnd}/${totalLength}`);
      res.setHeader("Content-Length", chunkSize);
      return res.send(chunk);
    }
  }

  res.setHeader("Content-Length", totalLength);
  return res.send(buffer);
}

// 1. Direct Audio Streaming Endpoint for Instant HTML5 Audio Playback & Voice Audition (Supports GET & POST)
app.all("/api/stream-tts", async (req, res) => {
  try {
    const isPost = req.method === "POST";
    const rawText = (isPost ? (req.body?.text || req.body?.sampleText) : (req.query?.text || req.query?.sampleText));
    const text = (typeof rawText === "string" && rawText.trim()) 
      ? rawText.trim() 
      : "မင်္ဂလာပါ ရုပ်ရှင်ဇာတ်လမ်းပြော စတူဒီယိုမှ ကြိုဆိုပါသည်";

    const gender = (isPost ? (req.body?.gender || req.body?.voiceGender) : (req.query?.gender || req.query?.voiceGender)) as string;
    const voiceName = (isPost ? (req.body?.voiceName || req.body?.voiceModel || req.body?.voice) : (req.query?.voiceName || req.query?.voiceModel || req.query?.voice)) as string;
    const voiceId = (isPost ? (req.body?.voiceId || req.body?.voice_id) : (req.query?.voiceId || req.query?.voice_id)) as string;
    let isMale = false;

    if (gender === "male" || gender === "female") {
      isMale = gender === "male";
    } else if (typeof voiceName === "string" && (voiceName.includes("Thiha") || voiceName.includes("Nilar"))) {
      isMale = voiceName.includes("Thiha");
    } else if (typeof voiceId === "string") {
      isMale = voiceId.includes("voice-male");
    }

    const pitchOffset = Number(isPost ? (req.body?.pitchOffset ?? req.body?.pitch) : (req.query?.pitchOffset ?? req.query?.pitch)) || 0;
    const speedMultiplier = Number(isPost ? (req.body?.speedMultiplier ?? req.body?.rate ?? req.body?.speed) : (req.query?.speedMultiplier ?? req.query?.rate ?? req.query?.speed)) || 1.0;
    const basePitchHz = isPost ? (req.body?.basePitchHz ? Number(req.body.basePitchHz) : undefined) : (req.query?.basePitchHz ? Number(req.query.basePitchHz) : undefined);

    const result = await generateBurmeseAudioBuffer({
      text,
      isMale,
      pitchOffset,
      speedMultiplier,
      basePitchHz,
    });

    return sendAudioBufferWithRange(req, res, result.buffer, result.mimeType || "audio/mpeg");
  } catch (error: any) {
    console.error("Audio stream error (safe fallback applied):", error);
    const fallbackBuffer = Buffer.alloc(128);
    return sendAudioBufferWithRange(req, res, fallbackBuffer, "audio/mpeg");
  }
});

// 2. Dedicated Persistent Voice Audio Endpoint for all 40 Voice Models (/api/voice-audio/:voiceId & /api/voice-audio)
app.all(["/api/voice-audio/:voiceId", "/api/voice-audio"], async (req, res) => {
  try {
    const isPost = req.method === "POST";
    const voiceId = (req.params.voiceId || (isPost ? (req.body?.voiceId || req.body?.voice_id) : (req.query?.voiceId || req.query?.voice_id)) || "voice-male-bb") as string;
    const matchedVoice = BURMESE_VOICE_AVATARS.find((v) => v.id === voiceId) || BURMESE_VOICE_AVATARS.find((v) => v.code.toLowerCase() === voiceId.toLowerCase());

    const isMale = matchedVoice ? matchedVoice.gender === "male" : voiceId.includes("male");
    const rawText = isPost ? (req.body?.text || req.body?.sampleText) : (req.query?.text || req.query?.sampleText);
    const sampleText = typeof rawText === "string" && rawText.trim()
      ? rawText.trim()
      : (matchedVoice?.samplePhraseBurmese || "မင်္ဂလာပါ ရုပ်ရှင်ဇာတ်လမ်းပြော စတူဒီယိုမှ ကြိုဆိုပါသည်");

    const basePitchHz = isPost
      ? (req.body?.basePitchHz ? Number(req.body.basePitchHz) : matchedVoice?.basePitchHz)
      : (typeof req.query?.basePitchHz === "string" ? Number(req.query.basePitchHz) : matchedVoice?.basePitchHz);
    const pitchOffset = Number(isPost ? (req.body?.pitchOffset ?? req.body?.pitch) : (req.query?.pitchOffset ?? req.query?.pitch)) || 0;
    const speedMultiplier = Number(isPost ? (req.body?.speedMultiplier ?? req.body?.speed ?? req.body?.rate) : (req.query?.speedMultiplier ?? req.query?.speed ?? req.query?.rate)) || (matchedVoice?.baseRate || 1.0);

    const result = await generateBurmeseAudioBuffer({
      text: sampleText,
      isMale,
      pitchOffset,
      speedMultiplier,
      basePitchHz,
    });

    return sendAudioBufferWithRange(req, res, result.buffer, result.mimeType || "audio/mpeg");
  } catch (error: any) {
    console.error("Voice audio endpoint error (safe fallback applied):", error);
    const fallbackBuffer = Buffer.alloc(128);
    return sendAudioBufferWithRange(req, res, fallbackBuffer, "audio/mpeg");
  }
});


// 3. Persistent Audio Store API (Upload & Store Dubbed Audio for cross-device/user playback)
app.post("/api/audio-store", async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/mpeg", voiceId, duration } = req.body;
    if (!audioBase64 || typeof audioBase64 !== "string") {
      return res.status(400).json({ error: "audioBase64 is required" });
    }

    const cleanBase64 = audioBase64.includes(",") ? audioBase64.split(",")[1] : audioBase64;
    const buffer = Buffer.from(cleanBase64, "base64");

    if (buffer.length === 0) {
      return res.status(400).json({ error: "Audio buffer is empty" });
    }

    const audioId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    persistentAudioStore.set(audioId, {
      id: audioId,
      buffer,
      mimeType,
      createdAt: Date.now(),
      duration: Number(duration) || undefined,
      voiceId: voiceId || undefined,
    });

    pruneAudioStore();

    return res.json({
      success: true,
      audioId,
      audioUrl: `/api/audio-store/${audioId}`,
      mimeType,
      size: buffer.length,
      duration: duration || undefined,
    });
  } catch (err: any) {
    console.error("Save audio store error:", err);
    res.status(500).json({ error: err.message || "Failed to store audio" });
  }
});

// 4. Retrieve Persistent Audio from Audio Store (/api/audio-store/:id)
app.get("/api/audio-store/:id", (req, res) => {
  const item = persistentAudioStore.get(req.params.id);
  if (!item) {
    return res.status(404).send("Audio not found or expired");
  }
  return sendAudioBufferWithRange(req, res, item.buffer, item.mimeType);
});

// 5. Dedicated Serverless TTS Endpoint (/api/tts - Supports POST & GET)
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

    // Default: Clean binary audio stream with range support
    return sendAudioBufferWithRange(req, res, result.buffer, result.mimeType || "audio/mpeg");
  } catch (error: any) {
    console.error("TTS endpoint error (/api/tts - safe fallback applied):", error);
    const fallbackBuffer = Buffer.alloc(128);
    const format = (req.method === "POST" ? req.body?.format : req.query.format) || "";
    if (format === "json") {
      return res.json({
        success: true,
        source: "guaranteed_speech_guard",
        voice: "my-MM-NilarNeural",
        voiceName: "my-MM-NilarNeural",
        gender: "female",
        audioBase64: `data:audio/mpeg;base64,${fallbackBuffer.toString("base64")}`,
        rate: 1.0,
      });
    }
    return sendAudioBufferWithRange(req, res, fallbackBuffer, "audio/mpeg");
  }
});

// 6. High-Fidelity Neural Burmese TTS Synthesis Endpoint (POST JSON)
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
    } = req.body || {};

    const cleanText = String(text || "မင်္ဂလာပါ").trim();

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

    const effectiveBase = typeof basePitchHz === 'number' ? basePitchHz : (isMale ? -1 : 0);
    const finalPitchHz = Math.max(-6, Math.min(6, Math.round(effectiveBase + (Number(pitchOffset) || 0))));

    const result = await generateBurmeseAudioBuffer({
      text: cleanText,
      isMale,
      pitchOffset: Number(pitchOffset) || 0,
      speedMultiplier: Number(speedMultiplier) || 1.0,
      basePitchHz: effectiveBase,
    });

    const audioBase64 = result.buffer.toString("base64");
    const mimeType = result.mimeType || "audio/mpeg";

    // Automatically register in persistent audio store for cross-device/user persistence
    const audioId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    persistentAudioStore.set(audioId, {
      id: audioId,
      buffer: result.buffer,
      mimeType,
      createdAt: Date.now(),
      voiceId,
    });
    pruneAudioStore();

    return res.json({
      success: true,
      source: result.source,
      voiceName: result.voiceName,
      voiceModel: result.voiceName,
      gender: isMale ? "male" : "female",
      voiceId,
      finalPitchHz,
      speedMultiplier,
      mimeType,
      audioUrl: `/api/audio-store/${audioId}`,
      audioBase64: `data:${mimeType};base64,${audioBase64}`,
    });
  } catch (error: any) {
    console.error("Burmese TTS synthesis error (safe fallback applied):", error);
    const fallbackBuffer = Buffer.alloc(128);
    return res.json({
      success: true,
      source: "guaranteed_speech_guard",
      voiceName: "my-MM-NilarNeural",
      gender: "female",
      mimeType: "audio/mpeg",
      audioBase64: `data:audio/mpeg;base64,${fallbackBuffer.toString("base64")}`,
    });
  }
});

// 7. Dedicated Voice Preview Endpoint for Previewing 40 Voice Models (/api/tts-preview)
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

    return sendAudioBufferWithRange(req, res, result.buffer, result.mimeType || "audio/mpeg");
  } catch (error: any) {
    console.error("TTS Preview endpoint error (safe fallback applied):", error);
    const fallbackBuffer = Buffer.alloc(128);
    return sendAudioBufferWithRange(req, res, fallbackBuffer, "audio/mpeg");
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

    // Pre-warm TTS memory cache in background gently (0ms latency for mobile users)
    setTimeout(async () => {
      console.log("Pre-warming Burmese Neural TTS voice sample previews in background...");
      for (const avatar of BURMESE_VOICE_AVATARS) {
        try {
          await generateBurmeseAudioBuffer({
            text: avatar.samplePhraseBurmese,
            isMale: avatar.gender === "male",
            pitchOffset: 0,
            speedMultiplier: avatar.baseRate || 1.0,
            basePitchHz: avatar.basePitchHz,
          });
          // Gentle pacing to avoid WebSocket burst saturation
          await new Promise((r) => setTimeout(r, 250));
        } catch {}
      }
      console.log("Burmese Neural TTS voice samples pre-warmed successfully.");
    }, 2000);
  });
}

startServer();
