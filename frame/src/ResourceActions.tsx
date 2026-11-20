import { useFrameMessages } from './messages';
import { createFormIntentBus } from '@schemastud/seam';
import type { SchemaNode } from '@schemastud/seam';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transportScope } from '@schemastud/facets';
import { useCallback, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { FrameActionError, navigateTarget, resolveActions } from './actions';
import type { ContextManifest } from './contexts';
import { useFrameInjection } from './context';
import { resourceQueryKey } from './data';
import { DefaultFormBody } from './slots/defaults';
import type { ActionLock, ActionResult, FrameNotice, ResourceActionDefinition, Row } from './types';

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
    const { primitives, transport, notify, actionLock } = useFrameInjection();
    const { Button } = primitives;
    const { t } = useFrameMessages();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    // A host lock (agreements 06): asked only about an action that carries `requires`, on every render. Null leaves
    // everything below exactly as it was, attribute for attribute; a lock that throws is treated as null, so a broken
    // host lock never takes the action bar down with it.
    let lock: ActionLock | null = null;
    if (actionLock && action.requires !== undefined && action.requires.length > 0) {
        try {
            lock = actionLock(resource, action, record);
        } catch {
            lock = null;
        }
    }
    const lockLabelId = useId();
    // While the host's unlock() runs the button stays focusable (aria-disabled, never native `disabled`, which drops
    // focus to <body> and leaves the host's dialog nowhere to return it); the ref ignores a second press.
    const [unlockPending, setUnlockPending] = useState(false);
    const unlockInFlight = useRef(false);
    const trigger = useRef<HTMLElement | null>(null);
    const close = useCallback(() => {
        setOpen(false);
        // A host Dialog need not use its own Trigger primitive. Restore the actual invoking
        // action after unmount, including cancel/escape and successful form submission.
        queueMicrotask(() => trigger.current?.focus());
    }, []);

    const notice = useCallback(
        (n: FrameNotice) => (notify ? notify(n) : onNotice?.(n)),
        [notify, onNotice],
    );

    const invoke = useMutation<ActionResult, Error, Row | undefined>({
        mutationKey: resourceQueryKey(transport, resource, 'action', action.key),
        mutationFn: (data) => {
            if (!transport.invoke) throw new Error(t("schemastud-frame::messages.host_cannot_send_actions"));
            return transport.invoke(action, {
                id: record?.id == null ? null : String(record.id),
                data,
            });
        },
        onSuccess: (result) => {
            close();
            notice({ tone: 'success', message: result.message || t("schemastud-frame::messages.action_done", { label: action.label }) });

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
                notice({ tone: 'error', message: error.message || t("schemastud-frame::messages.action_failed", { label: action.label }) });
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
                {...(lock !== null
                    ? {
                          'aria-describedby': lockLabelId,
                          'data-frame-action-locked': '',
                          ...(unlockPending ? { 'aria-disabled': 'true' } : {}),
                      }
                    : {})}
                // On a row, a quiet outline button (a destructive one says so in its text colour, never
                // as a solid block per row); beside the list, the host's primary or destructive button.
                variant={compact ? 'outline' : action.destructive ? 'destructive' : undefined}
                size={compact ? 'sm' : undefined}
                style={compact && action.destructive ? { color: 'var(--destructive, #dc2626)' } : undefined}
                onClick={(event: { stopPropagation?: () => void; currentTarget?: HTMLElement }) => {
                    // On a row, the row itself opens the record; the action must not do both.
                    event?.stopPropagation?.();
                    trigger.current = event.currentTarget ?? null;
                    if (lock === null) {
                        invoke.reset();
                        setOpen(true);
                        return;
                    }
                    // Locked: the host's step runs first, and nothing is sent until it resolves true. A false answer
                    // leaves the action as it was; a rejection (or a throw) leaves it locked and is announced.
                    if (unlockInFlight.current) return;
                    unlockInFlight.current = true;
                    setUnlockPending(true);
                    let unlocked: Promise<boolean>;
                    try {
                        unlocked = Promise.resolve(lock.unlock());
                    } catch (error) {
                        unlocked = Promise.reject(error);
                    }
                    unlocked
                        .then((unlocked) => {
                            if (unlocked === true) {
                                invoke.reset();
                                setOpen(true);
                            }
                        })
                        .catch((error: unknown) =>
                            notice({
                                tone: 'error',
                                message:
                                    error instanceof Error && error.message !== ''
                                        ? error.message
                                        : t('schemastud-frame::messages.action_unlock_failed', { label: action.label }),
                            }),
                        )
                        .finally(() => {
                            unlockInFlight.current = false;
                            setUnlockPending(false);
                        });
                }}
            >
                {lock !== null ? (
                    <>
                        <LockGlyph />
                        {action.label}
                    </>
                ) : (
                    action.label
                )}
            </Button>
            {lock !== null ? (
                <span id={lockLabelId} style={VISUALLY_HIDDEN}>
                    {lock.label}
                </span>
            ) : null}
            {open ? (
                <ActionDialog
                    resource={resource}
                    action={action}
                    pending={invoke.isPending}
                    error={invoke.error}
                    onCancel={close}
                    onSubmit={(data) => invoke.mutate(data)}
                />
            ) : null}
        </>
    );
}

/** Read by assistive technology, not drawn: the lock's reason, which the locked button names as its description. */
const VISUALLY_HIDDEN = {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
} as const;

/** A small padlock beside a locked action's label; decorative, since the description says why. Inline: no class names. */
function LockGlyph() {
    return (
        <svg
            aria-hidden="true"
            focusable="false"
            width="12"
            height="12"
            viewBox="0 0 16 16"
            style={{ marginInlineEnd: '0.375rem', verticalAlign: '-1px' }}
        >
            <path
                fill="currentColor"
                d="M4 7V5a4 4 0 1 1 8 0v2h.5A1.5 1.5 0 0 1 14 8.5v5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5v-5A1.5 1.5 0 0 1 3.5 7H4Zm2 0h4V5a2 2 0 1 0-4 0v2Z"
            />
        </svg>
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
    const { t } = useFrameMessages();
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
                    <div role="alert">{t("schemastud-frame::messages.could_not_load_this_form")}</div>
                ) : schemaQuery.data === undefined ? (
                    <div data-frame-shell="action-loading">{t("schemastud-frame::messages.loading")}</div>
                ) : (
                    <FormBody
                        schema={formSchema ?? schemaQuery.data}
                        formData={formData}
                        intentBus={intentBus}
                        readOnly={pending}
                        form="enriched"
                        onChange={setFormData}
                        onSubmit={(data) => onSubmit(data)}
                        registerSubmit={registerSubmit}
                    />
                )
            ) : (
                <p style={{ margin: 0 }}>
                    {action.destructive
                        ? t("schemastud-frame::messages.label_this_cannot_be_undone", { label: action.label })
                        : t("schemastud-frame::messages.actions.confirm", { label: action.label })}
                </p>
            )}
            {error ? (
                <div role="alert" data-frame-action-error="">
                    {fieldErrorLines.length > 0 ? fieldErrorLines.join(' ') : error.message}
                </div>
            ) : null}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <Button type="button" variant="outline" onClick={onCancel} data-frame-action="cancel">{t("schemastud-frame::messages.cancel")}</Button>
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
                    {pending ? t("schemastud-frame::messages.working") : action.label}
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
    const { t } = useFrameMessages();
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
                        aria-label={t("schemastud-frame::messages.dismiss")}
                        onClick={() => setNotice(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                    >
                        ×
                    </button>
                </div>
            ) : null,
    };
}
