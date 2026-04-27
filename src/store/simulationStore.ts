import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { DualRunController, type AiMode, type DualRunSnapshot } from "@/lib/sim/dualRun";
import { PRESETS, SMALL_SCENARIO } from "@/lib/sim/presets";
import type { Scenario, ScheduleEntry } from "@/lib/sim/types";

interface SimulationState {
  controller: DualRunController | null;
  snapshot: DualRunSnapshot | null;
  scenario: Scenario;
  aiReasoning: string;
  claudeStreaming: boolean;
  init: () => void;
  loadPreset: (id: string) => void;
  loadScenario: (s: Scenario) => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (m: number) => void;
  setAiMode: (m: AiMode, plan?: ScheduleEntry[]) => void;
  appendReasoning: (chunk: string) => void;
  resetReasoning: () => void;
  setClaudeStreaming: (b: boolean) => void;
}

export const useSimulationStore = create<SimulationState>()(
  subscribeWithSelector((set, get) => ({
    controller: null,
    snapshot: null,
    scenario: SMALL_SCENARIO,
    aiReasoning: "",
    claudeStreaming: false,

    init: () => {
      if (get().controller) return;
      const controller = new DualRunController(SMALL_SCENARIO);
      controller.subscribe((snap) => set({ snapshot: snap }));
      set({ controller, scenario: SMALL_SCENARIO });
    },

    loadPreset: (id) => {
      const preset = PRESETS.find((p) => p.id === id);
      if (!preset) return;
      get().loadScenario(preset);
    },

    loadScenario: (s) => {
      const c = get().controller;
      if (!c) return;
      c.reset(s);
      set({ scenario: s, aiReasoning: "" });
    },

    play: () => get().controller?.play(),
    pause: () => get().controller?.pause(),
    reset: () => {
      get().controller?.reset();
      set({ aiReasoning: "" });
    },
    setSpeed: (m) => get().controller?.setSpeed(m),
    setAiMode: (m, plan) => get().controller?.setAiMode(m, plan),
    appendReasoning: (chunk) => set((s) => ({ aiReasoning: s.aiReasoning + chunk })),
    resetReasoning: () => set({ aiReasoning: "" }),
    setClaudeStreaming: (b) => set({ claudeStreaming: b }),
  })),
);
