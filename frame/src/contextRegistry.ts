import { Key, OnKeyDuplicate, createRegistry, type Registry } from '@schemastud/registry';
import { INHERITS, KNOWN_CONTEXTS, type FrameContext, type NodeParticipation } from './contexts';

// =============================================================================
// The kit's context registry (frame-foundation 91; decision 86, ruling items 1, 2, 8 and 10). The JS half of the open
// context set: frame's seven are seeded, and a host hands the kit its own contexts beside its own widgets
// (`createFrameKit({ contexts })`, or a named `contexts` export of the `--widgets` module for the vocabulary bin).
//
// One more wrapper over a `@schemastud/registry` kernel registry, shaped like frame's route, guard and shell
// registries (`routes.ts`): root `frame.contexts`, `Supersede` (a replacement keeps its slot, so `names()` keeps
// frame's order, as the PHP block's `known` does). Unlike a route name, a context name is CHECKED: it must be one
// key segment under the kernel's own grammar, the same rule PHP's `Key::SEGMENT_PATTERN` applies, so a name one side
// accepts the other accepts.
//
// A kit entry is `{ name, fallback, reserved, grain? }`. 86 Q1 kept grain off it; frame-foundation 92 (grill part 2)
// puts PHP's three grains on it (`ContextGrain`: property, record, collection), seeded on frame's seven and optional for
// a host's. `SchemaView` reads it: a `record` context draws the whole record at pointer `""`. As in PHP, a fallback
// must share its context's grain (checked where both declare one), and a supersession that names no grain keeps the
// one it displaces. PHP's projector still decides what may bind. The shells' own facts stay in the shells: `edit`
// never cascades (`resolveWidgetFor`), and only `row-cell` has the heavyweight guard.
// =============================================================================

/** Who registered frame's own seven: the registrant `registrant()` and `superseded()` report for them. */
export const FRAME_CONTEXT_REGISTRANT = '@schemastud/frame';

/** The registry's kernel root: each context is the key `frame.contexts.<name>`. */
export const FRAME_CONTEXTS_ROOT = 'frame.contexts';

/** One context as the kit holds it. */
export interface FrameContextEntry {
    readonly name: FrameContext;
    /**
     * The contexts whose binding this one borrows when it binds none, in order. The cascade is ONE step: the first
     * listed fallback whose entry at the same pointer participates lends (`lenderFor`); a lender never lends its own
     * fallback's binding. Empty: the context never cascades.
     */
    readonly fallback: readonly FrameContext[];
    /** Class-level widget names this context admits at pointer `""` that are not registry widgets (`row-actions`). */
    readonly reserved: readonly string[];
    /**
     * What the context renders, PHP's `ContextGrain`: one property, one whole record, or a collection. `record`:
     * `SchemaView` draws the whole record at pointer `""`. Absent (a host registration that names none): the
     * per-property walk.
     */
    readonly grain?: FrameContextGrain;
}

/** PHP's `ContextGrain`, by value (frame-foundation 92). */
export type FrameContextGrain = 'property' | 'record' | 'collection';

const GRAINS: readonly FrameContextGrain[] = ['property', 'record', 'collection'];

/** Frame's seven, by grain: PHP's `WidgetContext` registrations for the same names. */
const SEVEN_GRAINS: Record<string, FrameContextGrain> = {
    edit: 'property',
    detail: 'property',
    'list-column': 'property',
    'row-cell': 'property',
    'list-item': 'record',
    summary: 'collection',
    overview: 'collection',
};

/** What a registration may say beyond the name. `fallback` and `reserved` default to empty; `grain` to the displaced entry's, else none. */
export interface FrameContextDefinition {
    fallback?: readonly FrameContext[];
    reserved?: readonly string[];
    grain?: FrameContextGrain;
}

/** The reads every surface needs: a shell, the resolver and the vocabulary writer take only this. */
export interface FrameContextLookup {
    has(name: string): boolean;
    /** The entry, or `undefined` when no context of that name is registered. */
    get(name: string): FrameContextEntry | undefined;
    /** Every registered name, in registration order (a supersession keeps its slot). */
    names(): FrameContext[];
    /** Each context with a non-empty fallback, mapped to that fallback, in registration order. */
    edges(): Record<string, FrameContext[]>;
    /** Who registered the entry a name resolves to, or `null` when none or it named nobody. */
    registrant(name: string): string | null;
    /** What later registrations of the name displaced, oldest first. */
    superseded(name: string): { entry: FrameContextEntry; by: string | null; supersededBy: string | null }[];
}

