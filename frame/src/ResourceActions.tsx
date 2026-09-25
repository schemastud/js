import { createFormIntentBus } from '@schemastud/seam';
import type { SchemaNode } from '@schemastud/seam';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transportScope } from '@schemastud/facets';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { FrameActionError, navigateTarget, resolveActions } from './actions';
import type { ContextManifest } from './contexts';
import { useFrameInjection } from './context';
import { resourceQueryKey } from './data';
import { DefaultFormBody } from './slots/defaults';
import type { ActionResult, FrameNotice, ResourceActionDefinition, Row } from './types';

// =============================================================================
// Declared ACTIONS (schemastud/laravel-frame ADR-0005): a button per action the manifest declares and
// this actor may press, a form from the action's declared input (or a confirmation when it has none),
// and the declared result — the response's message plus a refetch, or navigation.
//
// Styling is inline + primitives only, never class names: a host's Tailwind does not scan
// `node_modules`, so a `className` here would render markup with no styles behind it.
// =============================================================================

export interface ActionHandlers {
    /** Where a `navigate` result goes. Absent, a navigate action refreshes like a toast one. */
    onNavigate?: (record: Row) => void;
    /** The shell's fallback notice sink, used when the injection binds no `notify`. */
    onNotice?: (notice: FrameNotice) => void;
}

/** The resource-scope actions — the buttons beside the list's "New". Renders nothing when none are pressable. */
export function ResourceActionBar({
    resource,
    manifest,
    ...handlers
}: { resource: string; manifest: ContextManifest | undefined } & ActionHandlers) {
    const { transport } = useFrameInjection();
    const actions = resolveActions(manifest, 'resource', transport);

    if (actions.length === 0) return null;

    return (
        <div
            data-frame-slot="ResourceActions"
            style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexShrink: 0 }}
        >
            {actions.map((action) => (
                <ActionButton key={action.key} resource={resource} action={action} {...handlers} />
            ))}
        </div>
    );
}

/** The record-scope actions for one record — on a list row and on the detail page. */
export function RecordActionButtons({
    resource,
    manifest,
    record,
    compact = false,
    ...handlers
}: {
    resource: string;
    manifest: ContextManifest | undefined;
    record: Row;
    /** Row rendering: quieter buttons that do not open the row behind them. */
    compact?: boolean;
} & ActionHandlers) {
    const { transport } = useFrameInjection();
    const actions = resolveActions(manifest, 'record', transport);

    if (actions.length === 0 || record.id == null || record.id === '') return null;

    return (
        <div
            data-frame-slot="RecordActions"
            style={{ display: 'flex', gap: compact ? '0.25rem' : '0.5rem', justifyContent: 'flex-end' }}
        >
            {actions.map((action) => (
                <ActionButton
                    key={action.key}
                    resource={resource}
                    action={action}
                    record={record}
                    compact={compact}
                    {...handlers}
                />
            ))}
        </div>
    );
}

/**
 * One action: the button, then either the form (declared input) or a confirmation (confirm-only), then
 * the request and its declared result.
 */
export function ActionButton({
    resource,
    action,
    record,
    compact = false,
    onNavigate,
    onNotice,
}: {
    resource: string;
    action: ResourceActionDefinition;
    record?: Row;
    compact?: boolean;
} & ActionHandlers) {
    const { primitives, transport, notify } = useFrameInjection();
    const { Button } = primitives;
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);

    const notice = useCallback(
        (n: FrameNotice) => (notify ? notify(n) : onNotice?.(n)),
        [notify, onNotice],
    );

    const invoke = useMutation<ActionResult, Error, Row | undefined>({
        mutationKey: resourceQueryKey(transport, resource, 'action', action.key),
        mutationFn: (data) => {
            if (!transport.invoke) throw new Error('This host cannot send actions.');
            return transport.invoke(action, {
                id: record?.id == null ? null : String(record.id),
                data,
            });
        },
        onSuccess: (result) => {
            setOpen(false);
            notice({ tone: 'success', message: result.message || `${action.label} done.` });

            const target = action.result === 'navigate' ? navigateTarget(result, record) : null;
            if (target !== null && onNavigate) {
                onNavigate({ id: target });
                return;
            }

            // The declared default: refetch everything this resource's reads hold, in this transport's
            // cache scope — the same invalidation a Frame save performs.
            void queryClient.invalidateQueries({
                queryKey: ['frame', resource],
                predicate: (query) => query.queryKey.at(-1) === transportScope(transport),
            });
        },
        onError: (error) => {
            // A 422 is shown on the form it belongs to; every other refusal is also announced.
            if (!(error instanceof FrameActionError && error.status === 422 && action.input !== null)) {
                notice({ tone: 'error', message: error.message || `${action.label} failed.` });
            }
        },
    });

    return (
        <>
            <Button
                type="button"
                data-frame-action={action.key}
                data-frame-action-scope={action.scope}
                disabled={invoke.isPending}
                // On a row, a quiet outline button (a destructive one says so in its text colour, never
                // as a solid block per row); beside the list, the host's primary or destructive button.
                variant={compact ? 'outline' : action.destructive ? 'destructive' : undefined}
                size={compact ? 'sm' : undefined}
                style={compact && action.destructive ? { color: 'var(--destructive, #dc2626)' } : undefined}
                onClick={(event: { stopPropagation?: () => void }) => {
                    // On a row, the row itself opens the record; the action must not do both.
                    event?.stopPropagation?.();
                    invoke.reset();
                    setOpen(true);
                }}
            >
                {action.label}
            </Button>
            {open ? (
                <ActionDialog
                    resource={resource}
                    action={action}
                    pending={invoke.isPending}
                    error={invoke.error}
                    onCancel={() => setOpen(false)}
                    onSubmit={(data) => invoke.mutate(data)}
                />
            ) : null}
        </>
    );
}

