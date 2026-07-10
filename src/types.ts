import type * as React from 'react';

/** A JSON Schema node — kept loose on purpose; this layer only inspects it. */
export type SchemaNode = Record<string, unknown>;

/**
 * What a registry entry resolves to: an RJSF widget name (string) or a React
 * component RJSF mounts directly. `undefined` means "RJSF's own default is
 * already right — emit nothing".
 */
export type WidgetResolution = string | React.ComponentType<never> | undefined;

export interface RegistryEntry {
    predicate: (schema: SchemaNode) => boolean;
    widget: WidgetResolution;
}

export interface WidgetRegistry {
    /**
     * Register a widget. A function argument is a predicate over the schema node;
     * a string argument matches `schema.type === key || schema['x-widget'] === key`.
     * Later registrations take precedence (they are consulted first).
     */
    registerWidget: (
        predicateOrKey: string | ((schema: SchemaNode) => boolean),
        widget: WidgetResolution,
    ) => void;
    /** First matching entry wins; falls through to `undefined` (RJSF default). */
    resolveWidget: (schema: SchemaNode) => WidgetResolution;
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
