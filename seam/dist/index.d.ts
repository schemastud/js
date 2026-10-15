import * as react from 'react';
import { ReactNode } from 'react';
import { FormProps } from '@rjsf/core';
import * as _rjsf_utils from '@rjsf/utils';
import { UiSchema as UiSchema$1, ObjectFieldTemplateProps } from '@rjsf/utils';
import * as _rjsf_validator_ajv8_lib_validator_js from '@rjsf/validator-ajv8/lib/validator.js';
import { customizeValidator } from '@rjsf/validator-ajv8';

/** A JSON Schema node — kept loose on purpose; this layer only inspects it. */
type SchemaNode = Record<string, unknown>;
/**
 * What a registry entry resolves to: an RJSF widget name (string) or a React
 * component RJSF mounts directly. `undefined` means "RJSF's own default is
 * already right — emit nothing".
 */
type WidgetResolution = string | react.ComponentType<any> | undefined;
/**
 * Data-valued widget configuration attached at registration time: an object, or
 * a function computing one from the schema node. Emitted into `ui:options` by
 * the uiSchema walker with the lowest precedence — the schema's own
 * `x-widget-options` wins over it, and the caller uiSchema wins last.
 */
type WidgetConfig = Record<string, unknown> | ((schema: SchemaNode) => Record<string, unknown> | undefined);
interface RegistryEntry {
    predicate: (schema: SchemaNode) => boolean;
    widget: WidgetResolution;
    config?: WidgetConfig;
}
/** A resolution result: the widget plus the matched entry's computed config. */
interface ResolvedWidget {
    widget: WidgetResolution;
    config?: Record<string, unknown>;
}
interface WidgetRegistry {
    /**
     * Register a widget. A function argument is a predicate over the schema node;
     * a string argument matches `schema.type === key || schema['x-widget'] === key`.
     * Later registrations take precedence (they are consulted first). The optional
     * third argument attaches data-valued config (see WidgetConfig).
     */
    registerWidget: (predicateOrKey: string | ((schema: SchemaNode) => boolean), widget: WidgetResolution, config?: WidgetConfig) => void;
    /** First matching entry wins; falls through to `undefined` (RJSF default). */
    resolveWidget: (schema: SchemaNode) => WidgetResolution;
    /** Like resolveWidget, but also computes the matched entry's config. */
    resolveEntry: (schema: SchemaNode) => ResolvedWidget;
}
/** A block node a skin renders — its node-type plus resting attribute values. */
interface SkinNode {
    type: string;
    attrs?: Record<string, unknown>;
}
/**
 * Per-render context threaded to a skin. `attrsSchema` is the node-type's
 * attribute schema (the fallback enumerates field anchors from it); any
 * per-editor rich props ride alongside without the registry knowing them —
 * that's what keeps the seam context-free.
 */
interface SkinContext {
    attrsSchema?: SchemaNode;
    [key: string]: unknown;
}
/**
 * A skin is a minimal `(node, ctx) => ReactNode`. It owns only a node-type's
 * resting look; it has no frame context and no ProseMirror knowledge (the shell
 * owns selection chrome and editing). Per-editor rich props thread through `ctx`
 * so the shared registry never has to know them.
 */
type SkinComponent = (node: SkinNode, ctx?: SkinContext) => react.ReactNode;
interface SkinRegistry {
    /** Register a skin for a node-type. A later registration replaces an earlier one. */
    registerSkin: (nodeType: string, skin: SkinComponent) => void;
    /** Resolve the skin for a node-type; falls back to the block-chrome skin. */
    resolveSkin: (nodeType: string) => SkinComponent;
    /** Whether a node-type has an explicitly registered skin (vs. the fallback). */
    hasSkin: (nodeType: string) => boolean;
    /** The fallback skin this registry resolves to when nothing is registered. */
    fallback: SkinComponent;
}
/**
 * Host-injected schema fetcher for external $refs — receives the ref string,
 * returns the referenced schema document. Transport-agnostic: the host passes
 * its own authed client; this package never imports one.
 */
