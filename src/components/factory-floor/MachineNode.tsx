"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import type { Machine } from "@/lib/sim/types";
import { cn } from "@/lib/ui/cn";

type MachineNodeData = {
  machine: Machine;
  productColor: string;
  jobLabel?: string;
  remainingPct?: number;
};

const stateColors: Record<Machine["state"], string> = {
  idle: "border-zinc-600 bg-zinc-900",
  setup: "border-amber-400 bg-amber-950/60",
  producing: "border-emerald-400 bg-emerald-950/60",
  blocked: "border-rose-500 bg-rose-950/60",
};

const stateLabels: Record<Machine["state"], string> = {
  idle: "Idle",
  setup: "Changing over",
  producing: "Producing",
  blocked: "Blocked",
};

export function MachineNode({ data }: NodeProps) {
  const d = data as unknown as MachineNodeData;
  const { machine, productColor, jobLabel, remainingPct = 0 } = d;
  const setupPulse = machine.state === "setup";
  const producePulse = machine.state === "producing";

  return (
    <motion.div
      animate={{
        scale: setupPulse ? [1, 1.03, 1] : 1,
        boxShadow: producePulse
          ? `0 0 22px -4px ${productColor}aa`
          : setupPulse
            ? "0 0 22px -4px #fbbf24aa"
            : "0 0 0px 0px transparent",
      }}
      transition={{
        scale: { duration: 0.8, repeat: setupPulse ? Infinity : 0 },
        boxShadow: { duration: 0.4 },
      }}
      className={cn(
        "rounded-xl border-2 px-4 py-3 min-w-[180px] text-zinc-100",
        stateColors[machine.state],
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-zinc-600" />
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-sm">{machine.name}</div>
        <div
          className="w-3.5 h-3.5 rounded-full ring-2 ring-zinc-900"
          style={{ backgroundColor: productColor }}
          title={machine.currentProduct ?? "no product"}
        />
      </div>
      <div className="text-[11px] text-zinc-400 flex justify-between">
        <span>{stateLabels[machine.state]}</span>
        <span>
          {machine.outputUnitsPerHour}u/h · setup {machine.setupTimeMinutes}m
        </span>
      </div>
      {jobLabel && (
        <div className="text-[11px] text-zinc-300 mt-1 truncate">{jobLabel}</div>
      )}
      <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <motion.div
          animate={{ width: `${Math.max(0, Math.min(100, remainingPct))}%` }}
          transition={{ duration: 0.3, ease: "linear" }}
          className="h-full"
          style={{
            background:
              machine.state === "setup"
                ? "#fbbf24"
                : machine.state === "producing"
                  ? productColor
                  : "#3f3f46",
          }}
        />
      </div>
      <div className="text-[10px] text-zinc-500 mt-1.5 flex justify-between">
        <span>Made {machine.unitsProducedTotal}u</span>
        <span>Setup {Math.round(machine.setupMinutesTotal)}m</span>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-zinc-600" />
    </motion.div>
  );
}
