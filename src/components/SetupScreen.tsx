
import React, { useState } from "react";
import { motion } from "motion/react";
import { Shield, Key, Cpu, Zap, Activity } from "lucide-react";
import { Provider } from "../services/ai";

interface SetupScreenProps {
  onComplete: (provider: Provider, apiKey: string) => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onComplete }) => {
  const [provider, setProvider] = useState<Provider>("gemini");
  const [apiKey, setApiKey] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onComplete(provider, apiKey.trim());
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#00D1FF] font-sans flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background HUD Grid */}
      <div className="absolute inset-0 hud-grid opacity-20 pointer-events-none" />
      
      {/* Animated Scanline */}
      <div className="absolute top-0 left-0 w-full h-1 bg-[#00D1FF]/10 animate-scan pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-[#00D1FF]/5 border border-[#00D1FF]/30 p-8 rounded-2xl relative z-10 backdrop-blur-xl"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-[#00D1FF]/20" />
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 border-2 border-[#00D1FF] rounded-full flex items-center justify-center mb-4 animate-pulse-glow">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-orbitron font-black tracking-[0.2em] drop-shadow-[0_0_10px_rgba(0,209,255,0.8)]">SEFRAN</h1>
          <p className="text-[10px] font-mono text-white/40 tracking-[0.3em] uppercase mt-2">Core Initialization</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-white/60 uppercase tracking-widest ml-1">Select Provider</label>
            <select 
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              className="w-full bg-black border border-[#00D1FF]/30 p-4 rounded-xl text-sm font-mono focus:outline-none focus:border-[#00D1FF] transition-colors appearance-none"
            >
              <option value="gemini">Google Gemini</option>
              <option value="groq">Groq AI</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-white/60 uppercase tracking-widest ml-1">API Key</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#00D1FF]/40" />
              <input 
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key..."
                className="w-full bg-black border border-[#00D1FF]/30 p-4 pl-12 rounded-xl text-sm font-mono focus:outline-none focus:border-[#00D1FF] transition-colors"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-[#00D1FF]/20 border border-[#00D1FF]/50 rounded-xl text-sm font-orbitron font-bold tracking-widest hover:bg-[#00D1FF]/30 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <Zap className="w-4 h-4" />
            INITIALIZE CORE
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#00D1FF]/10 flex justify-between items-center opacity-40">
          <div className="flex gap-4">
            <Cpu className="w-4 h-4" />
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-[8px] font-mono uppercase tracking-widest">v2.5.0 Stable Build</span>
        </div>
      </motion.div>
    </div>
  );
};

export default SetupScreen;
