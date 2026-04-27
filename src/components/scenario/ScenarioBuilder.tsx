"use client";

import { motion } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useSimulationStore } from "@/store/simulationStore";
import type { Machine, Order, Product, Scenario } from "@/lib/sim/types";
import { cn } from "@/lib/ui/cn";

interface Props {
  onClose: () => void;
}

const SUGGESTED_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
];

export function ScenarioBuilder({ onClose }: Props) {
  const scenario = useSimulationStore((s) => s.scenario);
  const loadScenario = useSimulationStore((s) => s.loadScenario);
  const [draft, setDraft] = useState<Scenario>(() => structuredClone(scenario));

  useEffect(() => {
    setDraft(structuredClone(scenario));
  }, [scenario]);

  const productIds = draft.products.map((p) => p.id);
  const firstProductId = productIds[0] ?? "A";

  function commit() {
    // Sanitize: drop any machine.currentProduct or capability not in products,
    // drop any order whose productType vanished.
    const validIds = new Set(productIds);
    const cleaned: Scenario = {
      ...draft,
      machines: draft.machines.map((m) => ({
        ...m,
        currentProduct:
          m.currentProduct && validIds.has(m.currentProduct) ? m.currentProduct : null,
        capableProductIds: m.capableProductIds.filter((id) => validIds.has(id)),
      })),
      orders: draft.orders.filter((o) => validIds.has(o.productType)),
    };
    loadScenario(cleaned);
    onClose();
  }

  /* ----- products ----- */

  function addProduct() {
    const used = new Set(productIds);
    const id =
      ["A", "B", "C", "D", "E", "F", "G", "H"].find((c) => !used.has(c)) ??
      `P${draft.products.length + 1}`;
    const color = SUGGESTED_COLORS[draft.products.length % SUGGESTED_COLORS.length];
    const p: Product = {
      id,
      name: `Product ${id}`,
      color,
      baseUnitsPerHour: 60,
    };
    setDraft({ ...draft, products: [...draft.products, p] });
  }

  function updateProduct(id: string, patch: Partial<Product>) {
    setDraft({
      ...draft,
      products: draft.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  }

  function removeProduct(id: string) {
    setDraft({
      ...draft,
      products: draft.products.filter((p) => p.id !== id),
    });
  }

  /* ----- machines ----- */

  function addMachine() {
    const id = `m${draft.machines.length + 1}`;
    const m: Machine = {
      id,
      name: `Line ${draft.machines.length + 1}`,
      setupTimeMinutes: 25,
      speedFactor: 1.0,
      capableProductIds: [...productIds],
      currentProduct: firstProductId,
      state: "idle",
      currentJobId: null,
      unitsProducedTotal: 0,
      setupMinutesTotal: 0,
      busyMinutesTotal: 0,
      lastBecameBusyAt: null,
    };
    setDraft({ ...draft, machines: [...draft.machines, m] });
  }

  function removeMachine(id: string) {
    setDraft({ ...draft, machines: draft.machines.filter((m) => m.id !== id) });
  }

  function updateMachine(id: string, patch: Partial<Machine>) {
    setDraft({
      ...draft,
      machines: draft.machines.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });
  }

  function toggleCapability(machineId: string, productId: string) {
    const m = draft.machines.find((x) => x.id === machineId);
    if (!m) return;
    const next = m.capableProductIds.includes(productId)
      ? m.capableProductIds.filter((id) => id !== productId)
      : [...m.capableProductIds, productId];
    updateMachine(machineId, {
      capableProductIds: next,
      currentProduct:
        m.currentProduct && !next.includes(m.currentProduct) ? null : m.currentProduct,
    });
  }

  /* ----- orders ----- */

  function addOrder() {
    const id = `o${draft.orders.length + 1}`;
    const o: Order = {
      id,
      productType: firstProductId,
      quantity: 80,
      arrivedAt: 0,
      dueAt: 360,
    };
    setDraft({ ...draft, orders: [...draft.orders, o] });
  }

  function removeOrder(id: string) {
    setDraft({ ...draft, orders: draft.orders.filter((o) => o.id !== id) });
  }

  function updateOrder(id: string, patch: Partial<Order>) {
    setDraft({
      ...draft,
      orders: draft.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 280 }}
        className="ml-auto w-full max-w-3xl h-full bg-zinc-950 border-l border-zinc-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <div>
            <div className="text-sm font-semibold">Scenario sandbox</div>
            <div className="text-[11px] text-zinc-500">
              Build your own factory or tweak the preset
            </div>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <Card className="p-4">
            <SectionHeader
              title={`Products · ${draft.products.length}`}
              onAdd={addProduct}
              addLabel="Add product"
            />
            <div className="space-y-2">
              {draft.products.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-[40px_1fr_120px_90px_32px] gap-2 items-center text-xs"
                >
                  <span className="font-mono text-zinc-500">{p.id}</span>
                  <input
                    value={p.name}
                    onChange={(e) => updateProduct(p.id, { name: e.target.value })}
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={p.color}
                      onChange={(e) => updateProduct(p.id, { color: e.target.value })}
                      className="w-6 h-6 rounded border border-zinc-800 bg-zinc-900 cursor-pointer"
                    />
                    <input
                      value={p.color}
                      onChange={(e) => updateProduct(p.id, { color: e.target.value })}
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 flex-1 font-mono"
                    />
                  </div>
                  <input
                    type="number"
                    value={p.baseUnitsPerHour}
                    onChange={(e) =>
                      updateProduct(p.id, {
                        baseUnitsPerHour: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5"
                    title="Base units / hour on a 1.0× machine"
                  />
                  <Button
                    variant="ghost"
                    onClick={() => removeProduct(p.id)}
                    className="px-1 text-rose-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <ColumnHeader
                cols="grid-cols-[40px_1fr_120px_90px_32px]"
                labels={["id", "Name", "Color", "Base u/h", ""]}
              />
            </div>
          </Card>

          <Card className="p-4">
            <SectionHeader
              title={`Machines · ${draft.machines.length}`}
              onAdd={addMachine}
              addLabel="Add machine"
            />
            <div className="space-y-3">
              {draft.machines.map((m) => (
                <div
                  key={m.id}
                  className="rounded-md border border-zinc-800 bg-zinc-900/40 p-2 space-y-2"
                >
                  <div className="grid grid-cols-[1fr_90px_80px_80px_32px] gap-2 items-center text-xs">
                    <input
                      value={m.name}
                      onChange={(e) => updateMachine(m.id, { name: e.target.value })}
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5"
                    />
                    <select
                      value={m.currentProduct ?? ""}
                      onChange={(e) =>
                        updateMachine(m.id, {
                          currentProduct: e.target.value || null,
                        })
                      }
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5"
                      title="Current product"
                    >
                      <option value="">cold</option>
                      {m.capableProductIds.map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={m.setupTimeMinutes}
                      onChange={(e) =>
                        updateMachine(m.id, {
                          setupTimeMinutes: Math.max(0, Number(e.target.value)),
                        })
                      }
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5"
                      title="Setup minutes"
                    />
                    <input
                      type="number"
                      step="0.05"
                      value={m.speedFactor}
                      onChange={(e) =>
                        updateMachine(m.id, {
                          speedFactor: Math.max(0.1, Number(e.target.value)),
                        })
                      }
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5"
                      title="Speed factor (1.0 = standard)"
                    />
                    <Button
                      variant="ghost"
                      onClick={() => removeMachine(m.id)}
                      className="px-1 text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pl-1">
                    <span className="text-[10px] uppercase tracking-wide text-zinc-500 mr-1">
                      Tooled for
                    </span>
                    {draft.products.map((p) => {
                      const on = m.capableProductIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggleCapability(m.id, p.id)}
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1.5 transition-colors border",
                            on
                              ? "border-transparent text-zinc-100"
                              : "border-zinc-700 text-zinc-500 hover:text-zinc-300",
                          )}
                          style={
                            on
                              ? { background: `${p.color}33`, borderColor: `${p.color}aa` }
                              : undefined
                          }
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: p.color, opacity: on ? 1 : 0.4 }}
                          />
                          {p.id}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <ColumnHeader
                cols="grid-cols-[1fr_90px_80px_80px_32px]"
                labels={["Name", "Current", "Setup (m)", "Speed ×", ""]}
              />
            </div>
          </Card>

          <Card className="p-4">
            <SectionHeader
              title={`Orders · ${draft.orders.length}`}
              onAdd={addOrder}
              addLabel="Add order"
            />
            <div className="space-y-2">
              {draft.orders.map((o) => (
                <div
                  key={o.id}
                  className="grid grid-cols-[60px_80px_80px_80px_80px_32px] gap-2 items-center text-xs"
                >
                  <span className="font-mono text-zinc-500">{o.id}</span>
                  <select
                    value={o.productType}
                    onChange={(e) => updateOrder(o.id, { productType: e.target.value })}
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5"
                  >
                    {productIds.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={o.quantity}
                    onChange={(e) =>
                      updateOrder(o.id, { quantity: Math.max(1, Number(e.target.value)) })
                    }
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5"
                  />
                  <input
                    type="number"
                    value={o.arrivedAt}
                    onChange={(e) =>
                      updateOrder(o.id, { arrivedAt: Math.max(0, Number(e.target.value)) })
                    }
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5"
                    title="Arrived at (min)"
                  />
                  <input
                    type="number"
                    value={o.dueAt}
                    onChange={(e) => updateOrder(o.id, { dueAt: Number(e.target.value) })}
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5"
                    title="Due at (min)"
                  />
                  <Button
                    variant="ghost"
                    onClick={() => removeOrder(o.id)}
                    className="px-1 text-rose-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <ColumnHeader
                cols="grid-cols-[60px_80px_80px_80px_80px_32px]"
                labels={["id", "Product", "Qty", "Arrived", "Due", ""]}
              />
            </div>
          </Card>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-800">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={commit}>
            Apply &amp; reset
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SectionHeader({
  title,
  onAdd,
  addLabel,
}: {
  title: string;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="font-medium text-sm">{title}</div>
      <Button variant="primary" onClick={onAdd} className="text-xs">
        <Plus className="w-3 h-3" />
        {addLabel}
      </Button>
    </div>
  );
}

function ColumnHeader({ cols, labels }: { cols: string; labels: string[] }) {
  return (
    <div className={cn("grid gap-2 text-[10px] text-zinc-500 px-1", cols)}>
      {labels.map((l, i) => (
        <span key={i}>{l}</span>
      ))}
    </div>
  );
}
