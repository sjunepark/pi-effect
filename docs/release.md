# Release

This repo publishes the npm package `pi-effect`. The npm package includes the built TypeScript declarations and ESM output from `dist/`.

Release Please owns normal version bumps, `CHANGELOG.md`, source tags, and GitHub Releases. The Release workflow validates tagged source and publishes npm with OIDC trusted publishing.

## Manual setup

Before the first automated publish, create the npm package, then configure trusted publishing for `pi-effect`. npm requires the package to exist before trusted publishing can be attached, so the first creation needs either a one-time manual publish or a placeholder publish tool.

One-time package creation options:

```sh
npm login
npm publish --access public
```

If you publish the current package manually as `0.1.0`, also push the matching source tag from the same commit so future Release Please runs have a clean baseline:

```sh
git tag v0.1.0
git push origin main --tags
```

or publish a minimal placeholder with a tool such as `setup-npm-trusted-publish`, then let Release Please publish the real first release.

After the package exists, configure trusted publishing with these values:

- Publisher: GitHub Actions
- Organization or user: `sjunepark`
- Repository: `pi-effect`
- Workflow filename: `release.yml`

Keep the package public. The package name `pi-effect` was unclaimed when this setup was added; if you decide to publish under a scope instead, rename `package.json` and `release-please-config.json` before the first release, then update README import examples and downstream dependencies.

Configure this secret in the GitHub repository:

- `RELEASE_PLEASE_TOKEN`: token used by `.github/workflows/release-please.yml` to open release PRs and create source tags/releases. Use a fine-grained PAT or GitHub App token, not the default `GITHUB_TOKEN`, so Release Please-created tags trigger `.github/workflows/release.yml`. Grant this repository Contents read/write and Pull requests read/write access.

npm publishing uses OIDC trusted publishing, so no npm publish token is required.

Protect `main` so release PRs cannot merge until `.github/workflows/ci.yml` passes. At minimum, require the `CI / Typecheck, test, and build` and `CI / Secret scan` status checks before merging. Release Please and CI both run from pushes to `main`, so branch protection is the gate that ensures release PR contents are validated before Release Please creates source tags and releases.

## Automated release flow

While the package is pre-1.0, Release Please treats normal `feat:` and `fix:` commits as patch releases and reserves minor bumps for breaking changes. This keeps rapid greenfield feature work on `0.x.y` unless a commit uses `!` or a `BREAKING CHANGE:` footer.

1. Land normal work on `main` using Conventional Commits, especially `feat:`, `fix:`, and `docs:`. Use `!` or a `BREAKING CHANGE:` footer for breaking changes.
2. `.github/workflows/ci.yml` validates pull requests with typecheck, tests, build, and secret scanning.
3. `.github/workflows/release-please.yml` opens or updates a release PR that bumps `package.json`, updates `.release-please-manifest.json`, and writes `CHANGELOG.md`.
4. Merge the release PR after CI passes.
5. Release Please creates the source tag and GitHub Release.
6. The source tag triggers `.github/workflows/release.yml`, which validates the package again and publishes npm.

The source tag must match `package.json` exactly. Version `x.y.z` uses source tag `vx.y.z`.

## Manual fallback

If automation needs to be bypassed, update `package.json` and `.release-please-manifest.json` to the same version, commit the change, and push a matching source tag:

```sh
git tag vx.y.z
git push origin main --tags
```

To republish an existing source tag without moving it, run the `Release` workflow manually with the `tag` input set to the existing tag, for example `v0.1.0`.

The workflow is idempotent. If the npm package version already exists, npm publish is skipped.
