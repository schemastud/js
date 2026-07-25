import type { Meta, StoryObj } from '@storybook/react-vite';
import type { SchemaNode } from '@schemastud/seam';
import { Inspector } from './Inspector';
import { MockMount, makeMount } from './story-harness';

/**
 * Frame/Inspector (component-seams ticket 15). The always-mounted right pane of the
 * five-region edit shell (ED-08): a pure frame+seam surface with NO ProseMirror
 * knowledge. It reads `selectedNodeId` off the EditShellMount, pulls the node via
 * `getNode`, and renders seam's SchemaForm over the node's `attrsSchema`, routing
 * `onChange → setNodeAttrs`. It rests genuinely empty when nothing is selected.
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis — `empty` ("Select a block
 * to edit") vs. an attrs form for the selected node. The rendered form is seam's real
 * SchemaForm (RJSF shadcn theme), so this story doubles as a seam-in-frame smoke.
 * Ambient token + light⊗dark wired globally.
 */
const meta = {
    title: 'Frame/Inspector',
    component: Inspector,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof Inspector>;

export default meta;
type Story = StoryObj<typeof meta>;

const HEADING_NODE = {
    type: 'heading',
    attrsSchema: {
        type: 'object',
        properties: {
            level: { type: 'integer', title: 'Level', enum: [1, 2, 3] },
            anchor: { type: 'string', title: 'Anchor slug' },
            collapsed: { type: 'boolean', title: 'Collapsed' },
        },
    } as SchemaNode,
    attrs: { level: 2, anchor: 'introduction', collapsed: false },
};

/** Rest state — no selection: the pane sits empty by design (no auto-select of root). */
export const NoSelection: Story = {
    render: () => (
        <MockMount value={makeMount({ selectedNodeId: null })} withRegistry>
            <div style={{ width: 320 }}>
                <Inspector />
            </div>
        </MockMount>
    ),
};

/** Selected — the attrs form for the selected node (seam SchemaForm over `attrsSchema`). */
export const NodeSelected: Story = {
    render: () => (
        <MockMount
            value={makeMount({ selectedNodeId: 'h1', getNode: () => HEADING_NODE })}
            withRegistry
        >
            <div style={{ width: 320 }}>
                <Inspector />
            </div>
        </MockMount>
    ),
};
