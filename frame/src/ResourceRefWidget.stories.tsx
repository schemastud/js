import type { Meta, StoryObj } from '@storybook/react-vite';
import { within } from 'storybook/test';
import type { SchemaNode } from '@schemastud/seam';
import { ResourceRefWidget } from './ResourceRefWidget';
import { STUD_RESOURCE_REF_KEYWORD } from './raw-mode';
import { MockFrameProvider } from './story-harness';

/**
 * Frame/ResourceRefWidget (component-seams ticket 15). The `x-stud-resource-ref` picker
 * (FC-04): a property that references rows of another registered resource renders as a
 * select whose options are fetched from that resource's index through the injected
 * transport. Frame's built-in widget (a host normally wraps it in its own shadcn
 * select); catalogued here over the workbench transport (`members` fixture).
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis — single vs. multiple
 * (`multiple:true`), loading (transport parked), and disabled. Ambient token +
 * light⊗dark wired globally; the populated stories `play`-await their options.
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

const awaitOptions: Story['play'] = async ({ canvasElement }) => {
    await within(canvasElement).findByText('Ada Lovelace');
};

/** Single select — fetches `members` and maps rows to id/name options. */
export const Single: Story = {
    render: () => (
        <MockFrameProvider>
            <div style={{ width: 280 }}>
                <ResourceRefWidget id="ref-single" schema={refSchema()} value="2" onChange={() => {}} />
            </div>
        </MockFrameProvider>
    ),
    play: awaitOptions,
};

/** Multiple select — `multiple:true` renders a multi-select whose value is a string[]. */
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
    play: awaitOptions,
};

/** Loading — the transport parks, so the control shows its "Loading…" placeholder. */
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
    play: awaitOptions,
};
