# Production Optimizer · FIFO vs AI

A live, side-by-side simulation that shows how AI-driven scheduling beats naive
FIFO order processing on a real factory floor. Built as a sales-demo for
manufacturers who lose hours to unnecessary changeovers.

Two simulations run on a synchronized virtual clock:

- **FIFO baseline** — orders processed in arrival order, regardless of which
  product each machine is currently set up for.
- **AI-optimized** — a deterministic heuristic (batch by product, EDD tiebreak,
  bottleneck-aware) by default, or a real schedule from Claude (Opus 4.6) on
  demand.

KPIs tick up live: throughput, setup minutes wasted, makespan, on-time %, WIP,
$ saved.

## Run it

```bash
npm install
cp .env.example .env.local   # optional, only needed for the Ask Claude button
npm run dev
```

Open <http://localhost:3000>.

To enable the "Ask Claude to plan" button, fill in your key in `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

The heuristic AI run works with no API key.

## Tech

- Next.js 16 (App Router, Turbopack, React 19), TypeScript
- Tailwind CSS 4, custom shadcn-ish components
- React Flow (@xyflow/react) for the factory floor
- Framer Motion for animations
- Recharts for time-series KPIs
- Zustand for state
- @anthropic-ai/sdk with prompt caching + streaming

## Tests

```bash
npm test
```

The engine test asserts that the heuristic beats FIFO on **both** setup waste
and makespan across all three preset scenarios — and that the engine is
deterministic across re-runs.

## Headless diagnostic

Confirm scheduler quality without spinning up the UI:

```bash
npx tsx scripts/run-report.ts
```

Sample output:

```
=== Small factory (3 machines, 8 orders) ===
Makespan:    260 → 225  (35 min saved)
Setup:       120 → 0    (120 min saved)
$ saved:                $240

=== Medium factory (5 machines, 16 orders) ===
Makespan:    454 → 420  (34 min saved)
Setup:       410 → 70   (340 min saved)
$ saved:                $1703

=== Large factory (8 machines, 30 orders) ===
Makespan:    554 → 496  (58 min saved)
Setup:       730 → 170  (560 min saved)
$ saved:                $4101
```

## Architecture

- `src/lib/sim/engine.ts` — discrete-event simulation core (min-heap, virtual
  clock, event emit).
- `src/lib/sim/dualRun.ts` — single `requestAnimationFrame` advances both
  engines in lockstep.
- `src/lib/sim/schedulers/` — `fifo`, `aiHeuristic`, `aiClaude` all implement
  the same `Scheduler` interface.
- `src/app/api/optimize/route.ts` — Claude streaming endpoint with cached
  system prompt; returns reasoning text followed by a fenced JSON plan.
- `src/store/simulationStore.ts` — Zustand store; the page subscribes for
  narrow re-renders.
- `src/components/factory-floor/MachineNode.tsx` — React Flow custom node with
  Framer Motion pulses for setup and producing states.

## Demo flow

1. Pick a preset (Small / Medium / Large).
2. Hit **Play**. Both factories animate at 60× by default.
3. Watch the AI side finish first; confetti fires.
4. Hit **Sandbox** to edit products (id, name, color, base u/h), machines
   (speedFactor + capability chips), and orders.
5. Hit **Ask Claude to plan** to replace the heuristic with a real LLM-built
   schedule, complete with a streaming reasoning panel.

## Project docs

For anyone (or any AI session) picking this up cold:

- [`CLAUDE.md`](./CLAUDE.md) — conventions and quick reference for AI sessions.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — module map, data flow,
  engine internals.
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — why each major choice was made;
  the original product Q&A.
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — what's done, open questions, and
  a triaged backlog of realism enhancements.
