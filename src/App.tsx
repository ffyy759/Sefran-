import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Send, 
  Cpu, 
  Zap, 
  Settings,
  Mic,
  MicOff,
  Play,
  Pause,
  Music,
  SkipBack,
  SkipForward,
  ChevronLeft,
  Battery,
  Thermometer,
  Activity,
  Power,
  X,
  Volume2,
  Shield,
  ShieldAlert,
  Trash2
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "./lib/utils";
import { Message } from "./types";
import { getAIResponse, generateAISpeech, generateAIImage, AIConfig, Provider } from "./services/ai";
import BootSequence from "./components/BootSequence";
import SetupScreen from "./components/SetupScreen";

// --- Sub-Components ---

const Gauge = ({ value, label, unit, color = "#00D1FF", size = 80 }: { value: number, label: string, unit: string, color?: string, size?: number }) => {
  const radius = size * 0.4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="4"
          fill="transparent"
          className="text-white/5"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="4"
          fill="transparent"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 0.5s ease' }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-orbitron font-bold" style={{ color }}>{value}{unit}</span>
      </div>
      <span className="text-[8px] font-orbitron text-white/40 mt-1 uppercase tracking-tighter">{label}</span>
    </div>
  );
};

const Clock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hud-border px-4 py-1 rounded-full bg-[#00D1FF]/5">
      <span className="text-sm font-orbitron font-bold text-[#00D1FF] tracking-widest">
        {time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  );
};

