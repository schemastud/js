# Changesets

Independent versioning for the `@schemastud` packages. When you change a package, run
`npm run changeset`, pick the packages + bump levels, and write a one-line summary. On merge to
`main`, the release workflow opens/updates a "Version Packages" PR; merging that PR publishes the
bumped packages to the public npm registry.

- Independent mode (no `fixed`/`linked` groups) — each package versions on its own.
- `access: public` — matches every package's `publishConfig`.
- Internal `@schemastud/*` → `@schemastud/*` deps bump `patch` when a dependency releases.
