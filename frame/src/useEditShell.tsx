import { useFrameMessages } from './messages';
import { createFormIntentBus, type FormIntentBus, type SchemaNode } from '@schemastud/seam';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { useFrameInjection } from './context';
import { DefaultFormBody, DefaultSaveBar, DefaultToggle } from './slots/defaults';
import { useFormSchema, useRowRecord, useRowSave } from './data';
import { isNotFound } from './errors';
import { resolveActions } from './actions';
import { RecordActionButtons, useInlineNotice } from './ResourceActions';
import type { ContextManifest } from './contexts';
import type { CreateResultOf, EditOf, ResourceKey, RowOf } from './resources';
import type { EditSlots, FormMode, FrameNotice, ResourceActionDefinition, Row, SchemaPurpose } from './types';

/** What `useEditShell` takes: `EditShell`'s behaviour props. */
/** What `useEditShell` takes, typed by the resource key (ruling 03). */
export interface EditShellOptions<K extends ResourceKey = ResourceKey> extends EditShellOptionsOf<K> {}
/** What `useEditShell` returns, typed by the resource key (ruling 03). */
export interface EditShellState<K extends ResourceKey = ResourceKey> extends EditShellStateOf<K> {}

/** @internal `EditShellOptions` over any string key: frame's own untyped view. Not a root export. */
export interface EditShellOptionsOf<K extends string> {
    resource: K;
    /** `null` creates. */
    id: string | null;
    readOnly?: boolean;
    /** Default `'write'`; create always reads the write projection. */
    schemaPurpose?: SchemaPurpose;
    /** Default `'enriched'`. */
    form?: FormMode;
    /** Else the injection's lookup (a kit's manifest). */
    manifest?: ContextManifest;
    onSaved?: (record: RowOf<K> | CreateResultOf<K>) => void;
    /** Where a record action whose result is `navigate` goes. */
    onNavigate?: (record: RowOf<K>) => void;
    /** Per slot: this page's, then the injection's `editSlots`, then frame's default. `Container` is `EditShell`'s. */
    slots?: Partial<Omit<EditSlots, 'Container'>>;
}

/** A form's behaviour: the reads and their state, the draft, the save and its refusal. `EditShell` renders it. */
/** @internal `EditShellState` over any string key: frame's own untyped view. Not a root export. */
export interface EditShellStateOf<K extends string> {
    resource: K;
    id: string | null;
    manifest: ContextManifest | undefined;
    /**
     * One discriminant over the reads. `not-found` is a 404 record read (the record is gone; no retry). `error` is a
     * failed read before the schema and record are present; once they are present the form is `ready`, and a failed
     * refetch is reported in `readFailure` beside it rather than taking the form away.
     */
    status: 'loading' | 'not-found' | 'error' | 'ready';
    /** The retryable read failure: the cause of `error`, or a failed refetch beside a `ready` form. */
    readFailure: { message: string; retry(): void } | undefined;
    /** As served: the form mode acts in the form's resolver, not on the schema. */
    schema: SchemaNode;
    record: RowOf<K> | EditOf<K> | undefined;
    /** The form's working data. */
    draft: Row;
    /** Marks the draft dirty, so a refetched record does not overwrite it. */
    setDraft(data: Row): void;
    form: FormMode;
    setForm(mode: FormMode): void;
    /** The `readOnly` option, or the actor may not create/update, or a read failed. */
    readOnly: boolean;
    /** `New <singular>` when creating. */
    heading: string;
    singularLabel: string;
    intentBus: FormIntentBus;
    save: {
        /** The validated path: what a form body's `onSubmit` calls. */
        submit(data: Row): void;
        /** Flush widget commits, then the registered body's submit: the save bar's `onSave`. */
        request(): void;
        registerSubmit(handler: (() => void) | null): void;
        canSubmit: boolean;
        saving: boolean;
        /** The server's refusal. */
        error: Error | null;
    };
    /** The inline notice region (absent a host `notify`), and the sink every action here reports to. */
    notice: { element: ReactNode; onNotice: (notice: FrameNotice) => void };
    actions: {
        /** The record actions this actor may press, through this transport. */
        record: ResourceActionDefinition[];
        /** Bound to this record, `onNavigate` and `notice`; `undefined` when creating or when none is pressable. */
        RecordActions: ComponentType<{ compact?: boolean }> | undefined;
    };
    slots: Omit<EditSlots, 'Container'>;
}

