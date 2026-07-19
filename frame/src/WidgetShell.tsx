import { useContext, useEffect, useState } from 'react';
import { WidgetRegistryContext, type SchemaNode, type WidgetRegistry } from '@schemastud/seam';
import { useFrameInjection } from './context';
import {
    EditShellMountProvider,
    useEditShellMountController,
    type EditShellMountValue,
} from './EditShellMount';
import { useFormSchema, useResourceRecord, useSaveResource } from './data';
import { resolveWidgetFor } from './resolveWidgetFor';
import type { Row, WidgetShellProps } from './types';

// ED-04 — materialize the `mounts: 'widget'` route path (frame 22-spine). A route
// whose entry mounts a widget renders ONE `heavyweight` widget **full-surface**,
// not a field form. This is the single, shared materialization (no divergent
// per-host copy): the host router mounts <WidgetShell> for a `mounts:'widget'`
// leaf, exactly as it mounts <EditShell> for `'edit'`.

/**
 * The pure, props-driven surface: resolve the named heavyweight widget from the
 * registry and mount it full-surface over the record. The `edit` context never
 * suppresses a heavyweight widget (only `row-cell` does), so it mounts whole.
 */
export function WidgetSurface({
    schema,
    record,
    widget,
    registry: registryProp,
    readOnly = false,
    onChange,
    onSubmit,
    mount: mountProp,
}: {
    schema: SchemaNode;
    record?: Row;
    widget: string;
    registry?: WidgetRegistry;
    readOnly?: boolean;
    onChange?: (data: Row) => void;
    onSubmit?: (data: Row) => void;
    /** The EditShellMount handshake; a standalone surface makes its own. */
    mount?: EditShellMountValue;
}) {
    const contextRegistry = useContext(WidgetRegistryContext);
    const registry = registryProp ?? contextRegistry;
    // Always create a controller (rules-of-hooks); prefer a parent-supplied one
    // (WidgetShell owns it so it can flush before persist + navigate-away).
    const ownMount = useEditShellMountController();
    const mount = mountProp ?? ownMount;

    if (!registry) {
        return <div data-frame-shell="widget-unbound">No widget registry.</div>;
    }

    const resolved = resolveWidgetFor(
        schema,
        'edit',
        { participates: true, widget, heavyweight: true },
        undefined,
        registry,
    );
    const Widget = resolved.widget;

    // A heavyweight widget resolves to a component; a bare RJSF widget name (or a
    // miss) cannot mount full-surface — surface that rather than crash.
    if (typeof Widget !== 'function') {
        return (
            <div data-frame-shell="widget-unbound" data-widget={widget}>
                Widget “{widget}” is not mounted (no registry match).
            </div>
        );
    }

    // The EditShellMount is scoped here and dies with this surface on navigate-away.
    return (
        <EditShellMountProvider value={mount}>
            <div data-frame-shell="widget" data-widget={widget}>
                <Widget
                    schema={schema}
                    formData={record ?? {}}
                    value={record ?? {}}
                    onChange={onChange}
                    onSubmit={onSubmit}
                    readOnly={readOnly}
                    editShellMount={mount}
                />
            </div>
        </EditShellMountProvider>
    );
}

/**
 * The route shell (peer of EditShell): fetches the resource's form schema +
 * record and mounts its heavyweight widget full-surface. `splicewire` mode so the
 * widget receives the host-enriched schema. Non-widget routes (EditShell /
 * ListShell) are untouched, and heavyweight-in-cell suppression still lives in
 * `resolveWidgetFor` unchanged.
 */
export function WidgetShell({ resource, id, widget, readOnly = false, onSaved }: WidgetShellProps) {
    const { can } = useFrameInjection();
    const [formData, setFormData] = useState<Row>({});
    const mount = useEditShellMountController();

    const schemaQuery = useFormSchema(resource, 'enriched');
    const recordQuery = useResourceRecord(resource, id);
    const saveMutation = useSaveResource(resource);

    useEffect(() => {
        if (recordQuery.data) setFormData(recordQuery.data);
    }, [recordQuery.data]);

    const effectiveReadOnly = readOnly || !can(id === null ? 'create' : 'update', resource);

    if (schemaQuery.isLoading || (id !== null && recordQuery.isLoading)) {
        return <div data-frame-shell="widget-loading">Loading…</div>;
    }

    const schema = schemaQuery.data ?? { type: 'object', properties: {} };

    const submit = async (data: Row) => {
        if (effectiveReadOnly) return;
        // Drain the widget's commit bus before persisting.
        await mount.flush();
        saveMutation.mutate({ id, data }, { onSuccess: (saved) => onSaved?.(saved) });
    };

    return (
        <WidgetSurface
            schema={schema}
            record={formData}
            widget={widget}
            readOnly={effectiveReadOnly}
            onChange={setFormData}
            onSubmit={submit}
            mount={mount}
        />
    );
}
