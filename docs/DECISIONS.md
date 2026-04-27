# Decisions

A log of design decisions, their rationale, and the original Q&A that
shaped them. New decisions should be appended chronologically.

## Original product Q&A

These choices were locked in via a clarifying conversation before any code
was written. They are still in force.

| Topic | Choice | Why |
|---|---|---|
| Production model | Parallel machines, sequence-dependent setup | Captures the core "batching saves time" insight without job-shop routing complexity. Demos cleanly in 60s. |
| Compare mode | Side-by-side, synchronized | Lets the prospect *see* the AI side finish first. Toggle modes lose that visceral moment. |
| AI engine | Both: deterministic heuristic + Claude (toggleable) | Heuristic is snappy and offline-capable for reliable demos. Claude adds the "thinking AI" wow with a streaming reasoning trace and proves real LLM value. |
| Stack | Next.js 16 + Tailwind + shadcn-ish + Framer Motion + **React Flow** + Recharts + Zustand | React Flow gives a visual, eventually-draggable factory graph. Framer Motion + Recharts for the visceral live KPI feel. Vercel-deployable in one click. |
| Interactivity | Full sandbox + 3 presets | Presets for fast setup, sandbox for "let me try with my numbers". Both matter. |
| KPIs front-and-center | Throughput, setup wasted, makespan, on-time, WIP, $ saved | The first three tell the story; the rest add credibility. |
| Theme | Industry-neutral (Red Widget / Blue Gadget / Green Gizmo) | Re-skinnable per prospect; doesn't tie us to one vertical. |

## Tech choices

### Next.js 16 (App Router, React 19, Turbopack)
Modern, ships fast on Vercel, server-side route for the Anthropic call so
the API key never reaches the browser. Turbopack default in dev.

### Claude **Opus 4.6** (model id `claude-opus-4-6`)
Picked over Opus 4.7 by the project owner. The route uses prompt caching
on the system prompt so repeat calls are cheap. SSE streaming so reasoning
appears live (this *is* the differentiator vs the heuristic).

### Discrete-event simulation, not fixed-tick
Machine state changes are sparse and durations are heterogeneous (a
12-minute setup vs a sub-second unit-output interval). Fixed-tick at 60Hz
wastes ~99% of ticks. DES advances directly to the next event, so 10,000
sim-minutes runs in milliseconds.

### Single-rAF dual-run
Per-engine timers will desync the two runs within a second. The whole point
of the demo is the synchronized clock, so both engines must be advanced by
the same `dtVirtual` from one `requestAnimationFrame`. No Web Workers — the
postMessage cost would defeat the lockstep.

### Zustand with subscribeWithSelector
Narrow re-renders matter when KPIs tick at 60fps. Components subscribe to
their slice; the rest doesn't re-render.

### React Flow (not raw SVG / Konva / Pixi)
Eventually we want users to drag machines, hover for tooltips, see edges as
product flow paths. React Flow is the lowest-friction way to get there.
Today the nodes are arranged on a grid; the layout primitive is in place
for later.

## Domain-model decisions

### Product is a first-class entity
Originally products were just string keys (`"A"`, `"B"`). After the first
iteration we promoted `Product` to its own type with `id, name, color,
baseUnitsPerHour`. This was prompted by realizing that items/hour is
**neither** a pure machine property nor a pure product property — it's an
interaction. A bottling line does 200 bottles/min for water but 80 for
honey; a complex part takes longer on every machine.

The clean simple formulation:
```
effectiveRate = product.baseUnitsPerHour * machine.speedFactor
```
- `baseUnitsPerHour` lives on the product (its inherent difficulty).
- `speedFactor` lives on the machine (1.0 = standard, 1.2 = 20% faster).

### Capability matrix
Real factories don't tool every machine for every product. We added
`Machine.capableProductIds: string[]` as a hard constraint enforced by
every scheduler. FIFO will let an order wait if no capable machine is idle.
The heuristic and Claude scheduler simply skip incapable assignments.

This matters for the AI demo: when products have specialist machines, the
AI's job-to-machine matching becomes non-trivial in a way FIFO can't keep
up with.

### Skipped (deliberately)

- **Sequence-dependent setup matrix** (A→B costs 20min but B→C costs 5min).
  Realistic but UX-heavy to edit. Single per-machine `setupTimeMinutes` is
  good enough for v1.
- **Yield / scrap %, MTBF/MTTR breakdowns, operator shifts.** All
  realistic, all defer-able. See `ROADMAP.md`.

## Open assumptions baked into v1

These are sensible defaults — change them in the scenario rather than in
code unless you genuinely want a new model.

1. **Cost model**: `costPerMinute` ($/min wasted to setup) and
   `latePenaltyPerMinute` ($/min past due) are per-scenario constants.
   Defaults: $2 / $5 (small), $2.50 / $8 (medium), $3 / $10 (large).
   Realistic interpretation: combined labor + machine + opportunity cost.
2. **Order arrival**: all orders known at `t=0`. Stochastic Poisson arrivals
   are scaffolded (`rng.ts` is seeded) but not yet used.
3. **Speed multipliers**: 1× / 10× / 60× / 300×. Default 60× (1 sim-minute
   per real second).
4. **Reasoning panel**: free-text streaming from Claude.
5. **Persistence**: ephemeral. No accounts, no DB, no shareable URLs yet.

## $ saved KPI — what it means

The `$ saved` headline is **per simulated batch of orders** (i.e. per
scenario run), not per day or per year. It is computed as:
```
fifo.totalCost - ai.totalCost
where totalCost = setupMinutes * costPerMinute + lateMinutes * latePenaltyPerMinute
```
For the small preset that's $240 saved per ~3-hour batch. To turn it into a
per-year number for a sales pitch, multiply by batches-per-day × workdays.
We deliberately don't editorialize this in the UI — it's the prospect's
cost structure to extrapolate. See ROADMAP for a possible "per shift /
per year" toggle.

## Testing approach

- `src/lib/sim/engine.test.ts` (Vitest) asserts:
  1. Both schedulers complete every preset.
  2. AI heuristic beats FIFO on **setup waste** in every preset.
  3. AI heuristic beats FIFO on **makespan** in every preset.
  4. Engine is deterministic across re-runs (same KPIs).
- `scripts/run-report.ts` is a headless diagnostic for tuning presets and
  schedulers. Run with `npx tsx scripts/run-report.ts`.
- No UI tests yet. Manual smoke is fine for the current scope.
