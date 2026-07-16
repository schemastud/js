// The cross-property citation *kit* — types + the pure resolver. The manifest DATA (the
// concrete `Reference[]`) stays in the consuming satellite: an essay cites a canonical
// sibling by a stable `key`, and the satellite owns which keys exist and where they point.
// The base URL for each entry is resolved through an env-driven `links` map (keyed by
// `site`), so dev → *.test and prod → real domains without touching any essay.
//
// Guardrail (positioning canon): these are evidence links — evergreen Guides / Customer
// Stories — cited lightly at a concrete-claim point. Never a CTA.

export type ReferenceKind = 'guide' | 'story' | 'insight';

export interface Reference {
    key: string; // stable cite key, e.g. 'binding-network-locality'
    site: string; // key into the satellite's `links` config
    path: string; // path on that site, e.g. '/guides/binding-is-network-locality'
    kind: ReferenceKind; // Guide | Customer Story | Insight (per-entry)
    title: string; // anchor / receipts label
    summary?: string; // one-liner for the receipts block
    derivedFrom?: string; // provenance: source artifact (ADR/PRD/issue path)
    // 'pending' until the target is published on its property. Pending entries degrade to
    // plain text inline and are omitted from the receipts block and JSON-LD — no dead
    // links, no premature link equity.
    status: 'live' | 'pending';
}

/** The env-driven base-URL map (site key → absolute base), from the satellite's props. */
export type LinksConfig = Record<string, string>;

export interface ResolvedReference extends Reference {
    href: string; // links[site] + path — the absolute canonical URL
}

/**
 * Resolve a cite key against a manifest and the injected `links` config. Returns undefined
 * for an unknown key or a key whose `site` isn't in the links registry (an authoring/config
 * mistake, surfaced by the caller). The base comes from `links`, so the URL is correct
 * per-environment without touching the manifest.
 */
export function resolveReference(
    key: string,
    references: Reference[],
    links: LinksConfig,
): ResolvedReference | undefined {
    const ref = references.find((entry) => entry.key === key);

    if (!ref) {
        return undefined;
    }

    const base = links[ref.site];

    if (!base) {
        return undefined;
    }

    return { ...ref, href: `${base.replace(/\/$/, '')}${ref.path}` };
}
