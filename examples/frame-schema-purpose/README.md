# Independent Frame schema-purpose example

This private fixture mounts one `createFrameKit()` over Frame's memory transport
(`@schemastud/frame/testing`). The kit supplies the provider, the `@schemastud/ui` primitives and slots, the widget
registry and `can`. The in-memory producer decides only what is the producer's: which schema a purpose gets, what
create stores, and what the approve action does. It imports no Beam/Beam-inertia application code, and it is not an
HTTP backend, authentication or durable storage.

Use Node22.13+ and pnpm9.15.3. In a new clone of the supplied Schemastud candidate, first build `frame`
using its declared dependencies and pinned peers through the documented local proof setup. Its
committed `dist` is also included in the exact candidate; verify that rebuilding matches it.
Then, from this directory:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm dev --port 46560 --strictPort
```

The relative `file:../../frame`, `file:../../seam`, `file:../../facets` and `file:../../ui` dependencies, and the
`pnpm.overrides` that hold Frame's own `@schemastud/*` dependencies to them, resolve the same candidate, not a
globally installed Frame, a registry release or a live checkout. Build those four packages first. The local lock records the exact peers and required packages. If preparing
a new local candidate before the lock is generated, run `pnpm install` once and retain that lock as
part of the candidate; replay uses `--frozen-lockfile`. No package release is implied.

It opens on List: the `requests` resource's declared Title and Status columns (Status as a badge), the filter bar
(a Title search and a Status select, applied by the producer), numbered paging over 26 requests, and New request,
which opens Create. Tailwind (`vite.config.ts`, `src/style.css`) styles the kit's `@schemastud/ui` primitives.

Create a title and choose open/closed Status, then Save. Detail contains disabled ID/Title/Status/
Approval and no Save. Approve fixture uses Frame's existing confirmation/result/refetch; Approval
becomes approved. Switch Create → Read detail → Create to exercise distinct warm schemas. Legacy
disabled edit has the write fields and no Approval/Save. Fail read schema displays the real error;
Retry recovers the read schema. Schema requests are visible below the surface.

These are local teaching effects only. Server input validation, record/field authorization,
workflow history and durable effects belong to the real producer, demonstrated separately by the
Beam service-desk journey. `src/contract.ts` typechecks actual exported purpose/transport contracts,
including a negative presentation-versus-purpose witness.
