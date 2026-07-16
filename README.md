# @schemastud/beam-mdx

The file-driven MDX content rung. The browser + build surface for an app whose essays, pages,
and posts are hand-authored `.mdx` resolved at Vite build time — with a build-time draft gate so
a work-in-progress never ships. Pairs with `schemastud/laravel-beam-mdx` (the Laravel companion:
route macros + `beam-mdx:doctor`).

## Exports

- **`@schemastud/beam-mdx`** — the browser surface:
  - `createContent(modules)` → `resolveContent` / `essaysList` / `essayTopics` /
    `broadcastsList` / `contentNames`, plus `isDraft` and every content type.
  - `Ref` / `Receipts` + `resolveReference` — the cross-property citation kit (the app supplies
    the manifest via `BeamMdxProvider`).
  - `JsonLd` + `contentJsonLd` — frontmatter-driven Schema.org, `JsonLdNode`.
  - `Content` — embed an authored fragment by name.
  - `ContentShow` — the parameterized content renderer (the app injects layouts, the MDX
    component map, and the references manifest).
- **`@schemastud/beam-mdx/vite`** — the node/build surface:
  - `beamMdxContent(options)` — the build-time draft-exclusion plugin. Generates the
    `virtual:beam-mdx/content` module map, omitting drafts unless the current env is
    allowlisted (so a draft's content *and slug* are absent from a production bundle).
  - `beamMdxPreset(options)` — the MDX compile step (mdx + remark-frontmatter +
    remark-mdx-frontmatter).
- **`@schemastud/beam-mdx/css`** — the token-driven base `.site-prose` typography (apps override
  the `--sr-*` / `--font-*` tokens it reads).

## Draft convention

A file under a dated content type (`essays/`, `broadcasts/`) is a **draft** when it carries no
`datePublished`, or sets `draft: true`. The env allowlist (`BEAM_MDX_PREVIEW_ENVS`, comma-
separated) is the visibility knob; empty = nothing previews. The Laravel companion's
`beam-mdx:doctor` enforces "no draft reachable in a production build" fleet-wide.

## Wiring (host app)

```ts
// vite.config.ts
import { beamMdxContent, beamMdxPreset } from '@schemastud/beam-mdx/vite';
// plugins: [ beamMdxContent({ contentDir, previewEnvs, currentEnv }), beamMdxPreset(), ... ]

// resources/js/lib/content.ts — bind the resolver to this app's virtual module
import { createContent } from '@schemastud/beam-mdx';
import { MODULES } from 'virtual:beam-mdx/content';
export const { resolveContent, essaysList /* … */ } = createContent(MODULES);
```

```css
/* app.css */
@import '@schemastud/beam-mdx/css';
```
