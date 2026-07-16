# @schemastud

The `@schemastud` JS package family, as a single npm workspace.

| Package | What it is |
| --- | --- |
| `@schemastud/frame` | Editor / UI runtime (rjsf + shadcn widget surface) |
| `@schemastud/frame-remote` | Remote component portability (RCP) surface |
| `@schemastud/beam-mdx` | File-driven MDX content rung (draft-exclusion plugin, citation kit, `.site-prose`) |
| `@schemastud/blockdoc` | Block-document primitives |
| `@schemastud/chat` | Chat surface |
| `@schemastud/facets` | Facet primitives |
| `@schemastud/seam` | Shared seam / interop layer |

## Layout — why packages sit at the top level

Packages are workspace roots **at their existing paths** (not nested under `packages/*`). This is
deliberate: the fleet consumes several of them via `file:` overlays pinned to
`…/packages/schemastud/<pkg>` (e.g. `numero`, `stephenrushing`, and the live `splicewire-app/ui`
FC/RCP wiring). Keeping the paths stable means the consolidation into this workspace breaks no
consumer and no in-flight refactor.

## Dev

```bash
npm install          # one install links all workspaces
npm run build        # build every package (tsup)
npm run typecheck
npm run test
```

## Release

Publishing goes to the **public npm registry** (each package's `publishConfig`). Versioning is via
Changesets, independent per package:

```bash
npm run changeset    # record a bump + summary for the packages you touched
```

On merge to `main`, `.github/workflows/release.yml` opens a "Version Packages" PR; merging it
publishes. Requires the `NPM_TOKEN` repo secret (an npm automation token for the `schemastud` org).

See [`MIGRATION.md`](MIGRATION.md) for the one-time consolidation runbook (folding the seven
standalone repos into this workspace with history preserved).
