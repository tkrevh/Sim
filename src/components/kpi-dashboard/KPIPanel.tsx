"use client";

import { KPICard } from "./KPICard";
import type { RunSnapshot } from "@/lib/sim/dualRun";

interface Props {
  run: RunSnapshot;
  isAi?: boolean;
}

export function KPIPanel({ run, isAi = false }: Props) {
  const k = run.kpi;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
      <KPICard
        label="Throughput"
        value={k.throughputUnitsPerHour}
        format={(n) => n.toFixed(0)}
        unit="u/h"
        highlight={isAi ? "good" : "neutral"}
      />
      <KPICard
        label="Setup wasted"
        value={k.setupMinutesWasted}
        format={(n) => n.toFixed(0)}
        unit="min"
        highlight={isAi ? "good" : "bad"}
      />
      <KPICard
        label="Makespan"
        value={k.makespan}
        format={(n) => n.toFixed(0)}
        unit="min"
      />
      <KPICard
        label="On-time"
        value={k.onTimePct * 100}
        format={(n) => n.toFixed(0)}
        unit="%"
      />
      <KPICard
        label="WIP"
        value={k.wip}
        format={(n) => n.toFixed(0)}
      />
      <KPICard
        label="Done"
        value={k.jobsCompleted}
        format={(n) => n.toFixed(0)}
        unit={`/ ${k.jobsTotal}`}
      />
    </div>
  );
}
