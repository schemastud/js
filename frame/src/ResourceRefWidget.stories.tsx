import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import type { SchemaNode } from '@schemastud/seam';
import { ResourceRefWidget } from './ResourceRefWidget';
const STUD_RESOURCE_REF_KEYWORD = 'x-stud-resource-ref';
import { MockFrameProvider } from './story-harness';

/**
 * Frame/ResourceRefWidget (component-seams ticket 15; owner-review-20261102 RP). The
 * `x-stud-resource-ref` field (FC-04): a property that references rows of another registered
 * resource renders the ResourcePicker's compact face — a server typeahead with "Browse all N
 * with filters" — replacing the plain one-page select. Catalogued over the workbench
 * transport (`members` fixture); the full placement matrix lives in Frame/ResourcePicker.
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis — single vs. multiple
 * (`multiple:true`), open, loading (transport parked), and disabled. Ambient token +
 * light⊗dark wired globally; the populated stories `play`-await their stored labels.
 */
const meta = {
    title: 'Frame/ResourceRefWidget',
    parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const refSchema = (multiple = false): SchemaNode =>
    ({
        type: multiple ? 'array' : 'string',
        [STUD_RESOURCE_REF_KEYWORD]: { resource: 'members', value: 'id', label: 'name', multiple },
    }) as SchemaNode;

// A stored value's label is fetched by id, so a settled story shows the name, never the raw id.
const awaitLabel: Story['play'] = async ({ canvasElement }) => {
    await within(canvasElement).findByText('Grace Hopper');
};

/** Single — the trigger names the stored pick (`2` → Grace Hopper). */
export const Single: Story = {
    render: () => (
        <MockFrameProvider>
            <div style={{ width: 280 }}>
                <ResourceRefWidget id="ref-single" schema={refSchema()} value="2" onChange={() => {}} />
            </div>
        </MockFrameProvider>
    ),
    play: awaitLabel,
};

/** Open — the typeahead over `members`, with its "Browse all" escape hatch. */
export const Open: Story = {
    render: () => (
        <MockFrameProvider>
            <div style={{ width: 320, minHeight: 360 }}>
                <ResourceRefWidget id="ref-open" schema={refSchema()} value="" onChange={() => {}} />
            </div>
        </MockFrameProvider>
    ),
    play: async ({ canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: /Choose a member/ }));
        await within(canvasElement).findByText('Ada Lovelace');
    },
};

/** Multiple — `multiple:true`: the value is a string[] and the picks sit in a tray. */
export const Multiple: Story = {
    render: () => (
        <MockFrameProvider>
            <div style={{ width: 280 }}>
                <ResourceRefWidget
                    id="ref-multi"
                    schema={refSchema(true)}
                    value={['1', '3']}
                    onChange={() => {}}
                />
            </div>
        </MockFrameProvider>
    ),
    play: async ({ canvasElement }) => {
        await within(canvasElement).findByText('Alan Turing');
    },
};

/** Loading — the transport parks; the closed trigger still reads as an empty field. */
export const Loading: Story = {
    render: () => (
        <MockFrameProvider fixtures={{ loading: true }}>
            <div style={{ width: 280 }}>
                <ResourceRefWidget id="ref-loading" schema={refSchema()} onChange={() => {}} />
            </div>
        </MockFrameProvider>
    ),
};

/** Disabled — the read-only control (still populated). */
export const Disabled: Story = {
    render: () => (
        <MockFrameProvider>
            <div style={{ width: 280 }}>
                <ResourceRefWidget
                    id="ref-disabled"
                    schema={refSchema()}
                    value="2"
                    disabled
                    onChange={() => {}}
                />
            </div>
        </MockFrameProvider>
    ),
    play: awaitLabel,
};
