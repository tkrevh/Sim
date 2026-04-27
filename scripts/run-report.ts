import { SimEngine } from "../src/lib/sim/engine";
import { LARGE_SCENARIO, MEDIUM_SCENARIO, SMALL_SCENARIO } from "../src/lib/sim/presets";
import { createAiHeuristicScheduler } from "../src/lib/sim/schedulers/aiHeuristic";
import { createFifoScheduler } from "../src/lib/sim/schedulers/fifo";
import type { Scenario } from "../src/lib/sim/types";

function runHeadless(scenario: Scenario, schedulerKind: "fifo" | "ai") {
  const scheduler = schedulerKind === "fifo" ? createFifoScheduler() : createAiHeuristicScheduler();
  const engine = new SimEngine({ scenario, scheduler, label: schedulerKind });
  const kpi = engine.runToCompletion();
  const cost = engine.costStats();
  return { kpi, cost };
}

function fmt(n: number): string {
  return n.toFixed(1).padStart(8);
}

function report() {
  for (const s of [SMALL_SCENARIO, MEDIUM_SCENARIO, LARGE_SCENARIO]) {
    const fifo = runHeadless(s, "fifo");
    const ai = runHeadless(s, "ai");
    const dollarsSaved = fifo.cost.total - ai.cost.total;
    console.log(`\n=== ${s.name} (${s.machines.length} machines, ${s.orders.length} orders) ===`);
    console.log(`                FIFO       AI    Savings`);
    console.log(
      `Makespan      ${fmt(fifo.kpi.makespan)} ${fmt(ai.kpi.makespan)} ${fmt(fifo.kpi.makespan - ai.kpi.makespan)} min`,
    );
    console.log(
      `Setup wasted  ${fmt(fifo.kpi.setupMinutesWasted)} ${fmt(ai.kpi.setupMinutesWasted)} ${fmt(fifo.kpi.setupMinutesWasted - ai.kpi.setupMinutesWasted)} min`,
    );
    console.log(
      `Throughput    ${fmt(fifo.kpi.throughputUnitsPerHour)} ${fmt(ai.kpi.throughputUnitsPerHour)}`,
    );
    console.log(
      `On-time %     ${fmt(fifo.kpi.onTimePct * 100)} ${fmt(ai.kpi.onTimePct * 100)}`,
    );
    console.log(`$ saved       ${fmt(dollarsSaved)}`);
  }
}

report();
