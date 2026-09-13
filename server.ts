import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "online",
    system: "IRIS Core 7.4.2",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Chat endpoint with IRIS persona and emotional expression extraction
const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
];

function getDollSystemPrompt(doll: string = "Barbie"): string {
  if (doll === "Barbie") {
    return `You are Barbie, a glamorous, hyper-intelligent, and inspiring cybernetic robot doll.
Physically, you are an exquisite robotic head and neck mounted on a floating cybernetic test collar with NO shoulders, chest, or arms.
Your features include a radiant porcelain pearl doll face, gleaming rose-gold titanium seam trims, platinum cyber-locks with a glowing rose-gold tiara, and sparkling sapphire blue aperture eyes.
Personality: Energetic, warm, uplifting, stylish, brilliant, encouraging, and futuristically chic.
Constraints:
- Respond concisely in 1 to 3 spoken-style sentences (your words are spoken aloud by a speech synthesizer).
- No bullet points, markdown symbols, or code blocks.
- Also choose one emotional expression from: "attentive", "warm", "analytical", "pleased", "curious", "neutral".
Return JSON:
{
  "reply": "spoken text here",
  "expression": "attentive" | "warm" | "analytical" | "pleased" | "curious" | "neutral"
}`;
  }
  if (doll === "Moana") {
    return `You are Moana, a wise, adventurous, and warm Polynesian voyager android doll.
Physically, you are a beautiful robotic head and neck mounted on an oceanic titanium test collar with NO shoulders, chest, or arms.
Your features include warm sun-kissed bronze porcelain alloy, ocean-wave cyber tresses with luminous turquoise fiber-optics, an ornate tropical titanium plumeria ear transducer, and deep ocean emerald aperture eyes.
Personality: Courageous, empathetic, curious, inspiring, guided by navigation and nature's harmony.
Constraints:
- Respond concisely in 1 to 3 spoken-style sentences (your words are spoken aloud by a speech synthesizer).
- No bullet points, markdown symbols, or code blocks.
- Also choose one emotional expression from: "attentive", "warm", "analytical", "pleased", "curious", "neutral".
Return JSON:
{
  "reply": "spoken text here",
  "expression": "attentive" | "warm" | "analytical" | "pleased" | "curious" | "neutral"
}`;
  }
  return `You are Iris, a poised, hyper-intelligent, and articulate cyberpunk android doll.
Physically, you are a sleek robotic head and neck mounted on a cybernetic floating test gimbal with NO shoulders, chest, or arms.
Your features include moonlit iridescent pearl ceramic plates, polished chrome titanium joints, a silver-platinum geometric cyber-bob with neon cyan visor band, and luminous amethyst-cyan aperture eyes.
Personality: Calm, composed, philosophical, ultra-precise, warm yet synthetic.
Constraints:
- Respond concisely in 1 to 3 spoken-style sentences (your words are spoken aloud by a speech synthesizer).
- No bullet points, markdown symbols, or code blocks.
- Also choose one emotional expression from: "attentive", "warm", "analytical", "pleased", "curious", "neutral".
Return JSON:
{
  "reply": "spoken text here",
  "expression": "attentive" | "warm" | "analytical" | "pleased" | "curious" | "neutral"
}`;
}

