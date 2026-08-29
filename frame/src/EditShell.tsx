import { createFormIntentBus } from '@schemastud/seam';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useFrameInjection } from './context';
import { DefaultContainer, DefaultFormBody, DefaultSaveBar, DefaultToggle } from './slots/defaults';
import { useFormSchema, useResourceRecord, useSaveResource } from './data';
import { bridgeHostWidgets, stripHostWidgets } from './raw-mode';
import type { EditShellProps, FormMode, Row } from './types';

/**
 * The edit surface (create when id === null; detail = <EditShell readOnly/> — no
 * distinct DetailShell). Renders a form from `transport.getFormSchema` (the server's
 * forRequest() output), tracks edits, and submits via `transport.save`. The host's
 * persist strategy sits BELOW the transport; the shell is blind to which strategy
 * runs. Every slot has a frame default the host may override.
 */
export function EditShell({
    resource,
    id,
    readOnly = false,
    container = 'panel',
    form: formProp = 'bare',
    showModeToggle = false,
    onSaved,
    onCancel,
    slots,
}: EditShellProps) {
    const { can, hooks } = useFrameInjection();
    const [form, setForm] = useState<FormMode>(formProp);
    const [formData, setFormData] = useState<Row>({});

    const intentBus = useMemo(() => createFormIntentBus(), []);

    const schemaQuery = useFormSchema(resource, form);
    const recordQuery = useResourceRecord(resource, id);
    const saveMutation = useSaveResource(resource);

    // Seed the form once the record arrives (create starts empty).
    useEffect(() => {
        if (recordQuery.data) setFormData(recordQuery.data);
    }, [recordQuery.data]);

    const FormBody = slots?.FormBody ?? DefaultFormBody;
    const Toggle = slots?.Toggle ?? DefaultToggle;
    const SaveBar = slots?.SaveBar ?? DefaultSaveBar;
    const Container = slots?.Container ?? (container === 'page' ? PageContainer : DefaultContainer);

    // Detail (readOnly) still resolves against `view`; create/update gate on their action.
    const effectiveReadOnly = readOnly || !can(id === null ? 'create' : 'update', resource);

    const submit = (data: Row) => {
        if (effectiveReadOnly) return;
        saveMutation.mutate(
            { id, data },
            {
                onSuccess: (saved) => {
                    // Fire the host-side onSubmitted hook (opt-in) with the saved/returned
                    // record BEFORE the onSaved prop; both run, neither replaces the other.
                    hooks?.fireSubmitted(resource, saved, {
                        resource,
                        mode: id == null ? 'create' : 'edit',
                    });
                    onSaved?.(saved);
                },
            },
        );
    };

    if (schemaQuery.isLoading || (id !== null && recordQuery.isLoading)) {
        return <div data-frame-shell="edit-loading">Loading…</div>;
    }

    const served = schemaQuery.data ?? { type: 'object', properties: {} };
    // The mode contract: `enriched` resolves host widgets (enrich, etc.); `bare`
    // strips them so the field falls to its inferred control (same served schema).
    const schema = form === 'bare' ? stripHostWidgets(served) : bridgeHostWidgets(served);

    return (
        <Container>
            <div data-frame-shell="edit">
                {showModeToggle && !effectiveReadOnly ? (
                    <Toggle value={form} onChange={setForm} />
                ) : null}
                <FormBody
                    schema={schema}
                    formData={formData}
                    intentBus={intentBus}
                    readOnly={effectiveReadOnly}
                    form={form}
                    onChange={setFormData}
                    onSubmit={submit}
                />
                <SaveBar
                    saving={saveMutation.isPending}
                    readOnly={effectiveReadOnly}
                    onSave={() => submit(formData)}
                    onCancel={onCancel}
                />
            </div>
        </Container>
    );
}

/**
 * The `container="page"` container — a full-surface region, never an overlay.
 *
 * ⚠️ **This used to render `primitives.Dialog ?? primitives.SidePanel`, and the fallback was a silent
 * lie.** `Dialog` is OPTIONAL on `FramePrimitives`, so a host that registers only `SidePanel` — which is
 * every host in this estate; the flagship's `ui/src/frame/primitives.tsx` registers `SidePanel` and no
 * `Dialog` — got a DRAWER on a route that asked for a page. It typechecked, it rendered, and nothing
 * reported it. Anything driving `container: 'page'` from a declaration (see `createMountDispatcher`)
 * would have shipped a drawer on every full-page edit route.
 *
 * The fallback is now a plain block element, which is what "page" means. A host that wants chrome
 * registers the new optional `Page` primitive; nothing falls back to an overlay, because an overlay is a
 * different thing rather than a lesser version of the same thing.
 */
function PageContainer({ children }: { children: ReactNode }) {
    const { primitives } = useFrameInjection();
    const Page = primitives.Page;

    if (Page) {
        return <Page data-frame-slot="Container">{children}</Page>;
    }

    return (
        <div data-frame-slot="Container" data-frame-container="page">
            {children}
        </div>
    );
}
