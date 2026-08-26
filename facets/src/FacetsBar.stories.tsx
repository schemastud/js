import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { within } from 'storybook/test';
import { FacetsBar } from './FacetsBar';
import { DEMO_SCHEMA, MockFacetsProvider } from './story-harness';

/**
 * Facets/FacetsBar (component-seams ticket 16). The resource-agnostic, chip-based
 * filter/sort bar over the `x-filter`/`x-sort` schema: a leading Search input, one
 * chip per active filter (click to edit in a scoped popover, ✕ to clear), a
 * `+ Filter ▾` affordance for the inactive facets, and a Sort control. Rendered here
 * over the workbench's in-memory injection (story-harness) with the fixture DEMO_SCHEMA.
 * All chrome renders through the injected @schemastud/ui primitives — never a native
 * `<select>`.
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis dominates — the bar is
 * catalogued across `no filters active` (only Search + `+ Filter` + Sort), `filters
 * active` (chips with clearable values), and `sorted` (a primary sort key with the
 * asc/desc toggle). The **viewport** axis is exercised (a structure surface — chips
 * wrap at mobile width). `variant`/`size`/`density` are not exposed on FacetsBarProps,
 * so — per the rule of sanction — they are absent-not-a-gap. Ambient token + light⊗dark
 * are wired globally by the workbench (ticket 14's preview + colorScheme toolbar); the
 * bar renders against semantic tokens (`bg-card`/`bg-secondary`/`text-muted-foreground`),
 * so it re-skins correctly under `.dark`.
 */
const meta = {
    title: 'Facets/FacetsBar',
    parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A stateful host wrapper — the bar is controlled (the caller owns the
 * filter[...]/sort state), so the story holds it in local state to make the chips,
 * clear buttons, and sort toggle interactive for the catalog.
 */
function BarHost({
    initialValues = {},
    initialSort = null,
}: {
    initialValues?: Record<string, string>;
    initialSort?: string | null;
}) {
    const [values, setValues] = useState<Record<string, string>>(initialValues);
    const [sort, setSort] = useState<string | null>(initialSort);
    return (
        <MockFacetsProvider>
            <FacetsBar
                resource="fragments"
                schema={DEMO_SCHEMA}
                values={values}
                sort={sort}
                onFilterChange={(name, value) =>
                    setValues((prev) => {
                        const next = { ...prev };
                        if (value === null || value === '') delete next[name];
                        else next[name] = value;
                        return next;
                    })
                }
                onSortChange={setSort}
            />
        </MockFacetsProvider>
    );
}

/** state = no filters active — the resting bar: Search + `+ Filter ▾` + the Sort control. */
export const NoFiltersActive: Story = {
    render: () => <BarHost />,
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByText('Filter');
    },
};

/** state = filters active — a text + a relational chip present, each editable/clearable. */
export const FiltersActive: Story = {
    render: () => <BarHost initialValues={{ reference: 'INV-204', status: 'draft,published' }} />,
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByText('Reference:');
    },
};

/** state = sorted — a primary sort key is set, exposing the asc/desc direction toggle. */
export const Sorted: Story = {
    render: () => <BarHost initialSort="-createdAt" />,
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByLabelText('Descending');
    },
};

/** state = filters active AND sorted — the fully-loaded bar. */
export const FiltersAndSort: Story = {
    render: () => (
        <BarHost initialValues={{ reference: 'INV-204', status: 'draft' }} initialSort="name" />
    ),
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByText('Reference:');
    },
};

/** viewport = mobile — the structure surface at a narrow width; chips wrap. */
export const Mobile: Story = {
    parameters: { viewport: { defaultViewport: 'mobile1' } },
    render: () => <BarHost initialValues={{ reference: 'INV-204', status: 'draft,published' }} />,
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByText('Reference:');
    },
};
