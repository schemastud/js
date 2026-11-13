import { useFrameMessages } from '../messages';
import { useMemo, useState, type ComponentType } from 'react';
import {
    Activity,
    BookOpen,
    Box,
    Calendar,
    Check,
    ChevronDown,
    ChevronRight,
    ChevronsUpDown,
    Layers,
    MessagesSquare,
    PenLine,
    Scale,
    Search,
    Server,
    Workflow,
    X,
} from 'lucide-react';
import {
    Badge,
    Button,
    Popover,
    PopoverContent,
    PopoverTrigger,
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
    cn,
    useIsMobile,
} from '@schemastud/ui';
import {
    resolveKindPlacement,
    type KindPlacement,
    type ResolvedKindPlacement,
    type ResourceKindScope,
    type ResourceKindVariant,
    type ResourcePickerDensity,
} from './placement';

// =============================================================================
// Stage 1 — pick a resource KIND. Three bodies over one catalogue:
//   palette — a searchable list (inline when expanded, trigger + popover when compact);
//   rail    — section icons with flyouts (compact), a section tree with counts (expanded);
//   catalog — chips (compact) / a card grid (expanded); reachable only by `variant`.
// Density picks the body (owner ruling 2026-11-02: expanded → palette, compact → rail).
// =============================================================================

type IconComponent = ComponentType<{ className?: string }>;

/** A lucide icon name from the built-in set, or a component. */
export type ResourceKindIcon = string | IconComponent;

const BUILTIN_ICONS: Record<string, IconComponent> = {
    activity: Activity,
    'book-open': BookOpen,
    box: Box,
    calendar: Calendar,
    layers: Layers,
    'messages-square': MessagesSquare,
    'pen-line': PenLine,
    scale: Scale,
    server: Server,
    workflow: Workflow,
};

function iconOf(icon: ResourceKindIcon | undefined): IconComponent {
    if (!icon) return Box;
    return typeof icon === 'string' ? (BUILTIN_ICONS[icon] ?? Box) : icon;
}

export interface ResourceKindSection {
    key: string;
    label: string;
    icon?: ResourceKindIcon;
}

/** One declared resource kind. `facts` are what the scopes read; absent facts never pass a scope. */
export interface ResourceKindOption {
    key: string;
    label: string;
    /** The section key it is filed under; null/unknown files it under "Other". */
    section?: string | null;
    /** The fallback sub-heading inside "Other" (a backing package: Market, Accounts…). */
    group?: string;
    /** A second line in expanded bodies — the backing DTO, a short description. */
    detail?: string;
    /** Short flags (`read-only`, `unframed`) shown in expanded bodies. */
    badges?: string[];
    icon?: ResourceKindIcon;
    facts?: { framed?: boolean; writable?: boolean; filterable?: boolean };
}

export type ResourceKindScopeInput = ResourceKindScope | ((kind: ResourceKindOption) => boolean);

const SCOPE_PREDICATE: Record<ResourceKindScope, (kind: ResourceKindOption) => boolean> = {
    all: () => true,
    framed: (k) => k.facts?.framed === true,
    writable: (k) => k.facts?.writable === true,
    filterable: (k) => k.facts?.filterable === true,
};

export function kindsInScope(kinds: ResourceKindOption[], scope: ResourceKindScopeInput): ResourceKindOption[] {
    const predicate = typeof scope === 'function' ? scope : SCOPE_PREDICATE[scope];
    return kinds.filter(predicate);
}

interface Group {
    key: string;
    label: string;
    Icon: IconComponent;
    items: ResourceKindOption[];
    /** Sub-headings, only for the "Other" tail. */
    sub?: [string, ResourceKindOption[]][];
}

const OTHER = '__other';

