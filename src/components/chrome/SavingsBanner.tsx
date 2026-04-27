"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import type { DualRunSnapshot } from "@/lib/sim/dualRun";

interface Props {
  snapshot: DualRunSnapshot;
}

export function SavingsBanner({ snapshot }: Props) {
  const setupSaved = Math.max(
    0,
    snapshot.fifo.kpi.setupMinutesWasted - snapshot.ai.kpi.setupMinutesWasted,
  );
  const makespanDelta = snapshot.fifo.finished && snapshot.ai.finished
    ? (snapshot.fifo.finishedAt ?? 0) - (snapshot.ai.finishedAt ?? 0)
    : Math.max(0, snapshot.fifo.kpi.makespan - snapshot.ai.kpi.makespan);
  const dollars = snapshot.dollarsSaved;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Tile label="Setup minutes saved" value={setupSaved} unit="min" tone="amber" />
      <Tile label="Faster makespan" value={makespanDelta} unit="min" tone="emerald" />
      <Tile label="Cost saved" value={dollars} unit="$" tone="emerald" prefix />
    </div>
  );
}

function Tile({
  label,
  value,
  unit,
  prefix = false,
  tone,
}: {
  label: string;
  value: number;
  unit: string;
  prefix?: boolean;
  tone: "amber" | "emerald";
}) {
  const palette =
    tone === "amber"
      ? "border-amber-400/40 bg-amber-950/30 text-amber-200"
      : "border-emerald-400/40 bg-emerald-950/30 text-emerald-200";
  return (
    <motion.div
      layout
      animate={{ scale: value > 0 ? 1 : 0.985 }}
      className={`rounded-xl border p-3 flex items-center gap-3 ${palette}`}
    >
      <TrendingUp className="w-5 h-5 opacity-80" />
      <div className="flex flex-col">
        <div className="text-[10px] uppercase tracking-wide opacity-75">{label}</div>
        <div className="text-2xl font-bold tabular-nums">
          {prefix && unit === "$" ? "$" : ""}
          {value.toFixed(0)}
          {!(prefix && unit === "$") && <span className="text-xs opacity-70 ml-1">{unit}</span>}
        </div>
      </div>
    </motion.div>
  );
}
