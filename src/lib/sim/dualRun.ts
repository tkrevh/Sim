import { SimEngine } from "./engine";
import { createAiClaudeScheduler } from "./schedulers/aiClaude";
import { createAiHeuristicScheduler } from "./schedulers/aiHeuristic";
import { createFifoScheduler } from "./schedulers/fifo";
import type { Scheduler } from "./schedulers/Scheduler";
import type { KPISnapshot, ScheduleEntry, Scenario, SimEvent } from "./types";

export type AiMode = "heuristic" | "claude";
export type RunLabel = "fifo" | "ai";

export interface RunSnapshot {
  label: RunLabel;
  clock: number;
  finished: boolean;
  finishedAt: number | null;
  machines: SimEngine["machines"];
  jobs: SimEngine["jobs"];
  kpi: KPISnapshot;
  costStats: { setupCost: number; lateCost: number; total: number };
  recentEvents: SimEvent[];
}

export interface DualRunSnapshot {
  fifo: RunSnapshot;
  ai: RunSnapshot;
  dollarsSaved: number;
  speedMultiplier: number;
  playing: boolean;
  aiMode: AiMode;
}

const MAX_RECENT_EVENTS = 60;

export class DualRunController {
  fifo: SimEngine;
  ai: SimEngine;
  speedMultiplier = 60; // 1 sim-min per real second by default
  playing = false;
  aiMode: AiMode = "heuristic";

  private rafId: number | null = null;
  private lastFrameTime: number | null = null;
  private listeners = new Set<(snap: DualRunSnapshot) => void>();
  private fifoEvents: SimEvent[] = [];
  private aiEvents: SimEvent[] = [];
  private aiScheduler: Scheduler;
  private claudeScheduler: ReturnType<typeof createAiClaudeScheduler> | null = null;

  constructor(public scenario: Scenario) {
    this.aiScheduler = createAiHeuristicScheduler();
    this.fifo = new SimEngine({ scenario, scheduler: createFifoScheduler(), label: "fifo" });
    this.ai = new SimEngine({ scenario, scheduler: this.aiScheduler, label: "ai" });
    this.fifo.subscribe((evs) => this.collectFifoEvents(evs));
    this.ai.subscribe((evs) => this.collectAiEvents(evs));
  }

  setSpeed(mult: number) {
    this.speedMultiplier = mult;
    this.notify();
  }

  setAiMode(mode: AiMode, plan?: ScheduleEntry[]) {
    this.aiMode = mode;
    if (mode === "heuristic") {
      this.aiScheduler = createAiHeuristicScheduler();
    } else {
      this.claudeScheduler = createAiClaudeScheduler();
      if (plan) this.claudeScheduler.seedPlan?.(plan);
      this.aiScheduler = this.claudeScheduler;
    }
    this.ai.setScheduler(this.aiScheduler);
    this.notify();
  }

  seedClaudePlan(plan: ScheduleEntry[]) {
    this.claudeScheduler?.seedPlan?.(plan);
  }

  play() {
    if (this.playing) return;
    this.playing = true;
    this.lastFrameTime = null;
    this.tick = this.tick.bind(this);
    this.rafId = requestAnimationFrame(this.tick);
    this.notify();
  }

  pause() {
    this.playing = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.lastFrameTime = null;
    this.notify();
  }

  reset(scenario: Scenario = this.scenario) {
    this.pause();
    this.scenario = scenario;
    this.fifoEvents = [];
    this.aiEvents = [];
    this.fifo = new SimEngine({ scenario, scheduler: createFifoScheduler(), label: "fifo" });
    if (this.aiMode === "claude" && this.claudeScheduler) {
      this.aiScheduler = this.claudeScheduler;
    } else {
      this.aiScheduler = createAiHeuristicScheduler();
    }
    this.ai = new SimEngine({ scenario, scheduler: this.aiScheduler, label: "ai" });
    this.fifo.subscribe((evs) => this.collectFifoEvents(evs));
    this.ai.subscribe((evs) => this.collectAiEvents(evs));
    this.notify();
  }

  subscribe(fn: (s: DualRunSnapshot) => void): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  snapshot(): DualRunSnapshot {
    const fifoSnap = this.snapEngine(this.fifo, this.fifoEvents);
    const aiSnap = this.snapEngine(this.ai, this.aiEvents);
    fifoSnap.label = "fifo";
    aiSnap.label = "ai";
    const dollarsSaved = Math.max(0, fifoSnap.costStats.total - aiSnap.costStats.total);
    return {
      fifo: fifoSnap,
      ai: aiSnap,
      dollarsSaved,
      speedMultiplier: this.speedMultiplier,
      playing: this.playing,
      aiMode: this.aiMode,
    };
  }

  private snapEngine(engine: SimEngine, recent: SimEvent[]): RunSnapshot {
    return {
      label: engine.label as RunLabel,
      clock: engine.clock,
      finished: engine.finished,
      finishedAt: engine.finishedAt,
      machines: engine.machines.map((m) => ({ ...m })),
      jobs: engine.jobs.map((j) => ({ ...j })),
      kpi: engine.snapshotKPI(),
      costStats: engine.costStats(),
      recentEvents: recent.slice(-MAX_RECENT_EVENTS),
    };
  }

  private collectFifoEvents(evs: SimEvent[]) {
    this.fifoEvents.push(...evs);
    if (this.fifoEvents.length > MAX_RECENT_EVENTS * 4)
      this.fifoEvents.splice(0, this.fifoEvents.length - MAX_RECENT_EVENTS * 4);
  }
  private collectAiEvents(evs: SimEvent[]) {
    this.aiEvents.push(...evs);
    if (this.aiEvents.length > MAX_RECENT_EVENTS * 4)
      this.aiEvents.splice(0, this.aiEvents.length - MAX_RECENT_EVENTS * 4);
  }

  private tick(now: number) {
    if (!this.playing) return;
    if (this.lastFrameTime === null) {
      this.lastFrameTime = now;
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }
    const realDtMs = Math.min(now - this.lastFrameTime, 100);
    this.lastFrameTime = now;
    const dtVirtual = (realDtMs / 1000) * this.speedMultiplier;
    if (!this.fifo.finished) this.fifo.advanceBy(dtVirtual);
    if (!this.ai.finished) this.ai.advanceBy(dtVirtual);
    this.notify();
    if (this.fifo.finished && this.ai.finished) {
      this.playing = false;
      this.rafId = null;
      return;
    }
    this.rafId = requestAnimationFrame(this.tick);
  }

  private notify() {
    const snap = this.snapshot();
    for (const fn of this.listeners) fn(snap);
  }
}
