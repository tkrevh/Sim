"use client";

import { motion } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useSimulationStore } from "@/store/simulationStore";
import type { Machine, Order, Scenario } from "@/lib/sim/types";

interface Props {
  onClose: () => void;
}

const PRODUCTS = ["A", "B", "C", "D", "E"];

export function ScenarioBuilder({ onClose }: Props) {
  const scenario = useSimulationStore((s) => s.scenario);
  const loadScenario = useSimulationStore((s) => s.loadScenario);
  const [draft, setDraft] = useState<Scenario>(() => structuredClone(scenario));

  useEffect(() => {
    setDraft(structuredClone(scenario));
  }, [scenario]);

  function commit() {
    loadScenario(draft);
    onClose();
  }

  function addMachine() {
    const id = `m${draft.machines.length + 1}`;
    const m: Machine = {
      id,
      name: `Line ${draft.machines.length + 1}`,
      setupTimeMinutes: 25,
      outputUnitsPerHour: 60,
      currentProduct: "A",
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

  function addOrder() {
    const id = `o${draft.orders.length + 1}`;
    const o: Order = {
      id,
      productType: "A",
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
        className="ml-auto w-full max-w-2xl h-full bg-zinc-950 border-l border-zinc-800 flex flex-col"
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
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium text-sm">Machines · {draft.machines.length}</div>
              <Button variant="primary" onClick={addMachine} className="text-xs">
                <Plus className="w-3 h-3" />
                Add machine
              </Button>
            </div>
            <div className="space-y-2">
              {draft.machines.map((m) => (
                <div
                  key={m.id}
                  className="grid grid-cols-[1fr_80px_80px_80px_32px] gap-2 items-center text-xs"
                >
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
                  >
                    <option value="">cold</option>
                    {PRODUCTS.map((p) => (
                      <option key={p} value={p}>
                        {p}
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
                    value={m.outputUnitsPerHour}
                    onChange={(e) =>
                      updateMachine(m.id, {
                        outputUnitsPerHour: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5"
                    title="Units / hour"
                  />
                  <Button
                    variant="ghost"
                    onClick={() => removeMachine(m.id)}
                    className="px-1 text-rose-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
              <div className="grid grid-cols-[1fr_80px_80px_80px_32px] gap-2 text-[10px] text-zinc-500 px-1">
                <span>Name</span>
                <span>Product</span>
                <span>Setup (min)</span>
                <span>u/h</span>
                <span />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium text-sm">Orders · {draft.orders.length}</div>
              <Button variant="primary" onClick={addOrder} className="text-xs">
                <Plus className="w-3 h-3" />
                Add order
              </Button>
            </div>
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
                    {PRODUCTS.map((p) => (
                      <option key={p} value={p}>
                        {p}
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
              <div className="grid grid-cols-[60px_80px_80px_80px_80px_32px] gap-2 text-[10px] text-zinc-500 px-1">
                <span>id</span>
                <span>Product</span>
                <span>Qty</span>
                <span>Arrived</span>
                <span>Due</span>
                <span />
              </div>
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