/**
 * The action's dialog: its form, or its confirmation. Rendered through the host's optional `Dialog`
 * primitive (handed a `title`), else inline as a `role="dialog"` region — never through `SidePanel`,
 * which is a record surface, not a question.
 */
function ActionDialog({
    resource,
    action,
    pending,
    error,
    onCancel,
    onSubmit,
}: {
    resource: string;
    action: ResourceActionDefinition;
    pending: boolean;
    error: Error | null;
    onCancel: () => void;
    onSubmit: (data: Row | undefined) => void;
}) {
    const { primitives, editSlots } = useFrameInjection();
    const { Button } = primitives;
    const Dialog = primitives.Dialog;
    const FormBody = editSlots?.FormBody ?? DefaultFormBody;

    const [formData, setFormData] = useState<Row>({});
    const submitHandler = useRef<(() => void) | null>(null);
    const [canSubmit, setCanSubmit] = useState(false);
    const registerSubmit = useCallback((handler: (() => void) | null) => {
        submitHandler.current = handler;
        setCanSubmit(handler !== null);
    }, []);
    const intentBus = useMemo(() => createFormIntentBus(), []);
    const schemaQuery = useActionSchema(resource, action);

    const fieldErrors =
        error instanceof FrameActionError && error.status === 422 ? error.errors : {};
    const fieldErrorLines = Object.entries(fieldErrors).flatMap(([, messages]) => messages);

    // The dialog already carries the action's label as its title; the input class's own root title
    // ("Reload credits") would say it a second time inside the form.
    const formSchema = useMemo(() => {
        if (!schemaQuery.data) return undefined;
        const { title: _title, ...rest } = schemaQuery.data as SchemaNode & { title?: unknown };
        return rest as SchemaNode;
    }, [schemaQuery.data]);

    const hasForm = action.input !== null;
    const ready = !hasForm || schemaQuery.data !== undefined;

    const body: ReactNode = (
        <div
            data-frame-action-dialog={action.key}
            role={Dialog ? undefined : 'dialog'}
            aria-label={action.label}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
        >
            {Dialog ? null : <strong>{action.label}</strong>}
            {hasForm ? (
                schemaQuery.isError ? (
                    <div role="alert">Could not load this form.</div>
                ) : schemaQuery.data === undefined ? (
                    <div data-frame-shell="action-loading">Loading…</div>
                ) : (
                    <FormBody
                        schema={formSchema ?? schemaQuery.data}
                        formData={formData}
                        intentBus={intentBus}
                        readOnly={pending}
                        form="bare"
                        onChange={setFormData}
                        onSubmit={(data) => onSubmit(data)}
                        registerSubmit={registerSubmit}
                    />
                )
            ) : (
                <p style={{ margin: 0 }}>
                    {action.destructive
                        ? `${action.label}? This cannot be undone.`
                        : `${action.label}?`}
                </p>
            )}
            {error ? (
                <div role="alert" data-frame-action-error="">
                    {fieldErrorLines.length > 0 ? fieldErrorLines.join(' ') : error.message}
                </div>
            ) : null}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <Button type="button" variant="outline" onClick={onCancel} data-frame-action="cancel">
                    Cancel
                </Button>
                <Button
                    type="button"
                    data-frame-action="confirm"
                    variant={action.destructive ? 'destructive' : undefined}
                    disabled={pending || !ready || (hasForm && !canSubmit)}
                    onClick={() => {
                        if (!hasForm) {
                            onSubmit(undefined);
                            return;
                        }
                        // Commit buffered widget state before the registered body validates and submits.
                        flushSync(() => intentBus.flushCommits());
                        submitHandler.current?.();
                    }}
                >
                    {pending ? 'Working…' : action.label}
                </Button>
            </div>
        </div>
    );

    if (Dialog) {
        return (
            <Dialog
                open
                title={action.label}
                onOpenChange={(next: boolean) => {
                    if (!next) onCancel();
                }}
            >
                {body}
            </Dialog>
        );
    }

    return body;
}

function useActionSchema(resource: string, action: ResourceActionDefinition) {
    const { transport } = useFrameInjection();

    return useQuery<SchemaNode>({
        queryKey: resourceQueryKey(transport, resource, 'action-schema', action.key),
        enabled: action.input !== null && typeof transport.getActionSchema === 'function',
        placeholderData: undefined,
        queryFn: () => transport.getActionSchema!(resource, action.key),
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * The inline notice region a shell renders when the host binds no `notify` — so an action's result is
 * never silent. Returns the sink to hand the action buttons and the element to place.
 */
export function useInlineNotice(): {
    onNotice: ((notice: FrameNotice) => void) | undefined;
    element: ReactNode;
} {
    const { notify } = useFrameInjection();
    const [notice, setNotice] = useState<FrameNotice | null>(null);

    return {
        onNotice: notify ? undefined : setNotice,
        element:
            !notify && notice ? (
                <div
                    role={notice.tone === 'error' ? 'alert' : 'status'}
                    data-frame-notice={notice.tone}
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        marginBottom: '0.75rem',
                        borderRadius: '0.375rem',
                        border: '1px solid currentColor',
                        color: notice.tone === 'error' ? 'var(--destructive, #dc2626)' : 'inherit',
                    }}
                >
                    <span>{notice.message}</span>
                    <button
                        type="button"
                        aria-label="Dismiss"
                        onClick={() => setNotice(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                    >
                        ×
                    </button>
                </div>
            ) : null,
    };
}
