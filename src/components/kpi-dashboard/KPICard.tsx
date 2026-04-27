"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/ui/cn";

interface Props {
  label: string;
  value: number;
  format?: (n: number) => string;
  unit?: string;
  highlight?: "good" | "bad" | "neutral";
  className?: string;
}

const highlightStyles = {
  good: "border-emerald-500/40 bg-emerald-950/30 text-emerald-300",
  bad: "border-rose-500/40 bg-rose-950/30 text-rose-300",
  neutral: "border-zinc-700 bg-zinc-900/60 text-zinc-100",
};

export function KPICard({
  label,
  value,
  format = (n) => n.toFixed(1),
  unit,
  highlight = "neutral",
  className,
}: Props) {
  const mv = useMotionValue(value);
  const display = useTransform(mv, (v) => format(v));

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.4, ease: "easeOut" });
    return controls.stop;
  }, [value, mv]);

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 flex flex-col gap-0.5",
        highlightStyles[highlight],
        className,
      )}
    >
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="flex items-baseline gap-1">
        <motion.span className="text-xl font-semibold tabular-nums">{display}</motion.span>
        {unit && <span className="text-[10px] opacity-60">{unit}</span>}
      </div>
    </div>
  );
}
