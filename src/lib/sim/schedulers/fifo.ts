import { canProduce } from "../types";
import type { Dispatch, Scheduler, SchedulerContext } from "./Scheduler";

/**
 * Strict FIFO: pick the earliest-arrived pending job and assign it to the first
 * idle machine that is *capable* of producing it. If no capable machine is
 * idle, the job waits. Capability is a hard constraint (machines aren't
 * tooled for products outside their capability set), but FIFO does NOT
 * consider whether the machine is already set up for the product, so it
 * pays setup cost on every changeover.
 */
export function createFifoScheduler(): Scheduler {
  return {
    name: "fifo",
    onTick(ctx: SchedulerContext): Dispatch[] {
      const idleMachines = ctx.machines.filter(
        (m) => m.state === "idle" && m.currentJobId === null,
      );
      if (idleMachines.length === 0) return [];

      const sortedJobs = [...ctx.pendingJobs]
        .filter((j) => j.assignedMachineId === null)
        .sort((a, b) => a.arrivedAt - b.arrivedAt || a.id.localeCompare(b.id));
      if (sortedJobs.length === 0) return [];

      const dispatches: Dispatch[] = [];
      const usedMachines = new Set<string>();
      const usedJobs = new Set<string>();

      for (const job of sortedJobs) {
        if (usedJobs.has(job.id)) continue;
        const machine = idleMachines.find(
          (m) => !usedMachines.has(m.id) && canProduce(m, job.productType),
        );
        if (!machine) continue; // job waits for a capable machine
        dispatches.push({ machineId: machine.id, jobId: job.id });
        usedMachines.add(machine.id);
        usedJobs.add(job.id);
      }
      return dispatches;
    },
  };
}
