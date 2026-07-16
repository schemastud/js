import { Head, usePage } from '@inertiajs/react';
import type { ComponentType, ReactNode } from 'react';

import type { ContentLayout, ContentModule } from '../content';
import { isDraft } from '../content';
import { BeamMdxProvider, useLinks } from '../context';
import type { Reference } from '../references';
import { contentJsonLd, JsonLd } from './json-ld';
import { Receipts } from './reference';

/** The layout components a satellite maps each `layout` frontmatter value onto. */
export type ContentLayouts = Record<
    ContentLayout,
    ComponentType<{ children: ReactNode }>
>;

export interface ContentShowProps {
    /** Content name to render (e.g. 'essays/foo' or 'about'). */
    slug: string;
    /** The satellite's content resolver, bound to its `virtual:beam-mdx/content` map. */
    resolve: (name: string) => ContentModule | undefined;
    /** Brand layouts, keyed by the frontmatter `layout` value. */
    layouts: ContentLayouts;
    /** The MDX component map (embed <Content>, <Ref>, plus brand essay devices). */
    mdxComponents: Record<string, unknown>;
    /** The satellite's citation manifest — powers <Ref>, <Receipts>, and JSON-LD citations. */
    references?: Reference[];
    /** Content-name prefixes gated by a published date (draft convention). */
    draftablePrefixes?: string[];
}

/**
 * The file-driven content renderer: resolve the MDX module for `slug`, wrap it in the
 * satellite's chosen layout, emit frontmatter-driven JSON-LD (with live cross-property
 * citations), render the compiled MDX with the injected component map, and close with the
 * Receipts ledger. Everything satellite-specific — layouts, essay devices, the citation
 * manifest — arrives as props; the brand look rides CSS tokens (.site-prose + --sr-*).
 */
export function ContentShow({
    slug,
    resolve,
    layouts,
    mdxComponents,
    references = [],
    draftablePrefixes,
}: ContentShowProps) {
    const { url: pageUrl } = usePage();
    const links = useLinks();
    const mod = resolve(slug);

    if (!mod) {
        // The route pointed at a content name with no file — an authoring mistake, surfaced
        // instead of a blank page. Visitor-facing 404s happen at the route.
        const Fallback = layouts.site;

        return (
            <Fallback>
                <Head title="Not found" />
                <p>Content “{slug}” was not found.</p>
            </Fallback>
        );
    }

    const { Component, frontmatter } = mod;
    const Layout = layouts[frontmatter.layout];
    const draft = isDraft(slug, frontmatter, draftablePrefixes);

    const canonical = `${typeof window !== 'undefined' ? window.location.origin : ''}${pageUrl.split('?')[0]}`;

    return (
        <BeamMdxProvider references={references} resolve={resolve}>
            <Layout>
                <Head title={frontmatter.title}>
                    {frontmatter.excerpt ? (
                        <meta
                            name="description"
                            content={frontmatter.excerpt}
                        />
                    ) : null}
                </Head>
                {frontmatter.schemaType ? (
                    <JsonLd
                        data={contentJsonLd(
                            frontmatter,
                            canonical,
                            references,
                            links,
                        )}
                    />
                ) : null}
                <article className="site-prose mx-auto max-w-2xl px-6 py-14 sm:px-8 sm:py-16">
                    {draft || frontmatter.topic || frontmatter.datePublished ? (
                        <div className="mb-6 flex items-center gap-3 font-mono text-xs tracking-wide text-[color:var(--sr-brand)] uppercase">
                            {draft ? (
                                <span className="rounded-sm bg-[color:var(--sr-brand)]/15 px-1.5 py-0.5 font-medium ring-1 ring-[color:var(--sr-brand)]/40 ring-inset">
                                    Draft
                                </span>
                            ) : null}
                            {frontmatter.datePublished ? (
                                <span>
                                    {frontmatter.datePublished
                                        .replace(/-/g, '.')
                                        .slice(0, 7)}
                                </span>
                            ) : null}
                            {frontmatter.topic ? (
                                <>
                                    <span className="text-[color:var(--sr-faint)]">
                                        |
                                    </span>
                                    <span className="text-[color:var(--sr-dim)]">
                                        {frontmatter.topic}
                                    </span>
                                </>
                            ) : null}
                            {frontmatter.readingTime ? (
                                <>
                                    <span className="text-[color:var(--sr-faint)]">
                                        |
                                    </span>
                                    <span className="text-[color:var(--sr-dim)]">
                                        {frontmatter.readingTime}
                                    </span>
                                </>
                            ) : null}
                        </div>
                    ) : frontmatter.navGroup ? (
                        <p className="mb-5 font-mono text-xs tracking-widest text-[color:var(--sr-brand)] uppercase">
                            {frontmatter.navGroup}
                        </p>
                    ) : null}
                    <Component components={mdxComponents} />
                    <Receipts keys={frontmatter.references} />
                </article>
            </Layout>
        </BeamMdxProvider>
    );
}