const CentralFigure = () => (
  <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
    {/* HUD Rings */}
    <div className="absolute inset-0 border border-[#00D1FF]/10 rounded-full animate-rotate-slow" />
    <div className="absolute inset-4 border border-[#00D1FF]/20 rounded-full animate-rotate-fast border-dashed" />
    <div className="absolute inset-12 border-2 border-[#00D1FF]/5 rounded-full animate-pulse-glow" />
    
    {/* Liquid Anime Orb */}
    <div className="relative z-10 w-48 h-48 flex items-center justify-center">
      <motion.div
        animate={{
          borderRadius: [
            "40% 60% 70% 30% / 40% 50% 60% 50%",
            "60% 40% 30% 70% / 50% 60% 40% 60%",
            "40% 60% 70% 30% / 40% 50% 60% 50%",
          ],
          scale: [1, 1.05, 1],
          rotate: [0, 90, 180, 270, 360],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="w-full h-full bg-gradient-to-br from-[#00D1FF] via-[#00D1FF]/40 to-transparent blur-[2px] shadow-[0_0_50px_rgba(0,209,255,0.4)] relative"
      >
        {/* Inner Liquid Layer */}
        <motion.div
          animate={{
            borderRadius: [
              "60% 40% 30% 70% / 50% 60% 40% 60%",
              "40% 60% 70% 30% / 40% 50% 60% 50%",
              "60% 40% 30% 70% / 50% 60% 40% 60%",
            ],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-4 bg-[#00D1FF]/20 backdrop-blur-sm border border-[#00D1FF]/30"
        />
        
        {/* Core Glow */}
        <div className="absolute inset-12 bg-[#00D1FF] rounded-full blur-xl animate-pulse" />
        <div className="absolute inset-16 bg-white rounded-full blur-md opacity-50" />
      </motion.div>
      
      {/* HUD Crosshair Overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-full h-[1px] bg-[#00D1FF]/20" />
        <div className="h-full w-[1px] bg-[#00D1FF]/20 absolute" />
        <div className="w-8 h-8 border border-[#00D1FF]/40 rounded-full" />
      </div>
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const [booting, setBooting] = useState(true);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("sefran_messages");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved messages", e);
        return [];
      }
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveStatus, setLiveStatus] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [lastTranscript, setLastTranscript] = useState("");
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  
  const isLiveModeRef = useRef(isLiveMode);
  const liveStatusRef = useRef(liveStatus);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    isLiveModeRef.current = isLiveMode;
  }, [isLiveMode]);

  useEffect(() => {
    liveStatusRef.current = liveStatus;
  }, [liveStatus]);

  useEffect(() => {
    messagesRef.current = messages;
    localStorage.setItem("sefran_messages", JSON.stringify(messages));
  }, [messages]);

  // System Stats State
  const [stats, setStats] = useState({
    battery: 81,
    cpu: 42,
    gpu: 28,
    netSpeed: "12.4",
    temp: 39
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState("NO TRACK LOADED");
  const [musicConnected, setMusicConnected] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.1);
  const [useRealisticVoice, setUseRealisticVoice] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<string>(() => localStorage.getItem("sefran_voice") || "Kore");
  const [ttsQuotaExceeded, setTtsQuotaExceeded] = useState(false);
  const [ttsServiceUnavailable, setTtsServiceUnavailable] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const isRecognitionRunning = useRef(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    const savedProvider = localStorage.getItem("sefran_provider") as Provider;
    const savedApiKey = localStorage.getItem("sefran_api_key");
    if (savedProvider && savedApiKey) {
      setAiConfig({ provider: savedProvider, apiKey: savedApiKey });
    }
  }, []);

  const handleSetupComplete = (provider: Provider, apiKey: string) => {
    localStorage.setItem("sefran_provider", provider);
    localStorage.setItem("sefran_api_key", apiKey);
    setAiConfig({ provider, apiKey });
  };

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    localStorage.setItem("sefran_voice", voice);
    speak(`System voice updated to ${voice}. How do I sound now, Boss?`);
  };

  const resetApiKey = () => {
    localStorage.removeItem("sefran_provider");
    localStorage.removeItem("sefran_api_key");
    setAiConfig(null);
    setShowSettings(false);
  };

  const clearChatHistory = () => {
    if (window.confirm("Are you sure you want to clear all conversation history?")) {
      setMessages([]);
      localStorage.removeItem("sefran_messages");
      speak("Memory banks purged, Boss. Starting fresh.");
    }
  };

  const safeStartRecognition = () => {
    if (!recognitionRef.current) return false;
    if (isRecognitionRunning.current) return true;
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
      isRecognitionRunning.current = true;
      setMicPermissionDenied(false);
      return true;
    } catch (e: any) {
      const errorMsg = e.message || "";
      if (e.name === 'InvalidStateError' || errorMsg.includes('already started')) {
        isRecognitionRunning.current = true;
        setIsListening(true);
        return true;
      }
      // Only log if it's a real unexpected error
      console.error("Critical Recognition Start Error:", e);
      return false;
    }
  };

  const playMP3 = (base64Data: string) => {
    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audio.onplay = () => {
        console.log("MP3 voice started speaking");
        setLiveStatus("speaking");
      };
      
      audio.onended = () => {
        console.log("MP3 voice finished speaking");
        setLiveStatus("idle");
        URL.revokeObjectURL(url);
        if (isLiveModeRef.current) {
          setTimeout(() => {
            if (isLiveModeRef.current) {
              if (safeStartRecognition()) {
                setLiveStatus("listening");
              }
            }
          }, 400);
        }
      };
      
      audio.onerror = (e) => {
        console.error("MP3 Playback Error:", e);
        setLiveStatus("idle");
        URL.revokeObjectURL(url);
      };
      
      audio.play();
    } catch (err) {
      console.error("MP3 Playback Error:", err);
      setLiveStatus("idle");
    }
  };

  const playPCM = (base64Data: string) => {
    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // PCM is 16-bit little-endian
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const buffer = audioCtx.createBuffer(1, float32Array.length, 24000);
      buffer.getChannelData(0).set(float32Array);
      
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      
      source.onended = () => {
        console.log("Realistic voice finished speaking");
        setLiveStatus("idle");
        if (isLiveModeRef.current) {
          setTimeout(() => {
            if (isLiveModeRef.current) {
              if (safeStartRecognition()) {
                setLiveStatus("listening");
              }
            }
          }, 400);
        }
      };
      
      setLiveStatus("speaking");
      source.start();
    } catch (err) {
      console.error("PCM Playback Error:", err);
      setLiveStatus("idle");
    }
  };

  // Text to Speech
  const speak = async (text: string) => {
    if (useRealisticVoice && aiConfig && !ttsQuotaExceeded && !ttsServiceUnavailable) {
      console.log("Attempting realistic voice generation...");
      const audioData = await generateAISpeech(text, { ...aiConfig, voice: selectedVoice });
      
      if (audioData === "QUOTA_EXCEEDED") {
        console.warn("Gemini TTS Quota Exceeded. Switching to system voice for 60s.");
        if (!ttsQuotaExceeded) {
          setMessages(prev => [...prev, {
            role: "model",
            text: "[SYSTEM: Gemini TTS Quota Exceeded. Switching to system voice temporarily.]",
            timestamp: Date.now()
          }]);
        }
        setTtsQuotaExceeded(true);
        // Reset after 60 seconds
        setTimeout(() => setTtsQuotaExceeded(false), 60000);
        // Continue to fallback
      } else if (audioData === "SERVICE_UNAVAILABLE") {
        console.warn("Gemini TTS Service Unavailable. Falling back to system voice.");
        if (!ttsServiceUnavailable) {
          setMessages(prev => [...prev, {
            role: "model",
            text: "[SYSTEM: Gemini TTS Service Unavailable. Falling back to system voice.]",
            timestamp: Date.now()
          }]);
          setTtsServiceUnavailable(true);
          // Reset after 30 seconds to try again
          setTimeout(() => setTtsServiceUnavailable(false), 30000);
        }
        // Continue to fallback
      } else if (audioData) {
        if (aiConfig.provider === "gemini") {
          playPCM(audioData);
        } else if (aiConfig.provider === "openai") {
          playMP3(audioData);
        }
        return;
      } else {
        console.warn("Realistic voice failed, falling back to system TTS");
      }
    }

    if (!window.speechSynthesis) return;
    
    try {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find a good Hindi voice
      const voices = window.speechSynthesis.getVoices();
      const hindiVoice = voices.find(v => 
        (v.lang.includes('hi') || v.name.includes('Hindi')) && 
        (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('kalpana') || v.name.toLowerCase().includes('google'))
      ) || voices.find(v => v.lang.includes('hi') || v.name.includes('Hindi'));
      
      if (hindiVoice) utterance.voice = hindiVoice;
      
      utterance.lang = "hi-IN";
      utterance.rate = speechRate;
      utterance.pitch = 1.2; // Slightly higher pitch for a "cuter" young voice
      
      utterance.onstart = () => {
        console.log("System TTS started speaking");
        setLiveStatus("speaking");
      };
      
      utterance.onend = () => {
        console.log("System TTS finished speaking");
        setLiveStatus("idle");
        if (isLiveModeRef.current) {
          setTimeout(() => {
            if (isLiveModeRef.current) {
              if (safeStartRecognition()) {
                setLiveStatus("listening");
              }
            }
          }, 400);
        }
      };
      
      utterance.onerror = (e) => {
        console.error("Speech error:", e);
        setLiveStatus("idle");
        // Still restart listening if in live mode
        if (isLiveModeRef.current) {
          setTimeout(() => {
            if (isLiveModeRef.current) {
              if (safeStartRecognition()) {
                setLiveStatus("listening");
              }
            }
          }, 1000);
        }
      };
      
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Speak error:", err);
    }
  };

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    
    // Pre-load voices for better fallback performance
    const loadVoices = () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
      }
    };
    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        cpu: Math.floor(Math.random() * (65 - 35) + 35),
        gpu: Math.floor(Math.random() * (45 - 20) + 20),
        netSpeed: (Math.random() * (25 - 5) + 5).toFixed(1),
        temp: Math.floor(Math.random() * (42 - 38) + 38)
      }));
    }, 3000);

    // Real Battery API
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setStats(prev => ({ ...prev, battery: Math.round(battery.level * 100) }));
        battery.addEventListener('levelchange', () => {
          setStats(prev => ({ ...prev, battery: Math.round(battery.level * 100) }));
        });
      });
    }

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "hi-IN";

      recognition.onstart = () => {
        isRecognitionRunning.current = true;
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setLastTranscript(transcript);
        setIsListening(false);
        setLiveStatus("idle");

        if (isLiveModeRef.current) {
          handleLiveInput(transcript);
        } else {
          // Check for commands even in normal mode if it's a short command
          if (!handleVoiceCommand(transcript)) {
            // Automatically send the transcribed text
            handleSend(transcript);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Recognition Error:", event.error);
        setIsListening(false);
        setLiveStatus("idle");
        isRecognitionRunning.current = false;
        
        if (event.error === 'not-allowed') {
          setMicPermissionDenied(true);
          speak("Boss, mic ki permission nahi mili hai. Please browser me mic allow kardo.");
          return;
        }
        
        // Auto-restart if in live mode and it's a non-fatal error or timeout
        if (isLiveModeRef.current && (event.error === 'no-speech' || event.error === 'audio-capture')) {
          setTimeout(() => {
            if (isLiveModeRef.current && liveStatusRef.current === 'idle') {
              if (safeStartRecognition()) {
                setLiveStatus("listening");
              }
            }
          }, 500);
        }
      };

      recognition.onend = () => {
        isRecognitionRunning.current = false;
        setIsListening(false);
        // If it ended and we are still in live mode and idle (not thinking/speaking), restart
        if (isLiveModeRef.current && liveStatusRef.current === "listening") {
          setTimeout(() => {
            if (isLiveModeRef.current && liveStatusRef.current === "listening") {
              safeStartRecognition();
            }
          }, 100);
        }
      };

      recognitionRef.current = recognition;
    }

    // Global error handler for uncaught rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Uncaught promise rejection:", event.reason);
    };
    window.addEventListener("unhandledrejection", handleRejection);
    return () => window.removeEventListener("unhandledrejection", handleRejection);
  }, []);

  const handleImageGeneration = async (prompt: string) => {
    if (!aiConfig) return;
    
    const userMessage: Message = {
      role: "user",
      text: `Generate image: ${prompt}`,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setLiveStatus("thinking");
    speak("Acha boss, image generate kar rahi hoon. Thoda ruko...");

    try {
      const imageUrl = await generateAIImage(prompt, aiConfig);
      if (imageUrl) {
        const modelMessage: Message = {
          role: "model",
          text: `Here is the image for "${prompt}":`,
          imageUrl,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, modelMessage]);
        speak("Ye rahi aapki image, Boss! Kaisi lagi?");
      } else {
        speak("Oops, image generate nahi ho paayi. Shayad API me kuch problem hai.");
      }
    } catch (error) {
      console.error("Image Generation Error:", error);
      speak("Error aa gaya image banane me.");
    } finally {
      setIsTyping(false);
      setLiveStatus("idle");
    }
  };

  const handleVoiceCommand = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes("generate image") || lowerText.includes("create image") || lowerText.includes("imagine") || lowerText.includes("photo banao")) {
      const prompt = text.replace(/generate image|create image|imagine|photo banao/gi, "").trim();
      if (prompt) {
        handleImageGeneration(prompt);
        return true;
      }
    }

    if (lowerText.includes("connect music") || lowerText.includes("music connect")) {
      setMusicConnected(true);
      speak("System connected to music player, Boss. Ready for uplink.");
      return true;
    }

    if (lowerText.includes("pause") || lowerText.includes("stop")) {
      setIsPlaying(false);
      speak("Music paused, Boss.");
      return true;
    }
    
    if (lowerText.includes("resume") || lowerText === "play") {
      if (!musicConnected) {
        speak("Boss, music player connect nahi hai.");
        return true;
      }
      setIsPlaying(true);
      speak("Resuming playback, Boss.");
      return true;
    }

    if (lowerText.includes("play ") || lowerText.includes("bajao") || lowerText.includes("song play") || lowerText.includes("music play karo")) {
      // Extract song name
      let song = "";
      if (lowerText.includes("play ")) {
        song = text.substring(lowerText.indexOf("play ") + 5).trim();
        if (song.toLowerCase().endsWith(" song")) {
          song = song.substring(0, song.length - 5).trim();
        }
      } else if (lowerText.includes("bajao")) {
        song = text.substring(0, lowerText.indexOf("bajao")).trim();
      } else if (lowerText.includes("music play karo ")) {
        song = text.substring(lowerText.indexOf("music play karo ") + 16).trim();
      } else if (lowerText.includes("song play ")) {
        song = text.substring(lowerText.indexOf("song play ") + 10).trim();
      }
      
      if (song) {
        // Instead of opening YouTube results, we send it to the AI to find the ID
        // But we want to announce it first
        speak(`Searching for ${song} on YouTube, Sir.`);
        
        // Trigger handleSend manually with the song request
        setInput(`Find and play the song ${song} on YouTube.`);
        setTimeout(() => handleSend(), 500);
        return true;
      }
    }
    
    if (lowerText.includes("skip") || lowerText.includes("next")) {
      if (!musicConnected) {
        speak("Boss, music player connect nahi hai.");
        return true;
      }
      const tracks = [
        "Interstellar Main Theme - Hans Zimmer",
        "Time - Hans Zimmer",
        "Cornfield Chase - Hans Zimmer",
        "Stay - Hans Zimmer"
      ];
      const nextIndex = (tracks.indexOf(currentTrack) + 1) % tracks.length;
      setCurrentTrack(tracks[nextIndex] || tracks[0]);
      speak("Skipping to next track, Boss.");
      return true;
    }
    
    if (lowerText.includes("settings") || lowerText.includes("open settings")) {
      setShowSettings(true);
      speak("Opening system settings, Boss.");
      return true;
    }

    if (lowerText.includes("close settings")) {
      setShowSettings(false);
      speak("Settings closed, Boss.");
      return true;
    }
    
    return false;
  };

  const handleLiveInput = async (text: string) => {
    console.log("handleLiveInput called with:", text);
    if (!text.trim()) {
      console.log("Empty text, ignoring.");
      return;
    }
    
    // Check for local voice commands first
    if (handleVoiceCommand(text)) {
      console.log("Voice command handled locally.");
      return;
    }

    const userMessage: Message = {
      role: "user",
      text: text,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messagesRef.current, userMessage];
    setMessages(updatedMessages);
    setLiveStatus("thinking");
    console.log("Live status set to thinking, calling Gemini...");

    try {
      if (!aiConfig) return;
      console.log("Calling getAIResponse with messages:", updatedMessages);
      const response = await getAIResponse(updatedMessages, aiConfig);
      console.log("AI response received:", response);
      if (!response) {
        console.warn("Empty response from Gemini");
        return;
      }

      // Extract YouTube ID if present
      let cleanResponse = response;
      const ytMatch = response.match(/\[YOUTUBE_ID:\s*([^\]]+)\]/);
      if (ytMatch) {
        const videoId = ytMatch[1].trim();
        setYoutubeVideoId(videoId);
        setMusicConnected(true);
        setIsPlaying(true);
        cleanResponse = response.replace(/\[YOUTUBE_ID:\s*[^\]]+\]/, "").trim();
      }

      const modelMessage: Message = {
        role: "model",
        text: cleanResponse,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, modelMessage]);
      speak(cleanResponse);
      console.log("Live mode response handled");
    } catch (error) {
      console.error("Live Mode Error:", error);
      // Try to restart listening even on error to keep the loop going
      if (isLiveModeRef.current) {
        setTimeout(() => {
          if (isLiveModeRef.current) {
            if (safeStartRecognition()) {
              setLiveStatus("listening");
            }
          }
        }, 1000);
      }
    } finally {
      console.log("handleLiveInput finally block reached, setting status to idle");
      setLiveStatus("idle");
    }
  };

  const requestMicPermissionManually = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, we just wanted the permission
      stream.getTracks().forEach(track => track.stop());
      setMicPermissionDenied(false);
      safeStartRecognition();
    } catch (err: any) {
      console.error("Manual mic request error:", err);
      setMicPermissionDenied(true);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        speak("Boss, mic block hai. Setting me jaakar allow karna padega.");
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        alert("Sir, your browser doesn't support voice input.");
        return;
      }
      safeStartRecognition();
    }
  };

  const toggleLiveMode = () => {
    if (isLiveMode) {
      setIsLiveMode(false);
      setLiveStatus("idle");
      recognitionRef.current?.stop();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    } else {
      setIsLiveMode(true);
      setShowChat(false);
      // Start the loop
      setTimeout(() => {
        if (safeStartRecognition()) {
          setLiveStatus("listening");
        }
      }, 500);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || isTyping) return;
    
    const currentInput = textToSend;
    if (!overrideText) setInput("");

    // Check for local commands first
    if (handleVoiceCommand(currentInput)) {
      return;
    }

    const userMessage: Message = {
      role: "user",
      text: currentInput,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setShowChat(true);

    try {
      if (!aiConfig) return;
      const response = await getAIResponse([...messages, userMessage], aiConfig);
      console.log("AI response received (chat):", response);

      // Extract YouTube ID if present
      let cleanResponse = response;
      const ytMatch = response.match(/\[YOUTUBE_ID:\s*([^\]]+)\]/);
      if (ytMatch) {
        const videoId = ytMatch[1].trim();
        setYoutubeVideoId(videoId);
        setMusicConnected(true);
        setIsPlaying(true);
        cleanResponse = response.replace(/\[YOUTUBE_ID:\s*[^\]]+\]/, "").trim();
      }

      const modelMessage: Message = {
        role: "model",
        text: cleanResponse,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, modelMessage]);
      speak(modelMessage.text);
    } catch (error) {
      console.error("SEFRAN Error:", error);
      setMessages(prev => [...prev, {
        role: "model",
        text: "Analyzing... Let me compute the best approach, Sir.",
        timestamp: Date.now(),
      }]);
    } finally {
      console.log("handleSend finally block reached, setting isTyping to false");
      setIsTyping(false);
    }
  };

  if (!aiConfig) {
    return <SetupScreen onComplete={handleSetupComplete} />;
  }

  if (booting) {
    return <BootSequence onComplete={() => setBooting(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#000000] text-[#E0E0E0] font-sans flex flex-col selection:bg-[#00D1FF]/30 hud-grid relative overflow-hidden">
      {/* YouTube Mini Player */}
      <AnimatePresence>
        {youtubeVideoId && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed bottom-4 right-4 z-50 w-64 aspect-video bg-black border border-[#00D1FF]/30 rounded-xl overflow-hidden shadow-2xl shadow-[#00D1FF]/20"
          >
            <div className="absolute top-0 left-0 w-full h-6 bg-black/80 flex items-center justify-between px-2 z-10">
              <span className="text-[8px] font-orbitron text-[#00D1FF] tracking-widest uppercase">YouTube Uplink</span>
              <button 
                onClick={() => setYoutubeVideoId(null)}
                className="text-[#00D1FF] hover:text-red-500 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&controls=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="pt-6"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-[#00D1FF]/5 border border-[#00D1FF]/30 p-8 rounded-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-[#00D1FF]/20" />
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-orbitron font-black text-[#00D1FF]">SYSTEM SETTINGS</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6 text-[#00D1FF]" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 border border-[#00D1FF]/20 bg-[#00D1FF]/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-[#00D1FF]" />
                  <span className="font-mono text-sm">VOICE FEEDBACK</span>
                </div>
                <div className="w-12 h-6 bg-[#00D1FF]/20 rounded-full relative">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-[#00D1FF] rounded-full shadow-[0_0_10px_#00D1FF]" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border border-[#00D1FF]/20 bg-[#00D1FF]/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-[#00D1FF]" />
                  <span className="font-mono text-sm">IDENTITY SHIELD</span>
                </div>
                <div className="w-12 h-6 bg-[#00D1FF]/20 rounded-full relative">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-[#00D1FF] rounded-full shadow-[0_0_10px_#00D1FF]" />
                </div>
              </div>

              <div className="flex flex-col gap-4 p-4 border border-[#00D1FF]/20 bg-[#00D1FF]/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-[#00D1FF]" />
                  <span className="font-mono text-sm">VOICE SELECTION</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {['Kore', 'Puck', 'Zephyr', 'Charon'].map((voice) => (
                    <button
                      key={voice}
                      onClick={() => handleVoiceChange(voice)}
                      className={`px-3 py-2 rounded-lg font-mono text-xs border transition-all ${
                        selectedVoice === voice 
                          ? 'bg-[#00D1FF] text-black border-[#00D1FF]' 
                          : 'bg-white/5 text-[#00D1FF] border-[#00D1FF]/30 hover:bg-[#00D1FF]/10'
                      }`}
                    >
                      {voice.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border border-[#00D1FF]/20 bg-[#00D1FF]/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-[#00D1FF]" />
                  <span className="font-mono text-sm">OVERCLOCK MODE</span>
                </div>
                <div className="w-12 h-6 bg-white/10 rounded-full relative">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white/40 rounded-full" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border border-[#00D1FF]/20 bg-[#00D1FF]/5 rounded-xl">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-[#00D1FF]" />
                  <span className="font-mono text-sm">REALISTIC VOICE</span>
                  {ttsQuotaExceeded && (
                    <span className="text-[8px] font-orbitron text-red-500 animate-pulse border border-red-500/30 px-1 rounded">QUOTA EXCEEDED</span>
                  )}
                  {ttsServiceUnavailable && !ttsQuotaExceeded && (
                    <span className="text-[8px] font-orbitron text-yellow-500 animate-pulse border border-yellow-500/30 px-1 rounded">SERVICE ERROR</span>
                  )}
                </div>
                <button 
                  onClick={() => setUseRealisticVoice(!useRealisticVoice)}
                  className="w-12 h-6 bg-[#00D1FF]/20 rounded-full relative transition-colors"
                >
                  <motion.div 
                    animate={{ x: useRealisticVoice ? 24 : 4 }}
                    className="absolute top-1 w-4 h-4 bg-[#00D1FF] rounded-full shadow-[0_0_10px_#00D1FF]" 
                  />
                </button>
              </div>

              <div className="flex flex-col gap-3 p-4 border border-[#00D1FF]/20 bg-[#00D1FF]/5 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="w-5 h-5 text-[#00D1FF]" />
                  <span className="font-mono text-sm uppercase tracking-wider">Speech Speed: {speechRate}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2" 
                  step="0.5" 
                  value={speechRate} 
                  onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                  className="w-full accent-[#00D1FF] bg-white/10 rounded-lg appearance-none cursor-pointer h-1.5"
                />
                <div className="flex justify-between text-[8px] font-mono text-white/40 px-1">
                  <span>0.5x</span>
                  <span>1.0x</span>
                  <span>1.5x</span>
                  <span>2.0x</span>
                </div>
              </div>

              <button 
                onClick={clearChatHistory}
                className="w-full py-4 border border-yellow-500/30 bg-yellow-500/10 rounded-xl text-xs font-orbitron text-yellow-500 hover:bg-yellow-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <Trash2 className="w-4 h-4" />
                PURGE MEMORY (CLEAR CHAT)
              </button>

              <button 
                onClick={resetApiKey}
                className="w-full py-4 border border-red-500/30 bg-red-500/10 rounded-xl text-xs font-orbitron text-red-500 hover:bg-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <Power className="w-4 h-4" />
                RESET CORE (API KEY)
              </button>

              <button 
                onClick={requestMicPermissionManually}
                className="w-full py-4 border border-[#00D1FF]/30 bg-[#00D1FF]/10 rounded-xl text-xs font-orbitron text-[#00D1FF] hover:bg-[#00D1FF]/20 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <Mic className="w-4 h-4" />
                FIX MIC PERMISSIONS
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-[#00D1FF]/20 flex justify-center">
              <span className="text-[10px] font-mono text-white/30 tracking-widest uppercase">Urvashi Core v2.4.1</span>
            </div>
          </motion.div>
        </div>
      )}

      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#00D1FF]/10 animate-scan" />
      </div>

      {/* Top Bar */}
      <header className="h-16 flex items-center justify-between px-6 z-40 relative">
        <button className="p-2 text-white/50 hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-orbitron text-white/40 tracking-[0.4em] mb-1">HUD</span>
          <h1 className="text-xl font-orbitron font-black text-[#00D1FF] tracking-[0.2em] drop-shadow-[0_0_10px_rgba(0,209,255,0.8)]">SEFRAN</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end font-mono text-[8px] text-white/30">
            <span className="text-[#00D1FF]">API: CONNECTED ✅</span>
            <span>NET: {stats.netSpeed} MB/S 📶</span>
            <span>BAT: {stats.battery}% 🔋</span>
          </div>
        </div>
      </header>

      {/* Main HUD Layout */}
      <main className="flex-1 flex flex-col p-6 relative z-10">
        
        {/* JARVIS Logo Area */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleListening}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border border-[#00D1FF]/30 bg-[#00D1FF]/5 relative overflow-hidden",
                  isListening && "animate-pulse border-red-500/50"
                )}
                title="Hindi Speech-to-Text"
              >
                {isListening ? <MicOff className="w-5 h-5 text-red-500" /> : <Mic className="w-5 h-5 text-[#00D1FF]" />}
                <div className="absolute inset-0 bg-[#00D1FF]/10 animate-pulse" />
              </button>
              <div className="flex flex-col">
                <span className="text-[8px] font-orbitron text-[#00D1FF] tracking-widest">HINDI_STT</span>
                <button 
                  onClick={requestMicPermissionManually}
                  className="px-3 py-1 border border-[#00D1FF]/20 bg-[#00D1FF]/5 rounded-full text-[8px] font-orbitron text-[#00D1FF]/60 hover:bg-[#00D1FF]/10 transition-all active:scale-95 mt-1"
                >
                  FIX MIC
                </button>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-orbitron font-black text-[#00D1FF] tracking-tighter italic">SEFRAN</span>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right font-mono text-[8px] text-white/40">
              <p>CPU: {stats.cpu}%</p>
              <p>GPU: {stats.gpu}%</p>
            </div>
            <button className="p-2 text-red-500/50 hover:text-red-500 transition-colors">
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Top Stats Row */}
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-6">
            <Gauge value={stats.battery} label="Battery" unit="%" />
            <Gauge value={stats.temp} label="Temp" unit="°C" color="#FFA500" />
            <Clock />
          </div>
          
          <div className="flex flex-col items-end gap-6">
            <div className="hud-border p-4 rounded-xl bg-[#00D1FF]/5 w-32">
              <span className="text-[8px] font-orbitron text-white/40 block mb-2 uppercase tracking-widest">SYSTEM LOAD</span>
              <div className="h-12 flex flex-col justify-between">
                <div className="w-full h-1 bg-[#00D1FF]/20 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: `${stats.cpu}%` }} 
                    className="h-full bg-[#00D1FF]" 
                  />
                </div>
                <div className="w-full h-1 bg-[#00D1FF]/20 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: `${stats.gpu}%` }} 
                    className="h-full bg-[#00D1FF]" 
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right font-mono text-[8px] text-white/40">
                <p>UPLINK: {stats.netSpeed} MB/S</p>
                <p>LATENCY: 24MS</p>
              </div>
              <Gauge value={stats.cpu} label="CPU" unit="%" size={60} />
              <Gauge value={stats.gpu} label="GPU" unit="%" size={60} color="#FF4444" />
            </div>
          </div>
        </div>

        {/* Central Figure Area */}
        <div className="flex-1 flex flex-col items-center justify-start pt-10 relative py-8">
          <CentralFigure />
          
          <div className="mt-8 flex items-center gap-8">
            <button 
              onClick={toggleLiveMode}
              className={cn(
                "w-12 h-12 rounded-full border border-[#00D1FF]/30 flex items-center justify-center bg-[#00D1FF]/5 transition-all",
                isLiveMode && "bg-[#00D1FF]/20 border-[#00D1FF] shadow-[0_0_15px_rgba(0,209,255,0.5)]"
              )}
              title="Live Voice Mode"
            >
              <Activity className={cn("w-6 h-6", isLiveMode ? "text-[#00D1FF]" : "text-[#00D1FF]/40")} />
            </button>
            
            <button 
              onClick={() => setShowChat(!showChat)}
              className="hud-border px-8 py-2 rounded-lg bg-[#00D1FF]/10 hover:bg-[#00D1FF]/20 transition-all group"
            >
              <span className="text-sm font-orbitron font-black text-[#00D1FF] tracking-[0.3em] group-hover:scale-110 block">START</span>
            </button>

            <div className="w-12 h-12 rounded-full border border-[#00D1FF]/30 flex items-center justify-center bg-[#00D1FF]/5">
              <Zap className="w-6 h-6 text-[#00D1FF]" />
            </div>
          </div>
          
          <span className="mt-4 text-[10px] font-orbitron text-white/20 tracking-[0.5em]">SAIC</span>
        </div>

        {/* Commands Panel */}
        <div className="mt-auto pt-4 border-t border-[#00D1FF]/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[8px] font-orbitron text-[#00D1FF]/60 tracking-widest uppercase">Commands Log</span>
            <span className="text-[8px] font-mono text-white/20">v2.5.0-STABLE</span>
          </div>
          <div className="h-16 overflow-y-auto font-mono text-[9px] text-white/40 space-y-1 scrollbar-hide">
            <div className="flex gap-2">
              <span className="text-[#00D1FF]/40">[03:24:33]</span>
              <span>CORE INITIALIZED: {aiConfig?.provider.toUpperCase()} ENGINE ACTIVE</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[#00D1FF]/40">[03:24:34]</span>
              <span>UPLINK ESTABLISHED: LATENCY 24MS</span>
            </div>
            {messages.slice(-2).map((m, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[#00D1FF]/40">[{new Date(m.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                <span>{m.role.toUpperCase()}: {m.text.substring(0, 40)}...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Mode Overlay */}
        <AnimatePresence>
          {isLiveMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-[#000000]/95 backdrop-blur-xl flex flex-col items-center justify-start pt-12 p-8"
            >
              <div className="absolute top-8 right-8">
                <button 
                  onClick={toggleLiveMode}
                  className="p-4 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 transition-all"
                >
                  <Power className="w-8 h-8" />
                </button>
              </div>

              <div className="relative w-64 h-64 mb-6">
                <div className="absolute inset-0 border border-[#00D1FF]/20 rounded-full animate-rotate-slow" />
                <div className="absolute inset-4 border border-[#00D1FF]/40 rounded-full animate-rotate-fast border-dashed" />
                
                <motion.div
                  animate={{
                    scale: liveStatus === "listening" ? [1, 1.2, 1] : 1,
                    opacity: liveStatus === "listening" ? [0.5, 1, 0.5] : 0.8,
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-12 bg-[#00D1FF]/20 rounded-full blur-2xl"
                />
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-[10px] font-orbitron text-[#00D1FF]/60 tracking-[0.5em] block mb-2 uppercase">
                      {liveStatus}
                    </span>
                    <div className="flex items-center justify-center gap-1">
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{ height: liveStatus === "speaking" ? [4, 16, 4] : 4 }}
                          transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                          className="w-1 bg-[#00D1FF] rounded-full"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-w-md w-full text-center space-y-4">
                <h2 className="text-2xl font-orbitron font-black text-[#00D1FF] tracking-widest">
                  LIVE UPLINK
                </h2>
                
                <AnimatePresence mode="wait">
                  {micPermissionDenied && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-red-500/10 border border-red-500/30 p-6 rounded-xl mb-4"
                    >
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />
                        <p className="text-red-500 font-orbitron text-sm font-bold">MIC ACCESS BLOCKED</p>
                      </div>
                      <div className="text-white/70 text-[10px] font-mono mb-6 space-y-3 text-left bg-black/20 p-4 rounded-lg border border-white/5">
                        <p className="text-[#00D1FF] font-bold border-b border-[#00D1FF]/20 pb-1 uppercase tracking-widest">How to Unblock:</p>
                        <p>1. Look at the <span className="text-red-400 font-bold underline">Address Bar</span> (where the URL is).</p>
                        <p>2. Click the <span className="text-red-400 font-bold underline">Lock (Taala) icon</span> or the <span className="text-red-400 font-bold underline">Settings icon</span> next to the URL.</p>
                        <p>3. Find <span className="font-bold text-white">Microphone</span> and switch it to <span className="text-green-400 font-bold">"Allow"</span>.</p>
                        <p>4. If you don't see it, click <span className="text-[#00D1FF] font-bold underline">"Site Settings"</span> and change it there.</p>
                        <div className="pt-2 border-t border-white/5 mt-2 italic text-[9px] text-white/40">
                          Note: Browser code cannot unblock a mic that was manually denied. You MUST do it in the browser settings.
                        </div>
                      </div>
                      <div className="flex flex-col gap-3">
                        <button 
                          onClick={() => window.open(window.location.href, '_blank')}
                          className="w-full py-3 bg-[#00D1FF]/20 hover:bg-[#00D1FF]/30 border border-[#00D1FF]/40 rounded-xl text-[10px] font-orbitron text-[#00D1FF] transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          OPEN IN NEW TAB (Recommended)
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={requestMicPermissionManually}
                            className="py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] font-orbitron text-white/70 transition-all active:scale-95"
                          >
                            TRY PROMPT AGAIN
                          </button>
                          <button 
                            onClick={() => {
                              setMicPermissionDenied(false);
                              safeStartRecognition();
                            }}
                            className="py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] font-orbitron text-white/70 transition-all active:scale-95"
                          >
                            RECHECK STATUS
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  {lastTranscript && !micPermissionDenied && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-[#00D1FF]/5 border border-[#00D1FF]/20 p-4 rounded-xl"
                    >
                      <p className="text-[10px] font-orbitron text-[#00D1FF]/40 uppercase mb-1">Detected Input</p>
                      <p className="text-white/80 font-mono italic">"{lastTranscript}"</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-white/40 font-mono text-sm">
                  {liveStatus === "listening" && "Listening to your command, Sir..."}
                  {liveStatus === "thinking" && "Computing response sequence..."}
                  {liveStatus === "speaking" && "Transmitting JARVIS output..."}
                  {liveStatus === "idle" && "System standing by..."}
                </p>
              </div>

              {/* Visualizer */}
              <div className="mt-12 flex items-end gap-2 h-16">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      height: liveStatus === "speaking" || liveStatus === "listening" 
                        ? [8, Math.random() * 40 + 10, 8] 
                        : 4 
                    }}
                    transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                    className="w-1.5 bg-[#00D1FF]/40 rounded-full"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Area: Commands & Audio */}
        <div className="grid grid-cols-2 gap-8 mt-8 mb-12 h-48">
          {/* Commands Terminal */}
          <div className="hud-border rounded-2xl bg-[#01080E]/80 p-4 flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-orbitron text-[#00D1FF] tracking-widest">COMMANDS</span>
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-[#00D1FF] rounded-full" />
                <div className="w-1 h-1 bg-[#00D1FF] rounded-full opacity-50" />
              </div>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto font-mono text-[10px] text-[#00D1FF]/70 space-y-2 scrollbar-hide">
              {messages.length === 0 ? (
                <p className="animate-pulse">{">"} waiting...</p>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={cn(msg.role === "user" ? "text-white/50" : "text-[#00D1FF]", "space-y-2")}>
                    <div className="flex items-start gap-2">
                      <span className="shrink-0">{msg.role === "user" ? "USR:" : "JAR:"}</span>
                      <div className="flex-1">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    </div>
                    {msg.imageUrl && (
                      <div className="ml-8 mt-2 border border-[#00D1FF]/30 rounded-lg overflow-hidden bg-black/40">
                        <img 
                          src={msg.imageUrl} 
                          alt="Generated AI" 
                          className="w-full h-auto max-h-64 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
              {isTyping && <p className="animate-pulse">{">"} computing...</p>}
            </div>

            <div className="mt-2 flex items-center gap-2 border-t border-[#00D1FF]/10 pt-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="ENTER COMMAND..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-[10px] font-mono text-[#00D1FF] placeholder:text-[#00D1FF]/20"
              />
              <button 
                onClick={toggleListening}
                className={cn(
                  "p-2 rounded-lg transition-all hover:scale-110",
                  isListening ? "text-red-500 animate-pulse" : "text-[#00D1FF]"
                )}
                title="Hindi Voice Input"
              >
                {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
              </button>
              <button onClick={() => handleSend()} className="text-[#00D1FF] hover:scale-110 transition-transform">
                <Send className="w-3 h-3" />
              </button>
            </div>
            
            <div className="absolute left-0 top-0 h-full w-1 flex flex-col">
              <span className="text-[8px] font-orbitron text-red-500/50 -rotate-90 origin-left translate-y-12">ERROR</span>
              <span className="text-[8px] font-orbitron text-[#00D1FF]/50 -rotate-90 origin-left translate-y-24">INPUT</span>
            </div>
          </div>

          {/* Audio Visualizer Area */}
          <div className="flex flex-col items-center justify-end pb-4">
            <div className="mb-4 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-4">
                <span className={cn(
                  "hud-border px-3 py-1 rounded-full text-[8px] font-orbitron tracking-widest transition-all",
                  musicConnected ? "text-[#00D1FF] border-[#00D1FF]/40 bg-[#00D1FF]/10" : "text-red-500/50 border-red-500/20"
                )}>
                  {musicConnected ? "UPLINK_STABLE" : "NO_CONNECTION"}
                </span>
                <button 
                  onClick={() => setMusicConnected(!musicConnected)}
                  className={cn(
                    "p-1 rounded-lg border transition-all hover:scale-110",
                    musicConnected ? "border-[#00D1FF]/40 text-[#00D1FF]" : "border-white/10 text-white/30"
                  )}
                  title={musicConnected ? "Disconnect Music Player" : "Connect Music Player"}
                >
                  <Music className="w-3 h-3" />
                </button>
              </div>

              <div className="text-center mb-4">
                <p className="text-[10px] font-mono text-[#00D1FF] truncate max-w-[120px]">
                  {musicConnected ? currentTrack : "SYSTEM_OFFLINE"}
                </p>
              </div>

              <div className={cn(
                "flex items-center gap-6 transition-all",
                musicConnected ? "text-[#00D1FF]" : "text-[#00D1FF]/20 pointer-events-none"
              )}>
                <button onClick={() => {
                  const tracks = ["Interstellar", "Time", "Cornfield Chase", "Stay"];
                  const prevIndex = (tracks.indexOf(currentTrack) - 1 + tracks.length) % tracks.length;
                  setCurrentTrack(tracks[prevIndex]);
                }}>
                  <SkipBack className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-10 h-10 rounded-full border border-[#00D1FF]/30 flex items-center justify-center bg-[#00D1FF]/10 hover:bg-[#00D1FF]/20 transition-all"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button onClick={() => {
                  const tracks = ["Interstellar", "Time", "Cornfield Chase", "Stay"];
                  const nextIndex = (tracks.indexOf(currentTrack) + 1) % tracks.length;
                  setCurrentTrack(tracks[nextIndex]);
                }}>
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Visualizer Base */}
            <div className="relative w-32 h-12">
              <div className="absolute inset-0 border-t border-[#00D1FF]/20 rounded-[100%] transform scale-y-50" />
              <div className="absolute inset-0 flex items-end justify-center gap-1 px-4">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      height: isPlaying && musicConnected ? [4, 12, 4] : 4,
                      opacity: musicConnected ? 1 : 0.2
                    }}
                    transition={{ repeat: Infinity, duration: 1 + Math.random(), ease: "easeInOut" }}
                    className="w-1 bg-[#00D1FF]/40 rounded-full"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Side Labels */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col gap-12 font-orbitron text-[8px] text-white/10 tracking-[1em] -rotate-90">
        <span>SYSTEM_ACTIVE</span>
        <span>UPLINK_STABLE</span>
      </div>
    </div>
  );
}
