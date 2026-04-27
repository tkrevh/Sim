"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { RunSnapshot } from "@/lib/sim/dualRun";
import { productColor, type Scenario } from "@/lib/sim/types";

interface Props {
  run: RunSnapshot;
  scenario: Scenario;
}

export function OrderQueue({ run, scenario }: Props) {
  const pending = run.jobs.filter((j) => j.assignedMachineId === null && j.finishedAt === null);
  const inProgress = run.jobs.filter((j) => j.assignedMachineId !== null && j.finishedAt === null);
  const done = run.jobs.filter((j) => j.finishedAt !== null);

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      <Section title={`Queue · ${pending.length}`}>
        <AnimatePresence initial={false}>
          {pending.map((j) => (
            <motion.div
              key={j.id}
              layout
              initial={{ opacity: 0, x: -16, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, scale: 0.85 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md bg-zinc-900 border border-zinc-800"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: productColor(scenario.products, j.productType) }}
              />
              <span className="font-mono truncate">{j.id}</span>
              <span className="text-zinc-500">{j.productType}</span>
              <span className="text-zinc-400 ml-auto">{j.quantity}u</span>
            </motion.div>
          ))}
          {pending.length === 0 && (
            <motion.div
              key="empty-q"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-zinc-600 italic px-2 py-1"
            >
              empty
            </motion.div>
          )}
        </AnimatePresence>
      </Section>
      <Section title={`In progress · ${inProgress.length}`}>
        <AnimatePresence initial={false}>
          {inProgress.map((j) => (
            <motion.div
              key={j.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md bg-emerald-950/40 border border-emerald-900/60"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: productColor(scenario.products, j.productType) }}
              />
              <span className="font-mono truncate">{j.id}</span>
              <span className="text-zinc-400 ml-auto">
                {j.quantity - j.remaining}/{j.quantity}u
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </Section>
      <Section title={`Done · ${done.length}`}>
        <AnimatePresence initial={false}>
          {done.slice(-5).map((j) => (
            <motion.div
              key={j.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md bg-zinc-900/60 border border-zinc-800/60 text-zinc-500"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 opacity-60"
                style={{ background: productColor(scenario.products, j.productType) }}
              />
              <span className="font-mono truncate line-through">{j.id}</span>
              <span className="ml-auto">{(j.finishedAt ?? 0).toFixed(0)}m</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-h-0">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500 px-1">{title}</div>
      <div className="flex flex-col gap-1 overflow-y-auto pr-1" style={{ maxHeight: 200 }}>
        {children}
      </div>
    </div>
  );
}
