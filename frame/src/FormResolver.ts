import type { SchemaNode } from '@schemastud/seam';
import type { FormResolver } from './types';

/**
 * The **kind** of a schema is the terminal segment of its `$id` (e.g. `…/kind/series` → `series`).
 * Host-independent (unlike the full `$id`, which carries origin/version), so it is the stable key a
 * canonical form registers against.
 */
export function kindOfSchema(schema: SchemaNode): string {
    const id = typeof schema.$id === 'string' ? schema.$id : '';
    return id.split('/').pop() ?? '';
}

/**
 * A registry for **canonical whole-object forms** keyed by schema identity — the peer of the
 * per-field `WidgetRegistry`, resolved at the object root. Register a form by its schema `kind`
 * (the ergonomic key) or a `(schema) => boolean` predicate (the escape hatch for precision/
 * collisions). Resolution order is **root `x-widget` > form-by-kind > form-by-predicate > generic**:
 * an explicit root `x-widget` always wins (heavyweight editors — circuit-graph etc. — are
 * unaffected), then a registered kind, then a predicate, else the generic schema form.
 *
 * Optional on {@see FrameInjection}: absent, every object root renders the generic form (zero
 * migration). `DefaultFormBody` consults it before falling through to `SchemaForm`.
 */
export function createFormResolver(): FormResolver {
    const byKind = new Map<string, Parameters<FormResolver['registerFormForSchema']>[1]>();
    const predicates: Array<[(s: SchemaNode) => boolean, Parameters<FormResolver['registerFormForSchema']>[1]]> = [];

    return {
        registerFormForSchema(match, form) {
            if (typeof match === 'string') {
                byKind.set(match, form);
            } else {
                predicates.unshift([match, form]); // latest registration wins
            }
        },
        resolveFormForSchema(schema) {
            // Root x-widget wins — a heavyweight editor is bound extrinsically; not a form match.
            if (typeof schema['x-widget'] === 'string') {
                return { form: null, reason: 'x-widget' };
            }
            const kind = kindOfSchema(schema);
            if (kind !== '') {
                const hit = byKind.get(kind);
                if (hit) return { form: hit, reason: 'by-kind' };
            }
            for (const [predicate, form] of predicates) {
                if (predicate(schema)) return { form, reason: 'by-predicate' };
            }
            return { form: null, reason: 'generic' };
        },
    };
}
