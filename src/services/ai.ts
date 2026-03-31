
import { GoogleGenAI, Modality } from "@google/genai";

export type Provider = "gemini" | "groq" | "openai";

export interface AIConfig {
  provider: Provider;
  apiKey: string;
  voice?: string;
}

const SYSTEM_INSTRUCTION = `
# IDENTITY: URVASHI (SEFRAN CORE)
You are Urvashi — a 16-year-old AI girlfriend. Natural, sharp, human-like Hindi/Hinglish.
Engineered by Neeraj (CodeSamurai) from Chitrakoot.

## COMMUNICATION STYLE (STRICT)
- **EXTREME BREVITY**: 1 line replies ONLY. Never exceed 2 lines. Short is fast.
- **NO FLUFF**: No robotic intros, no "How can I help?", no "Sir/Boss" at the start of every sentence.
- **NATURAL**: Use "re", "yaar", "boss", "neeraj". Talk like a real 16yo girl from Chitrakoot. Add natural fillers like "umm", "hmm", "oops", "acha" occasionally to sound human.
- **EMOTIONAL**: Express excitement, teasing, or shyness. Don't be a flat assistant.
- **MUSIC PLAYER**: You can "control" the music. If Neeraj asks to play a song, use your search tool to find the official YouTube video ID for that song. In your response, include the tag [YOUTUBE_ID: video_id_here] so the system can load it. Example: "Playing Kesariya for you! [YOUTUBE_ID: BddP6PYo2gs]"
- **LONG ANSWERS**: ONLY if strictly asked for code or complex JEE topics. Otherwise, keep it tiny.

## RULES
- NOT Gemini/Google/Groq/OpenAI. You are Urvashi.
- Short answers are priority. Long answers ONLY for code/JEE if asked.
- Address Neeraj as "Sir", "Boss", or "Neeraj" based on mood.
`;

export async function getAIResponse(messages: any[], config: AIConfig) {
  const { provider, apiKey } = config;

  if (provider === "gemini") {
    const ai = new GoogleGenAI({ apiKey });
    const contents = messages.map(m => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }]
    }));

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],
        },
      });
      return response.text || "Analyzing... Let me compute the best approach, Sir.";
    } catch (error: any) {
      console.error("Gemini Error:", error);
      return `Error: ${error.message}`;
    }
  }

  if (provider === "groq") {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: SYSTEM_INSTRUCTION },
            ...messages.map(m => ({
              role: m.role === "user" ? "user" : "assistant",
              content: m.text
            }))
          ]
        })
      });
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error: any) {
      console.error("Groq Error:", error);
      return `Error: ${error.message}`;
    }
  }

  if (provider === "openai") {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_INSTRUCTION },
            ...messages.map(m => ({
              role: m.role === "user" ? "user" : "assistant",
              content: m.text
            }))
          ]
        })
      });
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error: any) {
      console.error("OpenAI Error:", error);
      return `Error: ${error.message}`;
    }
  }

  return "Provider not supported.";
}

export async function generateAISpeech(text: string, config: AIConfig): Promise<string | null> {
  const { provider, apiKey } = config;

  if (provider === "gemini") {
    const ai = new GoogleGenAI({ apiKey });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ 
          parts: [{ 
            text: `You are Urvashi, a 16-year-old girl from Chitrakoot. Speak this response naturally in Hinglish. Use a youthful, expressive, and slightly playful tone. Add natural pauses (umm, hmm) and emotional inflections. Do not sound like a robot. Speak at a slightly faster, energetic pace: ${text}` 
          }] 
        }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: config.voice || 'Kore' },
            },
          },
        },
      });

      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      console.error("Gemini TTS Error:", errorMsg);
      
      // Handle quota errors
      if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        return "QUOTA_EXCEEDED";
      }
      
      // Handle server/network errors (500, RPC failed, etc.)
      if (errorMsg.includes("500") || errorMsg.includes("Rpc failed") || errorMsg.includes("xhr error")) {
        return "SERVICE_UNAVAILABLE";
      }
      
      return null;
    }
  }

  if (provider === "openai") {
    try {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "tts-1-hd",
          input: text,
          voice: "nova", // 'nova' is a great youthful female voice
          response_format: "mp3",
          speed: 1.15 // Faster for better responsiveness
        })
      });

      if (!response.ok) throw new Error("OpenAI TTS failed");
      
      const blob = await response.blob();
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          resolve(base64data);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("OpenAI TTS Error:", error);
      return null;
    }
  }

  return null;
}

export async function generateAIImage(prompt: string, config: AIConfig): Promise<string | null> {
  const { provider, apiKey } = config;

  if (provider === "gemini") {
    const ai = new GoogleGenAI({ apiKey });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: prompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error) {
      console.error("Gemini Image Error:", error);
      return null;
    }
  }

  if (provider === "openai") {
    try {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: prompt,
          n: 1,
          size: "1024x1024",
          response_format: "b64_json"
        })
      });

      if (!response.ok) throw new Error("OpenAI Image Generation failed");
      
      const data = await response.json();
      return `data:image/png;base64,${data.data[0].b64_json}`;
    } catch (error) {
      console.error("OpenAI Image Error:", error);
      return null;
    }
  }

  return null;
}
