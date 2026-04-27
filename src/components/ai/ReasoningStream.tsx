"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useSimulationStore } from "@/store/simulationStore";

export function ReasoningStream() {
  const text = useSimulationStore((s) => s.aiReasoning);
  const streaming = useSimulationStore((s) => s.claudeStreaming);
  if (!text && !streaming) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-violet-500/40 bg-violet-950/30 p-3 text-sm text-violet-100"
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-violet-300 mb-2">
        <Sparkles className="w-3.5 h-3.5" />
        Claude’s reasoning
        {streaming && <span className="ml-auto animate-pulse text-violet-400">streaming…</span>}
      </div>
      <div className="whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto font-mono text-[12px]">
        {text || (streaming ? "…" : "")}
      </div>
    </motion.div>
  );
}
