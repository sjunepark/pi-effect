# TODO

Scratchpad and triage index.

- Delete items when they are done, rejected, or moved elsewhere.
- Keep P0 and P1 focused on the next compatibility hardening slice for `pi-effect`.
- Use worktree tags (`[compat]`, `[integration]`, `[evals]`, `[docs]`) so priority stays primary while work can split cleanly.
- `D/Px` means a decision is needed before the item can be implemented at that priority.
- Current implemented status and usage live in [`README.md`](./README.md).
- Durable adapter design rules live in [`WRAPPING_RULES.md`](./WRAPPING_RULES.md).

## Project direction

This section keeps the actionable planning context without duplicating status docs.

- Wrap public `@earendil-works/pi-coding-agent` APIs first. Do not wrap `@earendil-works/pi-agent-core` or `@earendil-works/pi-ai` directly unless a concrete public SDK gap requires it.
- Compatibility comes before broader API surface. Every supported wrapper behavior should have public-SDK compatibility coverage; import-surface sentinels document availability but do not imply full wrapper support.
- Keep wrappers shallow, Effect-native, and generic. Creo workflow concepts, app auth policy, run records, Context Store behavior, and UI copy belong downstream.
- Future expansion order: deepen prompt/settings/model compatibility, then add auth/model/resource-loader helpers only when repeated downstream usage proves the need.
- Real-model coverage stays opt-in, credential-gated, and outside the default test suite.

## Priority model

- **P0 — compatibility blocker:** wrapper behavior can diverge from the pinned public PI SDK contract.
- **P1 — compatibility quality bar:** not individually blocking, but should be done before broadening the wrapper surface.
- **P2 — later / optional:** useful after the core adapter contract is stable.

## Current status

- Completed [compat] real public-SDK prompt preflight rejection coverage in `tests/compatibility/session.compat.test.ts`.
- Completed [compat] file-backed settings persistence failure coverage in `tests/compatibility/settings.compat.test.ts`.
- Completed [compat] stable model lookup error normalization with `ModelRegistryEffect.find(...)`.
- Completed [compat] Creo-facing facade exports from `pi-effect` root for the direct PI SDK imports tracked in `CREO_PI_API_SURFACE.md`.
- Completed [docs] PI SDK-shaped Effect wrapper naming: `createAgentSessionEffect`, `AgentSessionEffect`, `defineToolEffect`, `SettingsManagerEffect`, and `ModelRegistryEffect`.
- Completed [integration] opt-in real-agent smoke coverage in `tests/integration/real-agent.test.ts`; it is excluded from default `bun run test` and runs through `bun run test:real-agent` only.
- Completed [docs] credential-dependent real-agent test workflow in `README.md`.
- Deferred real active-session interruption smoke coverage because a provider-speed-dependent abort prompt would be brittle; unit coverage still verifies `AgentSessionEffect.prompt(...)` calls `session.abort()` on Effect interruption.
- Validation: `bun run typecheck`, `bun run test`, `bun run test:real-agent` without `PI_EFFECT_REAL_AGENT=1` (skipped), and `bun run build` passed on 2026-06-01; removed generated `dist/` afterward.
- Creo import migration is deferred downstream; edit sibling `../creo` after the needed `pi-effect` repo work is complete.
- Next: no P0/P1 work; [evals] remain deferred P2 only.

## Active plan order

1. [evals] Defer full evals unless behavior quality becomes a package goal.
   1. Compatibility tests should answer whether `pi-effect` still matches public PI SDK behavior.
   2. Evals should answer whether the agent performs user tasks well.
   3. This package currently needs compatibility and smoke coverage more than behavioral evals.
   4. If evals are added later, follow the `../creo` pattern:
      1. Keep them opt-in through an environment gate.
      2. Use a dedicated package script.
      3. Write artifacts under `.tmp/...`.
      4. Inspect transcripts/events instead of relying only on final text.
      5. Keep normal unit and compatibility tests independent of live providers.

## P0 — compatibility blockers

- None.

## P1 — compatibility quality bar

- None.

## P2 — later / optional

- [evals] Add real behavioral evals only if `pi-effect` starts promising task-quality behavior rather than just adapter compatibility.
  - Use the `../creo` eval style as the template: env-gated, dedicated script, artifact output, and transcript/event inspection.
