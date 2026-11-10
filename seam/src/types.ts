import type * as React from 'react';

/** A JSON Schema node — kept loose on purpose; this layer only inspects it. */
export type SchemaNode = Record<string, unknown>;

/**
 * What a registry entry resolves to: an RJSF widget name (string) or a React
 * component RJSF mounts directly. `undefined` means "RJSF's own default is
 * already right — emit nothing".
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WidgetResolution = string | React.ComponentType<any> | undefined;

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

/** A resolution result: the widget plus the matched entry's computed config. */
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
}

/** How a name registration is scoped. */
export interface WidgetScope {
    /**
     * The contexts the name is bound in. Omitted, it is bound in every context. A scoped
     * registration beats an unscoped one for its contexts, whatever the registration order.
     */
    contexts?: readonly string[];
}

/** One name a registry binds, and where. */
export interface RegisteredName {
    name: string;
    /** `null` when the name is registered unscoped (bound in every context); else the contexts it is scoped to. */
    contexts: readonly string[] | null;
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
    /** Every name registered by name, sorted, with the contexts it is bound in. */
    names: () => RegisteredName[];
}

/** A block node a skin renders — its node-type plus resting attribute values. */
export interface SkinNode {
    type: string;
    attrs?: Record<string, unknown>;
}

/**
 * Per-render context threaded to a skin. `attrsSchema` is the node-type's
 * attribute schema (the fallback enumerates field anchors from it); any
 * per-editor rich props ride alongside without the registry knowing them —
 * that's what keeps the seam context-free.
 */
export interface SkinContext {
    attrsSchema?: SchemaNode;
    [key: string]: unknown;
}

/**
 * A skin is a minimal `(node, ctx) => ReactNode`. It owns only a node-type's
 * resting look; it has no frame context and no ProseMirror knowledge (the shell
 * owns selection chrome and editing). Per-editor rich props thread through `ctx`
 * so the shared registry never has to know them.
 */
export type SkinComponent = (node: SkinNode, ctx?: SkinContext) => React.ReactNode;

export interface SkinRegistry {
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
