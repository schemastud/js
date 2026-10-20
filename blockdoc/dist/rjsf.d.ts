import { UiSchema } from '@rjsf/utils';
import { ComponentType } from 'react';
import { B as BlockdocManifest } from './types-Cir_z1Em.js';
import { C as CommitPolicy, N as NodeViewRegistry, D as DocJson } from './node-views-CQ_ytj5D.js';
import '@tiptap/pm/model';
import '@tiptap/pm/view';
import '@tiptap/react';
import '@schemastud/seam';

/**
 * The seam uiSchema walker emits `ui:field` (not ui:widget) for
 * component resolutions on object/array nodes, so this component is mounted
 * as an RJSF FIELD for object-typed doc values — while plain hosts may mount
 * it with widget-signature props. It accepts both and normalizes internally.
 */
interface RichContentProps {
    formData?: unknown;
    schema?: Record<string, unknown>;
    uiSchema?: UiSchema;
    registry?: {
        formContext?: Record<string, unknown>;
    };
    formContext?: Record<string, unknown>;
    /** RJSF v6 field-path identity; its `path` must ride every onChange or the update lands on the root. */
    fieldPathId?: {
        path?: Array<string | number>;
    };
    value?: unknown;
    options?: Record<string, unknown>;
    onChange?: (doc: DocJson, path?: Array<string | number>) => void;
}
/**
 * The formContext intent-bus seam (structurally the seam
 * FormIntentBus — typed here so blockdoc takes no dependency on it). When a
 * host provides one, the widget registers the island's commit flush (a dirty
 * editor can never race an intent with a stale doc) and renders the
 * selection-scoped revise chrome.
 */
interface FormIntentBusLike {
    registerFlush(flush: () => void): () => void;
    /**
     * `origin` is the reserved collaboration/AI-provenance seam (B4, 10): when an
     * inline-AI or remote actor drives a write, it tags the intent so the flush
     * path can distinguish it from a local user edit. Optional and unset today —
     * the collab/AI build fills it; the doc never carries it (provenance is
     * SQL-authoritative — see the `document-is-a-location-index` doctrine).
     */
    dispatch(intent: {
        type: string;
        fieldPath: string;
        target?: unknown;
        payload?: unknown;
        origin?: string;
    }): Promise<void>;
}
interface RichContentOptions {
    /** An inline profile manifest; wins over manifestRef. */
    manifest?: BlockdocManifest;
    /** A manifest reference resolved through the injected schema fetcher. */
    manifestRef?: string;
    /** Slot-level doc admission override (category slugs) — mirrors the server's write-path check. */
    docAdmits?: string[];
    /** Show the insert palette. Default true. */
    palette?: boolean;
    /** Commit policy for the island. */
    commit?: CommitPolicy;
}
interface RichContentWidgetDefaults {
    /** The vendored base prose manifest, composed under the profile manifest. */
    baseManifest?: BlockdocManifest;
    /** Fallback fetcher when formContext.schemaFetcher is absent. */
    schemaFetcher?: (ref: string) => Promise<unknown>;
    commit?: CommitPolicy;
    palette?: boolean;
}
/**
 * Factory for the rich-content RJSF component: resolves the profile manifest
 * (inline `manifest` option, or `manifestRef` through the injected schema
 * fetcher), assembles [base, profile] into the island's PM schema, wires the
 * commit pipe through onChange with advisory client-side validation (server
 * stays authoritative), and rides formContext.commitBus for flush-before-submit.
 */
declare function createRichContentWidget(nodeViewRegistry: NodeViewRegistry, defaults?: RichContentWidgetDefaults): ComponentType<RichContentProps>;

export { type FormIntentBusLike, type RichContentOptions, type RichContentWidgetDefaults, createRichContentWidget };
