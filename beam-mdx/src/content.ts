import type { ComponentType } from 'react';

export type ContentLayout = 'site' | 'app' | 'bare';

/** One platform's ledger metadata on a broadcast (Facebook cut, LinkedIn cut, …). */
export interface BroadcastPlatform {
    name: string; // e.g. 'facebook' | 'linkedin'
    postedAt?: string; // ISO date the post went live on the network
    permalink?: string; // canonical URL of the network post (PESOS)
}

export interface ContentFrontmatter {
    title: string;
    layout: ContentLayout;
    excerpt?: string;
    navGroup?: string;
    // Optional Schema.org type (e.g. 'Article', 'Person'). When set, the content bridge
    // emits JSON-LD built React-side from this frontmatter — the MDX content plane's own
    // structured-data mechanism, never a PHP schema package. Keep it minimal: the moment a
    // page needs per-tenant or engine-generated data it belongs in the DTO/publishing plane.
    schemaType?: string;
    // Overrides the JSON-LD `name` when the page title isn't the entity name (e.g. a Person
    // page titled "Résumé" whose name is the person, not the page).
    schemaName?: string;
    datePublished?: string;
    // Explicit draft flag. A file is also a draft implicitly when it's a dated content type
    // (essay/broadcast) with no `datePublished`; the build-time exclusion plugin honors both.
    draft?: boolean;
    // Essay-log display fields (the /essays index and the home writing log).
    topic?: string;
    readingTime?: string;
    // Thread = the storyline an essay belongs to; stage places it on a learning → deciding →
    // proclaiming arc. Both are soft editorial metadata, not enforced.
    thread?: string;
    stage?: string;
    // Outward-facing planning metadata. targetQuery is the search intent the piece answers;
    // audience names the reader subtype(s) it aims to convert. Both soft.
    targetQuery?: string;
    audience?: string[];
    // Cross-property cite keys into the satellite's references manifest. Drives the
    // end-of-essay Receipts block and the JSON-LD `citation` nodes. Soft — most essays none.
    references?: string[];
    // Broadcast-only: the platforms a campaign was posted to, each with ledger metadata. A
    // broadcast carries no `datePublished`, so it is structurally always a draft.
    platforms?: BroadcastPlatform[];
}

export interface ContentModule {
    Component: ComponentType<Record<string, unknown>>;
    frontmatter: ContentFrontmatter;
}

/** The raw per-file shape the Vite plugin's generated module map hands over. */
export interface RawContentModule {
    default: ComponentType<Record<string, unknown>>;
    frontmatter?: Record<string, unknown>;
}

export type RawContentModules = Record<string, RawContentModule>;

/**
 * Content-name prefixes gated by a published date — the draft convention's dated types.
 * Must match `draftablePrefixes` given to the Vite plugin and the PHP route gate; all
 * three agree on which prefixes a missing `datePublished` marks as a draft.
 */
export const DEFAULT_DRAFTABLE_PREFIXES = ['essays/', 'broadcasts/'];

/**
 * Is this content a draft? A file under a dated content type (essays, broadcasts) is a
 * draft when it carries no `datePublished`, or when it sets `draft: true`. This is the
 * single render-side source of truth: the /essays list, the home writing log, and the show
 * page all call it, so the Draft badge and the listing can never disagree. The Vite plugin
 * (build-time bundle exclusion) and the PHP route gate are its cross-runtime twins.
 */
export function isDraft(
    name: string,
    frontmatter: Pick<ContentFrontmatter, 'draft' | 'datePublished'>,
    draftablePrefixes: string[] = DEFAULT_DRAFTABLE_PREFIXES,
): boolean {
    if (frontmatter.draft) {
        return true;
    }

    if (!draftablePrefixes.some((prefix) => name.startsWith(prefix))) {
        return false;
    }

    return !frontmatter.datePublished;
}

export interface EssayListItem {
    slug: string; // the /essays/{slug} segment, e.g. 'nephews-prompt'
    name: string; // the content name, e.g. 'essays/nephews-prompt'
    title: string;
    excerpt?: string;
    datePublished?: string;
    draft?: boolean; // no published date (or draft: true) — preview-only, never in prod
    topic?: string;
    readingTime?: string;
    thread?: string;
    stage?: string;
    targetQuery?: string;
    audience?: string[];
}

export interface EssayTopic {
    topic: string; // as authored, e.g. 'RETRIEVAL'
    slug: string; // url form, e.g. 'retrieval'
    count: number;
}

