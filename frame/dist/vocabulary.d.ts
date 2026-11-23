import { WidgetRegistry } from '@schemastud/seam';
import { f as FrameContext, p as FormMode, K as KitContexts } from './types-Dfls-XdJ.js';
import '@schemastud/facets';
import 'react';
import '@rjsf/utils';
import '@schemastud/ui';

declare const FRAME_READS: readonly string[];

/** A node type RJSF's `hasWidget` is asked about, in the sorted order `stock` lists them. */
type NodeType = 'array' | 'boolean' | 'integer' | 'number' | 'string';
/** One registration as the file writes it: its scope (absent = unscoped) and, for a stock name, its node types. */
interface VocabularyRegistration {
    contexts?: FrameContext[];
    stock?: NodeType[];
}
type FrameReaders = Readonly<Record<`${'manifest' | 'resource-entry' | 'context-block' | 'schema-keywords'}:${string}`, (...args: never[]) => unknown>>;
interface FrameVocabulary {
    $comment: string;
    version: 1;
    /** Every kit's registered contexts: the first kit's in registration order, then any a later kit adds. */
    contexts: FrameContext[];
    /**
     * Each context with a fallback, mapped to that fallback, written ONLY when the kits' edges differ from frame's own
     * two (`row-cell` ← `edit`, `overview` ← `summary`). Absent means frame's two, which is true of every file written
     * before contexts were open (decision 86 Q5; additive, so `version` stays 1).
     */
    inherits?: Record<string, FrameContext[]>;
    formModes: FormMode[];
    /** The union of every context's reserved class-level names, in registration order. */
    reserved: string[];
    /** Each name's registrations in the order they win. */
    widgets: Record<string, VocabularyRegistration[]>;
    /** Name → the contexts where two kits bind it and their answers differ. Absent when there are none. */
    conflicts?: Record<string, FrameContext[]>;
    /** Sorted union of Frame and host reader modules, as <group>:<key>. */
    reads?: string[];
}
/** One kit's host registrations: what that kit is handed as `widgets`. */
type KitWidgets = (registry: WidgetRegistry) => void;
/** One kit as the vocabulary sees it: its `widgets` and its `contexts`, exactly what `createFrameKit` is handed. */
interface KitDefinition {
    widgets?: KitWidgets;
    contexts?: KitContexts;
}
/**
 * The vocabulary of one or more kits. Each kit's registry is built separately with `createFrameRegistry`, never
 * merged. `widgets` is the union (the first kit's registrations in winning order, then any a later kit adds), and
 * `conflicts` names where kits disagree. Each kit's contexts are its own registry, frame's seven seeded (86 Q14): a
 * kit may scope a widget to any context it registers. No argument, or `[]`, is the default kit.
 */
declare function buildVocabulary(kits?: Array<KitDefinition | undefined>, readers?: readonly string[]): FrameVocabulary;
/** The one serialiser: what is written and what is compared. */
declare function serializeVocabulary(vocabulary: FrameVocabulary): string;
interface RunVocabularyOptions {
    /** Each `--widgets` value, one per kit. */
    widgets: string[];
    /** Each repeatable --readers module. */
    readers: string[];
    out: string;
    write: boolean;
    cwd: string;
    /** Loads a --widgets or --readers module: Vite for source, host exports resolution for a package. */
    load: (specifier: string) => Promise<unknown>;
    /** The command a mismatch names. */
    command?: string;
}
interface RunVocabularyResult {
    exitCode: 0 | 1 | 2;
    message: string;
}
/** The bin's whole run: load each kit's module, build, then write or compare. */
declare function runVocabulary(options: RunVocabularyOptions): Promise<RunVocabularyResult>;

export { FRAME_READS, type FrameReaders, type FrameVocabulary, type KitDefinition, type KitWidgets, type RunVocabularyOptions, type RunVocabularyResult, type VocabularyRegistration, buildVocabulary, runVocabulary, serializeVocabulary };
