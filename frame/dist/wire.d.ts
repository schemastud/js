export { F as FRAME_CONTEXT_KEYWORD, R as ResolvedForContext, r as resolveWidgetFor } from './resolveWidgetFor-DyTPD2bA.js';
import { b as ContextManifest, g as ResourceActionDefinition, h as FrameTransport } from './types-C1zrU238.js';
export { i as INHERITS, N as NodeParticipation, j as RealmDefinition } from './types-C1zrU238.js';
export { S as STUD_RESOURCE_REF_KEYWORD } from './ResourceRefWidget-DicocDWX.js';
export { K as KNOWN_ROW_ACTIONS } from './rowActions-CMdQOYha.js';
import '@schemastud/seam';
import '@schemastud/facets';
import 'react';
import '@rjsf/utils';
import '@schemastud/ui';

/**
 * The actions of one scope this ACTOR may press, in declared order (ADR-0005).
 *
 * Two gates, both from the manifest: the resource must DECLARE the action, and the per-actor
 * `can.actions[key]` must be `true`. Absent or `false` hides it — deny-while-unknown, the same posture a
 * host's `can` takes for the CRUD verbs — because a button that 403s teaches the reader the screen is
 * broken. The action's own URL is still the enforcement.
 *
 * A transport that cannot `invoke`, or cannot fetch the form of an action that has one, hides the
 * action too: a button that cannot send is worse than none.
 */
declare function resolveActions(manifest: ContextManifest | undefined, scope: ResourceActionDefinition['scope'], transport?: Pick<FrameTransport, 'invoke' | 'getActionSchema'>): ResourceActionDefinition[];

interface TextCellOptions {
    /** Monospace family (`var(--font-mono)`), for keys/ids/endpoints. */
    mono?: boolean;
    /** `medium` is the "primary column" weight; default inherits. */
    weight?: 'normal' | 'medium';
    /** `muted` reads as secondary (`var(--muted-foreground)`). */
    tone?: 'default' | 'muted';
    size?: 'xs' | 'sm' | 'base';
    /** Right-ish numeric alignment for value-ish strings that are not numbers. */
    tabular?: boolean;
    /** Clamp to N lines. */
    clamp?: number;
    /** Allow breaking inside a long unbroken token (URLs). */
    breakAll?: boolean;
    /** What an empty value renders as. Default `'—'`. */
    placeholder?: string;
    /** An `italic` placeholder reads as "absent by nature" rather than "missing". */
    placeholderStyle?: 'plain' | 'italic';
}
interface BadgeCellOptions {
    /** The primitive's variant token. Default `'outline'`. */
    variant?: string;
    /** Per-VALUE variant override, e.g. `{ demo: 'outline' }`. */
    variants?: Record<string, string>;
    /** Per-VALUE label override, e.g. `{ '1': 'Declared' }` or `{ true: 'exclude' }`. */
    labels?: Record<string, string>;
    /** Monospace badge text (event names, keys). */
    mono?: boolean;
    /**
     * What an empty value renders as. ABSENT means render nothing at all, which is what
     * eight of the measured closures did (`row.kind ? <Badge/> : null`) — so it is the
     * default rather than a dash.
     */
    placeholder?: string;
}
interface BadgesCellOptions extends BadgeCellOptions {
    /** How many badges before the overflow marker. Default 3. */
    limit?: number;
    /** For an array of OBJECTS: which key holds the label. */
    labelKey?: string;
    /** A second key tried when `labelKey` is absent on the item. */
    labelFallbackKey?: string;
    /** Render `+N more` past the limit. Default true. */
    overflow?: boolean;
}
interface NumberCellOptions {
    tone?: 'default' | 'muted';
    /** Render zero as the placeholder, so an empty row reads calm. */
    zeroAsDash?: boolean;
    /** Default `'—'`. */
    placeholder?: string;
}
interface DateCellOptions {
    tone?: 'default' | 'muted';
    /** Include the time-of-day. */
    time?: boolean;
    /** Default `'—'`. */
    placeholder?: string;
}

export { type BadgeCellOptions, type BadgesCellOptions, type DateCellOptions, type NumberCellOptions, type TextCellOptions, resolveActions };
