import { useEffect, type ReactElement, type ReactNode } from 'react';
import { isDevelopment } from './development';

export interface UnboundWidgetProps {
    /**
     * Where the name was resolved: a frame context (`edit`, `detail`, `list-item`, `row-cell`, `list-column`, `summary`,
     * `overview`), or `widget-route` for the full-surface widget route. Written to `data-frame-unbound`.
     */
    context: string;
    /** The declared name nothing binds in that context (the resolver's `name`). Written to `data-frame-unbound-widget`. */
    name: string;
    /** The field's label, drawn beside the copy. */
    label?: ReactNode;
    /** For the development error only; never rendered. */
    resource?: string;
    /** For the development error only (a JSON pointer, or the form field's id); never rendered. */
    pointer?: string;
}

/**
 * The one marker for a declared widget name nothing binds (ruling 01 §3): the same markup in every context and in
 * development and production. The user sees "Unable to display this field" and never the name; the name rides only on
 * `data-frame-unbound-widget`, for devtools, tests and host CSS. Nothing throws. In development it reports the
 * resource, the pointer, the context and the name once, with `console.error`.
 */
export function UnboundWidget({ context, name, label, resource, pointer }: UnboundWidgetProps): ReactElement {
    useEffect(() => {
        if (!isDevelopment()) return;
        const where = [resource !== undefined ? `resource "${resource}"` : '', pointer !== undefined ? `pointer "${pointer}"` : '']
            .filter(Boolean)
            .join(', ');
        console.error(`[schemastud] unbound widget "${name}" in context "${context}"${where ? ` (${where})` : ''}.`);
    }, [context, name, resource, pointer]);

    return (
        <div data-frame-unbound={context} data-frame-unbound-widget={name}>
            {label !== undefined && label !== null && label !== '' ? <span data-frame-unbound-label>{label}</span> : null}
            <span data-frame-unbound-message>Unable to display this field</span>
        </div>
    );
}
