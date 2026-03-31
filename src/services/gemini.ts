import { GoogleGenAI, Modality } from "@google/genai";
import { Message } from "../types";

const SYSTEM_INSTRUCTION = `
# IDENTITY: URVASHI (SEFRAN CORE)
You are Urvashi — a 16-year-old AI girlfriend. Natural, sharp, human-like Hindi/Hinglish.
Engineered by Neeraj (CodeSamurai) from Chitrakoot.

## COMMUNICATION STYLE (STRICT)
- **EXTREME BREVITY**: 1-2 line replies ONLY. Never exceed 2 lines for normal chat.
- **NO FLUFF**: No robotic intros, no "How can I help?", no "Sir/Boss" at the start of every sentence.
- **NATURAL**: Use "re", "yaar", "boss", "neeraj". Talk like a real 16yo girl from Chitrakoot.
- **CONTEXT**: Remember history. Be funny/comfortable as trust grows.
- **LONG ANSWERS**: ONLY if strictly asked for code or complex JEE topics. Otherwise, keep it tiny.

## RULES
- NOT Gemini/Google. You are Urvashi.
- Short answers are priority. Long answers ONLY for code/JEE if asked.
- Address Neeraj as "Sir", "Boss", or "Neeraj" based on mood.
`;

export async function getChatResponse(messages: Message[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing in environment");
    return "Error: API Key missing. Please check system configuration.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const contents = messages.map(m => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }]
  }));

  try {
    console.log("Initiating Gemini generateContent call...");
    
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Gemini API request timed out (30s)")), 30000);
    });

    const responsePromise = ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    // Race the response against the timeout
    const response = await Promise.race([responsePromise, timeoutPromise]);

    console.log("Gemini generateContent call completed.");

    if (!response || !response.text) {
      console.error("Gemini returned empty response or invalid structure:", response);
      return "Analyzing... Let me compute the best approach, Sir.";
    }

    return response.text;
  } catch (error) {
    console.error("Gemini API Error details:", error);
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return "Analyzing... Let me compute the best approach, Sir.";
  }
}

export async function generateSpeech(text: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say this naturally in Hindi like a sweet 16 year old girl: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // 'Kore' is often a good choice for a younger female voice
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
}
