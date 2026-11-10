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
export interface EditShellOptions<K extends ResourceKey = ResourceKey> {
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
export interface EditShellState<K extends ResourceKey = ResourceKey> {
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
    const schema = useMemo(() => schemaQuery.data ?? { type: 'object', properties: {} }, [schemaQuery.data]);

    // Seed the form once the record arrives (create starts empty).
    useEffect(() => {
        if (recordQuery.data && !dirty.current) setDraftState(recordQuery.data);
    }, [recordQuery.data, recordKey]);

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
    const ready = schemaQuery.data !== undefined && (id === null || recordQuery.data !== undefined);
    // C17 create-chrome + terminal states. A 404 record read is a DISTINCT not-found state; the
    // heading reads from the resource's singularLabel ("New <noun>" when creating).
    const recordNotFound = id !== null && recordQuery.isError && isNotFound(recordQuery.error);
    const singularLabel = manifest?.singularLabel ?? resource;
    const heading = id === null ? `New ${singularLabel}` : singularLabel;
    const loading = schemaQuery.isLoading || (id !== null && recordQuery.isLoading);
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
                  message: schemaQuery.isError ? 'Could not load this form.' : 'Could not load this record.',
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
    recordRef.current = { ...(recordQuery.data ?? {}), id };
    const actionKeys = recordActions.map((action) => action.key).join(',');
    const RecordActions = useMemo(
        () =>
            id === null || actionKeys === ''
                ? undefined
                : ({ compact }: { compact?: boolean }) => (
                      <RecordActionButtons
                          resource={resource}
                          manifest={manifest}
                          record={recordRef.current}
                          compact={compact}
                          onNavigate={onNavigate}
                          onNotice={onNotice}
                      />
                  ),
        [id, actionKeys, resource, manifest, onNavigate, onNotice],
    );

    return {
        resource,
        id,
        manifest,
        status,
        readFailure,
        schema: schema as SchemaNode,
        record: recordQuery.data,
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
    } as unknown as EditShellState<K>;
}
