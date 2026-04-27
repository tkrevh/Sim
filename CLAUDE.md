# CLAUDE.md

Conventions and quick-reference for any Claude Code (or general AI) session
working on this repo.

## What this is
A sales-demo web app that simulates a factory and shows AI-driven scheduling
beating naive FIFO order processing on a synchronized side-by-side run.
Greenfield Next.js 16 + TypeScript. See `docs/ARCHITECTURE.md` for module map.

## Stack (locked decisions, see `docs/DECISIONS.md` for rationale)
- Next.js 16 App Router · React 19 · Turbopack · TypeScript strict
- Tailwind CSS 4 · custom shadcn-style components in `src/components/ui/`
- React Flow (`@xyflow/react`) for the factory floor canvas
- Framer Motion for state-change animations and KPI count-ups
- Recharts for time-series KPIs
- Zustand (`subscribeWithSelector`) for state
- `@anthropic-ai/sdk` server-side, model **`claude-opus-4-6`**, with prompt
  caching on the system prompt and SSE-style streaming

## Working on this repo

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # vitest run (engine correctness + AI-beats-FIFO regression)
npm run build        # production build (also type-checks)
npx tsx scripts/run-report.ts   # headless scheduler diagnostic
```

`.env.local` is needed only for the "Ask Claude to plan" button:
`ANTHROPIC_API_KEY=sk-ant-...` (see `.env.example`).

## Conventions

- All sim logic is **pure** and lives in `src/lib/sim/`. The engine emits
  events; UI subscribes via the Zustand store. Never put React imports in
  `src/lib/sim/`.
- Schedulers implement the `Scheduler` interface in
  `src/lib/sim/schedulers/Scheduler.ts`. Add a new strategy by writing a
  `createXxxScheduler()` factory and wiring it in `dualRun.ts`.
- Domain types live in `src/lib/sim/types.ts` and are the single source of
  truth. `Product`, `Machine`, `Order`, `Job`, `Scenario`, `SimEvent`,
  `KPISnapshot`. Helpers `canProduce`, `effectiveUnitsPerHour`, `findProduct`,
  `productColor` live there too.
- New presets go in `src/lib/sim/presets/index.ts` and must be added to the
  `PRESETS` array.
- Anything user-editable must be reflected in `ScenarioBuilder.tsx`.
- After changing the engine, schedulers, or presets, run
  `npx tsx scripts/run-report.ts` to confirm the AI still meaningfully
  beats FIFO across all three presets. The Vitest test
  (`src/lib/sim/engine.test.ts`) enforces this as a regression.

## Don'ts

- Don't introduce per-engine timers — both runs must be advanced from the
  single `requestAnimationFrame` in `DualRunController`. Anything else
  causes clock drift between the side-by-side runs.
- Don't put scenario data in the system prompt for the Claude call — it
  invalidates the prompt cache. Keep machines/products/orders strictly in
  the user message.
- Don't model unimplemented domain features in the types. If you want to
  prototype shifts or breakdowns, branch off — see `docs/ROADMAP.md`.

## Where to start a new task

- Adding a sim feature → start in `src/lib/sim/types.ts`, then engine /
  schedulers, then presets, then UI components, then tests.
- Pure UI/visual change → start in the relevant component under
  `src/components/`.
- Tweaking the demo numbers → edit `src/lib/sim/presets/index.ts` and run
  the diagnostic script.
- Improving the Claude plan quality → start in
  `src/app/api/optimize/prompt.ts`.

## Repo docs index

- `README.md` — quickstart and feature list.
- `docs/ARCHITECTURE.md` — module map, data flow, engine internals.
- `docs/DECISIONS.md` — what was decided and why; the original product Q&A.
- `docs/ROADMAP.md` — what's done, open questions, realism candidates.
