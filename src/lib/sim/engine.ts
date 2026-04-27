import { MinHeap, eventCompare, type InternalEvent } from "./eventQueue";
import type { Scheduler } from "./schedulers/Scheduler";
import type {
  Job,
  KPISnapshot,
  Machine,
  Order,
  Scenario,
  SimEvent,
} from "./types";

const EPSILON = 1e-9;

export type SimEventListener = (events: SimEvent[]) => void;

export interface EngineOptions {
  scenario: Scenario;
  scheduler: Scheduler;
  label: string;
}

export class SimEngine {
  readonly label: string;
  private scheduler: Scheduler;
  private readonly costPerMinute: number;
  private readonly latePenaltyPerMinute: number;

  clock = 0;
  finished = false;
  finishedAt: number | null = null;
  machines: Machine[];
  orders: Order[];
  jobs: Job[];

  private heap = new MinHeap<InternalEvent>(eventCompare);
  private seq = 0;
  private outBuffer: SimEvent[] = [];
  private listeners = new Set<SimEventListener>();
  private finalKpi: KPISnapshot | null = null;

  constructor(opts: EngineOptions) {
    this.label = opts.label;
    this.scheduler = opts.scheduler;
    this.costPerMinute = opts.scenario.costPerMinute;
    this.latePenaltyPerMinute = opts.scenario.latePenaltyPerMinute;
    this.machines = opts.scenario.machines.map(cloneMachine);
    this.orders = opts.scenario.orders.map((o) => ({ ...o }));
    this.jobs = this.orders.map((o) => ({
      id: `job-${o.id}`,
      orderId: o.id,
      productType: o.productType,
      quantity: o.quantity,
      remaining: o.quantity,
      arrivedAt: o.arrivedAt,
      dueAt: o.dueAt,
      assignedMachineId: null,
      startedAt: null,
      finishedAt: null,
    }));

    for (const order of this.orders) {
      if (order.arrivedAt <= 0) continue;
      this.schedule({ t: order.arrivedAt, kind: "ORDER_ARRIVED", orderId: order.id });
    }
    this.schedule({ t: 0, kind: "DISPATCH" });
  }

  setScheduler(scheduler: Scheduler): void {
    this.scheduler = scheduler;
  }

