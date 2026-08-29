import type { CSSProperties, ReactNode } from 'react';
import { useFrameInjection } from './context';
import { getPath } from './getPath';
import type { NodeParticipation } from './contexts';
import type { Row } from './types';

// =============================================================================
// Declared column kinds — how a cell RENDERS, said once on the server.
//
// The column SET and its ORDER have been declaration-driven since `resolveColumns`
// learned to read `list-column` participation. How each cell RENDERS was not: every
// frame list in the estate hand-wrote a closure per column, and a census of the nine
// flagship surfaces that do it found 51 closures collapsing into a handful of shapes
// repeated verbatim — a `Badge` for a kind/layer/status string (11 times), a
// `toLocaleDateString()` (4), a right-aligned count (10), a monospace/emphasised/muted
// string (14), a badge row over an array (3).
//
// This module is that vocabulary. It is DERIVED from those 51, not invented: a shape had
// to appear at least three times across at least two surfaces to become a kind. Two real
// shapes were measured and deliberately REFUSED on that threshold — a "primary line over
// a muted secondary line" stack (2 occurrences) and a line-clamped description (1). The
// stack additionally fails a structural test the threshold does not: it renders a SECOND
// field, and a per-property declaration is the wrong place to name a companion property.
//
// ## Everything goes through injected `primitives`
//
// Frame is design-system-agnostic; `Badge` is a `FramePrimitives` member and is resolved
// through the injection, never imported. Typography and tone are inline `style`, not
// class names — a host's Tailwind does not scan `node_modules`, so a class name emitted
// from this package generates no CSS and the cell silently loses its styling behind a
// perfectly green test run. The color/family tokens are read as CSS custom properties
// (`var(--muted-foreground)`), which a host's stylesheet defines and this package never
// has to ship.
// =============================================================================

/** The derived vocabulary. A name outside this set falls through to the default cell. */
export const COLUMN_KINDS = ['text', 'badge', 'badges', 'number', 'date'] as const;

export type ColumnKind = (typeof COLUMN_KINDS)[number];

