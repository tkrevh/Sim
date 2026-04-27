export type ProductType = string;

export interface Product {
  id: ProductType;
  name: string;
  color: string;
  baseUnitsPerHour: number;
}

export type MachineState = "idle" | "setup" | "producing" | "blocked";

export interface Machine {
  id: string;
  name: string;
  setupTimeMinutes: number;
  /** Multiplier on a product's baseUnitsPerHour. 1.0 = standard, 1.2 = 20% faster. */
  speedFactor: number;
  /** Product ids this machine is tooled to produce. Empty = none. */
  capableProductIds: ProductType[];
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
  products: Product[];
  machines: Machine[];
  orders: Order[];
  costPerMinute: number;
  latePenaltyPerMinute: number;
}

/* ---------- helpers ---------- */

export function canProduce(machine: Machine, productId: ProductType): boolean {
  return machine.capableProductIds.includes(productId);
}

export function effectiveUnitsPerHour(machine: Machine, product: Product): number {
  return product.baseUnitsPerHour * machine.speedFactor;
}

export function findProduct(
  products: ReadonlyArray<Product>,
  id: ProductType,
): Product | undefined {
  return products.find((p) => p.id === id);
}

export function productColor(
  products: ReadonlyArray<Product>,
  id: ProductType | null,
  fallback = "#52525b",
): string {
  if (!id) return fallback;
  return findProduct(products, id)?.color ?? fallback;
}
