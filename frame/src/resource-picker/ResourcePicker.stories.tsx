import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState, type ReactNode } from 'react';
import { userEvent, within } from 'storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createWidgetRegistry } from '@schemastud/seam';
import { FrameProvider } from '../context';
import { shadcnListSlots } from '../shadcn/list-slots';
import { mockPrimitives } from '../story-harness';
import type { FrameInjection } from '../types';
import { ResourcePicker } from './ResourcePicker';
import { createMemoryUrlState } from '../memoryUrlState';
import { EMPTY_SELECTION, type ResourceSelection } from './selection';
import type { KindPlacement, RecordPlacement } from './placement';
import { PICKER_KINDS, PICKER_MANIFESTS, PICKER_SECTIONS, createPickerTransport } from './fixtures';

/**
 * Frame/ResourcePicker (owner-review-20261102 RP). One component, two stages, one placement
 * vocabulary. Each story is a PLACEMENT; density follows from it (owner ruling 2026-11-02):
 *
 *  - stage 1 (kinds): expanded → A palette, compact → C rail; B catalog only by `variant`.
 *  - stage 2 (records): compact → server typeahead with "Browse all N with filters";
 *    expanded → the embedded ListShell (declared columns, `x-filter` facets, `x-sort`,
 *    server paging) with a pick column, tri-state header, selection bar, tray, confirm bar.
 *
 * The record fixture pages, filters and sorts on the "server" (4,812 threads), so every
 * story shows the real large-list behaviour. Viewports 1440 / 390 and light / dark are the
 * ambient axes; the shot capture covers each story at all four.
 */
const meta = {
    title: 'Frame/ResourcePicker',
    parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function PickerProvider({ children }: { children: ReactNode }) {
    const [client] = useState(
        () => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } }),
    );
    const injection = useMemo<FrameInjection>(
        () => ({
            transport: createPickerTransport({ threads: 4812 }),
            primitives: mockPrimitives,
            useUrlState: createMemoryUrlState(),
            registry: createWidgetRegistry(),
            schemaFetcher: async (ref: string) => ({ $id: ref }),
            can: () => true,
            manifestFor: (resource) => PICKER_MANIFESTS[resource],
            listSlots: shadcnListSlots,
        }),
        [],
    );
    return (
        <QueryClientProvider client={client}>
            <FrameProvider value={injection}>{children}</FrameProvider>
        </QueryClientProvider>
    );
}

function Stage({ title, where, children }: { title: string; where: string; children: ReactNode }) {
    return (
        <div className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-8 sm:py-8">
            <div className="mx-auto max-w-5xl space-y-4">
                <header className="space-y-1">
                    <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
                    <p className="text-sm text-muted-foreground">{where}</p>
                </header>
                {children}
            </div>
        </div>
    );
}

function Field({ label, help, children, htmlFor }: { label: string; help: string; children: ReactNode; htmlFor: string }) {
    return (
        <div className="max-w-md space-y-1.5 rounded-lg border border-border bg-card p-4">
            <label id={`${htmlFor}-label`} htmlFor={htmlFor} className="block text-sm font-medium">
                {label}
            </label>
            {children}
            <p className="text-xs text-muted-foreground">{help}</p>
        </div>
    );
}

/* ─────────────────────────────── stage 1 ─────────────────────────────── */

function Kinds({ placement, variant, initial = ['threads'] }: { placement: KindPlacement; variant?: 'catalog' | 'palette' | 'rail'; initial?: string[] }) {
    const [value, setValue] = useState<string[]>(initial);
    return (
        <ResourcePicker
            kinds={PICKER_KINDS}
            sections={PICKER_SECTIONS}
            placement={placement}
            variant={variant}
            value={value}
            onChange={setValue}
            id={`kinds-${placement}`}
            label="Resource"
        />
    );
}

/** nav — compact rail, framed scope, a horizontal strip as it would sit in a topbar. */
export const KindsNav: Story = {
    render: () => (
        <Stage title="Nav switcher" where="placement nav → scope framed · compact (rail) · single">
            <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
                <span className="text-sm text-muted-foreground">Tenant /</span>
                <Kinds placement="nav" />
            </div>
        </Stage>
    ),
};

/** field — compact rail in a form row, every kind in scope. */
export const KindsField: Story = {
    render: () => (
        <Stage title="Form field" where="placement field → scope all · compact (rail) · single">
            <Field label="Subject resource" help="The resource this operation acts on." htmlFor="kinds-field">
                <Kinds placement="field" />
            </Field>
        </Stage>
    ),
};

/** field, flyout open — the "Other" tail grouped by package. */
export const KindsFieldOpen: Story = {
    ...KindsField,
    play: async ({ canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: /^Other,/ }));
    },
};

/** filters — compact rail as a column, filterable scope. */
export const KindsFilters: Story = {
    render: () => (
        <Stage title="Saved-filter builder" where="placement filters → scope filterable · compact (rail, vertical) · single">
            <Kinds placement="filters" initial={['fragments']} />
        </Stage>
    ),
};

/** seeder — expanded palette, writable scope, multi. */
export const KindsSeeder: Story = {
    render: () => (
        <Stage title="Seeder pipeline" where="placement seeder → scope writable · expanded (palette) · multi">
            <Kinds placement="seeder" initial={['threads', 'agents', 'fragments']} />
        </Stage>
    ),
};