type SchemaFetcher = (ref: string) => Promise<SchemaNode>;
/** Caller-supplied extension-keyword vocabulary: exact names and/or prefixes-by-pattern. */
interface KeywordVocabularyConfig {
    keywords?: readonly string[];
    patterns?: readonly RegExp[];
}
interface KeywordVocabulary {
    isKnownKeyword: (keyword: string) => boolean;
    keywords: readonly string[];
    patterns: readonly RegExp[];
}

/**
 * Extension keywords this package itself consumes — the unprefixed form
 * vocabulary. Everything beyond these is caller territory: hosts declare
 * their own dialects through `createKeywordVocabulary`.
 */
declare const FORM_KEYWORDS: readonly ["x-widget", "x-placeholder", "x-widget-options", "x-group"];
/**
 * Build a keyword vocabulary from caller-supplied exact names and patterns.
 * The package hardcodes no vendor dialect; tolerance for a host's `x-*`
 * grammar is configured, not assumed.
 */
declare function createKeywordVocabulary(config?: KeywordVocabularyConfig): KeywordVocabulary;

/**
 * The FormIntentBus — the generic intent channel for editing surfaces.
 *
 * RJSF onChange stays pure data mutation; intents ("revise this", "enrich
 * that") are a separate, host-routed vocabulary. The bus is a pure formContext
 * sidecar: it names no host vocabulary and never intercepts RJSF internals.
 * Widgets with pending uncommitted state register a flusher so a dispatch can
 * never race a stale document — every dispatch flushes commits first, then
 * notifies handlers.
 */
interface FormIntent {
    type: string;
    fieldPath: string;
    target?: unknown;
    payload?: unknown;
}
type FormIntentHandler = (intent: FormIntent) => void | Promise<void>;
interface FormIntentBus {
    /** Flushes pending commits, then delivers the intent to every handler. */
    dispatch: (intent: FormIntent) => Promise<void>;
    /** Host-side subscription (the intent router); returns an unsubscribe. */
    onIntent: (handler: FormIntentHandler) => () => void;
    /** Widget-side: register a pending-commit flusher; returns an unregister. */
    registerFlush: (flush: () => void) => () => void;
    /** Flush every registered widget's pending commits synchronously. */
    flushCommits: () => void;
}
/**
 * Read the host formContext from a widget/field's RJSF props, insulated from an
 * RJSF-version difference that is otherwise invisible: RJSF v5 delivers the form's
 * `formContext` as a widget prop, but v6 dropped that prop and exposes it only as
 * `props.registry.formContext`. Frame widgets that ride the FormIntentBus (or any
 * other formContext sidecar) read it through here rather than a version-specific
 * prop, so the enrich affordance keeps working across the bump.
 */
declare function widgetFormContext<T extends object = Record<string, unknown>>(props: {
    formContext?: unknown;
    registry?: {
        formContext?: unknown;
    };
}): T;
declare function createFormIntentBus(): FormIntentBus;

declare function createWidgetRegistry(): WidgetRegistry;
/**
 * Default singleton — used by SchemaForm when no registry prop/context is
 * given; extended by registerWidget calls in consuming apps.
 */
declare const defaultRegistry: WidgetRegistry;
declare const registerWidget: (predicateOrKey: string | ((schema: SchemaNode) => boolean), widget: WidgetResolution, config?: WidgetConfig) => void;
declare const resolveWidget: (schema: SchemaNode) => WidgetResolution;

/**
 * A peer of `createWidgetRegistry()` for **skins** — a node-type's resting look.
 * Context-free and per-consumer: each call yields a fresh, isolated instance
 * keyed by node-type (register / resolve / fallback). When a node-type has no
 * registered skin, `resolveSkin` returns the block-chrome fallback skin, so a
 * caller can always render *something* for any node.
 *
 * The registry knows nothing of frame context or ProseMirror; a skin is just a
 * minimal `(node, ctx) => ReactNode`, so per-editor rich props thread through
 * `ctx` without the shared registry knowing them.
 */
