import type { Machine, Order, Scenario } from "../types";

const PRODUCT_COLORS: Record<string, string> = {
  A: "#ef4444",
  B: "#3b82f6",
  C: "#22c55e",
  D: "#a855f7",
  E: "#f59e0b",
};

function machine(
  id: string,
  name: string,
  setupMinutes: number,
  unitsPerHour: number,
  startProduct: string | null = null,
): Machine {
  return {
    id,
    name,
    setupTimeMinutes: setupMinutes,
    outputUnitsPerHour: unitsPerHour,
    currentProduct: startProduct,
    state: "idle",
    currentJobId: null,
    unitsProducedTotal: 0,
    setupMinutesTotal: 0,
    busyMinutesTotal: 0,
    lastBecameBusyAt: null,
  };
}

function order(
  id: string,
  productType: string,
  quantity: number,
  arrivedAt: number,
  dueAt: number,
): Order {
  return { id, productType, quantity, arrivedAt, dueAt };
}

export const SMALL_SCENARIO: Scenario = {
  id: "small",
  name: "Small factory",
  description: "3 machines, 8 interleaved orders. Quick demo.",
  costPerMinute: 2,
  latePenaltyPerMinute: 5,
  productColors: PRODUCT_COLORS,
  machines: [
    machine("m1", "Line 1", 20, 60, "A"),
    machine("m2", "Line 2", 25, 50, "B"),
    machine("m3", "Line 3", 15, 80, "C"),
  ],
  orders: [
    order("o1", "B", 80, 0, 300),
    order("o2", "C", 100, 0, 300),
    order("o3", "A", 60, 0, 240),
    order("o4", "A", 80, 0, 360),
    order("o5", "B", 60, 0, 300),
    order("o6", "C", 120, 0, 360),
    order("o7", "A", 50, 0, 360),
    order("o8", "C", 80, 0, 420),
  ],
};

export const MEDIUM_SCENARIO: Scenario = {
  id: "medium",
  name: "Medium factory",
  description: "5 machines, 16 interleaved orders across 4 products.",
  costPerMinute: 2.5,
  latePenaltyPerMinute: 8,
  productColors: PRODUCT_COLORS,
  machines: [
    machine("m1", "Line 1", 30, 60, "A"),
    machine("m2", "Line 2", 25, 70, "B"),
    machine("m3", "Line 3", 35, 55, "C"),
    machine("m4", "Line 4", 20, 90, "D"),
    machine("m5", "Line 5", 40, 45, "A"),
  ],
  orders: [
    order("o1", "B", 100, 0, 360),
    order("o2", "D", 150, 0, 480),
    order("o3", "A", 90, 0, 360),
    order("o4", "C", 120, 0, 420),
    order("o5", "D", 80, 0, 360),
    order("o6", "A", 110, 0, 420),
    order("o7", "B", 70, 0, 300),
    order("o8", "C", 100, 0, 480),
    order("o9", "A", 80, 0, 480),
    order("o10", "D", 140, 0, 540),
    order("o11", "B", 90, 0, 480),
    order("o12", "C", 130, 0, 540),
    order("o13", "A", 75, 0, 540),
    order("o14", "D", 100, 0, 600),
    order("o15", "B", 110, 0, 600),
    order("o16", "C", 90, 0, 600),
  ],
};

export const LARGE_SCENARIO: Scenario = {
  id: "large",
  name: "Large factory",
  description: "8 machines, 30 orders across 5 products. Stress test.",
  costPerMinute: 3,
  latePenaltyPerMinute: 10,
  productColors: PRODUCT_COLORS,
  machines: [
    machine("m1", "Line 1", 40, 50, "A"),
    machine("m2", "Line 2", 35, 70, "B"),
    machine("m3", "Line 3", 30, 90, "C"),
    machine("m4", "Line 4", 45, 60, "D"),
    machine("m5", "Line 5", 25, 100, "E"),
    machine("m6", "Line 6", 40, 65, "A"),
    machine("m7", "Line 7", 30, 80, "B"),
    machine("m8", "Line 8", 35, 75, "C"),
  ],
  orders: Array.from({ length: 30 }, (_, i) => {
    const products = ["A", "B", "C", "D", "E"];
    const productType = products[i % products.length];
    const quantity = 60 + (i % 7) * 25;
    const dueAt = 360 + (i % 5) * 120;
    return order(`o${i + 1}`, productType, quantity, 0, dueAt);
  }),
};

export const PRESETS: Scenario[] = [SMALL_SCENARIO, MEDIUM_SCENARIO, LARGE_SCENARIO];

export function getPreset(id: string): Scenario | undefined {
  return PRESETS.find((p) => p.id === id);
}