/**
 * A form's behaviour as a hook (ruling 02 §6): the schema and record reads with their loading, not-found and
 * retryable failure states, the draft, readonly and create gating, the save with its refusal, the record actions
 * bound, and the resolved slots. `EditShell` is its default rendering. It reads `manifestFor` and `can` from the
 * injection and never a kit's `useManifest()`, so it works under any provider.
 *
 * A change of resource, id or purpose inside one mount starts over: the draft, the dirty flag, the registered
 * submit and the save reset, and a save still in flight for the previous record settles without touching the new
 * one (no draft write, no `onSaved`, no `onSubmitted` hook).
 */
export function useEditShell<K extends ResourceKey = ResourceKey>(options: EditShellOptions<K>): EditShellState<K> {
    return useEditShellOf(options);
}

/** @internal `useEditShell` over any string key, which the shell calls (ruling 03: typed at the boundary). Not a root export. */
export function useEditShellOf<K extends string>(options: EditShellOptionsOf<K>): EditShellStateOf<K> {
    const { t } = useFrameMessages();
    // Typed by the key at the boundary (ruling 03); the behaviour itself reads records as `Row`.
    const {
        resource,
        id,
        readOnly = false,
        schemaPurpose = 'write',
        form: formOption = 'enriched',
        manifest: manifestOption,
        onSaved,
        onNavigate,
        slots,
    } = options as unknown as {
        resource: string;
        id: string | null;
        readOnly?: boolean;
        schemaPurpose?: SchemaPurpose;
        form?: FormMode;
        manifest?: ContextManifest;
        onSaved?: (record: Row) => void;
        onNavigate?: (record: Row) => void;
        slots?: Partial<Omit<EditSlots, 'Container'>>;
    };
    const { can, hooks, editSlots, manifestFor, transport, notify } = useFrameInjection();
    // Handed in, else looked up through the injection (a hook at a real host, so it is read during render).
    const manifest = manifestOption ?? manifestFor?.(resource);
    const inline = useInlineNotice();
    const onNotice = useCallback(
        (n: FrameNotice) => (notify ? notify(n) : inline.onNotice?.(n)),
        [notify, inline.onNotice],
    );
    const [form, setForm] = useState<FormMode>(formOption);
    const [draft, setDraftState] = useState<Row>({});

    const submitHandler = useRef<(() => void) | null>(null);
    const [canSubmit, setCanSubmit] = useState(false);
    const registerSubmit = useCallback((handler: (() => void) | null) => {
        submitHandler.current = handler;
        setCanSubmit(handler !== null);
    }, []);

    const dirty = useRef(false);
    const setDraft = useCallback((data: Row) => {
        dirty.current = true;
        setDraftState(data);
    }, []);
    const intentBus = useMemo(() => createFormIntentBus(), []);

    const schemaQuery = useFormSchema(resource, form, id === null ? 'write' : schemaPurpose);
    const recordQuery = useRowRecord(resource, id);
    const saveMutation = useRowSave(resource);
    // A host's `placeholderData` (say `keepPreviousData` for its lists) carries the PREVIOUS key's data while the
    // new one loads. A placeholder is never this record: it never seeds the draft, never counts as loaded, and so a
    // save cannot send it under the new id. Only the real read for the current key does.
    const record = recordQuery.isPlaceholderData ? undefined : recordQuery.data;
    const servedSchema = schemaQuery.isPlaceholderData ? undefined : schemaQuery.data;

    // A new record inside one mount starts over (React's previous-prop pattern): a dirty draft is never
    // overwritten by a refetch, so without this the previous record's draft would save under the new id.
    const recordKey = JSON.stringify([resource, id, schemaPurpose]);
    const currentKey = useRef(recordKey);
    const [seenKey, setSeenKey] = useState(recordKey);
    if (seenKey !== recordKey) {
        setSeenKey(recordKey);
        setDraftState({});
        setCanSubmit(false);
        dirty.current = false;
        submitHandler.current = null;
        currentKey.current = recordKey;
    }
    const resetSave = saveMutation.reset;
    useEffect(() => {
        resetSave();
    }, [recordKey, resetSave]);

    // A stable schema keeps SchemaForm's asynchronous ref resolution from remounting
    // its controls on each keystroke or read-status change. The served schema reaches the form
    // body as served: the form mode acts in the form's resolver (`plainData`), not on the schema.
    const schema = useMemo(() => servedSchema ?? { type: 'object', properties: {} }, [servedSchema]);

    // Seed the form once the record arrives (create starts empty).
    useEffect(() => {
        if (record && !dirty.current) setDraftState(record);
    }, [record, recordKey]);

    // Per-slot across three tiers — this page's `slots`, the injection's app-wide `editSlots`,
    // then frame's default. See FrameInjection.editSlots.
    const resolvedSlots: Omit<EditSlots, 'Container'> = {
        FormBody: slots?.FormBody ?? editSlots?.FormBody ?? DefaultFormBody,
        Toggle: slots?.Toggle ?? editSlots?.Toggle ?? DefaultToggle,
        SaveBar: slots?.SaveBar ?? editSlots?.SaveBar ?? DefaultSaveBar,
    };

    const readFailed = schemaQuery.isError || (id !== null && recordQuery.isError);
    // Detail (readOnly) still resolves against `view`; create/update gate on their action.
    const effectiveReadOnly = readOnly || !can(id === null ? 'create' : 'update', resource) || readFailed;
    const ready = servedSchema !== undefined && (id === null || record !== undefined);
    // C17 create-chrome + terminal states. A 404 record read is a DISTINCT not-found state; the
    // heading reads from the resource's singularLabel ("New <noun>" when creating).
    const recordNotFound = id !== null && recordQuery.isError && isNotFound(recordQuery.error);
    const singularLabel = manifest?.singularLabel ?? resource;
    const heading = id === null ? t("schemastud-frame::messages.new_resource", { resource: singularLabel }) : singularLabel;
    // A placeholder stands in while the real read is in flight: that is still loading.
    const loading =
        schemaQuery.isLoading ||
        schemaQuery.isPlaceholderData ||
        (id !== null && (recordQuery.isLoading || recordQuery.isPlaceholderData));
    const status = loading
        ? 'loading'
        : recordNotFound
          ? 'not-found'
          : ready
            ? 'ready'
            : readFailed
              ? 'error'
              : 'loading';

    const submit = (data: Row) => {
        if (effectiveReadOnly || !ready) return;
        const issuedFor = recordKey;
        saveMutation.mutate(
            { id, data },
            {
                onSuccess: (saved) => {
                    // A save that settles after the record changed belongs to the previous record.
                    if (currentKey.current !== issuedFor) return;
                    dirty.current = false;
                    setDraftState(saved);
                    // Fire the host-side onSubmitted hook (opt-in) with the saved/returned
                    // record BEFORE the onSaved option; both run, neither replaces the other.
                    hooks?.fireSubmitted(resource, saved, {
                        resource,
                        mode: id == null ? 'create' : 'edit',
                    });
                    onSaved?.(saved);
                },
            },
        );
    };
    const request = () => {
        if (!submitHandler.current || effectiveReadOnly || !ready) return;
        // Commit buffered widget state, including controlled form reconciliation,
        // before the registered body validates and submits its current draft.
        flushSync(() => intentBus.flushCommits());
        submitHandler.current?.();
    };

    const readFailure =
        readFailed && !recordNotFound
            ? {
                  message: schemaQuery.isError ? t("schemastud-frame::messages.could_not_load_this_form") : t("schemastud-frame::messages.could_not_load_this_record"),
                  retry: () => {
                      if (schemaQuery.isError) void schemaQuery.refetch();
                      if (id !== null && recordQuery.isError) void recordQuery.refetch();
                  },
              }
            : undefined;

    // The record actions, bound. The record is read through a ref so a refetched record does not remount the
    // buttons mid-request; the component changes only with the record id, the action keys and the handlers.
    const recordActions = resolveActions(manifest, 'record', transport);
    const recordRef = useRef<Row>({});
    recordRef.current = { ...(record ?? {}), id };
    // The manifest too: a refreshed but equal manifest must not change the component type and close an open dialog.
    const manifestRef = useRef(manifest);
    manifestRef.current = manifest;
    const actionKeys = recordActions.map((action) => action.key).join(',');
    const RecordActions = useMemo(
        () =>
            id === null || actionKeys === ''
                ? undefined
                : ({ compact }: { compact?: boolean }) => (
                      <RecordActionButtons
                          resource={resource}
                          manifest={manifestRef.current}
                          record={recordRef.current}
                          compact={compact}
                          onNavigate={onNavigate}
                          onNotice={onNotice}
                      />
                  ),
        [id, actionKeys, resource, onNavigate, onNotice],
    );

    return {
        resource,
        id,
        manifest,
        status,
        readFailure,
        schema: schema as SchemaNode,
        record,
        draft,
        setDraft,
        form,
        setForm,
        readOnly: effectiveReadOnly,
        heading,
        singularLabel,
        intentBus,
        save: {
            submit,
            request,
            registerSubmit,
            canSubmit,
            saving: saveMutation.isPending,
            error: saveMutation.error ?? null,
        },
        notice: { element: inline.element, onNotice },
        actions: { record: recordActions, RecordActions },
        slots: resolvedSlots,
    } as unknown as EditShellStateOf<K>;
}
