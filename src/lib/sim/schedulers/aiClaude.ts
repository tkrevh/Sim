import type { ScheduleEntry } from "../types";
import { createAiHeuristicScheduler } from "./aiHeuristic";
import type { Dispatch, Scheduler, SchedulerContext } from "./Scheduler";

/**
 * Consumes a plan returned from Claude. For each idle machine, looks up the
 * next plan entry that targets it and dispatches the corresponding job.
 * Falls back to the heuristic for any machine the plan does not cover.
 */
export function createAiClaudeScheduler(): Scheduler {
  let plan: ScheduleEntry[] = [];
  const fallback = createAiHeuristicScheduler();

  return {
    name: "ai-claude",
    seedPlan(p: ScheduleEntry[]) {
      plan = [...p];
    },
    onTick(ctx: SchedulerContext): Dispatch[] {
      const idle = ctx.machines.filter((m) => m.state === "idle" && m.currentJobId === null);
      if (idle.length === 0) return [];
      const dispatches: Dispatch[] = [];
      const claimedJobs = new Set<string>();
      const claimedMachines = new Set<string>();

      for (const machine of idle) {
        const idx = plan.findIndex(
          (e) =>
            e.machineId === machine.id &&
            !claimedJobs.has(e.orderId) &&
            ctx.pendingJobs.some(
              (j) => j.orderId === e.orderId && j.assignedMachineId === null,
            ),
        );
        if (idx === -1) continue;
        const entry = plan[idx];
        const job = ctx.pendingJobs.find(
          (j) => j.orderId === entry.orderId && j.assignedMachineId === null,
        );
        if (!job) continue;
        plan.splice(idx, 1);
        claimedJobs.add(entry.orderId);
        claimedMachines.add(machine.id);
        dispatches.push({
          machineId: machine.id,
          jobId: job.id,
          reasoning: entry.reasoning ?? `Claude assigned ${entry.orderId} to ${machine.id}.`,
        });
      }

      const remainingIdle = idle.filter((m) => !claimedMachines.has(m.id));
      const remainingJobs = ctx.pendingJobs.filter(
        (j) => j.assignedMachineId === null && !claimedJobs.has(j.orderId),
      );
      if (remainingIdle.length > 0 && remainingJobs.length > 0) {
        const fallbackDispatches = fallback.onTick({
          now: ctx.now,
          machines: remainingIdle,
          pendingJobs: remainingJobs,
        });
        for (const d of fallbackDispatches) {
          dispatches.push({
            ...d,
            reasoning: d.reasoning
              ? `(fallback) ${d.reasoning}`
              : `(fallback) heuristic dispatch.`,
          });
        }
      }
      return dispatches;
    },
  };
}
