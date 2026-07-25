import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ReactNode } from 'react';
import { userEvent, within, waitFor } from 'storybook/test';
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from '@schemastud/ui';
import { Combobox, type ComboboxOption, type ComboboxPrimitives } from './Combobox';

/**
 * Foundation/Combobox (component-seams ticket 19). The host-agnostic async combobox: a
 * searchable, debounced, keyboard-navigable select over a caller-supplied `search(query)`.
 * It carries NO design-system dependency — its UI atoms (`Popover`, `Input`) are **injected
 * as a `primitives` prop** (not a provider), so it renders anywhere, including chrome outside
 * any provider (a breadcrumb switcher). Here it is fixtured over the sibling `@schemastud/ui`
 * Popover + Input (a package import, not app coupling) and a fake in-memory `search`.
 *
 * TREATMENT axes (treatment-axes.md): **states** is the dominant axis for this state-rich
 * primitive — closed / open / typing+filtering / empty-results / loading (async parked) /
 * disabled / selected (`currentValue`). The overlay-bearing stories drive the popover open
 * (and type) in `play` and `play`-await settled options, so a VR baseline captures the
 * settled panel — never the debounce/loading flash. Ambient token + light⊗dark inherited
 * from the workbench (ticket 14). **canvas** decorator proves the panel reads on flat ↔ dotted.
 *
 * Rule of sanction — axes this primitive does NOT expose, recorded so "storied" is honest:
 * **variant / size / tone / density** (no such props — a single injected surface, styling is
 * fully caller-supplied via `*ClassName`); **viewport** (a small anchored panel, not a
 * responsive/collapse surface); **multi-select** (the component is single-select by contract
 * — `onSelect` yields one option and closes; multi would be a component change, not a story).
 * Absent = absent-not-a-gap.
 */
const meta = {
    title: 'Foundation/Combobox',
    parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Fixtures ──────────────────────────────────────────────────────────────────
// A tiny in-memory corpus + a fake async `search`. Value-neutral (option.value is any
// caller identity); here plain ids. Case-insensitive substring filter to exercise typing.
const CORPUS: ComboboxOption[] = [
    { value: 'ada', label: 'Ada Lovelace', hint: 'Analytical Engine' },
    { value: 'grace', label: 'Grace Hopper', hint: 'COBOL · the compiler' },
    { value: 'alan', label: 'Alan Turing', hint: 'Halting problem' },
    { value: 'katherine', label: 'Katherine Johnson', hint: 'Orbital mechanics' },
    { value: 'donald', label: 'Donald Knuth', hint: 'TAOCP · TeX' },
];

// A settleable search: `delay` models network latency; `empty` returns nothing regardless
// of query; `never` parks forever (the loading state that a VR baseline must NOT catch —
// its story is deliberately left in-flight). `debounceMs={0}` on the stories keeps `play`
// deterministic without racing the default 200ms debounce.
function makeSearch(opts: { delay?: number; empty?: boolean; never?: boolean } = {}) {
    return (query: string): Promise<ComboboxOption[]> =>
        new Promise((resolve) => {
            if (opts.never) return; // parked forever → loadingText stays
            const q = query.trim().toLowerCase();
            const matched = opts.empty
                ? []
                : q === ''
                  ? CORPUS
                  : CORPUS.filter((o) => o.label.toLowerCase().includes(q));
            setTimeout(() => resolve(matched), opts.delay ?? 0);
        });
}

const primitives: ComboboxPrimitives = { Popover, PopoverTrigger, PopoverContent, Input };

// flat = calm settings paper (`bg-background`); dotted = work/operator surface. The dotted
// texture is inlined so the story is self-contained (mirrors FrameLayout's Canvas).
function Canvas({ variant, children }: { variant: 'flat' | 'dotted'; children: ReactNode }) {
    return (
        <div
            className="min-h-[420px] w-full bg-background px-6 py-8"
            style={
                variant === 'dotted'
                    ? {
                          backgroundImage:
                              'radial-gradient(circle, color-mix(in oklch, currentColor 12%, transparent) 1px, transparent 1px)',
                          backgroundSize: '16px 16px',
                      }
                    : undefined
            }
            data-canvas={variant}
        >
            {children}
        </div>
    );
}

// A stateful demo host: owns `currentValue` so selecting a person marks it current on reopen,
// and exposes the trigger label. This is the caller's job in production (the combobox is
// value-neutral); the story stands in for it.
function ComboboxDemo(props: {
    search?: (q: string) => Promise<ComboboxOption[]>;
    disabled?: boolean;
    initialValue?: string;
    triggerLabel?: string;
    emptyText?: string;
    loadingText?: string;
}) {
    const [value, setValue] = useState<string | undefined>(props.initialValue);
    const current = CORPUS.find((o) => o.value === value);
    return (
        <Combobox
            primitives={primitives}
            debounceMs={0}
            search={props.search ?? makeSearch()}
            currentValue={value}
            onSelect={(o) => setValue(o.value)}
            emptyText={props.emptyText}
            loadingText={props.loadingText}
            trigger={
                <Button variant="outline" disabled={props.disabled} className="min-w-56 justify-between">
                    {current?.label ?? props.triggerLabel ?? 'Pick a person…'}
                    <span aria-hidden className="ml-2 text-muted-foreground">
                        ▾
                    </span>
                </Button>
            }
        />
    );
}

// ── play helpers ────────────────────────────────────────────────────────────────
// The Combobox owns `open` internally (no `open` prop), so overlay stories must OPEN it by
// clicking the trigger, then await settled content — the popover renders nothing until open.
const openAndSettle = (awaitText?: RegExp | string): Story['play'] =>
    async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button'));
        if (awaitText) await canvas.findByText(awaitText);
    };

