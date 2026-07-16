import type { ReactNode } from 'react';

import { useBeamMdx, useLinks } from '../context';
import type { ReferenceKind } from '../references';
import { resolveReference } from '../references';

// Cross-property citation surfaces. Both read the citation manifest from the BeamMdx
// context and the env-driven `links` map from Inertia's shared page props. See
// ../references.ts for the kit and the non-drift rationale; the manifest itself is the
// satellite's, injected via <BeamMdxProvider>.

const KIND_LABEL: Record<ReferenceKind, string> = {
    guide: 'Guide',
    story: 'Customer story',
    insight: 'Insight',
};

function devWarn(message: string): void {
    if (import.meta.env?.DEV) {
        // eslint-disable-next-line no-console
        console.warn(message);
    }
}

/**
 * Inline evidence cite: `<Ref to="key">the claim words</Ref>`. A `live` entry renders a
 * dofollow anchor at the point of a concrete claim; a `pending` entry (or an unknown key)
 * degrades to the plain child text so no dead link ever ships.
 */
export function Ref({ to, children }: { to: string; children: ReactNode }) {
    const { references } = useBeamMdx();
    const links = useLinks();
    const ref = resolveReference(to, references, links);

    if (!ref) {
        devWarn(
            `<Ref to="${to}"> — no such reference key (or its site is missing from links)`,
        );

        return <>{children}</>;
    }

    if (ref.status !== 'live') {
        return <>{children}</>;
    }

    return (
        <a className="sr-ref" href={ref.href}>
            {children}
        </a>
    );
}

/**
 * End-of-essay receipts: `<Receipts keys={frontmatter.references} />`. Lists each live
 * referenced sibling as a labeled row (kind · title · summary · dofollow link). Pending and
 * unknown keys are dropped; renders nothing when no live entry remains.
 */
export function Receipts({ keys }: { keys?: string[] }) {
    const { references } = useBeamMdx();
    const links = useLinks();

    if (!keys?.length) {
        return null;
    }

    const live = keys
        .map((key) => resolveReference(key, references, links))
        .filter((ref) => ref?.status === 'live');

    if (!live.length) {
        return null;
    }

    return (
        <aside className="receipts" aria-label="Receipts">
            <p className="receipts-label">Receipts</p>
            <ul>
                {live.map((ref) => (
                    <li key={ref!.key}>
                        <span className="receipts-kind">
                            {KIND_LABEL[ref!.kind]}
                        </span>
                        <a className="receipts-link" href={ref!.href}>
                            {ref!.title}
                        </a>
                        {ref!.summary ? (
                            <span className="receipts-summary">
                                {ref!.summary}
                            </span>
                        ) : null}
                    </li>
                ))}
            </ul>
        </aside>
    );
}
