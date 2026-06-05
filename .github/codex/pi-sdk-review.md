# PI SDK dependency update review

Use this prompt manually when asking Codex to review a Dependabot PR for `@earendil-works/pi-coding-agent`, or pass it as `prompt-file` if a Codex Action workflow is added. Native Codex automatic reviews do not automatically read this file.

Review the dependency update for `pi-effect`.

Focus on:

- Public API, type, export, or behavior changes in `@earendil-works/pi-coding-agent`.
- Whether the Effect-native wrapper logic needs code changes.
- Compatibility-test gaps exposed by the SDK update.
- Typecheck, test, or build failures and their root causes.
- Whether `README.md`, `TODO.md`, `WRAPPING_RULES.md`, or compatibility docs need updates.

Keep recommendations small and wrapper-compatible. Do not propose broad rewrites unless the SDK contract change makes them necessary.