// ── STATES axis (dominant) ──────────────────────────────────────────────────────

/** states = closed — the resting trigger; the panel is not rendered until clicked. */
export const Closed: Story = {
    render: () => (
        <Canvas variant="flat">
            <ComboboxDemo />
        </Canvas>
    ),
};

/** states = open — clicked open, options settled (empty query → full corpus). */
export const Open: Story = {
    render: () => (
        <Canvas variant="flat">
            <ComboboxDemo />
        </Canvas>
    ),
    play: openAndSettle('Ada Lovelace'),
};

/**
 * states = typing / filtering — open, then type `gra` so the list narrows to the single
 * match. Awaits the filtered result so VR captures the settled, narrowed panel.
 */
export const Filtering: Story = {
    render: () => (
        <Canvas variant="flat">
            <ComboboxDemo />
        </Canvas>
    ),
    play: async (ctx) => {
        const canvas = within(ctx.canvasElement);
        await userEvent.click(canvas.getByRole('button'));
        await canvas.findByText('Ada Lovelace');
        await userEvent.type(canvas.getByRole('textbox'), 'gra');
        await canvas.findByText('Grace Hopper');
        await waitFor(() => {
            if (canvas.queryByText('Ada Lovelace')) throw new Error('still filtering');
        });
    },
};

/** states = empty-results — open with a search that always returns []; the `emptyText` shows. */
export const EmptyResults: Story = {
    render: () => (
        <Canvas variant="flat">
            <ComboboxDemo search={makeSearch({ empty: true })} emptyText="No people match" />
        </Canvas>
    ),
    play: openAndSettle('No people match'),
};

/**
 * states = loading — a `search` that never resolves, left OPEN and in-flight so the
 * `loadingText` is on screen. Deliberately NOT settled: this is the one overlay story whose
 * VR baseline is meant to capture the loading affordance, not settled content.
 */
export const Loading: Story = {
    render: () => (
        <Canvas variant="flat">
            <ComboboxDemo search={makeSearch({ never: true })} loadingText="Searching people…" />
        </Canvas>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button'));
        await canvas.findByText('Searching people…');
    },
};

/** states = disabled — the trigger is disabled; the panel can't be opened. */
export const Disabled: Story = {
    render: () => (
        <Canvas variant="flat">
            <ComboboxDemo disabled triggerLabel="Locked" />
        </Canvas>
    ),
};

/**
 * states = selected — a `currentValue` is set, so on open its option carries the ✓ check and
 * the emphasis, and the trigger reflects the current label.
 */
export const Selected: Story = {
    render: () => (
        <Canvas variant="flat">
            <ComboboxDemo initialValue="grace" />
        </Canvas>
    ),
    play: openAndSettle('Grace Hopper'),
};

// ── CANVAS axis ───────────────────────────────────────────────────────────────
// The panel must read legibly on both the flat settings paper and the dotted work surface.

/** canvas = dotted — the same open+settled panel over the operator work surface. */
export const OnDottedCanvas: Story = {
    name: 'Canvas · dotted',
    render: () => (
        <Canvas variant="dotted">
            <ComboboxDemo />
        </Canvas>
    ),
    play: openAndSettle('Ada Lovelace'),
};
