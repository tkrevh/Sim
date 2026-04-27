"use client";

import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DualRunSnapshot } from "@/lib/sim/dualRun";

interface Sample {
  t: number;
  fifoSetup: number;
  aiSetup: number;
  fifoThroughput: number;
  aiThroughput: number;
}

interface Props {
  snapshot: DualRunSnapshot;
}

const MAX_SAMPLES = 240;

export function KPITimeSeries({ snapshot }: Props) {
  const [series, setSeries] = useState<Sample[]>([]);
  const lastSampledClock = useRef(-Infinity);

  useEffect(() => {
    const t = Math.max(snapshot.fifo.clock, snapshot.ai.clock);
    if (t === 0 && series.length > 0) {
      setSeries([]);
      lastSampledClock.current = -Infinity;
      return;
    }
    if (t - lastSampledClock.current < 5) return;
    lastSampledClock.current = t;
    const sample: Sample = {
      t: Math.round(t),
      fifoSetup: snapshot.fifo.kpi.setupMinutesWasted,
      aiSetup: snapshot.ai.kpi.setupMinutesWasted,
      fifoThroughput: snapshot.fifo.kpi.throughputUnitsPerHour,
      aiThroughput: snapshot.ai.kpi.throughputUnitsPerHour,
    };
    setSeries((prev) => {
      const next = [...prev, sample];
      if (next.length > MAX_SAMPLES) next.splice(0, next.length - MAX_SAMPLES);
      return next;
    });
  }, [snapshot, series.length]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Chart
        title="Setup minutes wasted"
        data={series}
        keys={[
          { key: "fifoSetup", label: "FIFO", color: "#a1a1aa" },
          { key: "aiSetup", label: "AI", color: "#10b981" },
        ]}
      />
      <Chart
        title="Throughput (units/hour)"
        data={series}
        keys={[
          { key: "fifoThroughput", label: "FIFO", color: "#a1a1aa" },
          { key: "aiThroughput", label: "AI", color: "#10b981" },
        ]}
      />
    </div>
  );
}

function Chart({
  title,
  data,
  keys,
}: {
  title: string;
  data: Sample[];
  keys: Array<{ key: keyof Sample; label: string; color: string }>;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-2">{title}</div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: -16, right: 8, top: 4, bottom: 0 }}>
            <defs>
              {keys.map((k) => (
                <linearGradient key={String(k.key)} id={`g-${String(k.key)}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={k.color} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={k.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis dataKey="t" stroke="#52525b" fontSize={10} tickFormatter={(v) => `${v}m`} />
            <YAxis stroke="#52525b" fontSize={10} width={40} />
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid #3f3f46",
                fontSize: 12,
              }}
              labelStyle={{ color: "#a1a1aa" }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {keys.map((k) => (
              <Area
                key={String(k.key)}
                type="monotone"
                dataKey={k.key as string}
                name={k.label}
                stroke={k.color}
                fill={`url(#g-${String(k.key)})`}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