function groupKinds(kinds: ResourceKindOption[], sections: ResourceKindSection[], otherLabel: string): Group[] {
    const known = new Set(sections.map((s) => s.key));
    const groups: Group[] = sections
        .map((s) => ({
            key: s.key,
            label: s.label,
            Icon: iconOf(s.icon),
            items: kinds.filter((k) => k.section === s.key),
        }))
        .filter((g) => g.items.length > 0);
    const rest = kinds.filter((k) => !k.section || !known.has(k.section));
    if (rest.length > 0) {
        const byGroup = new Map<string, ResourceKindOption[]>();
        for (const k of [...rest].sort((a, b) => (a.group ?? '').localeCompare(b.group ?? ''))) {
            const g = k.group ?? '';
            byGroup.set(g, [...(byGroup.get(g) ?? []), k]);
        }
        groups.push({ key: OTHER, label: otherLabel, Icon: Box, items: rest, sub: [...byGroup.entries()] });
    }
    return groups;
}

function matches(kind: ResourceKindOption, query: string): boolean {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
        kind.key.toLowerCase().includes(q) ||
        kind.label.toLowerCase().includes(q) ||
        (kind.section ?? '').toLowerCase().includes(q) ||
        (kind.group ?? '').toLowerCase().includes(q) ||
        (kind.detail ?? '').toLowerCase().includes(q)
    );
}

export interface ResourceKindPickerProps {
    kinds: ResourceKindOption[];
    sections?: ResourceKindSection[];
    /** Where the picker is mounted; resolves scope × density × select. */
    placement?: KindPlacement;
    scope?: ResourceKindScopeInput;
    density?: ResourcePickerDensity;
    select?: 'single' | 'multi';
    /** Force a body; `catalog` is reachable only this way. */
    variant?: ResourceKindVariant;
    orientation?: 'horizontal' | 'vertical';
    /** Picked kind keys. */
    value: string[];
    onChange: (keys: string[]) => void;
    /** Accessible name of the whole control. */
    label?: string;
    id?: string;
    disabled?: boolean;
}

interface BodyProps {
    groups: Group[];
    kinds: ResourceKindOption[];
    resolved: ResolvedKindPlacement;
    picked: Set<string>;
    onPick: (key: string) => void;
    label: string;
    id?: string;
    disabled?: boolean;
    total: number;
}

/** Stage 1: pick resource kinds. */
export function ResourceKindPicker(props: ResourceKindPickerProps) {
    const { t } = useFrameMessages();
    const resolved = resolveKindPlacement(props.placement, {
        ...(typeof props.scope === 'string' ? { scope: props.scope } : {}),
        ...(props.density ? { density: props.density } : {}),
        ...(props.select ? { select: props.select } : {}),
        ...(props.variant ? { variant: props.variant } : {}),
        ...(props.orientation ? { orientation: props.orientation } : {}),
    });
    const scope = typeof props.scope === 'function' ? props.scope : resolved.scope;
    const inScope = useMemo(() => kindsInScope(props.kinds, scope), [props.kinds, scope]);
    const sections = props.sections ?? [];
    const groups = useMemo(() => groupKinds(inScope, sections, t("schemastud-frame::messages.other")), [inScope, sections, t]);
    const picked = new Set(props.value);
    const onPick = (key: string) => {
        if (props.disabled) return;
        if (resolved.select === 'single') props.onChange(picked.has(key) ? [] : [key]);
        else props.onChange(picked.has(key) ? props.value.filter((k) => k !== key) : [...props.value, key]);
    };
    const body: BodyProps = {
        groups,
        kinds: inScope,
        resolved,
        picked,
        onPick,
        label: props.label ?? t("schemastud-frame::messages.resource"),
        id: props.id,
        disabled: props.disabled,
        total: inScope.length,
    };
    return (
        <div
            data-resource-picker="kinds"
            data-variant={resolved.variant}
            data-density={resolved.density}
            className="min-w-0"
        >
            {resolved.variant === 'palette' ? (
                <PaletteBody {...body} />
            ) : resolved.variant === 'catalog' ? (
                <CatalogBody {...body} />
            ) : (
                <RailBody {...body} />
            )}
        </div>
    );
}