export interface BroadcastListItem {
    slug: string; // the /broadcasts/{slug} segment
    name: string; // the content name, e.g. 'broadcasts/funding-launch'
    title: string;
    excerpt?: string;
    platforms?: BroadcastPlatform[];
}

export interface ContentApi {
    /** Resolve an authored content file by name (its path under content/, sans .mdx). */
    resolveContent(name: string): ContentModule | undefined;
    /** Every authored content name — used by tests/tooling, not the render path. */
    contentNames(): string[];
    /** Every essay under content/essays, newest first (optionally filtered by topic). */
    essaysList(topic?: string): EssayListItem[];
    /** Distinct essay topics with counts, most-written first (ties alphabetical). */
    essayTopics(): EssayTopic[];
    /** Every broadcast under content/broadcasts (preview-only; empty in prod builds). */
    broadcastsList(): BroadcastListItem[];
}

type RawFrontmatter = Partial<ContentFrontmatter>;

/**
 * Bind the content resolver to a generated module map. The satellite passes the map from
 * its `virtual:beam-mdx/content` import (provided by the `beamMdxContent` Vite plugin),
 * keeping the virtual import in the app — where Vite owns it — rather than inside this
 * package. The map has already *omitted drafts* in non-preview builds, so the resolver only
 * ever sees what should ship; draft exclusion happens at the graph, not here.
 */
export function createContent(
    modules: RawContentModules,
    draftablePrefixes: string[] = DEFAULT_DRAFTABLE_PREFIXES,
): ContentApi {
    const byName: Record<string, ContentModule> = {};

    for (const [name, mod] of Object.entries(modules)) {
        const fm = (mod.frontmatter ?? {}) as RawFrontmatter;
        byName[name] = {
            Component: mod.default,
            frontmatter: {
                title: fm.title ?? '',
                layout: fm.layout ?? 'site',
                excerpt: fm.excerpt,
                navGroup: fm.navGroup,
                schemaType: fm.schemaType,
                schemaName: fm.schemaName,
                datePublished: fm.datePublished,
                draft: fm.draft,
                topic: fm.topic,
                readingTime: fm.readingTime,
                thread: fm.thread,
                stage: fm.stage,
                targetQuery: fm.targetQuery,
                audience: fm.audience,
                references: fm.references,
                platforms: fm.platforms,
            },
        };
    }

    function resolveContent(name: string): ContentModule | undefined {
        return byName[name];
    }

    function contentNames(): string[] {
        return Object.keys(byName);
    }

    function essaysList(topic?: string): EssayListItem[] {
        const all = Object.entries(byName)
            .filter(([name]) => name.startsWith('essays/'))
            .map(([name, mod]) => ({
                slug: name.slice('essays/'.length),
                name,
                title: mod.frontmatter.title,
                excerpt: mod.frontmatter.excerpt,
                datePublished: mod.frontmatter.datePublished,
                draft: isDraft(name, mod.frontmatter, draftablePrefixes),
                topic: mod.frontmatter.topic,
                readingTime: mod.frontmatter.readingTime,
                thread: mod.frontmatter.thread,
                stage: mod.frontmatter.stage,
                targetQuery: mod.frontmatter.targetQuery,
                audience: mod.frontmatter.audience,
            }))
            // Sort by datePublished desc; undated entries sort last, so a preview-visible
            // draft can never outrank a dated essay in the log.
            .sort((a, b) =>
                (b.datePublished ?? '').localeCompare(a.datePublished ?? ''),
            );

        if (!topic) {
            return all;
        }

        const wanted = topic.toLowerCase();

        return all.filter((essay) => essay.topic?.toLowerCase() === wanted);
    }

    function essayTopics(): EssayTopic[] {
        const counts = new Map<string, number>();

        for (const essay of essaysList()) {
            if (!essay.topic) {
                continue;
            }

            counts.set(essay.topic, (counts.get(essay.topic) ?? 0) + 1);
        }

        return [...counts.entries()]
            .map(([topic, count]) => ({
                topic,
                slug: topic.toLowerCase(),
                count,
            }))
            .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
    }

    function broadcastsList(): BroadcastListItem[] {
        return Object.entries(byName)
            .filter(([name]) => name.startsWith('broadcasts/'))
            .map(([name, mod]) => ({
                slug: name.slice('broadcasts/'.length),
                name,
                title: mod.frontmatter.title,
                excerpt: mod.frontmatter.excerpt,
                platforms: mod.frontmatter.platforms,
            }))
            .sort((a, b) => a.slug.localeCompare(b.slug));
    }

    return {
        resolveContent,
        contentNames,
        essaysList,
        essayTopics,
        broadcastsList,
    };
}
