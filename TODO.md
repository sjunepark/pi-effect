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

## Active plan order

1. [compat] Add real public-SDK prompt compatibility coverage for preflight rejection.
   1. Keep this in the default test suite because it should not require credentials or live model calls.
   2. Use `createAgentSession(...)` with in-memory `SessionManager` and `SettingsManager`.
   3. Configure the session so prompt preflight fails deterministically, such as no selected model or no usable auth for the selected model.
   4. Call `PiPrompt.run(session, "hello", { preflightResult })` rather than calling `session.prompt(...)` directly.
   5. Assert the wrapper fails with `PiPromptRejectedError`.
   6. Assert the caller-provided `preflightResult(false)` hook is invoked.
   7. Assert the original PI rejection cause is preserved on the wrapper error when available.
   8. Dispose the real session in `finally` or through `PiSessionService.acquireFrom(...)`.
2. [compat] Add file-backed settings persistence failure coverage.
   1. Use temporary directories or files only.
   2. Exercise public `SettingsManager` behavior, not private internals.
   3. Assert `PiSettings.flush(...)` / `drainErrors(...)` surfaces recorded persistence failures as `PiSettingsPersistenceError`.
   4. Preserve the original SDK error as the wrapper cause.
3. [compat] Add stable model lookup error normalization.
   1. Use public `ModelRegistry` behavior from the pinned PI SDK.
   2. Cover a deterministic missing-model or unavailable-model path.
   3. Normalize through a typed wrapper error only where callers can act on it.
   4. Preserve unknown model failures through `PiUnknownError` or the relevant conservative fallback.
4. [compat] Expose the Creo PI API surface through `pi-effect` one area at a time.
   1. Use `CREO_PI_API_SURFACE.md` as the source checklist.
   2. Start with facade exports for the direct Creo imports, then add Effect-native helpers where they reduce Creo boilerplate.
   3. For each API area, add compatibility tests that import from `pi-effect` only and prove behavior against the pinned PI SDK.
   4. Migrate the matching Creo imports after the `pi-effect` surface is covered.
   5. Keep the pinned PI SDK version unchanged unless the task is explicitly an upgrade.
5. [integration] Add opt-in real-agent smoke tests that require credentials.
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
6. [docs] Document the real-agent test workflow.
   1. Add README instructions for `bun run test:real-agent`.
   2. Document every supported environment variable.
   3. State that default tests never require credentials.
   4. Tell contributors not to paste API keys into chat, commits, issues, or fixtures.
   5. Explain the two credential paths:
      1. API key from provider environment variables such as `OPENAI_API_KEY`.
      2. Existing PI OAuth/subscription credentials through `PI_EFFECT_AGENT_DIR`.
   6. Note expected cost/network behavior and recommend cheap models for local smoke tests.
7. [evals] Defer full evals unless behavior quality becomes a package goal.
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

- [compat] Add default real-SDK prompt preflight rejection coverage.
  - This closes the current gap where key `PiPrompt.run` behavior is only exercised with `FakePiSession`.
  - The test must run without API keys or OAuth credentials.
  - The test should pin public `AgentSession.prompt(...)` preflight behavior through the wrapper, not through PI private internals.

## P1 — compatibility quality bar

- [compat] Add file-backed settings persistence failure coverage.
  - Use temporary directories or files to avoid touching user PI state.
  - Exercise public `SettingsManager` behavior and assert `PiSettings` preserves the original failure cause.
- [compat] Add model lookup error normalization.
  - Pin deterministic public `ModelRegistry` missing-model behavior before exposing a wrapper contract.
  - Keep the classifier conservative; unknown model failures should preserve causes through the fallback path.
- [compat] Expose the Creo PI API surface through `pi-effect`.
  - Use `CREO_PI_API_SURFACE.md` as the migration checklist.
  - Cover auth, model registry, session/settings managers, resource loading, extension runtime, generic tools, builtin tool factories, and operation/result types.
  - Add compatibility tests that import only from `pi-effect` before changing Creo imports.
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
