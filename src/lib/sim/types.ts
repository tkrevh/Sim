export type ProductType = string;

export type MachineState = "idle" | "setup" | "producing" | "blocked";

export interface Machine {
  id: string;
  name: string;
  setupTimeMinutes: number;
  outputUnitsPerHour: number;
  currentProduct: ProductType | null;
  state: MachineState;
  currentJobId: string | null;
  unitsProducedTotal: number;
  setupMinutesTotal: number;
  busyMinutesTotal: number;
  lastBecameBusyAt: number | null;
}

export interface Order {
  id: string;
  productType: ProductType;
  quantity: number;
  arrivedAt: number;
  dueAt: number;
}

export interface Job {
  id: string;
  orderId: string;
  productType: ProductType;
  quantity: number;
  remaining: number;
  arrivedAt: number;
  dueAt: number;
  assignedMachineId: string | null;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface ScheduleEntry {
  machineId: string;
  orderId: string;
  reasoning?: string;
}

export type SimEvent =
  | {
      kind: "MACHINE_SETUP_STARTED";
      t: number;
      machineId: string;
      fromProduct: ProductType | null;
      toProduct: ProductType;
      durationMinutes: number;
    }
  | { kind: "MACHINE_SETUP_FINISHED"; t: number; machineId: string }
  | { kind: "JOB_STARTED"; t: number; machineId: string; jobId: string; productType: ProductType }
  | { kind: "JOB_PROGRESS"; t: number; machineId: string; jobId: string; produced: number; remaining: number }
  | { kind: "JOB_FINISHED"; t: number; machineId: string; jobId: string; onTime: boolean }
  | { kind: "MACHINE_IDLE"; t: number; machineId: string }
  | { kind: "ORDER_ARRIVED"; t: number; orderId: string }
  | { kind: "RUN_FINISHED"; t: number };

export interface KPISnapshot {
  t: number;
  throughputUnitsPerHour: number;
  setupMinutesWasted: number;
  makespan: number;
  onTimePct: number;
  wip: number;
  perMachineUtilization: Record<string, number>;
  totalUnitsProduced: number;
  jobsCompleted: number;
  jobsTotal: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  machines: Machine[];
  orders: Order[];
  productColors: Record<ProductType, string>;
  costPerMinute: number;
  latePenaltyPerMinute: number;
}
