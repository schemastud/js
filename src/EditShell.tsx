import { createFormIntentBus } from '@schemastud/seam';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useFrameInjection } from './context';
import { DefaultContainer, DefaultFormBody, DefaultSaveBar, DefaultToggle } from './slots/defaults';
import { useFormSchema, useResourceRecord, useSaveResource } from './data';
import { stripHostWidgets } from './raw-mode';
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
    form: formProp = 'raw',
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
    // The mode contract: `splicewire` resolves host widgets (enrich, etc.); `raw`
    // strips them so the field falls to its inferred control (same served schema).
    const schema = form === 'raw' ? stripHostWidgets(served) : served;

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

function PageContainer({ children }: { children: ReactNode }) {
    const { primitives } = useFrameInjection();
    const Dialog = primitives.Dialog ?? primitives.SidePanel;
    return <Dialog data-frame-slot="Container">{children}</Dialog>;
}