declare function createSkinRegistry(fallback?: SkinComponent): SkinRegistry;
/**
 * Default singleton — a shared registry for callers that don't create their own.
 * Extended by `registerSkin` calls; isolated from any `createSkinRegistry()`.
 */
declare const defaultSkinRegistry: SkinRegistry;
declare const registerSkin: (nodeType: string, skin: SkinComponent) => void;
declare const resolveSkin: (nodeType: string) => SkinComponent;

declare function BlockChromeFallback(node: SkinNode, ctx?: SkinContext): react.JSX.Element;

interface EnumOption {
    value: unknown;
    label: string;
}
interface ButtonGroupWidgetProps {
    id?: string;
    value?: unknown;
    disabled?: boolean;
    readonly?: boolean;
    schema?: SchemaNode;
    options?: {
        enumOptions?: EnumOption[];
    };
    onChange: (value: unknown) => void;
}
declare function ButtonGroupWidget(props: ButtonGroupWidgetProps): react.JSX.Element;

interface ComboboxWidgetProps {
    id?: string;
    value?: unknown;
    disabled?: boolean;
    readonly?: boolean;
    schema?: SchemaNode;
    options?: {
        suggestions?: unknown[];
    };
    onChange: (value: unknown) => void;
}
declare function ComboboxWidget(props: ComboboxWidgetProps): react.JSX.Element;

interface StarRatingWidgetProps {
    id?: string;
    value?: unknown;
    disabled?: boolean;
    readonly?: boolean;
    schema?: SchemaNode;
    options?: {
        enumOptions?: unknown[];
    };
    onChange: (value: unknown) => void;
}
declare function StarRatingWidget(props: StarRatingWidgetProps): react.JSX.Element;

declare function resolveExternalRefs(schema: SchemaNode, fetcher?: SchemaFetcher): Promise<SchemaNode>;

/**
 * Re-express nullable `$ref`s (`{$ref, nullable: true}` — the OpenAPI idiom
 * laravel-data-schemas emits for a nullable nested Data) as `anyOf[$ref, null]`:
 * AJV rejects `nullable` without a `type` sibling, so the form's validator sees
 * a broken schema otherwise. It is the same transform the server applies for
 * opis.
 *
 * This is a NOTATION fix, not a policy one — nothing here touches `required`.
 * It used to ship inside `relaxNullableRequired()`, which also stripped every
 * nullable property out of `required` to compensate for a server-side defect:
 * laravel-data-schemas marked every non-`Optional` constructor property
 * required, including defaulted ones. That defect is fixed at the source (a
 * defaulted property is now optional on the request axis and required on the
 * response axis), and the compensator was never a faithful inverse of it — it
 * relaxed on NULLABILITY where the real rule is HAS-DEFAULT, so it dropped
 * genuinely-required nullable properties and kept genuinely-optional
 * non-nullable ones. The server's `required` is now authoritative at the form
 * layer; only the `$ref` notation still needs bridging.
 */
declare function normalizeNullableRefs(schema: SchemaNode): SchemaNode;

/**
 * Hosts provide their own extended registry through this context (or the
 * `registry` prop); absent both, the package default singleton applies.
 */
declare const WidgetRegistryContext: react.Context<WidgetRegistry | null>;
interface SchemaFormProps extends Omit<FormProps, 'schema' | 'uiSchema' | 'validator'> {
    schema: SchemaNode;
    uiSchema?: UiSchema$1;
    registry?: WidgetRegistry;
    /** Host-injected authed fetcher for external $refs; omit when the schema is self-contained. */
    schemaFetcher?: SchemaFetcher;
    validator?: FormProps['validator'];
}
/**
 * The base schema-form: RJSF (shadcn theme) driven by the predicate widget
 * registry, tolerant of extension keywords, with external $refs pre-resolved
 * through the injected fetcher.
 */
declare function SchemaForm({ schema, uiSchema, registry, schemaFetcher, validator, formData, formContext, templates, widgets, ...rest }: SchemaFormProps): react.JSX.Element | null;

