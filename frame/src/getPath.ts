/**
 * Read a possibly-DOTTED field pointer off a record: `getPath(row, 'commerce.plan')`.
 *
 * ## Why frame needs this
 *
 * A column's `field` used to be a bare property name, because a resource's row was one Data
 * class flat. It is not any more: a producer above frame may fold a named SUB-PROJECTION onto a
 * row (`row.commerce.plan`), and it declares that node in the manifest under the dotted pointer
 * `commerce.plan`. `byNode` is a plain string map, so the dotted pointer needed no schema change
 * on the wire — but every place that indexed a record FLAT by `col.field` would miss it and
 * render blank.
 *
 * Frame learns nothing about who folded the slice or why. It learns only that a field pointer
 * may have depth.
 *
 * ## Deliberately not applied everywhere a `col.field` appears
 *
 * Two neighbouring lookups take a dotted pointer and must NOT be path-resolved:
 *
 *  - `manifest.byNode[field]` is keyed by the FULL dotted pointer — flat indexing is already
 *    correct there, and traversing would look for a `byNode.commerce` node that does not exist.
 *  - a JSON Schema's `properties[field]` nests through a `properties` hop per level, so plain
 *    dot-traversal is the WRONG traversal for it. (It is also unreachable for a dotted field:
 *    the only caller is the inline-editor path, and a producer folding a slice is refused
 *    `row-cell` participation at registration precisely because a slice has no writer.)
 *
 * Missing intermediate ⇒ `undefined`, exactly as a flat miss returns today, so a column whose
 * slice is absent renders empty rather than throwing.
 */
export function getPath(record: unknown, field: string): unknown {
    if (!field.includes('.')) {
        return (record as Record<string, unknown> | null | undefined)?.[field];
    }

    let cursor: unknown = record;

    for (const segment of field.split('.')) {
        if (cursor === null || cursor === undefined || typeof cursor !== 'object') {
            return undefined;
        }

        cursor = (cursor as Record<string, unknown>)[segment];
    }

    return cursor;
}
