import * as _rjsf_utils from '@rjsf/utils';
import { Widget, Field, WidgetProps, UiSchema as UiSchema$1, ValidatorType, Registry, ObjectFieldTemplateProps } from '@rjsf/utils';
import * as react from 'react';
import { ComponentType } from 'react';
import { FormProps, ThemeProps } from '@rjsf/core';
import * as _rjsf_validator_ajv8_lib_validator_js from '@rjsf/validator-ajv8/lib/validator.js';
import { customizeValidator } from '@rjsf/validator-ajv8';

/** A JSON Schema node — kept loose on purpose; this layer only inspects it. */
type SchemaNode = Record<string, unknown>;
/**
 * What a registry entry resolves to: an RJSF widget name (string) or a React
 * component RJSF mounts directly. `undefined` means "RJSF's own default is
 * already right — emit nothing".
 */
type WidgetResolution = string | Widget | Field | undefined;
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
/**
 * A resolution result: the widget, the matched entry's computed config, the merged options, and,
 * when the node declares a name, that name and whether it is bound.
 */
interface ResolvedWidget {
    widget: WidgetResolution;
    config?: Record<string, unknown>;
    /**
     * The options the widget gets: the matched entry's config with the node's declared
     * `x-widget-options` deep-merged over it.
     */
    options?: Record<string, unknown>;
    /**
     * Whether the node's declared `x-widget` name is bound: registered by name, unscoped or
     * scoped to the context asked. Absent when the node declares no name. A predicate
     * registration never binds a name, even when it matched.
     */
    bound?: boolean;
    /** The declared `x-widget` name `bound` describes; present exactly when `bound` is. */
    name?: string;
}
/** How a name registration is scoped. */
interface WidgetScope {
    /**
     * The contexts the name is bound in. Omitted, it is bound in every context. A scoped
     * registration beats an unscoped one for its contexts, whatever the registration order.
     */
    contexts?: readonly string[];
}
/** One registration of a name, as it answers. */
interface NameRegistration {
    /** `null` when unscoped (every context); else the contexts it was registered for. */
    contexts: readonly string[] | null;
    widget: WidgetResolution;
}
/**
 * One name a registry binds: its registrations in the order they win (every scoped one, latest
 * first, then the latest unscoped one).
 */
interface RegisteredName {
    name: string;
    registrations: readonly NameRegistration[];
}
interface WidgetRegistry {
    /**
     * Register a widget, by name or by predicate. Later registrations take precedence (they
     * are consulted first). The optional third argument attaches data-valued config (see
     * WidgetConfig).
     *
     * - **By name** (`registerWidget('star-rating', …)`): binds the name, matched against the
     *   node's `x-widget` and nothing else, optionally scoped to contexts.
     * - **By predicate**: infers a widget from the node (its type, format, keywords or the
     *   context frame stamps). A predicate never binds a name.
     */
    registerWidget: {
        (name: string, widget: WidgetResolution, config?: WidgetConfig, scope?: WidgetScope): void;
        (predicate: (schema: SchemaNode) => boolean, widget: WidgetResolution, config?: WidgetConfig): void;
    };
    /** First matching entry wins; falls through to `undefined` (RJSF default). */
    resolveWidget: (schema: SchemaNode, context?: string) => WidgetResolution;
    /**
     * Like resolveWidget, but also computes the matched entry's config, the merged options and
     * whether the declared name is bound. `context` selects scoped name registrations; without
     * it only unscoped ones bind.
     */
    resolveEntry: (schema: SchemaNode, context?: string) => ResolvedWidget;
    /** Every name registered by name, sorted, with its registrations in the order they win. */
    names: () => RegisteredName[];
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

/**
 * A registry holding every seam built-in: the eight names in `BUILTIN_NAMES`, then the
 * inference in `INFERENCE`. Each call returns a new, independent registry.
 */
declare function createWidgetRegistry(): WidgetRegistry;
/**
 * Default singleton — used by SchemaForm when no registry prop/context is given; extended by
 * registerWidget calls in consuming apps. It is one `createWidgetRegistry()` and holds nothing
 * a fresh registry lacks.
 */
declare const defaultRegistry: WidgetRegistry;
declare const registerWidget: {
    (name: string, widget: WidgetResolution, config?: WidgetConfig, scope?: WidgetScope): void;
    (predicate: (schema: SchemaNode) => boolean, widget: WidgetResolution, config?: WidgetConfig): void;
};
declare const resolveWidget: (schema: SchemaNode, context?: string) => WidgetResolution;

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

declare function ComboboxWidget(props: WidgetProps): react.JSX.Element;

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
    /**
     * The RJSF theme to draw with: any `ThemeProps` (what `withTheme` takes; `@rjsf/shadcn` exports one as
     * `Theme`). Absent, `RjsfThemeContext`, then seam's `shadcnTheme`. It must be a stable object (a module
     * constant or a memo). Seam's theme-neutral rules (field labels, `x-group` sections) wrap whichever theme
     * is active; the caller's `templates` and `widgets` still win over it.
     */
    theme?: ThemeProps;
    /**
     * The plain-data mode (`form: 'bare'`): the form resolves no declared widget name. Below the root, each node's
     * `x-widget` is ignored and inference draws its control; `x-widget-options`, `x-group`/`x-tab`, `x-placeholder`
     * and `x-stud-resource-ref` are untouched, and the root `x-widget` is kept. It acts after external references
     * resolve, so a name a fetched `$ref` carries is suppressed too. Default false.
     */
    plainData?: boolean;
}
/**
 * The base schema-form: RJSF on a theme (shadcn by default) driven by the widget
 * registry, tolerant of extension keywords, with external $refs pre-resolved
 * through the injected fetcher.
 */
