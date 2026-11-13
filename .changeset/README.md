# Changesets

Independent versioning for the `@schemastud` packages. When you change a package, run
`npm run changeset`, pick the packages + bump levels, and write a one-line summary. On merge to
`main`, the release workflow opens/updates a "Version Packages" PR; merging that PR publishes the
bumped packages to the public npm registry.

- Independent mode (no `fixed`/`linked` groups) — each package versions on its own.
- `access: public` — matches every package's `publishConfig`.
- Internal `@schemastud/*` → `@schemastud/*` deps bump `patch` when a dependency releases.

## Localization train: keep compatible 0.x minors

The owner keeps this train at 0.x minor releases. The config enables
`onlyUpdatePeerDependentsWhenOutOfRange`: a dependency's minor release alone must
not force a dependent to 1.0.0 while the declared compatible range still holds.
The default false setting promoted the entire messages peer graph to majors.

The messages runtime has the same v1 context/catalog contract across this train,
so its dependents accept `>=0.1.0 <1` (including the pending 0.2.0). The flag alone
still promotes consumers pinned to ^0.1.0, whose range excludes 0.2.0. Chat also
accepts the pending seam 0.3.0 and blockdoc 0.2.0 alongside its existing supported
0.x pairings. These peer ranges change no runtime code or provider identity.

Check `changeset status --output <file>` before release: every pending train
package must remain a 0.x minor. Seam's useFormValidator ships in the pending
seam minor; blockdoc's release peer must match that computed version, while its
file:../seam link remains development-only. big-calendar remains a standalone
manual 0.1.0 -> 0.2.0 minor, with its own lock metadata updated before publishing.