function pickedNames(kinds: ResourceKindOption[], picked: Set<string>): string {
    return kinds.filter((k) => picked.has(k.key)).map((k) => k.label).join(', ');
}

function Picked({ picked, kinds, select, sections }: { picked: Set<string>; kinds: ResourceKindOption[]; select: string; sections: Group[] }) {
    const { t } = useFrameMessages();
    const chosen = kinds.filter((k) => picked.has(k.key));
    if (chosen.length === 0) return null;
    if (select === 'single' || chosen.length === 1) {
        const k = chosen[0];
        const Icon = k.icon ? iconOf(k.icon) : (sections.find((g) => g.items.includes(k))?.Icon ?? Box);
        return (
            <span className="inline-flex min-w-0 items-center gap-1.5">
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{k.label}</span>
            </span>
        );
    }
    return <span>{t("schemastud-frame::messages.count_resources", { count: chosen.length })}</span>;
}

/* ─────────────────────────────── palette ─────────────────────────────── */

function PaletteList({ groups, picked, onPick, resolved, query, disabled }: BodyProps & { query: string }) {
    const { t } = useFrameMessages();
    const expanded = resolved.density === 'expanded';
    const visible = groups
        .map((g) => ({ ...g, items: g.items.filter((k) => matches(k, query)) }))
        .filter((g) => g.items.length > 0);
    if (visible.length === 0) {
        return (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                {query ? t("schemastud-frame::messages.no_resources_match_query", { query: query }) : t("schemastud-frame::messages.no_resources_are_available_here")}
            </p>
        );
    }
    return (
        <div className={cn('overflow-y-auto overscroll-contain p-1', expanded ? 'max-h-[32rem]' : 'max-h-80')}>
            {visible.map((g) => (
                <div key={g.key} role="group" aria-label={g.label} className="py-1">
                    <div className="px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
                        {g.label} <span className="font-normal tabular-nums">· {g.items.length}</span>
                    </div>
                    {g.items.map((k, i, xs) => {
                        const on = picked.has(k.key);
                        const Icon = k.icon ? iconOf(k.icon) : g.Icon;
                        const subHead = g.key === OTHER && k.group && (i === 0 || xs[i - 1].group !== k.group);
                        return (
                            <div key={k.key} className="contents">
                                {subHead ? (
                                    <div className="px-2 pt-2 pb-0.5 text-[11px] font-medium text-muted-foreground">{k.group}</div>
                                ) : null}
                                <button
                                    type="button"
                                    disabled={disabled}
                                    aria-pressed={on}
                                    onClick={() => onPick(k.key)}
                                    className={cn(
                                        'flex w-full min-w-0 items-center gap-2 rounded-sm px-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                        expanded ? 'py-2' : 'py-1.5',
                                        on && 'bg-accent text-accent-foreground',
                                    )}
                                >
                                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex min-w-0 items-baseline gap-2">
                                            <span className="truncate font-medium">{k.label}</span>
                                            <span className="hidden truncate font-mono text-xs text-muted-foreground sm:inline">{k.key}</span>
                                        </span>
                                        {expanded && (k.detail || k.badges?.length) ? (
                                            <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                                {k.detail ? <span className="truncate font-mono">{k.detail}</span> : null}
                                                {k.badges?.map((b) => (
                                                    <Badge key={b} variant="outline" className="h-4 px-1 text-[11px] font-normal">
                                                        {b}
                                                    </Badge>
                                                ))}
                                            </span>
                                        ) : null}
                                    </span>
                                    <Check className={cn('size-4 shrink-0 text-primary', on ? 'opacity-100' : 'opacity-0')} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

function SearchBox({ value, onChange, label, autoFocus }: { value: string; onChange: (v: string) => void; label: string; autoFocus?: boolean }) {
    return (
        <div className="flex items-center gap-2 border-b border-border px-2.5">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
                type="search"
                autoFocus={autoFocus}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label={label}
                placeholder={`${label}…`}
                className="h-9 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
        </div>
    );
}

function PaletteBody(props: BodyProps) {
    const { t } = useFrameMessages();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    if (props.resolved.density === 'expanded') {
        return (
            <div id={props.id} role="region" aria-label={props.label} className="w-full max-w-xl rounded-md border border-border bg-card text-card-foreground">
                <SearchBox value={query} onChange={setQuery} label={t("schemastud-frame::messages.search_resources")} />
                <PaletteList {...props} query={query} />
                <div className="border-t border-border px-2.5 py-1.5 text-xs text-muted-foreground tabular-nums">
                    {props.picked.size > 0 && props.resolved.select === 'multi' ? t("schemastud-frame::messages.size_of_total_picked", { size: props.picked.size, total: props.total }) : t("schemastud-frame::messages.total_resources", { total: props.total })}
                </div>
            </div>
        );
    }
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={props.id}
                    type="button"
                    variant="outline"
                    disabled={props.disabled}
                    aria-label={`${props.label}: ${pickedNames(props.kinds, props.picked) || t("schemastud-frame::messages.none_chosen")}`}
                    className="w-full min-w-0 justify-between font-normal sm:w-72"
                >
                    <Picked picked={props.picked} kinds={props.kinds} select={props.resolved.select} sections={props.groups} />
                    {props.picked.size === 0 ? <span className="text-muted-foreground">{t("schemastud-frame::messages.choose_a_resource")}</span> : null}
                    <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-0">
                <SearchBox value={query} onChange={setQuery} label={t("schemastud-frame::messages.search_resources")} autoFocus />
                <PaletteList
                    {...props}
                    query={query}
                    onPick={(k) => {
                        props.onPick(k);
                        if (props.resolved.select === 'single') setOpen(false);
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}

/* ─────────────────────────────── rail ─────────────────────────────── */

function RailFlyout({ g, picked, onPick, close, select, disabled }: { g: Group; picked: Set<string>; onPick: (k: string) => void; close: () => void; select: string; disabled?: boolean }) {
    const sub = g.sub ?? [['', g.items] as [string, ResourceKindOption[]]];
    return (
        <div className="max-h-[min(24rem,70vh)] overflow-y-auto overscroll-contain p-1">
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                {g.label} · {g.items.length}
            </div>
            {sub.map(([name, items]) => (
                <div key={name || '_'}>
                    {name ? <div className="px-2 pt-1.5 pb-0.5 text-[11px] font-medium text-muted-foreground">{name}</div> : null}
                    {items.map((k) => {
                        const on = picked.has(k.key);
                        return (
                            <button
                                key={k.key}
                                type="button"
                                disabled={disabled}
                                aria-pressed={on}
                                onClick={() => {
                                    onPick(k.key);
                                    if (select === 'single') close();
                                }}
                                className={cn(
                                    'flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                    on && 'bg-accent font-medium text-accent-foreground',
                                )}
                            >
                                <span className="truncate">{k.label}</span>
                                <Check className={cn('size-3.5 shrink-0 text-primary', on ? 'opacity-100' : 'opacity-0')} />
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

function RailBody(props: BodyProps) {
    const { t } = useFrameMessages();
    const { groups, picked, onPick, resolved } = props;
    const [query, setQuery] = useState('');
    const [openKey, setOpenKey] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
    const isMobile = useIsMobile();

    if (resolved.density === 'compact') {
        const horizontal = resolved.orientation === 'horizontal';
        if (groups.length === 0) {
            return <p className="text-sm text-muted-foreground">{t("schemastud-frame::messages.no_resources_are_available_here")}</p>;
        }
        const sheetGroup = isMobile ? groups.find((g) => g.key === openKey) : undefined;
        return (
            <TooltipProvider>
                <div className={cn('flex min-w-0 gap-2', horizontal ? 'flex-wrap items-center' : 'items-start')}>
                    <div
                        id={props.id}
                        role="toolbar"
                        aria-label={t("schemastud-frame::messages.label_sections", { label: props.label })}
                        aria-orientation={resolved.orientation}
                        className={cn(
                            'flex max-w-full gap-0.5 rounded-md border border-border bg-card p-1',
                            horizontal ? 'flex-row flex-wrap' : 'w-11 flex-col items-center',
                        )}
                    >
                        {groups.map((g, i) => {
                            const has = g.items.some((k) => picked.has(k.key));
                            const open = openKey === g.key;
                            // Flyouts in the right half of a strip open toward the left, so a phone-width
                            // strip never pushes a panel past the viewport's edge.
                            const align = horizontal && i >= groups.length / 2 ? 'end' : 'start';
                            return (
                                // Phone: the flyout is a bottom sheet (rendered once, below) — an anchored panel off a
                                // 40px icon cannot stay inside a 390px viewport from every position in the strip.
                                <Popover key={g.key} open={open && !isMobile} onOpenChange={(o) => setOpenKey(o ? g.key : null)}>
                                    <PopoverTrigger asChild>
                                        <button
                                            type="button"
                                            disabled={props.disabled}
                                            aria-label={t("schemastud-frame::messages.label_count_resourcesvalue", { label: g.label, count: g.items.length, value: has ? t("schemastud-frame::messages.has_a_pick") : '' })}
                                            className={cn(
                                                'relative flex size-10 items-center justify-center sm:size-8 rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                                (open || has) && 'bg-accent text-foreground',
                                            )}
                                        >
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="flex size-full items-center justify-center">
                                                        <g.Icon className="size-4" />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    {g.label} · {g.items.length}
                                                </TooltipContent>
                                            </Tooltip>
                                            {has ? <span aria-hidden className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" /> : null}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent align={align} className="w-[min(16rem,calc(100vw-2rem))] p-0">
                                        <RailFlyout
                                            g={g}
                                            picked={picked}
                                            onPick={onPick}
                                            select={resolved.select}
                                            disabled={props.disabled}
                                            close={() => setOpenKey(null)}
                                        />
                                    </PopoverContent>
                                </Popover>
                            );
                        })}
                    </div>
                    <Sheet open={Boolean(sheetGroup)} onOpenChange={(o) => !o && setOpenKey(null)}>
                        <SheetContent side="bottom" className="max-h-[80dvh] gap-0 rounded-t-xl p-0">
                            <SheetHeader className="border-b border-border px-4 py-3">
                                <SheetTitle>{sheetGroup?.label ?? props.label}</SheetTitle>
                                <SheetDescription className="sr-only">{t("schemastud-frame::messages.choose_a_resource_from_this_section")}</SheetDescription>
                            </SheetHeader>
                            {sheetGroup ? (
                                <RailFlyout
                                    g={sheetGroup}
                                    picked={picked}
                                    onPick={onPick}
                                    select={resolved.select}
                                    disabled={props.disabled}
                                    close={() => setOpenKey(null)}
                                />
                            ) : null}
                        </SheetContent>
                    </Sheet>
                    <div className={cn('min-w-0 truncate text-sm', !horizontal && 'pt-1.5')} aria-live="polite">
                        {picked.size === 0 ? (
                            <span className="text-muted-foreground">{t("schemastud-frame::messages.choose_a_section_then_a_resource")}</span>
                        ) : (
                            <span className="font-medium">
                                <Picked picked={picked} kinds={props.kinds} select={resolved.select} sections={groups} />
                            </span>
                        )}
                    </div>
                </div>
            </TooltipProvider>
        );
    }

    const visible = groups
        .map((g) => ({ ...g, items: g.items.filter((k) => matches(k, query)) }))
        .filter((g) => g.items.length > 0);
    return (
        <div id={props.id} role="region" aria-label={props.label} className="w-full max-w-xs rounded-md border border-border bg-card text-card-foreground">
            <SearchBox value={query} onChange={setQuery} label={t("schemastud-frame::messages.filter_resources")} />
            <div className="max-h-[32rem] overflow-y-auto overscroll-contain p-1">
                {visible.map((g) => {
                    const isCollapsed = collapsed.has(g.key) && !query;
                    return (
                        <div key={g.key}>
                            <button
                                type="button"
                                aria-expanded={!isCollapsed}
                                onClick={() =>
                                    setCollapsed((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(g.key)) next.delete(g.key);
                                        else next.add(g.key);
                                        return next;
                                    })
                                }
                                className="flex w-full items-center gap-1.5 rounded-sm px-1.5 py-1.5 text-xs font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {isCollapsed ? (
                                    <ChevronRight className="size-3.5 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="size-3.5 text-muted-foreground" />
                                )}
                                <g.Icon className="size-3.5 text-muted-foreground" />
                                {g.label}
                                <span className="ml-auto font-normal text-muted-foreground tabular-nums">{g.items.length}</span>
                            </button>
                            {!isCollapsed &&
                                g.items.map((k) => {
                                    const on = picked.has(k.key);
                                    return (
                                        <button
                                            key={k.key}
                                            type="button"
                                            disabled={props.disabled}
                                            aria-pressed={on}
                                            onClick={() => onPick(k.key)}
                                            className={cn(
                                                'ml-4 flex w-[calc(100%-1rem)] items-center gap-2 rounded-sm border-l py-1 pr-2 pl-3 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                                on ? 'border-primary bg-accent font-medium' : 'border-border',
                                            )}
                                        >
                                            <span className="truncate">{k.label}</span>
                                            <Check className={cn('ml-auto size-3.5 shrink-0 text-primary', on ? 'opacity-100' : 'opacity-0')} />
                                        </button>
                                    );
                                })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ─────────────────────────────── catalog (flag only) ─────────────────────────────── */

function CatalogBody({ groups, picked, onPick, resolved, label, id, disabled }: BodyProps) {
    if (resolved.density === 'compact') {
        return (
            <div id={id} role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
                {groups.map((g) => (
                    <div key={g.key} className="contents">
                        <span className="mr-0.5 ml-1 text-[11px] font-medium text-muted-foreground uppercase first:ml-0">{g.label}</span>
                        {g.items.map((k) => {
                            const on = picked.has(k.key);
                            return (
                                <button
                                    key={k.key}
                                    type="button"
                                    disabled={disabled}
                                    aria-pressed={on}
                                    onClick={() => onPick(k.key)}
                                    className={cn(
                                        'inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                        on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:bg-accent',
                                    )}
                                >
                                    <g.Icon className="size-3" />
                                    {k.label}
                                    {on && resolved.select === 'multi' ? <X className="size-3" /> : null}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        );
    }
    return (
        <div id={id} role="group" aria-label={label} className="space-y-6">
            {groups.map((g) => (
                <section key={g.key} className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                        <g.Icon className="size-4 text-muted-foreground" />
                        {g.label}
                        <span className="text-xs font-normal text-muted-foreground tabular-nums">{g.items.length}</span>
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {g.items.map((k) => {
                            const on = picked.has(k.key);
                            return (
                                <button
                                    key={k.key}
                                    type="button"
                                    disabled={disabled}
                                    aria-pressed={on}
                                    onClick={() => onPick(k.key)}
                                    className={cn(
                                        'min-w-0 rounded-md border border-border bg-card p-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                        on && 'border-primary ring-1 ring-primary',
                                    )}
                                >
                                    <span className="flex items-start justify-between gap-2">
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-medium">{k.label}</span>
                                            <span className="block truncate font-mono text-xs text-muted-foreground">{k.key}</span>
                                        </span>
                                        <span
                                            aria-hidden
                                            className={cn(
                                                'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                                                on ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                                            )}
                                        >
                                            {on ? <Check className="size-3" /> : null}
                                        </span>
                                    </span>
                                    {k.detail || k.badges?.length ? (
                                        <span className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                            {k.detail ? <span className="truncate font-mono">{k.detail}</span> : null}
                                            {k.badges?.map((b) => (
                                                <Badge key={b} variant="outline" className="h-4 px-1 text-[11px] font-normal">
                                                    {b}
                                                </Badge>
                                            ))}
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
}