/**
 * Partition an object's properties into titled `x-group` sections (e.g. Basics /
 * Retrieval / Targets), turning one flat stack of inputs into a legible, sectioned
 * form. Group order is first-appearance and within-group order is declaration order,
 * so the single existing ordering axis (property/`ui:order`) drives both — no second
 * primitive. An object whose properties carry no `x-group` falls straight through to
 * the shadcn default, so nested/ungrouped objects are untouched.
 *
 * A second, orthogonal keyword, `x-tab`, additionally partitions the resulting
 * `x-group` sections into tabs (e.g. a "Style" tab holding Classes + Style, an
 * "Advanced" tab holding Access + Attributes) — for forms dense enough that stacked
 * sections alone read as a technical settings dump rather than a legible surface. A
 * group's tab is its first property's `x-tab`; groups whose properties carry no
 * `x-tab` render above the tab strip, always visible. An object with `x-group` but no
 * `x-tab` anywhere renders exactly as before (stacked sections, no tabs) — fully
 * backward compatible.
 *
 * Wired once through `SchemaForm` (the shared RJSF mount), never per screen.
 */
declare function GroupedObjectFieldTemplate(props: ObjectFieldTemplateProps): react.JSX.Element;

type UiSchema = Record<string, unknown>;
/**
 * Walk a (pre-dereferenced) JSON Schema and emit an RJSF uiSchema from the
 * predicate registry — this is how the predicate widget-resolution contract
 * layers over RJSF's name-based widget model. Only fields whose resolution
 * differs from RJSF's own default get a `ui:widget`; `x-placeholder` maps to
 * `ui:placeholder`.
 */
declare function buildUiSchema(schema: SchemaNode, registry: WidgetRegistry): UiSchema;
/**
 * Deep-merge a caller-supplied uiSchema over the generated one (caller wins on
 * leaves), so hosts can hand-tune single fields without abandoning the registry.
 */
declare function mergeUiSchema(generated: UiSchema, overrides?: UiSchema): UiSchema;

/**
 * The one rule for a rendered label (app-walkthrough APP-09, APP-21): a declared `title` wins. With none, a PROPERTY
 * label is the humanized property name (`parent_tenant_id` → "Parent tenant"), and anything else renders nothing.
 * Never a class short name, a backing value or a raw key. Hosts that set laravel-data-schemas'
 * `identifier_titles => false` stop emitting short-name titles, so this is where a missing title lands.
 */
declare function displayLabel(schema: {
    title?: unknown;
} | null | undefined, key?: string | null, options?: {
    property?: boolean;
}): string;
/** `parent_tenant_id` → "Parent tenant", `billingPeriodEnd` → "Billing period end". A trailing id is dropped. */
declare function humanizeKey(key: string): string;

/**
 * The package validator: AJV with `strict: false` so extension keywords
 * (whatever dialect the host's vocabulary declares) never trip strict-mode
 * rejection, and `allErrors: true` so forms surface every violation at once.
 *
 * ## Why `AjvClass` is set, and why a version bump is NOT the fix
 *
 * `@rjsf/validator-ajv8`'s default export is an AJV instance for **draft-07**. Having AJV v8
 * installed does not help: v8's default export is *also* the draft-07 dialect. Only
 * `ajv/dist/2020` speaks 2020-12, so the class swap is what does the work — the dependency
 * version merely decides whether that subpath resolves. Do not "simplify" this to a bump.
 *
 * It matters because `schemastud/laravel-data-schemas` stamps
 * `"$schema": "https://json-schema.org/draft/2020-12/schema"` onto every generated document
 * (`data-schemas.schema_version`), and a generated schema is what these forms are handed.
 *
 * The failure mode is silent, which is why it survived. AJV throws on the first `compile()`;
 * RJSF catches that and returns it as a **root-level** error with an empty property path, so a
 * form rendering `showErrorList={false}` shows nothing and `onSubmit` never fires. Measured:
 * the first submit click after every page load is swallowed and the second works, because AJV
 * caches the failure. `strict: false` does **not** suppress it — the meta-schema is genuinely
 * absent, not merely unrecognised.
 *
 * ## Why draft-07 is registered alongside it
 *
 * Swapping the class is not a superset move — `Ajv2020` does not know draft-07's meta-schema, so
 * the swap alone turns the same silent failure around on every hand-authored draft-07 document,
 * and the estate has both kinds. A regression test caught this; it is not theoretical.
 * `additionalMetaSchemas` teaches the 2020-12 instance the older dialect so both validate.
 *
 * `AjvClass` sits before the caller's spread, so a consumer can still override it.
 */
