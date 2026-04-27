import type { Job, Machine } from "../types";
import type { Dispatch, Scheduler, SchedulerContext } from "./Scheduler";

/**
 * Heuristic that mimics what a smart planner would do:
 *   1. For each idle machine, prefer pending jobs with the same productType
 *      as currentProduct (zero setup). Among those, pick earliest dueAt (EDD).
 *   2. If no zero-setup match, group pending jobs by productType, pick the
 *      product with the largest aggregate quantity (amortizing setup),
 *      tie-broken by earliest dueAt.
 *   3. Process machines in descending output rate so faster machines get
 *      first pick (bottleneck-aware).
 */
export function createAiHeuristicScheduler(): Scheduler {
  return {
    name: "ai-heuristic",
    onTick(ctx: SchedulerContext): Dispatch[] {
      const idleMachines = ctx.machines
        .filter((m) => m.state === "idle" && m.currentJobId === null)
        .sort((a, b) => b.outputUnitsPerHour - a.outputUnitsPerHour);
      if (idleMachines.length === 0) return [];

      const available = ctx.pendingJobs.filter((j) => j.assignedMachineId === null);
      if (available.length === 0) return [];

      const dispatches: Dispatch[] = [];
      const claimed = new Set<string>();

      for (const machine of idleMachines) {
        const pool = available.filter((j) => !claimed.has(j.id));
        if (pool.length === 0) break;
        const pick = pickJobFor(machine, pool);
        if (!pick) continue;
        const reasoning =
          pick.productType === machine.currentProduct
            ? `${machine.name} already set up for ${pick.productType} — zero changeover.`
            : `${machine.name} is fastest available; switching to ${pick.productType} (largest pending batch).`;
        dispatches.push({ machineId: machine.id, jobId: pick.id, reasoning });
        claimed.add(pick.id);
      }
      return dispatches;
    },
  };
}

function pickJobFor(machine: Machine, pool: Job[]): Job | null {
  const sameProduct = pool.filter((j) => j.productType === machine.currentProduct);
  if (sameProduct.length > 0) {
    return [...sameProduct].sort(byEdd)[0];
  }

  const totals = new Map<string, number>();
  for (const j of pool) totals.set(j.productType, (totals.get(j.productType) ?? 0) + j.remaining);
  let bestProduct: string | null = null;
  let bestQty = -1;
  for (const [pt, q] of totals.entries()) {
    if (q > bestQty) {
      bestProduct = pt;
      bestQty = q;
    }
  }
  if (!bestProduct) return null;
  const candidates = pool.filter((j) => j.productType === bestProduct);
  return [...candidates].sort(byEdd)[0];
}

function byEdd(a: Job, b: Job): number {
  if (a.dueAt !== b.dueAt) return a.dueAt - b.dueAt;
  if (b.remaining !== a.remaining) return b.remaining - a.remaining;
  return a.arrivedAt - b.arrivedAt;
}