declare function SchemaForm({ schema, uiSchema, registry, schemaFetcher, validator, formData, formContext, templates, widgets, theme, plainData, ...rest }: SchemaFormProps): react.JSX.Element | null;

/**
 * Seam's default theme: `@rjsf/shadcn`'s `Theme` with seam's shadcn-only corrections merged in — the flush
 * wrapper on text, select and textarea fields (its 2px inset), the readable disabled Submit (its
 * `opacity-50`), and the radio value fix (its index-encoded items). A host that wants shadcn untouched passes
 * `@rjsf/shadcn`'s own `Theme`.
 */
declare const shadcnTheme: ThemeProps;
/**
 * The RJSF theme a seam form (and, later, a widget mounted outside a form) draws with, below the `theme` prop and
 * above the `shadcnTheme` default. A theme must be a stable object — a module constant or a memo — because one
 * themed form is built and cached per theme object.
 */
declare const RjsfThemeContext: react.Context<ThemeProps | null>;

interface RjsfRegistryOptions {
    /** The resource's root schema — the document a `$ref` points into — never the node alone. */
    rootSchema: SchemaNode;
    /** Default: seam's `shadcnTheme`, as `SchemaForm`'s. Seam's theme-neutral rules wrap it, as in the form. */
    theme?: ThemeProps;
    /** Default: seam's `defaultValidator`. */
    validator?: ValidatorType;
    formContext?: Record<string, unknown>;
}
/**
 * An RJSF registry built from RJSF's own exports, never by mounting a form (ruling 04 §2): `Form.getRegistry`
 * over the theme's fields, widgets and templates (with seam's neutral rules), and schema utilities over the root.
 */
declare function createRjsfRegistry({ rootSchema, theme, validator, formContext }: RjsfRegistryOptions): Registry;
/**
 * The registry a surface shares across its fields or cells: the theme read as `SchemaForm` reads it
 * (`RjsfThemeContext`, else `shadcnTheme`), memoized on its inputs.
 */