/**
 * The registry a host's `contexts` function is handed. Registering a name that exists REPLACES its entry in place
 * (`Supersede`): a host may change one of frame's seven's fallback or reserved names without forking frame (story 53).
 * There is no `forget`, so nothing can unregister a context a fallback names.
 *
 * `register` throws on a name that is not one key segment, a fallback naming the context itself, and any fallback on
 * `edit` (the resolver never cascades `edit`). A fallback naming a context NOT YET registered is legal at registration:
 * the kit checks every fallback once, after the host's function returns (`assertFallbacks`), so the order a host
 * registers in never matters.
 */
export interface FrameContextRegistry extends FrameContextLookup {
    register(name: FrameContext, definition?: FrameContextDefinition, by?: string): void;
    /** Throws when any fallback names a context that is not registered, naming it and the registered contexts. */
    assertFallbacks(): void;
}

/** A host's contexts: what the kit and a `--widgets` module's named `contexts` export are handed. */
export type KitContexts = (contexts: FrameContextRegistry) => void;

/** One key segment by the kernel's grammar: `Key.tryParse` applies it, and a dotted name parses to several segments. */
function isOneSegment(name: unknown): name is string {
    return typeof name === 'string' && Key.tryParse(name)?.segments.length === 1;
}

const describeName = (name: unknown) => (typeof name === 'string' ? `"${name}"` : String(name));

/**
 * A context registry seeded with frame's seven, in wire order, registered by `@schemastud/frame`: `KNOWN_CONTEXTS`,
 * with `INHERITS`'s two edges as one-element fallback lists (`row-cell` ← `edit`, `overview` ← `summary`), and
 * `list-column` reserving `row-actions` (the class-level `#[RowActions]` column, ruling 01 §4). `KNOWN_CONTEXTS` and
 * `INHERITS` are read here and nowhere else in the resolve path (86 Q15).
 */
export function createFrameContextRegistry(): FrameContextRegistry {
    const kernel: Registry<FrameContextEntry> = createRegistry<FrameContextEntry>({
        root: FRAME_CONTEXTS_ROOT,
        onKeyDuplicate: OnKeyDuplicate.Supersede,
        description: "frame's render contexts: frame's seven, then a host's (frame-foundation 86, 91)",
    });

    const get = (name: string): FrameContextEntry | undefined => {
        if (!isOneSegment(name)) return undefined;
        return kernel.has(name) ? kernel.resolve(name) : undefined;
    };

    const registry: FrameContextRegistry = {
        register(name, definition = {}, by) {
            if (!isOneSegment(name)) {
                throw new Error(
                    `[frame] context ${describeName(name)} is not one registry key segment: lowercase alphanumeric groups joined by "-", "_" or ":", ` +
                        `with no dot (it is the last segment of "${FRAME_CONTEXTS_ROOT}.<name>").`,
                );
            }
            const fallback = [...(definition.fallback ?? [])];
            const reserved = [...(definition.reserved ?? [])];
            if (name === 'edit' && fallback.length > 0) {
                throw new Error(`[frame] context "edit" takes no fallback: the form context never cascades (given ${fallback.map(describeName).join(', ')}).`);
            }
            for (const target of fallback) {
                if (!isOneSegment(target)) {
                    throw new Error(`[frame] context "${name}" falls back to ${describeName(target)}, which is not one registry key segment.`);
                }
                if (target === name) {
                    throw new Error(`[frame] context "${name}" falls back to itself.`);
                }
            }
            if (definition.grain !== undefined && !GRAINS.includes(definition.grain)) {
                throw new Error(
                    `[frame] context "${name}" names grain ${describeName(definition.grain)}; a grain is one of ${GRAINS.map((g) => `"${g}"`).join(', ')}.`,
                );
            }
            // A supersession keeps the grain it displaces when it names none, and may not change it (as PHP).
            const displaced = kernel.has(name) ? kernel.resolve(name).grain : undefined;
            if (displaced !== undefined && definition.grain !== undefined && definition.grain !== displaced) {
                throw new Error(`[frame] context "${name}" is ${displaced}-grain; a supersession may not make it ${definition.grain}-grain.`);
            }
            const grain = definition.grain ?? displaced;
            kernel.register(
                name,
                Object.freeze({
                    name,
                    fallback: Object.freeze(fallback),
                    reserved: Object.freeze(reserved),
                    ...(grain ? { grain } : {}),
                }),
                typeof by === 'string' ? by : null,
            );
        },
        assertFallbacks() {
            const names = kernel.names();
            for (const entry of names.map((n) => kernel.resolve(n))) {
                for (const target of entry.fallback) {
                    if (!kernel.has(target)) {
                        throw new Error(
                            `[frame] context "${entry.name}" falls back to "${target}", which is not registered (registered: ${names.join(', ')}).`,
                        );
                    }
                    // As PHP's edges check: a fallback shares its context's grain (where both declare one).
                    const targetGrain = kernel.resolve(target).grain;
                    if (entry.grain !== undefined && targetGrain !== undefined && entry.grain !== targetGrain) {
                        throw new Error(
                            `[frame] context "${entry.name}" is ${entry.grain}-grain but falls back to "${target}", which is ${targetGrain}-grain.`,
                        );
                    }
                }
            }
        },
        has: (name) => get(name) !== undefined,
        get,
        names: () => kernel.names(),
        edges() {
            const out: Record<string, FrameContext[]> = {};
            for (const name of kernel.names()) {
                const { fallback } = kernel.resolve(name);
                if (fallback.length > 0) out[name] = [...fallback];
            }
            return out;
        },
        registrant: (name) => (isOneSegment(name) ? kernel.registrantOf(name) : null),
        superseded: (name) =>
            isOneSegment(name) ? kernel.superseded(name).map(({ entry, by, supersededBy }) => ({ entry, by, supersededBy })) : [],
    };

    for (const name of KNOWN_CONTEXTS) {
        const parent = INHERITS[name];
        registry.register(
            name,
            {
                fallback: parent ? [parent] : [],
                reserved: name === 'list-column' ? ['row-actions'] : [],
                grain: SEVEN_GRAINS[name],
            },
            FRAME_CONTEXT_REGISTRANT,
        );
    }

    return registry;
}

