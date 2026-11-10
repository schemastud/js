import { useContext, useEffect, useState, type ComponentType } from 'react';
import type { ResourceKey } from './resources';
import { WidgetRegistryContext, type SchemaNode, type WidgetRegistry } from '@schemastud/seam';
import { useFrameInjection } from './context';
import {
    EditShellMountProvider,
    useEditShellMountController,
    type EditShellMountValue,
} from './EditShellMount';
import { useFormSchema, useRowRecord, useRowSave } from './data';
import { resolveWidgetFor } from './resolveWidgetFor';
import type { Row, WidgetShellProps, WidgetShellPropsOf } from './types';

// ED-04 — materialize the `mounts: 'widget'` route path (frame 22-spine). A route
// whose entry mounts a widget renders ONE `heavyweight` widget **full-surface**,
// not a field form. This is the single, shared materialization (no divergent
// per-host copy): the host router mounts <WidgetShell> for a `mounts:'widget'`
// leaf, exactly as it mounts <EditShell> for `'edit'`.

/**
 * What a full-surface (heavyweight) editor receives from `WidgetSurface` (`WidgetShell`, `FiveRegionEditShell`):
 * frame's own props, not RJSF's (ruling 04 §5). The lock is `readonly`, RJSF's spelling, the one every widget
 * receives; `formData` and `value` both carry the record, because hosts read either.
 */
export interface HeavyweightWidgetProps<R = Row> {
    schema: SchemaNode;
    /** The whole record. */
    formData: R;
    /** The same record. */
    value: R;
    readonly: boolean;
    onChange?: (data: R) => void;
    onSubmit?: (data: R) => void;
    editShellMount: EditShellMountValue;
}

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
    // A heavyweight widget resolves to a component; a bare RJSF widget name (or a
    // miss) cannot mount full-surface — surface that rather than crash.
    if (typeof resolved.widget !== 'function') {
        return (
            <div data-frame-shell="widget-unbound" data-widget={widget}>
                Widget “{widget}” is not mounted (no registry match).
            </div>
        );
    }

    // Narrowed once, here: a full-surface editor takes frame's heavyweight contract.
    // The registry holds RJSF's Widget | Field; a full-surface editor is neither, and is registered through this
    // same narrowing in reverse. It is narrowed here, once, to frame's heavyweight contract (ruling 04 §5).
    const Widget = resolved.widget as unknown as ComponentType<HeavyweightWidgetProps>;

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
                    readonly={readOnly}
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
export function WidgetShell<K extends ResourceKey = ResourceKey>(typed: WidgetShellProps<K>) {
    // Typed by the key at the boundary (ruling 03); the shell itself reads records as `Row`.
    const { resource, id, widget, readOnly = false, onSaved } = typed as unknown as WidgetShellPropsOf<string>;
    const { can } = useFrameInjection();
    const [formData, setFormData] = useState<Row>({});
    const mount = useEditShellMountController();

    const schemaQuery = useFormSchema(resource, 'enriched');
    const recordQuery = useRowRecord(resource, id);
    const saveMutation = useRowSave(resource);

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
