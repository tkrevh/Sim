import type { Dispatch, Scheduler, SchedulerContext } from "./Scheduler";

/**
 * Strict FIFO: assigns the earliest-arrived pending job to the first
 * available idle machine, regardless of currentProduct. This is the
 * "naive" baseline that wastes setup time on every changeover.
 */
export function createFifoScheduler(): Scheduler {
  return {
    name: "fifo",
    onTick(ctx: SchedulerContext): Dispatch[] {
      const idleMachines = ctx.machines.filter(
        (m) => m.state === "idle" && m.currentJobId === null,
      );
      if (idleMachines.length === 0 || ctx.pendingJobs.length === 0) return [];

      const sortedJobs = [...ctx.pendingJobs]
        .filter((j) => j.assignedMachineId === null)
        .sort((a, b) => a.arrivedAt - b.arrivedAt || a.id.localeCompare(b.id));

      const dispatches: Dispatch[] = [];
      const usedMachines = new Set<string>();
      const usedJobs = new Set<string>();

      for (const job of sortedJobs) {
        if (job.assignedMachineId !== null) continue;
        if (usedJobs.has(job.id)) continue;
        const machine = idleMachines.find((m) => !usedMachines.has(m.id));
        if (!machine) break;
        dispatches.push({ machineId: machine.id, jobId: job.id });
        usedMachines.add(machine.id);
        usedJobs.add(job.id);
      }
      return dispatches;
    },
  };
}