export interface TextCellOptions {
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

export interface BadgeCellOptions {
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

export interface BadgesCellOptions extends BadgeCellOptions {
    /** How many badges before the overflow marker. Default 3. */
    limit?: number;
    /** For an array of OBJECTS: which key holds the label. */
    labelKey?: string;
    /** A second key tried when `labelKey` is absent on the item. */
    labelFallbackKey?: string;
    /** Render `+N more` past the limit. Default true. */
    overflow?: boolean;
}

export interface NumberCellOptions {
    tone?: 'default' | 'muted';
    /** Render zero as the placeholder, so an empty row reads calm. */
    zeroAsDash?: boolean;
    /** Default `'—'`. */
    placeholder?: string;
}

export interface DateCellOptions {
    tone?: 'default' | 'muted';
    /** Include the time-of-day. */
    time?: boolean;
    /** Default `'—'`. */
    placeholder?: string;
}

const MUTED = 'var(--muted-foreground, inherit)';
const MONO = 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)';
const SIZES: Record<string, string> = { xs: '0.75rem', sm: '0.875rem', base: '1rem' };

const isEmpty = (value: unknown): boolean =>
    value === null || value === undefined || value === '';

/**
 * Resolve a declared `list-column` participation into a cell renderer, or `undefined` when
 * the participation names no kind (or one this build does not know).
 *
 * Deliberately returns a closure that renders a COMPONENT rather than raw markup: the
 * renderers read `primitives` off the injection, and a hook can only run inside a
 * component's render. This is also what keeps `resolveColumns` a pure function with an
 * unchanged signature.
 */
export function resolveDeclaredCell(
    field: string,
    participation: NodeParticipation,
): ((record: Row) => ReactNode) | undefined {
    const kind = participation.widget;

    if (!kind || !(COLUMN_KINDS as readonly string[]).includes(kind)) return undefined;

    const options = (participation.options ?? {}) as Record<string, unknown>;

    return (record: Row) => (
        <DeclaredCell kind={kind as ColumnKind} options={options} value={getPath(record, field)} />
    );
}

/** The one component every declared kind renders through. */
export function DeclaredCell({
    kind,
    options,
    value,
}: {
    kind: ColumnKind;
    options: Record<string, unknown>;
    value: unknown;
}) {
    switch (kind) {
        case 'badge':
            return <BadgeCell value={value} options={options as BadgeCellOptions} />;
        case 'badges':
            return <BadgesCell value={value} options={options as BadgesCellOptions} />;
        case 'number':
            return <NumberCell value={value} options={options as NumberCellOptions} />;
        case 'date':
            return <DateCell value={value} options={options as DateCellOptions} />;
        case 'text':
        default:
            return <TextCell value={value} options={options as TextCellOptions} />;
    }
}

// ─── text ────────────────────────────────────────────────────────────────────
// 14 of the 51 measured closures: a monospace id, an emphasised primary name, a muted
// secondary line, a clamped description. They differed only in typography and in what
// they printed when the value was absent, so they are one kind with options rather than
// the four kinds (`mono` / `strong` / `text` / `truncate`) a first read suggests.

function TextCell({ value, options }: { value: unknown; options: TextCellOptions }) {
    const style: CSSProperties = {};

    if (options.mono) style.fontFamily = MONO;
    if (options.weight === 'medium') style.fontWeight = 500;
    if (options.tone === 'muted') style.color = MUTED;
    if (options.size) style.fontSize = SIZES[options.size];
    if (options.tabular) style.fontVariantNumeric = 'tabular-nums';
    if (options.breakAll) style.wordBreak = 'break-all';

    if (options.clamp) {
        style.display = '-webkit-box';
        style.WebkitBoxOrient = 'vertical';
        style.WebkitLineClamp = options.clamp;
        style.overflow = 'hidden';
    }

    if (isEmpty(value)) {
        return (
            <Placeholder
                text={options.placeholder ?? '—'}
                italic={options.placeholderStyle === 'italic'}
            />
        );
    }

    return (
        <span data-frame-cell="text" style={style}>
            {String(value)}
        </span>
    );
}

function Placeholder({ text, italic }: { text: string; italic?: boolean }) {
    // A placeholder is ALWAYS muted, whatever tone the value carries — the two are
    // different facts and every measured closure agreed on this without saying so.
    return (
        <span
            data-frame-cell="placeholder"
            style={{ color: MUTED, ...(italic ? { fontStyle: 'italic' } : {}) }}
        >
            {text}
        </span>
    );
}

// ─── badge ───────────────────────────────────────────────────────────────────
// 11 of the 51: a `kind` / `layer` / `status` / `vertical` string in a Badge. The two
// interesting sub-shapes both fold into per-value maps rather than into new kinds — a
// variant that depends on the value (`demo` → outline, else secondary) and a label that
// depends on the value (provenance tier 1/2/3 → Declared/Derived/Verified, or a boolean
// → include/exclude).

function BadgeCell({ value, options }: { value: unknown; options: BadgeCellOptions }) {
    const { primitives } = useFrameInjection();
    const Badge = primitives.Badge;

    if (isEmpty(value)) {
        return options.placeholder !== undefined ? (
            <Placeholder text={options.placeholder} />
        ) : null;
    }

    const key = String(value);
    const label = options.labels?.[key] ?? key;
    const variant = options.variants?.[key] ?? options.variant ?? 'outline';

    return (
        <Badge
            data-frame-cell="badge"
            variant={variant}
            {...(options.mono ? { style: { fontFamily: MONO } } : {})}
        >
            {label}
        </Badge>
    );
}

// ─── badges ──────────────────────────────────────────────────────────────────
// 3 of the 51: an ARRAY rendered as a badge row, capped, with the rest summarised. Items
// are strings or objects; `labelKey`/`labelFallbackKey` name where the label lives.

function BadgesCell({ value, options }: { value: unknown; options: BadgesCellOptions }) {
    const { primitives } = useFrameInjection();
    const Badge = primitives.Badge;

    const items = Array.isArray(value) ? value : [];

    if (items.length === 0) {
        return options.placeholder !== undefined ? (
            <Placeholder text={options.placeholder} />
        ) : null;
    }

    const limit = options.limit ?? 3;
    const shown = items.slice(0, limit);
    const rest = items.length - shown.length;
    const variant = options.variant ?? 'outline';

    return (
        <div
            data-frame-cell="badges"
            style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', alignItems: 'center' }}
        >
            {shown.map((item, index) => {
                const label = badgeLabel(item, options);

                return (
                    <Badge
                        key={`${label}-${index}`}
                        variant={options.variants?.[label] ?? variant}
                        {...(options.mono ? { style: { fontFamily: MONO } } : {})}
                    >
                        {options.labels?.[label] ?? label}
                    </Badge>
                );
            })}
            {options.overflow !== false && rest > 0 ? (
                <span style={{ color: MUTED, fontSize: SIZES.xs }}>+{rest} more</span>
            ) : null}
        </div>
    );
}

function badgeLabel(item: unknown, options: BadgesCellOptions): string {
    if (item === null || item === undefined) return '';
    if (typeof item !== 'object') return String(item);

    const record = item as Record<string, unknown>;
    const primary = options.labelKey ? record[options.labelKey] : undefined;
    const fallback = options.labelFallbackKey ? record[options.labelFallbackKey] : undefined;

    return String(primary ?? fallback ?? '');
}

// ─── number ──────────────────────────────────────────────────────────────────
// 10 of the 51: a count or tier, tabular so columns of digits line up. The only real
// variation was whether ZERO reads as `0` or as a calm dash.

function NumberCell({ value, options }: { value: unknown; options: NumberCellOptions }) {
    const placeholder = options.placeholder ?? '—';

    if (isEmpty(value)) return <Placeholder text={placeholder} />;

    const n = Number(value);

    if (Number.isNaN(n)) return <Placeholder text={placeholder} />;
    if (n === 0 && options.zeroAsDash) return <Placeholder text={placeholder} />;

    return (
        <span
            data-frame-cell="number"
            style={{
                fontVariantNumeric: 'tabular-nums',
                ...(options.tone === 'muted' ? { color: MUTED } : {}),
            }}
        >
            {n}
        </span>
    );
}

// ─── date ────────────────────────────────────────────────────────────────────
// 4 of the 51, and the most verbatim repetition in the census: an ISO string through
// `new Date(…).toLocaleDateString()`, muted, dash when absent.

function DateCell({ value, options }: { value: unknown; options: DateCellOptions }) {
    const placeholder = options.placeholder ?? '—';

    if (isEmpty(value)) return <Placeholder text={placeholder} />;

    const parsed = new Date(String(value));

    // An unparseable value is shown RAW rather than as `Invalid Date` or as a dash: the
    // dash would assert the field is empty when it is populated-and-wrong, which is the
    // estate's recurring "reports success by not running" shape in miniature.
    if (Number.isNaN(parsed.getTime())) {
        return <span data-frame-cell="date">{String(value)}</span>;
    }

    return (
        <span
            data-frame-cell="date"
            style={options.tone === 'muted' ? { color: MUTED } : undefined}
        >
            {options.time ? parsed.toLocaleString() : parsed.toLocaleDateString()}
        </span>
    );
}
