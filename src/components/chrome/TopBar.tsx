"use client";

import { Pause, Play, RotateCcw, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSimulationStore } from "@/store/simulationStore";
import { PRESETS } from "@/lib/sim/presets";

const SPEEDS = [
  { label: "1×", value: 1 },
  { label: "10×", value: 10 },
  { label: "60×", value: 60 },
  { label: "300×", value: 300 },
];

interface Props {
  onAskClaude: () => void;
  onOpenSandbox: () => void;
}

export function TopBar({ onAskClaude, onOpenSandbox }: Props) {
  const snapshot = useSimulationStore((s) => s.snapshot);
  const scenario = useSimulationStore((s) => s.scenario);
  const play = useSimulationStore((s) => s.play);
  const pause = useSimulationStore((s) => s.pause);
  const reset = useSimulationStore((s) => s.reset);
  const setSpeed = useSimulationStore((s) => s.setSpeed);
  const loadPreset = useSimulationStore((s) => s.loadPreset);
  const claudeStreaming = useSimulationStore((s) => s.claudeStreaming);

  const playing = snapshot?.playing ?? false;
  const speed = snapshot?.speedMultiplier ?? 60;
  const aiMode = snapshot?.aiMode ?? "heuristic";

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-emerald-400" />
        <div>
          <div className="text-sm font-semibold leading-none">Production Optimizer</div>
          <div className="text-[10px] text-zinc-500">FIFO vs AI · live simulation</div>
        </div>
      </div>

      <div className="flex items-center gap-1 ml-2">
        <span className="text-[10px] text-zinc-500 mr-1">Preset</span>
        {PRESETS.map((p) => (
          <Button
            key={p.id}
            variant={scenario.id === p.id ? "primary" : "ghost"}
            onClick={() => loadPreset(p.id)}
            className="text-xs px-2.5 py-1.5"
          >
            {p.name.replace(" factory", "")}
          </Button>
        ))}
      </div>

      <Button variant="ghost" onClick={onOpenSandbox} className="text-xs px-2.5 py-1.5">
        Sandbox
      </Button>

      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant={playing ? "secondary" : "primary"}
          onClick={playing ? pause : play}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {playing ? "Pause" : "Play"}
        </Button>
        <Button variant="ghost" onClick={reset} aria-label="Reset">
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-[10px] text-zinc-500 mr-1">Speed</span>
        {SPEEDS.map((s) => (
          <Button
            key={s.value}
            variant={speed === s.value ? "primary" : "ghost"}
            onClick={() => setSpeed(s.value)}
            className="text-xs px-2 py-1.5"
          >
            {s.label}
          </Button>
        ))}
      </div>

      <Button
        variant="primary"
        onClick={onAskClaude}
        disabled={claudeStreaming}
        className="bg-violet-500 hover:bg-violet-400 text-white shadow-[0_0_18px_-4px_rgba(139,92,246,0.7)]"
      >
        <Sparkles className="w-4 h-4" />
        {claudeStreaming
          ? "Claude planning…"
          : aiMode === "claude"
            ? "Re-ask Claude"
            : "Ask Claude to plan"}
      </Button>
    </div>
  );
}
