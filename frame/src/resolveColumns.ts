import type { FrameColumn, ResolveColumns } from './types';
import type { ContextManifest, NodeParticipation } from './contexts';
import { resolveDeclaredCell } from './columnKinds';

const isDev = (): boolean => Boolean((import.meta as any).env?.DEV);

/**
 * The columns seam (DECISION A). **Two paths, and they behave oppositely — the sentence
 * that used to open this docblock ("host-supplied FrameColumn[] IS the columns — there is
 * nothing to default from") described only the first and was read as describing both.**
 * That reading is why every surface in the estate still hand-writes a full column list it
 * no longer has to.
 *
 * **No manifest ⇒ pure passthrough.** `hostColumns` is returned untouched, so there really
 * is nothing to default from and the host owns the whole set + its order. This is the
 * pre-manifest behavior, kept byte-identical so existing surfaces migrate for free.
 *
 * **A manifest ⇒ the MANIFEST is the columns.** The column SET and its ORDER come entirely
 * from `list-column` participation — every participating node, sorted by `sort` — and each
 * field's `header` defaults to the manifest's `label`. `hostColumns` is no longer the set:
 * it is a **per-field override map**, consulted only for fields the manifest already
 * carries, supplying `header` / `sortField` / `cell` (host-closure-wins-by-field). Passing
 * ZERO host columns is therefore legal and complete — it yields the full manifest-derived,
 * sort-ordered set. A host column naming a field with NO `list-column` participation is a
 * wiring error (throws in dev, passes through in prod); it cannot add a column, because
 * there is no participation entry to add one from.
 *
 * **A manifest also decides how a cell RENDERS.** `list-column` participation carries a
 * `widget` name — it always has, and until now nothing on the client read it, so a
 * declaration could say `#[Column('badge')]` and the host still had to hand-write the
 * closure. That name is now resolved through {@link resolveDeclaredCell} into a `cell`
 * renderer drawn from frame's derived column-kind vocabulary (`text` / `badge` / `badges`
 * / `number` / `date`). Precedence is unchanged where it already existed: a host `cell`
 * still wins by field, and a kind frame does not know resolves to nothing and falls to the
 * default cell. `cellSource` records which of the two produced the renderer, because one
 * downstream consumer — the `row-cell` editable-in-place wiring in `ListShell` — keys off
 * "did a HOST supply a cell", and a synthesized one must not be mistaken for that.
 *
 * A field may be a DOTTED pointer (`commerce.plan`) when a producer above frame folds a named
 * sub-projection onto the row. Nothing here needs to change for it: `byNode` is keyed by the full
 * pointer, so participation lookup, ordering and the host-column check all match on the dotted
 * string as-is. Depth only matters where the VALUE is read — see `getPath`.
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
        // The DECLARED cell — the manifest's `widget` naming a presentation kind
        // (`badge`/`date`/`number`/…), resolved to a renderer. A host `cell` still wins:
        // host-closure-wins-by-field is the existing contract and a declaration is a
        // DEFAULT for it, never a replacement.
        const declared = host?.cell ? undefined : resolveDeclaredCell(field, cm);
        // Manifest supplies header/sortField defaults; a host FrameColumn overrides —
        // and its `cell` renderer wins (host-closure-wins-by-field).
        const column: FrameColumn = {
            field,
            header: host?.header ?? cm.label ?? field,
            ...(host?.sortField ? { sortField: host.sortField } : {}),
            ...(host?.cell ? { cell: host.cell, cellSource: 'host' as const } : {}),
            ...(declared ? { cell: declared, cellSource: 'declared' as const } : {}),
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
