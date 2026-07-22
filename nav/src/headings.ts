// =============================================================================
// scanHeadings — build an in-page TOC's items from the rendered DOM.
//
// Headings aren't threaded through any content module, so a table of contents reads them
// straight off the page: every id-bearing heading becomes a `{ id, text, level }` item an
// anchor link (`#id`) points at. Pulled out of <OnThisPage> so any TOC/scroll-spy
// consumer builds its items the same way.
// =============================================================================

/** One TOC item: an id to anchor at, its text, and its heading depth (2 for <h2>, …). */
export type TocHeading = {
    id: string;
    text: string;
    level: number;
};

/** Default: level-2 and level-3 headings that carry an id. */
export const DEFAULT_HEADING_SELECTOR = 'h2[id], h3[id]';

/**
 * Scope a heading selector to a container: `scopeHeadingSelector('.site-prose', 'h2[id],
 * h3[id]')` → `.site-prose h2[id], .site-prose h3[id]`. A comma-list is distributed across
 * the container prefix. Pure — no DOM.
 */
export function scopeHeadingSelector(
    container: string | undefined,
    selector: string,
): string {
    return container
        ? selector
              .split(',')
              .map((s) => `${container} ${s.trim()}`)
              .join(', ')
        : selector;
}

/**
 * Read id-bearing headings from the DOM into a flat TOC item list. `container` scopes the
 * query (e.g. `.site-prose`); `selector` picks the heading levels (default h2/h3); `doc`
 * overrides the document (tests/SSR). Returns `[]` with no document or no matches.
 */
export function scanHeadings(
    options: { container?: string; selector?: string; doc?: Document } = {},
): TocHeading[] {
    const { container, selector = DEFAULT_HEADING_SELECTOR } = options;
    const doc =
        options.doc ?? (typeof document !== 'undefined' ? document : undefined);
    if (!doc) {
        return [];
    }

    return Array.from(
        doc.querySelectorAll<HTMLHeadingElement>(
            scopeHeadingSelector(container, selector),
        ),
    ).map((el) => ({
        id: el.id,
        text: el.textContent ?? '',
        // 'H2' → 2, 'H3' → 3, … (falls back to 2 for a non-h tag).
        level: Number(el.tagName.slice(1)) || 2,
    }));
}
