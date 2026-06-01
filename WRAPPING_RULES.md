# PI SDK Wrapping Rules

This file records durable design rules for expanding `pi-effect` around the public `@earendil-works/pi-coding-agent` SDK. Use it when adding new wrappers so error handling, interruption, compatibility tests, and abstraction depth stay consistent.

## Scope

Wrap public `@earendil-works/pi-coding-agent` APIs first. Do not wrap `@earendil-works/pi-agent-core` or `@earendil-works/pi-ai` directly unless a concrete public SDK gap requires it.

Keep wrappers shallow and Effect-native. `pi-effect` should make PI easier to use from Effect programs; it should not re-model PI concepts, hide useful PI details, or add app-specific policy.

## Naming and Shape Policy

`pi-effect` should be PI SDK-shaped, Effect-flavored. A user who knows the PI SDK should be able to predict the wrapper surface without learning a parallel vocabulary.

Rules:

- Re-export original PI SDK values and types under their original names when exposing facade APIs.
- Name Effect wrappers by preserving the original PI SDK concept or function name and adding `Effect` where a distinction is needed: `createAgentSessionEffect`, `defineToolEffect`, `AgentSessionEffect`, `SettingsManagerEffect`, `ModelRegistryEffect`.
- Preserve original PI result and object shapes unless changing the shape is the point of the wrapper. Example: `createAgentSessionEffect(...)` returns PI's `CreateAgentSessionResult`, not just the nested session.
- Prefer wrapper namespaces around PI concepts over invented service names. Example: use `AgentSessionEffect.prompt(session, ...)` instead of a separate prompt service that hides `AgentSession.prompt(...)`.
- Avoid alias-only renamed PI types. If the upstream type is exactly `PromptOptions` or `AgentSessionEvent`, export and use that name instead of adding a package-specific alias.
- Use package-defined error names only for wrapper-owned failure boundaries. The names should still point back to the PI concept being wrapped, such as `AgentSessionPromptRejectedError` or `SettingsManagerPersistenceError`.
- Public wrappers should have doc comments explaining which PI SDK API they wrap, what Effect semantics they add, what PI shape is preserved, and how original causes are retained.

## Boundary Types

Classify each wrapper by the boundary it exposes:

1. **Effect-native public APIs** return `Effect` or `Stream` and should preserve normal Effect semantics.
2. **PI callback / Promise APIs** must satisfy PI contracts such as `execute(...): Promise<AgentToolResult>` even when the implementation is Effect-backed.
3. **Plain data/config helpers** should stay structural and avoid behavior unless callers repeatedly need a safer boundary.
4. **Compatibility sentinels** document importability or public SDK shape. They are not full wrapper support by themselves.

## Error Policy

Expose stable `pi-effect` errors at package boundaries when classification helps callers act on the failure. Always preserve original causes.

Rules:

- Preserve the original PI, Effect, or user-code error as `cause` when wrapping.
- Prefer conservative typed errors over broad, brittle classification.
- Keep unknown fallback errors for unrecognized failures.
- Do not classify by private PI message text unless a compatibility test pins the public behavior that requires it.
- Do not erase details just to make the API look cleaner; stable top-level errors and rich causes should coexist.

## Interruption Policy

Effect interruption is not the same as normal failure.

For Effect-native APIs, preserve interruption as interruption. Use finalizers or `Effect.onInterrupt` for cleanup, but do not convert ordinary fiber interruption into a typed failure just to fit the error channel. Current example: `AgentSessionEffect.prompt` remains interrupted when its fiber is interrupted, while `Effect.onInterrupt` calls `session.abort()` for PI cleanup.

For non-Effect PI callback boundaries, JavaScript Promises have no interruption channel. If an Effect-backed implementation is exposed through a Promise API and interruption would otherwise reject with an Effect `FiberFailure`, wrap it in a stable package-defined interruption error and preserve the original `FiberFailure` as `cause`.

Current example:

```text
Effect handler interrupted by PI AbortSignal
  -> Effect FiberFailure from runPromise
  -> ToolEffectInterruptedError
       cause: original FiberFailure
```

This keeps cancellation classifiable for non-Effect callers without hiding Effect diagnostics.

## Promise Boundary Policy

When an Effect program is run to satisfy a PI Promise contract:

- use `runEffectAsPromise(...)` from `src/effect/EffectPromiseBoundary.ts` for the shared Effect-to-Promise execution pattern;
- keep wrapper-specific error mapping in the owning adapter module;
- use `src/effect/EffectRuntimeFailure.ts` for reusable low-level Effect runtime-cause classification;
- convert expected Effect failures into the relevant typed wrapper error;
- convert defects or synchronous throws into defect-style wrapper errors;
- convert interruption into a distinct interruption wrapper error only at the Promise boundary;
- preserve the original rejected value or `FiberFailure` as `cause`;
- test the Promise-facing rejection shape, not only the internal Effect value.

## Compatibility Policy

Every supported wrapper surface needs compatibility coverage against the pinned public PI SDK version.

Prefer tests that exercise public `@earendil-works/pi-coding-agent` behavior. Use PI internals only to understand behavior, then pin the public contract with tests.

Import-surface tests may document broader SDK availability for downstream apps, but they do not imply `pi-effect` wraps or owns that whole surface.

## Wrapper Expansion Checklist

Before adding a wrapper, answer:

- Which public PI SDK API is being wrapped?
- Is the exposed `pi-effect` API Effect-native, Promise-based, or plain data/config?
- What are the success, failure, defect, and interruption semantics?
- Which original causes or details must remain visible?
- What typed errors, if any, help callers act on failures?
- What compatibility test pins the current PI behavior?
- Is this a generic PI adapter concern, or app-specific policy that belongs downstream?

If the answers are unclear, add compatibility tests or keep the wrapper surface smaller.
