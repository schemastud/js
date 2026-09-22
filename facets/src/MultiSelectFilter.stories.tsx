import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { FacetsResourceProvider } from './context';
import { MultiSelectFilter } from './MultiSelectFilter';
import type { FilterDescriptor } from './types';
import { MockFacetsProvider } from './story-harness';

/**
 * Facets/MultiSelectFilter (component-seams ticket 16). The type-ahead,
 * Options-Source-backed relational picker the facet popover mounts — an Input + a
 * results list + removable chips, no native `<select>`. Relational options resolve
 * through the injected transport; finite enum/bool declarations supply inline options. Rendered here over the workbench injection with the
 * fixture `statuses`/`circuits` option sources.
 *
 * TREATMENT axes (treatment-axes.md): the **cardinality** axis is component-defined,
 * driven off `descriptor.control` — `multiselect` (accrues a comma-joined id set,
 * list stays open) vs `select` (single relational id, replace-on-pick, closes) — so
 * it is catalogued as two variants. The **states** axis is exercised: `empty` (no
 * selection), `populated` (chips present), and `loading` (options never resolve, so
 * the list is empty while the query is in flight). The picker exposes no
 * `variant`/`size`/`density` prop, so those are absent-not-a-gap. Ambient token +
 * light⊗dark are wired globally; the control renders against semantic tokens
 * (`bg-background`/`bg-muted`, Badge `secondary`), so it re-skins under `.dark`.
 */
const meta = {
    title: 'Facets/MultiSelectFilter',
    parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const multiDescriptor: FilterDescriptor = {
    operator: 'set',
    name: 'status',
    control: 'multiselect',
    optionsRef: 'statuses',
};

const selectDescriptor: FilterDescriptor = {
    operator: 'exact',
    name: 'circuit',
    control: 'select',
    optionsRef: 'circuits',
};

/** A stateful host — the control is controlled (value/onChange), held locally so the
 *  add/remove chip flow is interactive in the catalog. Boxed to a popover-ish width. */
function FilterHost({
    descriptor,
    initialValue = '',
    loading = false,
}: {
    descriptor: FilterDescriptor;
    initialValue?: string;
    loading?: boolean;
}) {
    const [value, setValue] = useState<string>(initialValue);
    return (
        <MockFacetsProvider fixtures={loading ? { loading: true } : undefined}>
            <div style={{ width: 280 }}>
                <FacetsResourceProvider resource="fragments">
                    <MultiSelectFilter
                        descriptor={descriptor}
                        value={value}
                        onChange={(v) => setValue(v ?? '')}
                    />
                </FacetsResourceProvider>
            </div>
        </MockFacetsProvider>
    );
}

/** cardinality = multiselect · state = empty — no selection, ready to type-ahead. */
export const MultiEmpty: Story = {
    render: () => <FilterHost descriptor={multiDescriptor} />,
};

/**
 * cardinality = multiselect · state = populated — a comma-joined set with removable
 * chips; the picker resolves ids to labels off the fixture option source.
 */
export const MultiPopulated: Story = {
    render: () => <FilterHost descriptor={multiDescriptor} initialValue="draft,published" />,
    play: async ({ canvasElement }) => {
        // await the value→label resolution so the chip reads as a name, not the id
        await within(canvasElement).findByText('Draft');
    },
};

/** cardinality = select · state = populated — a single relational id, replace-on-pick. */
export const SelectPopulated: Story = {
    render: () => <FilterHost descriptor={selectDescriptor} initialValue="c1" />,
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByText('Ingest Circuit');
    },
};

/** state = loading — the option source never resolves, so the results list is empty
 *  while the query is in flight (the type-ahead's pending path). */
export const Loading: Story = {
    render: () => <FilterHost descriptor={multiDescriptor} loading />,
};

/** Inline enum options are the same declaration emitted by resource-backed filters. */
export const InlineOptions: Story = {
    render: () => <FilterHost descriptor={{
        operator: 'set', name: 'status', control: 'multiselect', options: [
            { value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }, { value: 'archived', label: 'Archived' },
        ],
    }} initialValue="draft" />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole('button', { name: 'Remove Draft' })).toBeVisible();
        const search = canvas.getByPlaceholderText('Search…');
        await userEvent.click(search);
        await expect(canvas.getByRole('button', { name: 'Archived' })).toBeVisible();
        await userEvent.type(search, 'unmatched');
        await expect(canvas.queryByRole('list')).not.toBeInTheDocument();
        await expect(canvas.queryByRole('button', { name: 'Published' })).not.toBeInTheDocument();
        await expect(canvas.queryByRole('button', { name: 'Archived' })).not.toBeInTheDocument();
        await userEvent.clear(search);
        await userEvent.type(search, 'pub');
        await expect(canvas.queryByRole('button', { name: 'Archived' })).not.toBeInTheDocument();
        await userEvent.click(canvas.getByRole('button', { name: 'Published' }));
        await expect(canvas.getByRole('button', { name: 'Remove Published' })).toBeVisible();
        await userEvent.click(canvas.getByRole('button', { name: 'Remove Draft' }));
        await expect(canvas.queryByRole('button', { name: 'Remove Draft' })).not.toBeInTheDocument();
    },
};

export const InlineScalarOptions: Story = {
    render: () => <FilterHost descriptor={{
        operator: 'set', name: 'enabled', control: 'multiselect', options: [
            { value: false, label: 'No' }, { value: true, label: 'Yes' }, { value: 0, label: 'Zero' },
        ],
    }} initialValue="false,0" />,
};
