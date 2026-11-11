import type { ReactNode } from 'react';
import type { FrameColumn, ResolveColumns, Row } from './types';
import type { ContextManifest, NodeParticipation } from './contexts';
import { ColumnWidgetCell } from './columnKinds';
import { getPath } from './getPath';
import { isWidgetComponent, resolveWidgetFor } from './resolveWidgetFor';
import { UnboundWidget, displayLabel, type SchemaNode, type WidgetRegistry } from '@schemastud/seam';

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
 * `widget` name, a column kind, and a column kind is a widget (ruling 01 §4): the name resolves
 * through `resolveWidgetFor` in the `list-column` context against `registry`, where frame registers
 * its kinds (`text` / `badge` / `badges` / `number` / `date`) scoped to `list-column`, and the
 * resolved component mounts through seam's `widgetProps`. A name nothing binds draws the unbound
 * marker; a stock RJSF name, or no name, falls to the default cell. Only the column's own entry
 * resolves: the node's form binding (`x-widget`) never reaches a list cell. A host `cell` still
 * wins by field. `cellSource` records which of the two produced the renderer, because one
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
    registry,
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
    const root = _schema as SchemaNode | undefined;
    const properties = (root?.properties ?? {}) as Record<string, SchemaNode>;

    // Manifest-participating fields, ordered by `sort` (stable for equal/absent sort).
    const fields = [...participation.entries()].sort(sortEntries).map(([field]) => field);

    return fields.map((field) => {
        const cm = participation.get(field)!;
        const host = hostByField.get(field);
        // The DECLARED cell — the manifest's `widget` naming a presentation kind
        // (`badge`/`date`/`number`/…), resolved to a renderer. A host `cell` still wins:
        // host-closure-wins-by-field is the existing contract and a declaration is a
        // DEFAULT for it, never a replacement.
        const header = host?.header ?? displayLabel({ title: cm.label }, field, { property: true });
        // FLAT, as `withEditableCells` reads it: `byNode` keys a dotted pointer whole.
        const declared = host?.cell ? undefined : declaredCell(field, cm, properties[field], root, registry, header);
        // Manifest supplies header/sortField defaults; a host FrameColumn overrides —
        // and its `cell` renderer wins (host-closure-wins-by-field).
        const column: FrameColumn = {
            field,
            header,
            ...(host?.sortField ? { sortField: host.sortField } : {}),
            ...(host?.headerControl ? { headerControl: host.headerControl } : {}),
            ...(host?.cell ? { cell: host.cell, cellSource: 'host' as const } : {}),
            ...(declared ? { cell: declared, cellSource: 'declared' as const } : {}),
        };
        return column;
    });
};

/**
 * The cell a column's declared kind draws, or `undefined` for the default cell. Only a NAMED entry resolves: a
 * column with no kind never picks up a predicate widget. The name resolves against the property with its own form
 * binding (`x-widget`) removed; its `x-widget-options` stay, beneath the column entry's (ruling 01 §3, §4). The
 * widget mounts over the property as served.
 */
function declaredCell(
    field: string,
    entry: NodeParticipation,
    property: SchemaNode | undefined,
    root: SchemaNode | undefined,
    registry: WidgetRegistry,
    header: string,
): ((record: Row) => ReactNode) | undefined {
    if (!entry.widget) return undefined;
    // Only the node the name resolves against: `{ type: 'string' }` stands in for a property the list schema lacks.
    const { 'x-widget': _formBinding, ...node } = property ?? ({ type: 'string' } as SchemaNode);
    const resolved = resolveWidgetFor(node, 'list-column', entry, undefined, registry);
    if (isWidgetComponent(resolved.widget)) {
        const widget = resolved.widget as Parameters<typeof ColumnWidgetCell>[0]['widget'];
        return (record: Row) => (
            <ColumnWidgetCell
                widget={widget}
                property={property}
                rootSchema={root}
                field={field}
                header={header}
                value={getPath(record, field)}
                options={resolved.options}
            />
        );
    }
    if (resolved.bound === false && resolved.name !== undefined) {
        const name = resolved.name;
        return () => <UnboundWidget context="list-column" name={name} label={header} pointer={`/${field}`} />;
    }
    return undefined;
}

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
