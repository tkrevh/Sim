import type { Machine, Order, Product, Scenario } from "../types";

const BASE_PRODUCTS: Product[] = [
  { id: "A", name: "Red Widget", color: "#ef4444", baseUnitsPerHour: 80 },
  { id: "B", name: "Blue Gadget", color: "#3b82f6", baseUnitsPerHour: 60 },
  { id: "C", name: "Green Gizmo", color: "#22c55e", baseUnitsPerHour: 100 },
  { id: "D", name: "Purple Part", color: "#a855f7", baseUnitsPerHour: 45 },
  { id: "E", name: "Amber Item", color: "#f59e0b", baseUnitsPerHour: 70 },
];

function machine(
  id: string,
  name: string,
  setupMinutes: number,
  speedFactor: number,
  capable: string[],
  startProduct: string | null = null,
): Machine {
  return {
    id,
    name,
    setupTimeMinutes: setupMinutes,
    speedFactor,
    capableProductIds: capable,
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
  description: "3 lines, 8 interleaved orders. All lines tooled for A/B/C.",
  costPerMinute: 2,
  latePenaltyPerMinute: 5,
  products: BASE_PRODUCTS.slice(0, 3),
  machines: [
    machine("m1", "Line 1", 20, 1.0, ["A", "B", "C"], "A"),
    machine("m2", "Line 2", 25, 0.9, ["A", "B", "C"], "B"),
    machine("m3", "Line 3", 15, 1.2, ["A", "B", "C"], "C"),
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
  description:
    "5 lines with mixed capabilities — Line 4 is the only one tooled for D.",
  costPerMinute: 2.5,
  latePenaltyPerMinute: 8,
  products: BASE_PRODUCTS.slice(0, 4),
  machines: [
    machine("m1", "Line 1", 30, 1.0, ["A", "B", "D"], "A"),
    machine("m2", "Line 2", 25, 1.1, ["B", "C"], "B"),
    machine("m3", "Line 3", 35, 0.85, ["A", "C", "D"], "C"),
    machine("m4", "Line 4", 20, 1.3, ["C", "D"], "D"),
    machine("m5", "Line 5", 40, 0.75, ["A", "B"], "A"),
  ],
  orders: [
    order("o1", "B", 100, 0, 360),
    order("o2", "D", 120, 0, 480),
    order("o3", "A", 90, 0, 360),
    order("o4", "C", 120, 0, 420),
    order("o5", "D", 80, 0, 360),
    order("o6", "A", 110, 0, 420),
    order("o7", "B", 70, 0, 300),
    order("o8", "C", 100, 0, 480),
    order("o9", "A", 80, 0, 480),
    order("o10", "D", 100, 0, 540),
    order("o11", "B", 90, 0, 480),
    order("o12", "C", 130, 0, 540),
    order("o13", "A", 75, 0, 540),
    order("o14", "D", 80, 0, 600),
    order("o15", "B", 110, 0, 600),
    order("o16", "C", 90, 0, 600),
  ],
};

export const LARGE_SCENARIO: Scenario = {
  id: "large",
  name: "Large factory",
  description: "8 lines, 5 products, varied tooling and speeds.",
  costPerMinute: 3,
  latePenaltyPerMinute: 10,
  products: BASE_PRODUCTS,
  machines: [
    machine("m1", "Line 1", 40, 0.9, ["A", "B", "E"], "A"),
    machine("m2", "Line 2", 35, 1.15, ["B", "C", "E"], "B"),
    machine("m3", "Line 3", 30, 1.3, ["C", "E"], "C"),
    machine("m4", "Line 4", 45, 0.85, ["A", "D"], "D"),
    machine("m5", "Line 5", 25, 1.4, ["A", "B", "C"], "C"),
    machine("m6", "Line 6", 40, 1.0, ["A", "B", "D", "E"], "A"),
    machine("m7", "Line 7", 30, 1.1, ["B", "C", "E"], "B"),
    machine("m8", "Line 8", 35, 0.95, ["C", "D", "E"], "D"),
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