/** catalog — expanded palette over every kind. */
export const KindsCatalog: Story = {
    render: () => (
        <Stage title="Resource catalog" where="placement catalog → scope all · expanded (palette) · single">
            <Kinds placement="catalog" />
        </Stage>
    ),
};

/** The `variant="catalog"` escape hatch: the card grid B, kept behind the flag. */
export const KindsCatalogVariant: Story = {
    render: () => (
        <Stage title="Catalog variant (flag)" where='variant="catalog" · expanded (cards) · single'>
            <Kinds placement="catalog" variant="catalog" />
        </Stage>
    ),
};

/* ─────────────────────────────── stage 2 ─────────────────────────────── */

function Records({
    placement,
    initial = EMPTY_SELECTION,
    confirm,
    defaultBrowseOpen,
    id,
}: {
    placement: RecordPlacement;
    initial?: ResourceSelection;
    confirm?: boolean;
    defaultBrowseOpen?: boolean;
    id: string;
}) {
    const [value, setValue] = useState<ResourceSelection>(initial);
    return (
        <ResourcePicker
            resource="threads"
            placement={placement}
            labelField="title"
            defaultSort="-updatedAt"
            value={value}
            onChange={setValue}
            onConfirm={confirm ? () => undefined : undefined}
            describe={(row) => `${String(row.agentName)} · ${String(row.status)}`}
            defaultBrowseOpen={defaultBrowseOpen}
            id={id}
            aria-labelledby={`${id}-label`}
        />
    );
}

/** field — compact single: the server typeahead trigger. */
export const RecordsField: Story = {
    render: () => (
        <PickerProvider>
            <Stage title="Relation field" where="placement field → compact (typeahead) · single">
                <Field label="Thread" help="Search 4,812 threads, or browse them with filters." htmlFor="rec-field">
                    <Records placement="field" id="rec-field" />
                </Field>
            </Stage>
        </PickerProvider>
    ),
};

/** field, open — 8 of 4,812 with "Browse all 4,812 with filters" (a bottom sheet on phone). */
export const RecordsFieldOpen: Story = {
    ...RecordsField,
    play: async ({ canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: /Choose a thread/ }));
        await within(document.body).findByText(/8 of 4,812/);
    },
};

/** attach — compact multi with two picks in the tray. */
export const RecordsAttach: Story = {
    render: () => (
        <PickerProvider>
            <Stage title="Attach threads" where="placement attach → compact (typeahead) · multi">
                <Field label="Evidence threads" help="Attach the threads this rule draws on." htmlFor="rec-attach">
                    <Records placement="attach" id="rec-attach" initial={{ mode: 'ids', ids: ['t-1', 't-4'] }} />
                </Field>
            </Stage>
        </PickerProvider>
    ),
};

/** attach, browse — the escape hatch: the embedded shell in a Sheet, editing a draft. */
export const RecordsAttachBrowse: Story = {
    render: () => (
        <PickerProvider>
            <Stage title="Attach threads — browse" where="Browse all 4,812 with filters → the embedded list shell, in a sheet">
                <Field label="Evidence threads" help="Attach the threads this rule draws on." htmlFor="rec-attach-b">
                    <Records placement="attach" id="rec-attach-b" initial={{ mode: 'ids', ids: ['t-1', 't-4'] }} defaultBrowseOpen />
                </Field>
            </Stage>
        </PickerProvider>
    ),
    play: async () => {
        await within(document.body).findByRole('checkbox', { name: /Deselect Invoice dispute #0001/ });
    },
};

/** bulk — expanded multi: pick column, tri-state header, selection bar, tray, confirm bar. */
export const RecordsBulk: Story = {
    render: () => (
        <PickerProvider>
            <Stage title="Bulk action" where="placement bulk → expanded (embedded list shell) · multi">
                <Records placement="bulk" id="rec-bulk" confirm initial={{ mode: 'ids', ids: ['t-1', 't-2', 't-5'] }} />
            </Stage>
        </PickerProvider>
    ),
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByRole('checkbox', { name: /Deselect Invoice dispute #0001/ });
    },
};

/** bulk, all matching — "Select all N matching" made a set; one row un-ticked is an exclusion. */
export const RecordsBulkSet: Story = {
    render: () => (
        <PickerProvider>
            <Stage title="Bulk action — all matching" where="Select all 4,812 matching → a set, with exceptions">
                <Records
                    placement="bulk"
                    id="rec-bulk-set"
                    confirm
                    initial={{ mode: 'set', filter: {}, sort: null, exclude: ['t-2'] }}
                />
            </Stage>
        </PickerProvider>
    ),
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByRole('checkbox', { name: /Select Onboarding checklist #0002/ });
    },
};

/** dynamic — expanded set: the selection IS the filter, re-evaluated when it runs. */
export const RecordsDynamic: Story = {
    render: () => (
        <PickerProvider>
            <Stage title="Pipeline input" where="placement dynamic → expanded (embedded list shell) · set">
                <Records
                    placement="dynamic"
                    id="rec-dynamic"
                    confirm
                    initial={{ mode: 'set', filter: { status: 'open' }, sort: '-updatedAt', exclude: [] }}
                />
            </Stage>
        </PickerProvider>
    ),
    play: async ({ canvasElement }) => {
        await within(canvasElement).findAllByRole('checkbox', { name: /Deselect/ });
    },
};