/**
 * A kit's contexts: frame's seven, then the host's `contexts` function (run last, so its registrations win), then the
 * one fallback check (86 Q8). The one construction: `createFrameKit` and the vocabulary writer both call it.
 */
export function createFrameContexts(contexts?: KitContexts): FrameContextRegistry {
    const registry = createFrameContextRegistry();
    contexts?.(registry);
    registry.assertFallbacks();
    return registry;
}

/** A registry's reads alone, frozen: what a built kit exposes and injects, so nothing registers after construction. */
export function asLookup(registry: FrameContextRegistry): FrameContextLookup {
    const { has, get, names, edges, registrant, superseded } = registry;
    return Object.freeze({ has, get, names, edges, registrant, superseded });
}

let frameOnly: FrameContextLookup | undefined;

/**
 * Frame's own seven, as a READ-ONLY lookup: what a surface reads when no kit's registry reaches it (a hand-built
 * story, a test, a shell rendered without a `FrameProvider`). It is never handed to a host to register on.
 */
export function frameContexts(): FrameContextLookup {
    return (frameOnly ??= asLookup(createFrameContexts()));
}

/** The lender `lenderFor` found: its context's name and its participation entry. */
export interface FrameContextLender {
    context: FrameContext;
    entry: NodeParticipation;
}

/**
 * The cascade's ONE lookup (86 Q12): the first context in `ctx`'s fallback list whose entry at the same pointer
 * participates lends. An opted-out entry lends nothing and the next listed fallback is tried; lending never chains (a
 * lender's own fallback is never consulted), so a reader predicts the result from two entries and a cycle is harmless.
 * `byCtx` is one pointer's participation map (`manifest.byNode[ptr]`). `undefined` when nothing lends.
 *
 * Pass the SAME `contexts` to `resolveWidgetFor`'s sixth argument: that is where the resolver learns whether `ctx`
 * cascades at all, and a lender found in one registry handed to a resolver reading another would disagree with it.
 */
export function lenderFor(
    byCtx: Partial<Record<FrameContext, NodeParticipation>> | undefined,
    ctx: FrameContext,
    contexts: FrameContextLookup = frameContexts(),
): FrameContextLender | undefined {
    for (const context of contexts.get(ctx)?.fallback ?? []) {
        const entry = byCtx?.[context];
        if (entry?.participates) return { context, entry };
    }
    return undefined;
}
