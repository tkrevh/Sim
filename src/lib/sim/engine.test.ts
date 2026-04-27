import { describe, expect, it } from "vitest";
import { SimEngine } from "./engine";
import { LARGE_SCENARIO, MEDIUM_SCENARIO, SMALL_SCENARIO } from "./presets";
import { createAiHeuristicScheduler } from "./schedulers/aiHeuristic";
import { createFifoScheduler } from "./schedulers/fifo";

function runHeadless(scenario: typeof SMALL_SCENARIO, schedulerName: "fifo" | "ai") {
  const scheduler =
    schedulerName === "fifo" ? createFifoScheduler() : createAiHeuristicScheduler();
  const engine = new SimEngine({ scenario, scheduler, label: schedulerName });
  return engine.runToCompletion();
}

describe("SimEngine", () => {
  it("FIFO and heuristic both finish all jobs", () => {
    for (const s of [SMALL_SCENARIO, MEDIUM_SCENARIO, LARGE_SCENARIO]) {
      const fifo = runHeadless(s, "fifo");
      const ai = runHeadless(s, "ai");
      expect(fifo.jobsCompleted).toBe(fifo.jobsTotal);
      expect(ai.jobsCompleted).toBe(ai.jobsTotal);
    }
  });

  it("heuristic beats FIFO on setup waste in every preset", () => {
    for (const s of [SMALL_SCENARIO, MEDIUM_SCENARIO, LARGE_SCENARIO]) {
      const fifo = runHeadless(s, "fifo");
      const ai = runHeadless(s, "ai");
      expect(ai.setupMinutesWasted).toBeLessThan(fifo.setupMinutesWasted);
    }
  });

  it("heuristic beats FIFO on makespan in every preset", () => {
    for (const s of [SMALL_SCENARIO, MEDIUM_SCENARIO, LARGE_SCENARIO]) {
      const fifo = runHeadless(s, "fifo");
      const ai = runHeadless(s, "ai");
      expect(ai.makespan).toBeLessThan(fifo.makespan);
    }
  });

  it("is deterministic across re-runs", () => {
    const a = runHeadless(MEDIUM_SCENARIO, "ai");
    const b = runHeadless(MEDIUM_SCENARIO, "ai");
    expect(a.makespan).toBe(b.makespan);
    expect(a.setupMinutesWasted).toBe(b.setupMinutesWasted);
    expect(a.totalUnitsProduced).toBe(b.totalUnitsProduced);
  });
});
