"use client";

import { useEffect, useRef, useState } from "react";
import { ReasoningStream } from "@/components/ai/ReasoningStream";
import { RunPanel } from "@/components/chrome/RunPanel";
import { SavingsBanner } from "@/components/chrome/SavingsBanner";
import { TopBar } from "@/components/chrome/TopBar";
import { KPITimeSeries } from "@/components/kpi-dashboard/KPITimeSeries";
import { ScenarioBuilder } from "@/components/scenario/ScenarioBuilder";
import { useSimulationStore } from "@/store/simulationStore";
import type { ScheduleEntry } from "@/lib/sim/types";
import confetti from "canvas-confetti";

export default function Page() {
  const init = useSimulationStore((s) => s.init);
  const snapshot = useSimulationStore((s) => s.snapshot);
  const scenario = useSimulationStore((s) => s.scenario);
  const setAiMode = useSimulationStore((s) => s.setAiMode);
  const reset = useSimulationStore((s) => s.reset);
  const appendReasoning = useSimulationStore((s) => s.appendReasoning);
  const resetReasoning = useSimulationStore((s) => s.resetReasoning);
  const setClaudeStreaming = useSimulationStore((s) => s.setClaudeStreaming);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const celebratedRef = useRef(false);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!snapshot) return;
    const aiDone = snapshot.ai.finished;
    const fifoDone = snapshot.fifo.finished;
    if (aiDone && fifoDone && !celebratedRef.current) {
      const aiBeat =
        (snapshot.ai.finishedAt ?? Infinity) < (snapshot.fifo.finishedAt ?? Infinity);
      if (aiBeat) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.4, x: 0.7 },
          colors: ["#10b981", "#34d399", "#a7f3d0"],
        });
      }
      celebratedRef.current = true;
    }
    if (!aiDone || !fifoDone) celebratedRef.current = false;
  }, [snapshot]);

  async function askClaude() {
    if (!snapshot) return;
    resetReasoning();
    setClaudeStreaming(true);
    reset();
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machines: scenario.machines,
          orders: scenario.orders,
          now: 0,
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.text();
        appendReasoning(`\n[Error: ${err}]`);
        setAiMode("heuristic");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        appendReasoning(chunk);
      }
      const plan = parsePlan(buffer);
      if (plan) {
        setAiMode("claude", plan);
      } else {
        appendReasoning("\n[Could not parse plan; falling back to heuristic.]");
        setAiMode("heuristic");
      }
    } catch (e) {
      appendReasoning(`\n[Network error: ${(e as Error).message}]`);
      setAiMode("heuristic");
    } finally {
      setClaudeStreaming(false);
    }
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <TopBar onAskClaude={askClaude} onOpenSandbox={() => setSandboxOpen(true)} />

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-3 p-3 min-h-0">
        <RunPanel
          run={snapshot.fifo}
          scenario={scenario}
          title="FIFO baseline"
          subtitle="Process orders in arrival order"
        />
        <RunPanel
          run={snapshot.ai}
          scenario={scenario}
          title={snapshot.aiMode === "claude" ? "AI · Claude plan" : "AI · heuristic"}
          subtitle={
            snapshot.aiMode === "claude"
              ? "Claude proposed a schedule; engine follows it"
              : "Batch by product, EDD tiebreak, bottleneck-aware"
          }
          isAi
        />
      </div>

      <div className="px-3 pb-3 grid grid-cols-1 xl:grid-cols-[2fr_3fr] gap-3">
        <SavingsBanner snapshot={snapshot} />
        <ReasoningStream />
      </div>
      <div className="px-3 pb-4">
        <KPITimeSeries snapshot={snapshot} />
      </div>

      {sandboxOpen && <ScenarioBuilder onClose={() => setSandboxOpen(false)} />}
    </div>
  );
}

function parsePlan(text: string): ScheduleEntry[] | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  try {
    const obj = JSON.parse(candidate);
    if (obj && Array.isArray(obj.assignments)) {
      const out: ScheduleEntry[] = [];
      for (const a of obj.assignments) {
        if (typeof a?.machineId === "string" && typeof a?.orderId === "string") {
          out.push({
            machineId: a.machineId,
            orderId: a.orderId,
            reasoning: typeof a.reasoning === "string" ? a.reasoning : undefined,
          });
        }
      }
      return out.length > 0 ? out : null;
    }
  } catch {
    return null;
  }
  return null;
}
