"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { FactoryFloor } from "@/components/factory-floor/FactoryFloor";
import { OrderQueue } from "@/components/factory-floor/OrderQueue";
import { KPIPanel } from "@/components/kpi-dashboard/KPIPanel";
import { Card } from "@/components/ui/Card";
import type { RunSnapshot } from "@/lib/sim/dualRun";
import type { Scenario } from "@/lib/sim/types";
import { cn } from "@/lib/ui/cn";

interface Props {
  run: RunSnapshot;
  scenario: Scenario;
  title: string;
  subtitle?: string;
  isAi?: boolean;
}

export function RunPanel({ run, scenario, title, subtitle, isAi = false }: Props) {
  return (
    <Card className={cn("flex flex-col overflow-hidden h-full", isAi && "ring-1 ring-emerald-500/30")}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            {title}
            {run.finished && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded",
                  isAi ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-700/40 text-zinc-300",
                )}
              >
                <CheckCircle2 className="w-3 h-3" />
                done
              </motion.span>
            )}
          </div>
          {subtitle && <div className="text-[10px] text-zinc-500">{subtitle}</div>}
        </div>
        <div className="text-[11px] text-zinc-400 tabular-nums">
          t = {run.clock.toFixed(0)}m
          {run.finishedAt !== null && ` · finished at ${run.finishedAt.toFixed(0)}m`}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_220px] gap-2 p-3 flex-1 min-h-0">
        <div className="rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 min-h-[260px]">
          <FactoryFloor run={run} scenario={scenario} />
        </div>
        <OrderQueue run={run} scenario={scenario} />
      </div>
      <div className="px-3 pb-3">
        <KPIPanel run={run} isAi={isAi} />
      </div>
    </Card>
  );
}
