# @schemastud/_resources

The **open, foundation** generated-resource bundle: the `#[TypeScript]` type
projection (and, later, JSON schemas) off **schemastud-tier** `Data` classes.

This is a **generated projection**, not source. PHP `#[TypeScript]` Data classes
in the app's `app/Data/*` are the single source of truth; the app emits this
bundle app-side via the `resources:schemastud` pipeline
(`rushing/laravel-pipeline-registry`). **Do not hand-edit** anything under
`types/` or `schemas/` — regenerate:

```
php artisan pipelines:run resources:schemastud
```

## Why the bundle, and why the split

A package (and any host consuming it — Laravel or not) gets the DTO/schema
projection **without running Laravel**. The vendor tier line (ADR-0092) is kept
*by construction*: foundation DTOs project here into `@schemastud/_resources`
(open); app-shaped DTOs project into the private `@splicewire/_resources`. A
free `@splicewire/beam-*` package reaches app shapes only by depending on the
private bundle — the tier seam made visible.

## Consuming

```ts
import type { SomeFoundationData } from '@schemastud/_resources/types/foundation'
```
