import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "../lib/utils";

interface BootSequenceProps {
  onComplete: () => void;
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [lines, setLines] = useState<string[]>([]);
  
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  };

  const bootLines = [
    "⚡ SEFRAN v1.0 — INITIALIZING HUD",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "📡 UPLINK STATUS     : ESTABLISHED",
    "🧠 NEURAL CORE       : SYNCHRONIZED",
    "🌐 GLOBAL ACCESS     : AUTHORIZED",
    "🛡️ ENCRYPTION        : QUANTUM ACTIVE",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `Good ${getTimeGreeting()}, Sir.`,
    "All systems nominal. Awaiting your command.",
  ];

  useEffect(() => {
    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < bootLines.length) {
        setLines(prev => [...prev, bootLines[currentLine]]);
        currentLine++;
      } else {
        clearInterval(interval);
        setTimeout(onComplete, 1500);
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-[#000000] flex items-center justify-center font-mono p-6 z-50 hud-grid">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#00D1FF]/20 animate-scan" />
      </div>
      <div className="max-w-md w-full space-y-1 relative">
        {lines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "font-orbitron tracking-widest",
              i === 0 ? "text-[#00D1FF] font-bold mb-2 drop-shadow-[0_0_8px_rgba(0,209,255,0.5)]" : "text-[#00D1FF]/60 text-xs"
            )}
          >
            {line}
          </motion.div>
        ))}
        <motion.div
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="inline-block w-2 h-4 bg-[#00D1FF] ml-1 align-middle"
        />
      </div>
    </div>
  );
}