declare function useRjsfRegistry(rootSchema: SchemaNode, formContext?: Record<string, unknown>): Registry;
/** Ruling 04 §1: what a mount site hands `widgetProps`. */
interface WidgetMountInput {
    /** From `useRjsfRegistry` / `createRjsfRegistry`, built over the resource's root schema. */
    registry: Registry;
    /** The node as the schema carries it; the builder resolves it as RJSF's `SchemaField` does. */
    schema: SchemaNode;
    value: unknown;
    /** The property key; `''` at the root. */
    name: string;
    /** Unique per mount; the mount site calls React's `useId`. */
    id: string;
    /** What the resolver hands over for this node (ticket 07's `ResolvedWidget.options`). */
    options?: Record<string, unknown>;
    /** Default: seam's label rule — a declared title, else the key humanized. */
    label?: string;
    /** Default `true`: outside a form a widget is read-only unless the site says so. */
    readonly?: boolean;
    disabled?: boolean;
    required?: boolean;
    autofocus?: boolean;
    placeholder?: string;
    uiSchema?: UiSchema$1;
    onChange?: (value: unknown) => void;
    onBlur?: (id: string, value: unknown) => void;
    onFocus?: (id: string, value: unknown) => void;
}
/**
 * RJSF `WidgetProps` for a widget mounted outside a form (ruling 04 §1). The node is resolved as `SchemaField`
 * resolves it (`$ref`, `allOf`), and its choices are built as the leaf field builds them, so a stock widget
 * shows the choices and the selection the form would. `hideLabel` is true: the surface draws the label.
 */
declare function widgetProps(input: WidgetMountInput): WidgetProps;
/**
 * Narrow a resolved widget to RJSF's `Widget` for a mount site that takes the widget contract. A name (an RJSF
 * stock name) or a miss is `undefined`: whether a read surface mounts a stock name is ticket 01's call, through
 * RJSF's `getWidget`.
 */
declare function asWidget(resolved: WidgetResolution): Widget | undefined;

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
 * Wired once through `SchemaForm` (the shared RJSF mount), never per screen, over the
 * active theme's own object template ({@link groupedObjectFieldTemplate}).
 */
declare const GroupedObjectFieldTemplate: ComponentType<ObjectFieldTemplateProps>;

type UiSchema = Record<string, unknown>;
/** How the form walks: `context` selects scoped name registrations (`SchemaForm` passes `edit`); `plainData` is the `bare` mode. */
interface UiSchemaOptions {
    /** The context the form resolves names in. Absent, only unscoped names bind (a direct caller's behaviour before contexts). */
    context?: string;
    /**
     * The plain-data mode: below the root, a node's `x-widget` is ignored and inference draws its control. The root
     * `x-widget` is kept, as are `x-widget-options` and every other keyword.
     */
    plainData?: boolean;
}
/**
 * Walk a (pre-dereferenced) JSON Schema and emit an RJSF uiSchema from the
 * predicate registry — this is how the predicate widget-resolution contract
 * layers over RJSF's name-based widget model. Only fields whose resolution
 * differs from RJSF's own default get a `ui:widget`; `x-placeholder` maps to
 * `ui:placeholder`.
 */
declare function buildUiSchema(schema: SchemaNode, registry: WidgetRegistry, options?: UiSchemaOptions): UiSchema;
/**
 * Whether a node is composite (an object or an array, or a union including one): a component bound to it takes
 * over the subtree as an RJSF field, where a primitive node takes a widget. The one test the form's uiSchema walker
 * and the read surfaces share (ruling 04 §5). A local `$ref` and a nullable `anyOf` borrow their target's type,
 * resolved against the root schema.
 */
declare function isCompositeNode(schema: SchemaNode, rootSchema: SchemaNode): boolean;
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

export { ButtonGroupWidget, ComboboxWidget, FORM_KEYWORDS, type FormIntent, type FormIntentBus, type FormIntentHandler, GroupedObjectFieldTemplate, type KeywordVocabulary, type KeywordVocabularyConfig, type NameRegistration, type RegisteredName, type RegistryEntry, type ResolvedWidget, type RjsfRegistryOptions, RjsfThemeContext, type SchemaFetcher, SchemaForm, type SchemaFormProps, type SchemaNode, StarRatingWidget, type UiSchemaOptions, type WidgetConfig, type WidgetMountInput, type WidgetRegistry, WidgetRegistryContext, type WidgetResolution, type WidgetScope, asWidget, buildUiSchema, createFormIntentBus, createFormValidator, createKeywordVocabulary, createRjsfRegistry, createWidgetRegistry, defaultRegistry, defaultValidator, displayLabel, humanizeKey, isCompositeNode, mergeUiSchema, normalizeNullableRefs, registerWidget, resolveExternalRefs, resolveWidget, shadcnTheme, useRjsfRegistry, widgetFormContext, widgetProps };
