import type { FrameColumn, ResolveColumns } from './types';
import type { ContextManifest, NodeParticipation } from './contexts';

const isDev = (): boolean => Boolean((import.meta as any).env?.DEV);

/**
 * The columns seam (DECISION A). v1 strategy: host-supplied FrameColumn[] IS the
 * columns — there is nothing to default from until the x-column reflection strategy
 * graduates.
 *
 * With a resource `ContextManifest` supplied, the seam folds `list-column`
 * participation into the columns: each participating field contributes its
 * `sort`/`label`, and a host FrameColumn for that field becomes a per-field render
 * override (its `cell` renderer wins — host-closure-wins-by-field). A host `columns`
 * entry naming a field with NO `list-column` participation is a wiring error (throws
 * in dev, passes through in prod). When NO manifest is supplied the seam is a pure
 * passthrough — exactly today's behavior, so existing surfaces migrate for free.
 */
export const resolveColumns: ResolveColumns = (
    _resource,
    _schema,
    hostColumns,
    manifest,
): ReturnType<ResolveColumns> => {
    if (!manifest) return hostColumns;

    const participation = listColumnParticipation(manifest);

    // Validate host columns against the manifest (dev only): a host column naming a
    // field with no `list-column` participation is a wiring error.
    if (isDev()) {
        for (const col of hostColumns) {
            if (!participation.has(col.field)) {
                throw new Error(
                    `[frame] resolveColumns: host column "${col.field}" has no list-column participation in the manifest.`,
                );
            }
        }
    }

    const hostByField = new Map(hostColumns.map((c) => [c.field, c] as const));

    // Manifest-participating fields, ordered by `sort` (stable for equal/absent sort).
    const fields = [...participation.entries()].sort(sortEntries).map(([field]) => field);

    return fields.map((field) => {
        const cm = participation.get(field)!;
        const host = hostByField.get(field);
        // Manifest supplies header/sortField defaults; a host FrameColumn overrides —
        // and its `cell` renderer wins (host-closure-wins-by-field).
        const column: FrameColumn = {
            field,
            header: host?.header ?? cm.label ?? field,
            ...(host?.sortField ? { sortField: host.sortField } : {}),
            ...(host?.cell ? { cell: host.cell } : {}),
        };
        return column;
    });
};

function listColumnParticipation(manifest: ContextManifest): Map<string, NodeParticipation> {
    const out = new Map<string, NodeParticipation>();
    for (const [key, byCtx] of Object.entries(manifest.byNode)) {
        if (key === '') continue; // list-column is per-property, never the root
        const cm = byCtx['list-column'];
        if (cm?.participates) out.set(key, cm);
    }
    return out;
}

function sortEntries(
    [, a]: [string, NodeParticipation],
    [, b]: [string, NodeParticipation],
): number {
    const av = a.sort ?? Number.POSITIVE_INFINITY;
    const bv = b.sort ?? Number.POSITIVE_INFINITY;
    return av - bv;
}