declare function createFormValidator(options?: Parameters<typeof customizeValidator>[0]): _rjsf_validator_ajv8_lib_validator_js.default<any, _rjsf_utils.RJSFSchema, any>;
declare const defaultValidator: _rjsf_validator_ajv8_lib_validator_js.default<any, _rjsf_utils.RJSFSchema, any>;

/**
 * The uniform selection-chrome primitive (B3) — row 2 of the four-part render
 * model (06). It draws the *same* ring / handle / badge / outline around ANY
 * skin (a registered NodeView or the neutral fallback), so a skin ships **zero
 * chrome code**: the shell owns selection, the skin owns only its resting look.
 * It is grammar-blind and medium-agnostic (it rides `selectedNodeId` + B2's
 * completeness flags, never the document model), which is what lets rows 2 + 4
 * generalize across media while rows 1 + 3 stay PM-specific.
 *
 * The contract is **plural from day one** so it doubles as the collaboration
 * presence reservation (10, = 06's chrome extraction): `remoteSelections` and
 * `advisory` are rendered but wired to nothing — no transport exists yet. When
 * collab lands, the realtime channel (never the document — see
 * `lock-and-presence-state-lives-in-transport`) fills these props.
 */
interface RemoteSelection {
    /** Stable id of the participant holding this remote selection. */
    ownerId: string;
    /** Human label to show on the cursor (falls back to `ownerId`). */
    ownerLabel?: string;
    /** Presentation color for the cursor/ring (host-assigned per participant). */
    color?: string;
}
interface SelectionChromeProps {
    /** Stable id of the node this chrome wraps (the `selectedNodeId` currency). */
    nodeId: string;
    /** Is this node the local user's current selection? Draws the ring + handle. */
    localSelected?: boolean;
    /** Remote participants selecting this node (reserved; renders N cursors). */
    remoteSelections?: RemoteSelection[];
    /** Advisory soft-lock presence (reserved; decoration only, never a gate). */
    advisory?: boolean;
    /** Grammar-required node (08) — draws the required badge. */
    required?: boolean;
    /** Structurally incomplete per B2 completeness — draws the incomplete outline. */
    incomplete?: boolean;
    /** The skin (row 1) or fallback card this chrome is drawn around. */
    children: ReactNode;
}
/**
 * Draw the shell selection chrome around a skin. All decoration is
 * `pointer-events: none` and absolutely positioned so the wrapped skin keeps
 * its own layout and interaction untouched.
 */
declare function SelectionChrome({ nodeId, localSelected, remoteSelections, advisory, required, incomplete, children, }: SelectionChromeProps): react.JSX.Element;

export { BlockChromeFallback, ButtonGroupWidget, ComboboxWidget, FORM_KEYWORDS, type FormIntent, type FormIntentBus, type FormIntentHandler, GroupedObjectFieldTemplate, type KeywordVocabulary, type KeywordVocabularyConfig, type RegistryEntry, type RemoteSelection, type ResolvedWidget, type SchemaFetcher, SchemaForm, type SchemaFormProps, type SchemaNode, SelectionChrome, type SelectionChromeProps, type SkinComponent, type SkinContext, type SkinNode, type SkinRegistry, StarRatingWidget, type WidgetConfig, type WidgetRegistry, WidgetRegistryContext, type WidgetResolution, buildUiSchema, createFormIntentBus, createFormValidator, createKeywordVocabulary, createSkinRegistry, createWidgetRegistry, defaultRegistry, defaultSkinRegistry, defaultValidator, displayLabel, humanizeKey, mergeUiSchema, normalizeNullableRefs, registerSkin, registerWidget, resolveExternalRefs, resolveSkin, resolveWidget, widgetFormContext };
