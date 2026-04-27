import type { Job, Machine, ScheduleEntry } from "../types";

export interface SchedulerContext {
  now: number;
  machines: ReadonlyArray<Machine>;
  pendingJobs: ReadonlyArray<Job>;
}

export interface Dispatch {
  machineId: string;
  jobId: string;
  reasoning?: string;
}

export interface Scheduler {
  name: "fifo" | "ai-heuristic" | "ai-claude";
  onTick(ctx: SchedulerContext): Dispatch[];
  seedPlan?(plan: ScheduleEntry[]): void;
}
