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
- Completed [compat] stable model lookup error normalization with `PiModelRegistry.find(...)`.
- Completed [compat] Creo-facing facade exports from `pi-effect` root for the direct PI SDK imports tracked in `CREO_PI_API_SURFACE.md`.
- Validation: `bun run typecheck && bun run test && bun run build` passed on 2026-06-01; removed generated `dist/` afterward.
- Blocked decision: whether this `pi-effect` task should modify sibling `../creo` imports now, or leave Creo migration as downstream work.
- Next after that decision: [integration] add opt-in real-agent smoke tests.

## Active plan order

1. D/P1 [compat] Decide whether to migrate matching sibling `../creo` imports now or leave that migration downstream.
   1. `pi-effect` facade exports and compatibility coverage are complete.
   2. Touching `../creo` is cross-repository scope and needs explicit approval before editing.
2. [integration] Add opt-in real-agent smoke tests that require credentials.
   1. Do not run these from default `bun run test`.
   2. Add a dedicated script, for example `bun run test:real-agent`.
   3. Gate the suite with `PI_EFFECT_REAL_AGENT=1`; otherwise skip every test.
   4. Use actual public PI SDK wiring: `AuthStorage`, `ModelRegistry`, `createAgentSession`, `PiPrompt.run`, and `PiEventStream.fromSession`.
   5. Support API-key mode through environment variables, for example:
      1. `PI_EFFECT_REAL_AGENT=1`
      2. `PI_EFFECT_PROVIDER=openai`
      3. `PI_EFFECT_MODEL=gpt-4.1-mini` or another cheap/fast model available to the user.
      4. `OPENAI_API_KEY=...`
   6. Support PI OAuth/subscription mode by allowing a local agent directory override, for example `PI_EFFECT_AGENT_DIR=/path/to/.pi/agent`.
   7. Never commit credentials, generated auth files, or real-agent artifacts.
   8. Prefer temporary directories for session state unless explicitly reusing a user-provided PI agent dir.
   9. Cover at least one successful prompt against a real model.
      1. Keep the prompt deterministic and cheap, such as asking for a short exact string or JSON object.
      2. Assert that `PiPrompt.run(...)` resolves.
      3. Assert the real session records assistant output or emits an `agent_end` event.
   10. Cover event-stream behavior during a real prompt.
      1. Subscribe through `PiEventStream.fromSession(session)` before running the prompt.
      2. Collect a small bounded set of lifecycle events or wait for `agent_end`.
      3. Assert ordering only for events that the public SDK contract makes stable.
   11. Cover interruption against a real active session if it can be made reliable.
      1. Start a prompt likely to stream long enough to abort.
      2. Interrupt the Effect fiber or abort the run promise signal.
      3. Assert `session.abort()` behavior leaves the session idle or emits an aborted/end state.
      4. Avoid brittle text-quality assertions for abort behavior.
3. [docs] Document the real-agent test workflow.
   1. Add README instructions for `bun run test:real-agent`.
   2. Document every supported environment variable.
   3. State that default tests never require credentials.
   4. Tell contributors not to paste API keys into chat, commits, issues, or fixtures.
   5. Explain the two credential paths:
      1. API key from provider environment variables such as `OPENAI_API_KEY`.
      2. Existing PI OAuth/subscription credentials through `PI_EFFECT_AGENT_DIR`.
   6. Note expected cost/network behavior and recommend cheap models for local smoke tests.
4. [evals] Defer full evals unless behavior quality becomes a package goal.
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

- D/P1 [compat] Decide whether to migrate sibling `../creo` imports now.
  - `pi-effect` facade exports and compatibility tests are in place.
  - Cross-repository edits need explicit approval.
- [integration] Add opt-in real-agent smoke tests.
  - The suite should prove a real configured PI Agent can run through the wrapper.
  - The suite should be skipped unless `PI_EFFECT_REAL_AGENT=1` is set.
  - Credentials should be supplied only through local environment or local PI auth storage.
- [docs] Document credential-dependent testing clearly.
  - Include API-key and OAuth/subscription paths.
  - Include cost and network caveats.
  - Keep examples copy-pasteable without embedding secrets.

## P2 — later / optional

- [evals] Add real behavioral evals only if `pi-effect` starts promising task-quality behavior rather than just adapter compatibility.
  - Use the `../creo` eval style as the template: env-gated, dedicated script, artifact output, and transcript/event inspection.
