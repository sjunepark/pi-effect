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
- Keep wrappers shallow, Effect-native, and PI SDK-shaped around the public `@earendil-works/pi-coding-agent` SDK; preserve upstream names and shapes where possible.
- Preserve original causes in typed wrapper errors; avoid brittle private-message classification without compatibility coverage.
- Keep modules narrow under `src/session`, `src/tools`, `src/settings`, and `src/testing`; avoid broad utility modules unless a repeated pattern is proven.

## Testing expectations
- Put unit tests in `tests/unit` and public SDK compatibility tests in `tests/compatibility`.
- Use `src/testing/FakeAgentSession.ts` for unit tests that should not require real model credentials.
- When wrapper behavior depends on PI SDK contracts, add or update compatibility tests that exercise public `@earendil-works/pi-coding-agent` behavior.

## Change expectations
- Update `README.md` when public usage or supported behavior changes.
- Update `TODO.md` when near-term work or PI compatibility priorities change.
- Update `WRAPPING_RULES.md` when durable adapter-design rules change.
- Keep the pinned PI SDK version (`@earendil-works/pi-coding-agent@0.78.1`) unless the task is explicitly an upgrade; an upgrade must include compatibility-test updates.

## Release and publishing
- Read `docs/release.md` before preparing release automation changes, Release Please PRs, tags, or manual npm publish fallbacks.
- Release Please owns normal version bumps, changelog updates, source tags, and GitHub Releases; do not manually edit them except for the documented manual fallback.
- Use Conventional Commit messages. While the package is pre-1.0, normal `feat:` and `fix:` commits become patch releases; breaking commits using `!` or `BREAKING CHANGE:` become minor releases.
- Manual release tags must match `package.json` exactly: version `x.y.z` uses source tag `vx.y.z`.

## Safety and approvals
- Do not wrap `@earendil-works/pi-agent-core` or `@earendil-works/pi-ai` directly unless a concrete public SDK gap requires it.
- Do not add real-model or credential-dependent tests to the default test suite without explicit approval.