  subscribe(fn: SimEventListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Advance virtual clock by `dtMinutes`. Processes all events whose time
   * falls within [clock, clock+dt]. Returns true if the run is finished.
   */
  advanceBy(dtMinutes: number): boolean {
    if (this.finished) return true;
    const target = this.clock + dtMinutes;
    while (!this.finished) {
      const next = this.heap.peek();
      if (!next) {
        this.checkFinished(target);
        break;
      }
      if (next.t > target + EPSILON) break;
      this.heap.pop();
      this.clock = next.t;
      this.processEvent(next);
    }
    if (!this.finished) this.clock = target;
    this.flush();
    return this.finished;
  }

  /** Run to completion (used in headless / Phase 1). */
  runToCompletion(maxMinutes = 1_000_000): KPISnapshot {
    while (!this.finished && this.clock < maxMinutes) {
      const next = this.heap.peek();
      if (!next) {
        this.checkFinished(this.clock);
        break;
      }
      this.heap.pop();
      this.clock = next.t;
      this.processEvent(next);
    }
    this.flush();
    return this.snapshotKPI();
  }

  snapshotKPI(): KPISnapshot {
    if (this.finalKpi) return this.finalKpi;
    const totalUnits = this.machines.reduce((s, m) => s + m.unitsProducedTotal, 0);
    const setupWasted = this.machines.reduce((s, m) => s + m.setupMinutesTotal, 0);
    const completed = this.jobs.filter((j) => j.finishedAt !== null);
    const onTime = completed.filter((j) => j.finishedAt! <= this.jobDueAt(j));
    const wip = this.jobs.filter(
      (j) => j.startedAt !== null && j.finishedAt === null,
    ).length;
    const elapsedHours = Math.max(this.clock / 60, EPSILON);
    const perMachineUtil: Record<string, number> = {};
    for (const m of this.machines) {
      perMachineUtil[m.id] = this.clock > 0 ? m.busyMinutesTotal / this.clock : 0;
    }
    const snap: KPISnapshot = {
      t: this.clock,
      throughputUnitsPerHour: totalUnits / elapsedHours,
      setupMinutesWasted: setupWasted,
      makespan: this.finished ? this.finishedAt ?? this.clock : this.clock,
      onTimePct: completed.length > 0 ? onTime.length / completed.length : 1,
      wip,
      perMachineUtilization: perMachineUtil,
      totalUnitsProduced: totalUnits,
      jobsCompleted: completed.length,
      jobsTotal: this.jobs.length,
    };
    if (this.finished) this.finalKpi = snap;
    return snap;
  }

  costStats(): { setupCost: number; lateCost: number; total: number } {
    const setupWasted = this.machines.reduce((s, m) => s + m.setupMinutesTotal, 0);
    let lateMinutes = 0;
    for (const j of this.jobs) {
      if (j.finishedAt === null) continue;
      const diff = j.finishedAt - this.jobDueAt(j);
      if (diff > 0) lateMinutes += diff;
    }
    const setupCost = setupWasted * this.costPerMinute;
    const lateCost = lateMinutes * this.latePenaltyPerMinute;
    return { setupCost, lateCost, total: setupCost + lateCost };
  }

  private jobDueAt(job: Job): number {
    return job.dueAt;
  }

  private processEvent(ev: InternalEvent): void {
    switch (ev.kind) {
      case "ORDER_ARRIVED": {
        if (ev.orderId) this.emit({ kind: "ORDER_ARRIVED", t: this.clock, orderId: ev.orderId });
        this.tryDispatch();
        break;
      }
      case "SETUP_FINISHED": {
        const machine = this.machineById(ev.machineId!);
        if (!machine) return;
        machine.setupMinutesTotal += machine.setupTimeMinutes;
        machine.state = "producing";
        this.emit({ kind: "MACHINE_SETUP_FINISHED", t: this.clock, machineId: machine.id });
        this.startProducing(machine);
        break;
      }
      case "JOB_FINISHED": {
        const machine = this.machineById(ev.machineId!);
        const job = this.jobs.find((j) => j.id === ev.jobId);
        if (!machine || !job) return;
        job.remaining = 0;
        job.finishedAt = this.clock;
        machine.unitsProducedTotal += job.quantity;
        if (machine.lastBecameBusyAt !== null) {
          machine.busyMinutesTotal += this.clock - machine.lastBecameBusyAt;
        }
        machine.lastBecameBusyAt = null;
        machine.state = "idle";
        machine.currentJobId = null;
        const onTime = this.clock <= job.dueAt;
        this.emit({
          kind: "JOB_FINISHED",
          t: this.clock,
          machineId: machine.id,
          jobId: job.id,
          onTime,
        });
        this.emit({ kind: "MACHINE_IDLE", t: this.clock, machineId: machine.id });
        this.tryDispatch();
        break;
      }
      case "DISPATCH": {
        this.tryDispatch();
        break;
      }
    }
  }

  private tryDispatch(): void {
    const pending = this.jobs.filter(
      (j) => j.assignedMachineId === null && j.arrivedAt <= this.clock + EPSILON,
    );
    if (pending.length === 0) return;
    const dispatches = this.scheduler.onTick({
      now: this.clock,
      machines: this.machines,
      pendingJobs: pending,
    });
    for (const d of dispatches) {
      const machine = this.machineById(d.machineId);
      const job = this.jobs.find((j) => j.id === d.jobId);
      if (!machine || !job) continue;
      if (machine.state !== "idle" || machine.currentJobId !== null) continue;
      if (job.assignedMachineId !== null) continue;
      this.assignJob(machine, job);
    }
  }

  private assignJob(machine: Machine, job: Job): void {
    job.assignedMachineId = machine.id;
    machine.currentJobId = job.id;
    machine.lastBecameBusyAt = this.clock;
    if (machine.currentProduct !== job.productType) {
      const fromProduct = machine.currentProduct;
      machine.state = "setup";
      this.emit({
        kind: "MACHINE_SETUP_STARTED",
        t: this.clock,
        machineId: machine.id,
        fromProduct,
        toProduct: job.productType,
        durationMinutes: machine.setupTimeMinutes,
      });
      this.schedule({
        t: this.clock + machine.setupTimeMinutes,
        kind: "SETUP_FINISHED",
        machineId: machine.id,
      });
    } else {
      machine.state = "producing";
      this.startProducing(machine);
    }
  }

  private startProducing(machine: Machine): void {
    if (!machine.currentJobId) return;
    const job = this.jobs.find((j) => j.id === machine.currentJobId);
    if (!job) return;
    machine.currentProduct = job.productType;
    if (job.startedAt === null) job.startedAt = this.clock;
    const minutes = (job.remaining * 60) / machine.outputUnitsPerHour;
    const finishAt = this.clock + minutes;
    this.emit({
      kind: "JOB_STARTED",
      t: this.clock,
      machineId: machine.id,
      jobId: job.id,
      productType: job.productType,
    });
    this.schedule({
      t: finishAt,
      kind: "JOB_FINISHED",
      machineId: machine.id,
      jobId: job.id,
    });
  }

  private schedule(ev: Omit<InternalEvent, "seq">): void {
    this.heap.push({ ...ev, seq: this.seq++ } as InternalEvent);
  }

  private machineById(id: string): Machine | undefined {
    return this.machines.find((m) => m.id === id);
  }

  private emit(ev: SimEvent): void {
    this.outBuffer.push(ev);
  }

  private flush(): void {
    if (this.outBuffer.length === 0) return;
    const buf = this.outBuffer;
    this.outBuffer = [];
    for (const fn of this.listeners) fn(buf);
  }

  private checkFinished(at: number): void {
    if (this.finished) return;
    const allDone = this.jobs.every((j) => j.finishedAt !== null);
    const noPending = this.heap.size() === 0;
    if (allDone && noPending) {
      this.finished = true;
      this.finishedAt = this.clock;
      this.emit({ kind: "RUN_FINISHED", t: this.clock });
    } else if (noPending && !allDone) {
      // No more events but jobs unassigned (e.g. waiting orders). Advance idle.
      this.clock = Math.max(this.clock, at);
    }
  }
}

function cloneMachine(m: Machine): Machine {
  return {
    ...m,
    state: "idle",
    currentJobId: null,
    unitsProducedTotal: 0,
    setupMinutesTotal: 0,
    busyMinutesTotal: 0,
    lastBecameBusyAt: null,
  };
}
