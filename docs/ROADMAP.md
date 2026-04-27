# Roadmap

Status of features and a triaged backlog of realism / polish ideas. Items
are not commitments — pull from this list when you have a concrete user
need.

## Done (v1)

- Discrete-event simulation engine with synchronized dual-run.
- Three schedulers: FIFO, AI heuristic, Claude-driven.
- Three presets: Small (3 lines, 8 orders), Medium (5/16), Large (8/30).
- React Flow factory floor with custom Framer-Motion machine nodes
  (idle/setup/producing colors and pulse).
- Animated order queue (queue / in-progress / done) with `AnimatePresence`.
- Six-tile KPI panel per run with motion count-up tweens.
- Recharts time series for setup-waste and throughput.
- Savings banner (setup minutes saved, makespan delta, $ saved).
- Confetti when AI finishes first.
- Sandbox side-sheet: products (id, name, color, base u/h), machines (name,
  current product, setup time, speedFactor, capability chips), orders.
- Streaming `/api/optimize` route hitting Claude Opus 4.6 with cached
  system prompt.
- Live "Claude reasoning" panel that streams text as the model thinks.
- Vitest regression: AI must beat FIFO on makespan and setup in every preset.
- Headless scheduler diagnostic (`scripts/run-report.ts`).

## Open questions

These are calls the project owner has not yet made. Decide when relevant.

1. **$ saved framing.** Currently per-scenario. Should we surface
   per-shift, per-day, or per-year extrapolations? UI toggle or static
   multiplier?
2. **Heuristic strength.** The current heuristic is "same-product → biggest
   cluster on fastest machine". A real LPT-on-effective-rate planner would
   close some of the remaining gap to optimal. Do we want the heuristic to
   be *almost* as good as Claude (so Claude's win is reasoning quality,
   not raw makespan)?
3. **Persistence.** Should sandbox scenarios be saveable / shareable
   (URL-encoded? local storage? Supabase?). v1 is ephemeral.
4. **Embeddable widget.** Could the simulator embed in a marketing page as
   an iframe-friendly widget? Today the page assumes full viewport.

## Realism backlog (cheap → expensive)

1. **Sequence-dependent setup matrix.** Replace `setupTimeMinutes` with
   `setupMinutes(fromProduct, toProduct)`. Realistic, but the sandbox UI
   becomes a 5×5 matrix per machine — heavy. Could ship as JSON-only first.
2. **Yield / scrap %.** Per-machine defect rate; produced units are
   reduced. Lets the AI optimize for quality. Add to KPI panel.
3. **Operator shifts / availability.** Machines off after 8h or only
   between 06:00 and 22:00. Strong storytelling ("AI plans around the
   night shift"). Needs a wall-clock concept the sim doesn't have today.
4. **MTBF + MTTR random breakdowns.** Adds chaos AI handles better than
   FIFO. Cool, but harder to make deterministic for sales demos. Use the
   already-seeded `mulberry32` RNG.
5. **Per-product machine performance overrides.** A `productSpeedOverrides`
   map on the machine for the cases where the simple `speedFactor` model
   isn't expressive enough (e.g. one machine is great at A but mediocre
   at B). Adds UI complexity.
6. **Streaming order arrivals.** Orders arriving during the run instead of
   all at `t=0`. Engine already supports `arrivedAt > 0`; need to expose
   in the sandbox UI.
7. **Energy / labor cost modeling.** Right now `$ saved` collapses
   everything into `costPerMinute`. Splitting into machine $/h, operator
   $/h, energy $/kWh would let prospects plug in their numbers.
8. **Customer / priority on orders.** VIP orders should preempt; SLA tiers
   could affect the late-penalty rate per order.
9. **Routings.** True job-shop: a product visits Machine A, then B, then
   C. Departs from the parallel-machine model entirely. Big change — only
   if a real demo prospect needs it.

## Polish backlog

- Drag-to-rearrange machines on the React Flow canvas.
- Per-machine utilization gauge in the KPI panel (data is already there in
  `kpi.perMachineUtilization`, just unused).
- Animated tokens flying from the order queue to the assigned machine on
  dispatch (idea was in the original architecture, deferred).
- "Replay" scrubber for the finished run.
- Shareable URL of the current scenario state.
- Light theme (currently dark-only).
- A11y pass on the sandbox forms.
- One UI test covering the golden-path render.

## Likely-bad ideas (note for future)

- Web Workers per engine. Tried in design; introduces postMessage latency
  and breaks lockstep. Don't.
- Re-deriving KPIs from the in-store event log. Tried in design; expensive
  at high speeds. Keep KPI math inside the engine.
- Putting scenario data in the Claude system prompt. Invalidates the
  prompt cache. Always send it in the user message.
