"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { MachineNode } from "./MachineNode";
import type { RunSnapshot } from "@/lib/sim/dualRun";
import {
  effectiveUnitsPerHour,
  findProduct,
  productColor,
  type Scenario,
} from "@/lib/sim/types";

const nodeTypes: NodeTypes = { machine: MachineNode };

interface Props {
  run: RunSnapshot;
  scenario: Scenario;
}

export function FactoryFloor({ run, scenario }: Props) {
  const nodes = useMemo<Node[]>(() => {
    const cols = Math.min(3, run.machines.length);
    return run.machines.map((m, i) => {
      const job = run.jobs.find((j) => j.id === m.currentJobId);
      const color = productColor(scenario.products, m.currentProduct);
      const product = m.currentProduct
        ? findProduct(scenario.products, m.currentProduct)
        : undefined;
      const effectiveRate =
        product && m.state !== "idle" ? effectiveUnitsPerHour(m, product) : null;
      const remainingPct =
        m.state === "producing" && job
          ? 100 - (job.remaining / job.quantity) * 100
          : m.state === "setup"
            ? 50
            : 0;
      const capableProducts = m.capableProductIds
        .map((id) => findProduct(scenario.products, id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p));
      return {
        id: m.id,
        type: "machine",
        position: { x: 60 + (i % cols) * 250, y: 30 + Math.floor(i / cols) * 170 },
        data: {
          machine: m,
          productColor: color,
          capableProducts,
          effectiveRate,
          jobLabel: job ? `${job.productType} · ${job.remaining}/${job.quantity}u` : undefined,
          remainingPct,
        },
        draggable: false,
        selectable: false,
      };
    });
  }, [run, scenario]);

  const edges = useMemo<Edge[]>(() => [], []);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
      >
        <Background gap={20} color="#27272a" />
      </ReactFlow>
    </div>
  );
}
