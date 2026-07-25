import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { SavedViews } from './SavedViews';
import { MockFacetsProvider } from './story-harness';

/**
 * Facets/SavedViews (component-seams ticket 16). Save the current facets-bar state as
 * a named view and recall it — CRUD against the injected Saved Filter transport,
 * operating purely on the same `filter[...]`/`sort` encoding. Works on any resource
 * key. Rendered here over the workbench injection with fixture saved views.
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis is the whole surface —
 * catalogued across `empty` ("None yet."), `populated` (recallable/deletable view
 * chips), `naming` (the inline name input open), and `error` (a save the endpoint
 * rejects 422, surfaced as a field-level message). A `loading` state (saved-filters
 * query in flight) is also shown. No `variant`/`size`/`density` prop is exposed, so
 * those are absent-not-a-gap. Ambient token + light⊗dark are wired globally; the
 * surface renders against semantic tokens (`text-muted-foreground`/`text-destructive`,
 * outline/ghost buttons), so it re-skins under `.dark`.
 */
const meta = {
    title: 'Facets/SavedViews',
    parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const current = { filter: { status: 'draft' }, sort: '-createdAt' };

/** state = populated — the fixture's two recallable + deletable saved views. */
export const Populated: Story = {
    render: () => (
        <MockFacetsProvider>
            <SavedViews resource="fragments" current={current} onApply={() => {}} />
        </MockFacetsProvider>
    ),
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByText('Recent drafts');
    },
};

/** state = empty — no views saved yet ("None yet."). */
export const Empty: Story = {
    render: () => (
        <MockFacetsProvider fixtures={{ savedFilters: [] }}>
            <SavedViews resource="fragments" current={current} onApply={() => {}} />
        </MockFacetsProvider>
    ),
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByText('None yet.');
    },
};

/** state = naming — the inline "Save current view" name input opened for entry. */
export const Naming: Story = {
    render: () => (
        <MockFacetsProvider fixtures={{ savedFilters: [] }}>
            <SavedViews resource="fragments" current={current} onApply={() => {}} />
        </MockFacetsProvider>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText('None yet.');
        await userEvent.click(await canvas.findByText('Save current view'));
        await canvas.findByPlaceholderText('View name');
    },
};

/**
 * state = error — a save the endpoint rejects with a 422 surfaces the first
 * validation message as a field-level error under the input.
 */
export const SaveError: Story = {
    render: () => (
        <MockFacetsProvider fixtures={{ savedFilters: [], saveRejects422: true }}>
            <SavedViews resource="fragments" current={current} onApply={() => {}} />
        </MockFacetsProvider>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText('None yet.');
        await userEvent.click(await canvas.findByText('Save current view'));
        await userEvent.type(await canvas.findByPlaceholderText('View name'), 'Recent drafts');
        await userEvent.click(await canvas.findByLabelText('Confirm save'));
        await canvas.findByText('A view with that name already exists.');
    },
};

/** state = loading — the saved-filters query parks, so no chips render yet. */
export const Loading: Story = {
    render: () => (
        <MockFacetsProvider fixtures={{ loading: true }}>
            <SavedViews resource="fragments" current={current} onApply={() => {}} />
        </MockFacetsProvider>
    ),
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByText('Saved views');
    },
};
