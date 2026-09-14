import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ListFilters } from './ListFilters';
import { useListFilters } from './useListFilters';
import { MockFacetsProvider, type TransportFixtures } from './story-harness';

/**
 * Facets/ListFilters (component-seams ticket 16). The generalized facets surface every
 * list mounts: the `FacetsBar` over the resource's schema PLUS `SavedViews` for that
 * same resource when its schema advertises saved-view support. It is pure wiring over
 * `useListFilters(resource)`; a new list mounts by spreading the hook result. Renders
 * declared variant selection independently of vocabulary loading. Catalogued here through the real keystone hook so
 * the story exercises the actual URL⇄filter contract, not a hand-built state object.
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis — `loading` (schema not yet
 * resolved ⇒ the surface renders nothing, per its documented contract) and `populated`
 * (bar + saved views over the fixture schema). The **viewport** axis is exercised (a
 * structure surface — the composed bar wraps at mobile width). No `variant`/`size`/
 * `density` prop is exposed, so those are absent-not-a-gap. Ambient token + light⊗dark
 * are wired globally; the composed surface is all semantic tokens, so it re-skins under
 * `.dark`.
 */
const meta = {
    title: 'Facets/ListFilters',
    parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Mounts the real keystone hook for a resource, then spreads it into `<ListFilters>`. */
function ListFiltersHost({ resource = 'fragments' }: { resource?: string }) {
    const state = useListFilters(resource);
    return <ListFilters {...state} />;
}

function Harness({ fixtures, resource }: { fixtures?: TransportFixtures; resource?: string }) {
    return (
        <MockFacetsProvider fixtures={fixtures}>
            <ListFiltersHost resource={resource} />
        </MockFacetsProvider>
    );
}

/** state = populated — the composed facets bar + saved views over the fixture schema. */
export const Populated: Story = {
    render: () => <Harness />,
    play: async ({ canvasElement }) => {
        // await both halves so the VR baseline captures the settled composite
        await within(canvasElement).findByText('Recent drafts');
    },
};

/**
 * state = loading — the filter schema never resolves, so the surface renders nothing
 * (its documented "renders nothing until the schema resolves" contract). A stable,
 * intentional empty snapshot, not a loading flash.
 */
export const Loading: Story = {
    render: () => <Harness fixtures={{ loading: true }} />,
};

/** viewport = mobile — the composed structure surface at a narrow width. */
export const Mobile: Story = {
    parameters: { viewport: { defaultViewport: 'mobile1' } },
    render: () => <Harness />,
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByText('Recent drafts');
    },
};

function NoQueryVocabulary() {
    const state = useListFilters('entries');
    return (
        <div data-testid="resolved-filters" data-schema={state.schema ? 'resolved' : 'pending'}>
            <ListFilters {...state} />
        </div>
    );
}

/** Resolved data fields alone must not produce an empty bar or nonfunctional saved views. */
export const NoQueryDescriptors: Story = {
    render: () => (
        <MockFacetsProvider
            fixtures={{
                schema: {
                    properties: { title: { title: 'Title' } },
                },
            }}
        >
            <NoQueryVocabulary />
        </MockFacetsProvider>
    ),
    play: async ({ canvasElement }) => {
        const host = within(canvasElement).getByTestId('resolved-filters');
        await waitFor(() => expect(host).toHaveAttribute('data-schema', 'resolved'));
        await expect(host).toBeEmptyDOMElement();
    },
};

/** A producer supplies variants; the generic hook and selector own URL selection. */
export const DeclaredVariants: Story = {
    render: () => (
        <Harness
            resource="papers"
            fixtures={{
                schema: { properties: {} },
                variants: [
                    { key: 'papers', resource: 'papers', canonical: true, sameAsCanonical: true },
                    {
                        key: 'recent-papers',
                        resource: 'papers',
                        canonical: false,
                        sameAsCanonical: false,
                    },
                ],
                variantSchemas: {
                    'recent-papers': {
                        properties: {
                            query: {
                                title: 'Search papers',
                                'x-filter': {
                                    name: 'query',
                                    operator: 'partial',
                                    control: 'search',
                                },
                            },
                            published: { 'x-sort': { name: 'published' } },
                        },
                    },
                },
            }}
        />
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(await canvas.findByRole('combobox', { name: 'Filter variant' }));
        await userEvent.click(
            await within(canvasElement.ownerDocument.body).findByRole('option', {
                name: 'recent-papers',
            })
        );
        await userEvent.type(await canvas.findByLabelText('Search'), 'ecology');
        await expect(canvas.getByLabelText('Search')).toHaveValue('ecology');
    },
};
