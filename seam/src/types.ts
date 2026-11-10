import type { Field, Widget } from '@rjsf/utils';

/** A JSON Schema node — kept loose on purpose; this layer only inspects it. */
export type SchemaNode = Record<string, unknown>;

/**
 * What a registry entry resolves to: an RJSF widget name (string) or a React
 * component RJSF mounts directly. `undefined` means "RJSF's own default is
 * already right — emit nothing".
 */
export type WidgetResolution = string | Widget | Field | undefined;

/**
 * Data-valued widget configuration attached at registration time: an object, or
 * a function computing one from the schema node. Emitted into `ui:options` by
 * the uiSchema walker with the lowest precedence — the schema's own
 * `x-widget-options` wins over it, and the caller uiSchema wins last.
 */
export type WidgetConfig =
    | Record<string, unknown>
    | ((schema: SchemaNode) => Record<string, unknown> | undefined);

export interface RegistryEntry {
    predicate: (schema: SchemaNode) => boolean;
    widget: WidgetResolution;
    config?: WidgetConfig;
}

/**
 * A resolution result: the widget, the matched entry's computed config, the merged options, and,
 * when the node declares a name, that name and whether it is bound.
 */
export interface ResolvedWidget {
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
export interface WidgetScope {
    /**
     * The contexts the name is bound in. Omitted, it is bound in every context. A scoped
     * registration beats an unscoped one for its contexts, whatever the registration order.
     */
    contexts?: readonly string[];
}

/** One registration of a name, as it answers. */
export interface NameRegistration {
    /** `null` when unscoped (every context); else the contexts it was registered for. */
    contexts: readonly string[] | null;
    widget: WidgetResolution;
}

/**
 * One name a registry binds: its registrations in the order they win (every scoped one, latest
 * first, then the latest unscoped one).
 */
export interface RegisteredName {
    name: string;
    registrations: readonly NameRegistration[];
}

export interface WidgetRegistry {
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
export type SchemaFetcher = (ref: string) => Promise<SchemaNode>;

/** Caller-supplied extension-keyword vocabulary: exact names and/or prefixes-by-pattern. */
export interface KeywordVocabularyConfig {
    keywords?: readonly string[];
    patterns?: readonly RegExp[];
}

export interface KeywordVocabulary {
    isKnownKeyword: (keyword: string) => boolean;
    keywords: readonly string[];
    patterns: readonly RegExp[];
}
