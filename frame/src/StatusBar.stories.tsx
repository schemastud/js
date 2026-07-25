import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatusBar } from './StatusBar';
import { MockMount, makeConformance, makeMount } from './story-harness';

/**
 * Frame/StatusBar (component-seams ticket 15). The bottom conformance readout of the
 * five-region edit shell (ED-14): `N nodes · R required (F of R) · complete|incomplete
 * · grammar ✓|✗`, sourced from the EditShellMount's `conformance` channel. The
 * `incomplete` segment is a live control (cycles the next incomplete node); here it is
 * catalogued in its rendered states.
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis — the bar is a pure state
 * projection, so one story per conformance shape (complete / incomplete / invalid-
 * grammar / no-document). Ambient token + light⊗dark wired globally.
 */
const meta = {
    title: 'Frame/StatusBar',
    component: StatusBar,
    parameters: { layout: 'centered' },
} satisfies Meta<typeof StatusBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No document loaded — the channel is null; every segment shows its zero/valid default. */
export const NoDocument: Story = {
    render: () => (
        <MockMount value={makeMount({ conformance: null })}>
            <StatusBar />
        </MockMount>
    ),
};

/** Complete — all required slots filled, grammar valid: the calm success readout. */
export const Complete: Story = {
    render: () => (
        <MockMount
            value={makeMount({
                conformance: makeConformance({ nodes: 18, requiredTotal: 5, requiredFilled: 5 }),
            })}
        >
            <StatusBar />
        </MockMount>
    ),
};

/** Incomplete — required slots outstanding; the `incomplete` segment is the live cycle control. */
export const Incomplete: Story = {
    render: () => (
        <MockMount
            value={makeMount({
                conformance: makeConformance({
                    nodes: 14,
                    requiredTotal: 5,
                    requiredFilled: 2,
                    incompleteNodeIds: ['node-a', 'node-b', 'node-c'],
                }),
            })}
        >
            <StatusBar />
        </MockMount>
    ),
};

/** Invalid grammar — a loaded doc violates the schema (grammar ✗). */
export const InvalidGrammar: Story = {
    render: () => (
        <MockMount
            value={makeMount({
                conformance: makeConformance({
                    grammarValid: false,
                    requiredFilled: 3,
                    incompleteNodeIds: ['node-x'],
                }),
            })}
        >
            <StatusBar />
        </MockMount>
    ),
};
