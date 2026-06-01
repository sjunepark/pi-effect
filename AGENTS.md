# AGENTS.md

## Setup commands
- Install dependencies: `bun install`.
- Use Node `>=22.19.0` and Bun; keep `bun.lock` in sync when dependencies change.

## Build and test
- Typecheck all source and tests: `bun run typecheck`.
- Run tests: `bun run test`.
- Build declarations and JS: `bun run build`.
- For a full local validation pass, run `bun run typecheck && bun run test && bun run build`; remove generated `dist/` afterward unless intentionally inspecting build output.

## Code conventions
- This is a TypeScript ESM package using `moduleResolution: "NodeNext"`; use `.js` extensions in relative source imports.
- Keep wrappers shallow and Effect-native around the public `@earendil-works/pi-coding-agent` SDK.
- Preserve original causes in typed wrapper errors; avoid brittle private-message classification without compatibility coverage.
- Keep modules narrow under `src/session`, `src/tools`, `src/settings`, and `src/testing`; avoid broad utility modules unless a repeated pattern is proven.

## Testing expectations
- Put unit tests in `tests/unit` and public SDK compatibility tests in `tests/compatibility`.
- Use `src/testing/FakePiSession.ts` for unit tests that should not require real model credentials.
- When wrapper behavior depends on PI SDK contracts, add or update compatibility tests that exercise public `@earendil-works/pi-coding-agent` behavior.

## Change expectations
- Update `README.md` when public usage or supported behavior changes.
- Update `TODO.md` when near-term work or PI compatibility priorities change.
- Update `WRAPPING_RULES.md` when durable adapter-design rules change.
- Keep the pinned PI SDK version (`@earendil-works/pi-coding-agent@0.78.0`) unless the task is explicitly an upgrade; an upgrade must include compatibility-test updates.

## Safety and approvals
- Do not wrap `@earendil-works/pi-agent-core` or `@earendil-works/pi-ai` directly unless a concrete public SDK gap requires it.
- Do not add real-model or credential-dependent tests to the default test suite without explicit approval.
