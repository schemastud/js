> You are in **schemastud/js** — the `@schemastud` npm workspace, a single-repo package family of
> core/tooling primitives (editor runtime, block-document, chat, facets, seam/interop layer).

One git repo, one npm workspace — not one-repo-per-package like the rest of the fleet. For the
current package roster, see the `workspaces` field in this repo's own `package.json`; that's the
source of truth, not this file. Publishes under the shared `@schemastud` npm scope, independently
versioned per package via Changesets.
