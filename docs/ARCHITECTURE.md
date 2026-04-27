# Architecture

A discrete-event simulation of a parallel-machine factory, run side-by-side
under two different schedulers (FIFO baseline vs AI-optimized) on a single
synchronized virtual clock.

## High-level flow

```
ScenarioBuilder ─┐
PresetPicker ────┴──> simulationStore (Zustand)
                              │
                              ▼
                    DualRunController
                  ┌────────────┴────────────┐
                  ▼                         ▼
         SimEngine (FIFO)           SimEngine (AI)
            │      ▲                    │      ▲
            ▼      │                    ▼      │
      MinHeap<events>             MinHeap<events>
            │                            │
            └──────► event listener ◄────┘
                          │
                          ▼
                  Zustand snapshot
                          │
            ┌──────┬──────┴──────┬──────┐
            ▼      ▼             ▼      ▼
       FactoryFloor  OrderQueue  KPIPanel  KPITimeSeries
       (React Flow + Framer)     (Recharts + motion)
```

## Module map

```
src/lib/sim/                      # pure simulation, no React
  types.ts                        # Product, Machine, Order, Job, Scenario,
                                  # SimEvent, KPISnapshot + helpers
                                  # (canProduce, effectiveUnitsPerHour,
                                  #  findProduct, productColor)
  eventQueue.ts                   # MinHeap + InternalEvent
  rng.ts                          # mulberry32 (seeded; not yet used,
                                  # reserved for stochastic arrivals)
  engine.ts                       # SimEngine: discrete-event loop, advances
                                  # the virtual clock to the next event,
                                  # processes ORDER_ARRIVED / DISPATCH /
                                  # SETUP_FINISHED / JOB_FINISHED, emits
                                  # SimEvents to subscribers, computes KPI
  dualRun.ts                      # DualRunController: owns both engines,
                                  # one rAF loop advances both with the same
                                  # dtVirtual, fans out a DualRunSnapshot
  kpi.ts                          # (currently empty – KPI math lives inline
                                  #  in SimEngine.snapshotKPI)
  schedulers/
    Scheduler.ts                  # interface { onTick(ctx), seedPlan? }
    fifo.ts                       # earliest-arrived → first capable idle
    aiHeuristic.ts                # same-product preference (zero changeover),
                                  # then biggest-pending-cluster, EDD tiebreak,
                                  # processed in machine-speed-desc order
    aiClaude.ts                   # consumes a seeded plan from the API,
                                  # falls back to the heuristic on parse
                                  # error or capability violation
  presets/index.ts                # SMALL / MEDIUM / LARGE Scenarios

src/store/
  simulationStore.ts              # Zustand store wrapping a DualRunController

src/app/
  layout.tsx                      # root layout (dark, Geist)
  page.tsx                        # main dashboard, "Ask Claude" handler,
                                  # confetti on AI win
  globals.css                     # Tailwind + a few React Flow tweaks
  api/optimize/
    prompt.ts                     # cached system prompt
    route.ts                      # POST /api/optimize, streams Claude

src/components/
  factory-floor/
    FactoryFloor.tsx              # React Flow canvas, derives nodes from run
    MachineNode.tsx               # custom node, Framer pulse + glow
    OrderQueue.tsx                # animated queue / in-progress / done lists
  kpi-dashboard/
    KPICard.tsx                   # single tile with motion count-up
    KPIPanel.tsx                  # 6-tile panel per run
    KPITimeSeries.tsx             # Recharts area charts (setup, throughput)
  ai/
    ReasoningStream.tsx           # live-streamed Claude reasoning panel
  scenario/
    ScenarioBuilder.tsx           # side-sheet for products + machines + orders
  chrome/
    TopBar.tsx                    # preset picker, play/pause, speed, Ask Claude
    RunPanel.tsx                  # one column of the side-by-side
    SavingsBanner.tsx             # big numbers: setup saved, faster, $ saved
  ui/
    Button.tsx, Card.tsx          # tiny shadcn-style primitives

scripts/
  run-report.ts                   # `npx tsx scripts/run-report.ts` —
                                  # headless scheduler benchmark
```

## Domain model

```ts
Product { id, name, color, baseUnitsPerHour }
Machine { id, name, setupTimeMinutes, speedFactor, capableProductIds[],
          currentProduct, state, currentJobId, ...counters }
Order   { id, productType, quantity, arrivedAt, dueAt }
Job     { id, orderId, productType, quantity, remaining, dueAt,
          assignedMachineId, startedAt, finishedAt }
Scenario { id, name, products[], machines[], orders[],
           costPerMinute, latePenaltyPerMinute }
```

Effective rate (units/hour) when machine `m` runs product `p`:
```
effectiveUnitsPerHour(m, p) = p.baseUnitsPerHour * m.speedFactor
```

Capability is a hard constraint enforced by every scheduler:
`canProduce(m, productId)` returns true iff `productId` is in
`m.capableProductIds`. FIFO will let a job wait if no capable machine is
idle; the heuristic and Claude scheduler simply skip incapable assignments.

## Engine semantics

- **Discrete-event**, not fixed-tick. The engine maintains a min-heap of
  internal events keyed by virtual minutes. `step()` pops the earliest event,
  sets `clock = event.t`, processes it, and pushes follow-ups
  (`SETUP_FINISHED`, `JOB_FINISHED`).
- `advanceBy(dtMinutes)` processes all events whose time is within
  `[clock, clock+dt]`. The `DualRunController` calls this on each
  `requestAnimationFrame`, with `dtVirtual = (rAF_dt_ms / 1000) * speedMultiplier`.
- `runToCompletion(maxMinutes)` is the non-realtime variant used by the
  diagnostic script and tests.
- A `SimEvent[]` buffer is flushed to subscribers at the end of each
  `advanceBy` call, so React renders are bounded to one per frame.
- Setup time is incurred whenever a machine switches to a different product
  (or starts cold). Setup uses the machine's `setupTimeMinutes` regardless
  of from/to product (sequence-independent for now — see ROADMAP).

## Synchronized dual-run

`DualRunController` owns two `SimEngine` instances. A single
`requestAnimationFrame` loop computes one `dtVirtual` per frame and feeds
the same value to both engines, guaranteeing lockstep. Engine event buffers
are drained into a `DualRunSnapshot` once per frame. The store fans the
snapshot out via Zustand's `subscribeWithSelector` middleware, so each
component re-renders only when its slice changes.

## Claude integration

- `app/api/optimize/route.ts` is a Next.js Node route (not Edge — the SDK
  currently expects Node).
- Request: `{ products[], machines[], orders[], now }`. Capability and
  speedFactor are forwarded so Claude can reason about them.
- The system prompt (`prompt.ts`) is sent with `cache_control:
  { type: 'ephemeral' }` so subsequent requests re-use it.
- Claude streams `<reasoning>...</reasoning>` followed by a fenced JSON
  block with `{ assignments: [{ machineId, orderId, reasoning }] }`.
- The UI streams the reasoning into `ReasoningStream`. On stream close,
  `parsePlan` extracts the JSON and calls
  `controller.setAiMode("claude", plan)` which re-creates the AI engine
  using `aiClaudeScheduler`. FIFO is left untouched so the comparison is
  apples-to-apples.
- Any parse failure or 5xx silently falls back to the heuristic.

## Determinism

The engine is fully deterministic given the same scenario and scheduler
(no `Math.random` in either FIFO or the heuristic). The Vitest suite
asserts this. Stochastic features (random arrivals, breakdowns) would have
to use the seeded `mulberry32` RNG to preserve replay.
