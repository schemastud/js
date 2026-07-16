import { Head } from '@inertiajs/react';

import type { ContentFrontmatter } from '../content';
import type { LinksConfig, Reference } from '../references';
import { resolveReference } from '../references';

/** One Schema.org node — a flat JSON-LD object. `jsonLd` on a page may be one or many. */
export type JsonLdNode = Record<string, unknown>;

// The shared render surface for Schema.org structured data. Emits one
// `<script type="application/ld+json">` per node into the document <Head> (Inertia merges
// multiple <Head> instances, so a page drops this alongside its own <Head>). `<` is
// hex-escaped so a value containing HTML can never break out of the script.
function serialize(node: JsonLdNode): string {
    return JSON.stringify(node).replace(/</g, '\\u003c');
}

export function JsonLd({ data }: { data: JsonLdNode | JsonLdNode[] }) {
    const nodes = Array.isArray(data) ? data : [data];

    return (
        <Head>
            {nodes.map((node, i) => (
                <script key={i} type="application/ld+json">
                    {serialize(node)}
                </script>
            ))}
        </Head>
    );
}

/**
 * The MDX content plane's own JSON-LD: built React-side from a file's frontmatter, never
 * through a PHP schema package. Deliberately minimal — @type/name from the declared
 * schemaType + title, optional description/datePublished, identity from the page's
 * canonical URL, and cross-property `citation` nodes for the *live* references (the
 * structured-data twin of the Receipts block — no premature link equity for pending
 * targets). A guide reads as TechArticle, a story/insight as Article. Anything richer
 * (per-tenant, engine-generated) belongs in the DTO/publishing plane, not here.
 */
export function contentJsonLd(
    frontmatter: ContentFrontmatter,
    url: string,
    references: Reference[],
    links: LinksConfig,
): JsonLdNode {
    const node: JsonLdNode = {
        '@context': 'https://schema.org',
        '@type': frontmatter.schemaType,
        name: frontmatter.schemaName ?? frontmatter.title,
        '@id': url,
        url,
    };

    if (frontmatter.schemaType === 'Article') {
        node.headline = frontmatter.title;
    }

    if (frontmatter.excerpt) {
        node.description = frontmatter.excerpt;
    }

    if (frontmatter.datePublished) {
        node.datePublished = frontmatter.datePublished;
    }

    const citation = (frontmatter.references ?? [])
        .map((key) => resolveReference(key, references, links))
        .filter((ref) => ref?.status === 'live')
        .map((ref) => ({
            '@type': ref!.kind === 'guide' ? 'TechArticle' : 'Article',
            name: ref!.title,
            url: ref!.href,
        }));

    if (citation.length) {
        node.citation = citation;
    }

    return node;
}
