import { useEffect, useState, type ReactNode } from 'react';

import { scanHeadings, type TocHeading } from './headings';

// =============================================================================
// <OnThisPage> — an automatic in-page table of contents with scroll-spy.
//
// Builds its items via `scanHeadings` (id-bearing headings read from the rendered DOM),
// renders anchor links, and drives an IntersectionObserver so the heading nearest the top
// of the reading zone is "active". Foundation-neutral: no router (anchors are plain `#id`
// links), no bundled CSS — the host injects class names, the heading selector, and a
// `routeKey` that triggers a re-scan on navigation.
// =============================================================================

/** Injected class names for each part. Anything omitted renders unstyled. */
export type OnThisPageClasses = {
    root?: string; // the <nav>
    title?: string;
    list?: string;
    item?: string; // each <li>
    link?: string; // base link
    linkActive?: string; // added to the active link
    linkLevel3?: string; // added to h3 links (indent)
};

export type OnThisPageProps = {
    /** Changes trigger a re-scan (e.g. the current URL). */
    routeKey?: string;
    /** Optional container selector the headings are scoped to (e.g. '.site-prose'). */
    container?: string;
    /** Heading selector (default `h2[id], h3[id]`). Only id-bearing headings link. */
    selector?: string;
    /** Heading label (default "On this page"). */
    title?: ReactNode;
    /** Hide the whole TOC below this many headings (default 2 — a lone heading isn't a TOC). */
    minHeadings?: number;
    classes?: OnThisPageClasses;
    /** Accessible label for the nav landmark. */
    'aria-label'?: string;
};

export function OnThisPage({
    routeKey,
    container,
    selector,
    title = 'On this page',
    minHeadings = 2,
    classes = {},
    'aria-label': ariaLabel = 'On this page',
}: OnThisPageProps) {
    const [headings, setHeadings] = useState<TocHeading[]>([]);
    const [activeId, setActiveId] = useState<string>('');

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        const items = scanHeadings({ container, selector });
        setHeadings(items);

        if (items.length === 0) {
            return;
        }

        // The scanned headings' elements, for the scroll-spy observer.
        const nodes = items
            .map((h) => document.getElementById(h.id))
            .filter((el): el is HTMLElement => el !== null);

        // "Active" = the heading nearest the top of the reading zone. The negative bottom
        // rootMargin keeps a section highlighted until the next heading reaches the upper band.
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort(
                        (a, b) =>
                            a.boundingClientRect.top - b.boundingClientRect.top,
                    );
                if (visible[0]) setActiveId(visible[0].target.id);
            },
            { rootMargin: '-80px 0px -66% 0px', threshold: 0 },
        );

        nodes.forEach((n) => observer.observe(n));

        // A short trailing section can never reach the top band — the page runs out of scroll
        // first — so force the final heading active once the viewport hits the bottom.
        const onScroll = () => {
            const atBottom =
                window.innerHeight + window.scrollY >=
                document.documentElement.scrollHeight - 2;
            if (atBottom) setActiveId(nodes[nodes.length - 1].id);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', onScroll);
        };
    }, [routeKey, container, selector]);

    if (headings.length < minHeadings) {
        return null;
    }

    return (
        <nav className={classes.root} aria-label={ariaLabel}>
            {title != null && <p className={classes.title}>{title}</p>}
            <ul className={classes.list}>
                {headings.map((h) => (
                    <li key={h.id} className={classes.item}>
                        <a
                            href={`#${h.id}`}
                            onClick={() => setActiveId(h.id)}
                            aria-current={h.id === activeId ? 'true' : undefined}
                            className={[
                                classes.link,
                                h.level === 3 ? classes.linkLevel3 : '',
                                h.id === activeId ? classes.linkActive : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                        >
                            {h.text}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
