// =============================================================================
// @schemastud/beam-mdx — the file-driven MDX content rung.
//
// The browser surface: the content resolver, the cross-property citation kit (Ref /
// Receipts), the frontmatter-driven JSON-LD builder, the embed-by-reference <Content>,
// and the parameterized <ContentShow> renderer. The node-side build plugin + MDX preset
// live at `@schemastud/beam-mdx/vite`; the base typography at `@schemastud/beam-mdx/css`.
// A consuming satellite keeps only its own references manifest and brand tokens.
// =============================================================================

// Content resolver + types.
export { createContent, isDraft, DEFAULT_DRAFTABLE_PREFIXES } from './content';
export type {
    ContentApi,
    ContentLayout,
    ContentFrontmatter,
    ContentModule,
    RawContentModule,
    RawContentModules,
    BroadcastPlatform,
    EssayListItem,
    EssayTopic,
    BroadcastListItem,
} from './content';

// Cross-property citation kit (types + pure resolver; the manifest stays satellite-side).
export { resolveReference } from './references';
export type {
    Reference,
    ReferenceKind,
    ResolvedReference,
    LinksConfig,
} from './references';

// Injection seam for the MDX render surface.
export { BeamMdxProvider, useBeamMdx, useLinks } from './context';
export type { BeamMdxContextValue } from './context';

// Render surface.
export { Ref, Receipts } from './components/reference';
export { Content } from './components/content';
export { JsonLd, contentJsonLd } from './components/json-ld';
export type { JsonLdNode } from './components/json-ld';
export { ContentShow } from './components/content-show';
export type { ContentShowProps, ContentLayouts } from './components/content-show';