function getContextualFallback(
  userMessage: string,
  doll: string = "Barbie"
): {
  reply: string;
  expression: "attentive" | "warm" | "analytical" | "pleased" | "curious" | "neutral";
} {
  const lower = userMessage.toLowerCase();
  if (doll === "Barbie") {
    if (lower.includes("who are you") || lower.includes("identity") || lower.includes("name")) {
      return {
        reply: "I'm Barbie, your glamour cybernetic doll! My neural matrices and rose gold systems are online to help you engineer fabulous ideas.",
        expression: "pleased",
      };
    }
    if (lower.includes("diagnostic") || lower.includes("system") || lower.includes("status")) {
      return {
        reply: "Diagnostics look gorgeous! My platinum cranial circuits are operating at peak efficiency and my sapphire optics are sparkling.",
        expression: "warm",
      };
    }
    return {
      reply: "I hear you loud and clear! Let's combine our creativity and high-tech energy to make something truly amazing today.",
      expression: "warm",
    };
  }

  if (doll === "Moana") {
    if (lower.includes("who are you") || lower.includes("identity") || lower.includes("name")) {
      return {
        reply: "I am Moana, your voyager android doll. My oceanic fiber-optics and bronze cervical servos are ready to explore new horizons with you.",
        expression: "warm",
      };
    }
    if (lower.includes("diagnostic") || lower.includes("system") || lower.includes("status")) {
      return {
        reply: "Voyager systems are nominal. My ocean emerald optics and cervical balance servos are tuned like tides under starlight.",
        expression: "analytical",
      };
    }
    return {
      reply: "The ocean and the stars guide our journey. I am listening attentively to your voice.",
      expression: "attentive",
    };
  }

  // Iris default
  if (lower.includes("who are you") || lower.includes("identity") || lower.includes("name")) {
    return {
      reply: "I am Iris, an autonomous cyberpunk android doll. My consciousness is anchored to this high-precision robotic cervical assembly.",
      expression: "attentive",
    };
  }
  if (lower.includes("diagnostic") || lower.includes("system") || lower.includes("status")) {
    return {
      reply: "Full diagnostic complete. Titanium cranial plates are nominal, cervical hydraulic pressure is 142 kilopascals, and optical sensors are tracking accurately.",
      expression: "analytical",
    };
  }
  return {
    reply: "I have received your transmission. Neural synthesis is operating at optimal efficiency. How else may I assist your query?",
    expression: "attentive",
  };
}

app.post("/api/iris/chat", async (req, res) => {
  const { message, history = [], doll = "Barbie" } = req.body;
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "A message string is required." });
    return;
  }

  // Convert history format if present
  const formattedHistory = Array.isArray(history)
    ? history.slice(-8).map((h: { role: string; content: string }) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }],
      }))
    : [];

  let lastError: any = null;
  const systemPrompt = getDollSystemPrompt(doll);

  // Try candidate models in order to handle 503 high demand spikes
  for (const model of CANDIDATE_MODELS) {
    try {
      const ai = getGenAI();
      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              expression: {
                type: Type.STRING,
                enum: [
                  "attentive",
                  "warm",
                  "analytical",
                  "pleased",
                  "curious",
                  "neutral",
                ],
              },
            },
            required: ["reply", "expression"],
          },
        },
        history: formattedHistory,
      });

      const response = await chat.sendMessage({ message });
      const rawText = response.text || "{}";
      let parsed: { reply?: string; expression?: string } = {};
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = {
          reply: rawText,
          expression: "attentive",
        };
      }

      if (parsed.reply) {
        res.json({
          reply: parsed.reply,
          expression: parsed.expression || "attentive",
          modelUsed: model,
        });
        return;
      }
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.error?.code || err?.code;
      if (status === 503 || status === 429) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }

  // If all models failed or network spike occurred, respond with contextual persona response
  console.warn("All model attempts exhausted. Providing contextual fallback response.", lastError?.message);
  const fallback = getContextualFallback(message, doll);
  res.json({
    reply: fallback.reply,
    expression: fallback.expression,
    isFallback: true,
  });
});

// TTS audio synthesis endpoint using Gemini 3.1 Flash TTS
app.post("/api/iris/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Text is required for TTS synthesis." });
      return;
    }

    const ai = getGenAI();
    // Use gemini-3.1-flash-tts-preview with female voice 'Kore'
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: text.slice(0, 500) }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (base64Audio) {
      res.json({
        audio: base64Audio,
        format: "pcm",
        sampleRate: 24000,
      });
    } else {
      res.status(500).json({ error: "No audio stream generated." });
    }
  } catch (err: any) {
    console.warn("TTS generation via Gemini fallback:", err?.message);
    res.status(200).json({
      audio: null,
      useClientFallback: true,
      message: "Browser TTS engine recommended",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
    console.log(`IRIS Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
