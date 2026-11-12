import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { FacetsResourceProvider } from './context';
import { MultiSelectFilter } from './MultiSelectFilter';
import type { FilterDescriptor } from './types';
import { MockFacetsProvider } from './story-harness';

/**
 * Facets/MultiSelectFilter (component-seams ticket 16). The type-ahead,
 * Options-Source-backed relational picker the facet popover mounts — the kit's
 * `ComboboxList` inline + removable chips, no native `<select>`. Relational options resolve
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
    width = 280,
}: {
    descriptor: FilterDescriptor;
    initialValue?: string;
    loading?: boolean;
    width?: number;
}) {
    const [value, setValue] = useState<string>(initialValue);
    return (
        <MockFacetsProvider fixtures={loading ? { loading: true } : undefined}>
            <div style={{ width }}>
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
        const search = canvas.getByRole('combobox');
        await userEvent.click(search);
        await expect(await canvas.findByRole('option', { name: 'Archived' })).toBeVisible();
        await userEvent.type(search, 'unmatched');
        await expect(await canvas.findByText('No matches')).toBeVisible();
        await expect(canvas.queryByRole('option')).not.toBeInTheDocument();
        await userEvent.clear(search);
        await userEvent.type(search, 'pub');
        await userEvent.click(await canvas.findByRole('option', { name: 'Published' }));
        await expect(canvas.queryByRole('option', { name: 'Archived' })).not.toBeInTheDocument();
        await expect(canvas.getByRole('button', { name: 'Remove Published' })).toBeVisible();
        await userEvent.click(canvas.getByRole('button', { name: 'Remove Draft' }));
        await expect(canvas.queryByRole('button', { name: 'Remove Draft' })).not.toBeInTheDocument();
        // The list no longer closes on a blur timer (owner-review-20261112 06): Escape closes it. End closed, so the
        // VR shot is the resting control.
        await userEvent.type(search, '{Escape}');
        await waitFor(() => expect(canvas.queryByRole('listbox')).not.toBeInTheDocument());
    },
};

/**
 * keyboard — the relational picker as the Threads agent filter uses it: open on focus,
 * type to search the Options Source (once per pause), ArrowDown and Enter to pick. The
 * list stays open for the next pick (multiselect), with the chosen option checked.
 */
export const Keyboard: Story = {
    render: () => <FilterHost descriptor={multiDescriptor} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const search = canvas.getByRole('combobox');
        await userEvent.click(search);
        await canvas.findAllByRole('option');
        await userEvent.keyboard('{ArrowDown}{Enter}');
        await waitFor(() => expect(canvas.getAllByRole('option', { selected: true })).toHaveLength(1));
    },
};

/** the same picker in a 390-wide column (a phone's width), populated and open. */
export const Narrow: Story = {
    render: () => (
        <FilterHost descriptor={multiDescriptor} initialValue="draft,published" width={358} />
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText('Draft');
        await userEvent.click(canvas.getByRole('combobox'));
        await canvas.findAllByRole('option');
    },
};

export const InlineScalarOptions: Story = {
    render: () => <FilterHost descriptor={{
        operator: 'set', name: 'enabled', control: 'multiselect', options: [
            { value: false, label: 'No' }, { value: true, label: 'Yes' }, { value: 0, label: 'Zero' },
        ],
    }} initialValue="false,0" />,
};
