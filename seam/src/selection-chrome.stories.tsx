import type { CSSProperties, ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SelectionChrome } from './selection-chrome';

/**
 * Seam/SelectionChrome (component-seams ticket 17). The uniform selection-chrome
 * primitive (B3): it draws the same ring / drag-handle / required-badge / incomplete
 * outline / remote-cursor decoration around ANY skin, so a skin ships zero chrome code.
 * Grammar-blind and medium-agnostic — it rides `selectedNodeId` + completeness flags,
 * never the document model. The plural `remoteSelections` / `advisory` props are the
 * collaboration-presence reservation (rendered, wired to nothing yet).
 *
 * TREATMENT axes (treatment-axes.md): this component IS a states machine — its whole
 * surface is the **states** axis (Resting / Selected / Required / Incomplete / Remote /
 * Advisory / Combined). No variant/size/density props ⇒ absent-not-a-gap. Ambient token
 * + light⊗dark wired globally; NOTE the decoration uses self-contained hex (not semantic
 * tokens), so the ring/badge colors do not re-skin under `.dark` — a pre-existing
 * property of the primitive recorded here, not fixed in this catalog (mirrors ticket 15’s
 * hardcoded-hex note; re-treating to tokens is ticket 32).
 */
const meta = {
    title: 'Seam/SelectionChrome',
    parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const SKIN_STYLE: CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: 6,
    background: 'var(--card)',
    color: 'var(--card-foreground)',
    padding: '10px 14px',
    fontSize: 13,
    minWidth: 200,
};

/** A stand-in skin (row 1) the chrome wraps — the chrome adds nothing to its layout. */
function DemoSkin({ children = 'A skinned node' }: { children?: ReactNode }) {
    return <div style={SKIN_STYLE}>{children}</div>;
}

/** Enough gutter so the absolutely-positioned handle/badge are not clipped in `centered`. */
function Gutter({ children }: { children: ReactNode }) {
    return <div style={{ padding: 24 }}>{children}</div>;
}

/** states = resting — no flags: the chrome is a transparent pass-through. */
export const Resting: Story = {
    render: () => (
        <Gutter>
            <SelectionChrome nodeId="n1">
                <DemoSkin />
            </SelectionChrome>
        </Gutter>
    ),
};

/** states = selected — the local selection ring + drag handle. */
export const Selected: Story = {
    render: () => (
        <Gutter>
            <SelectionChrome nodeId="n1" localSelected>
                <DemoSkin>Selected node</DemoSkin>
            </SelectionChrome>
        </Gutter>
    ),
};

/** states = required — the grammar-required badge. */
export const Required: Story = {
    render: () => (
        <Gutter>
            <SelectionChrome nodeId="n1" required>
                <DemoSkin>Required node</DemoSkin>
            </SelectionChrome>
        </Gutter>
    ),
};

/** states = incomplete — the dashed incomplete outline (B2 completeness). */
export const Incomplete: Story = {
    render: () => (
        <Gutter>
            <SelectionChrome nodeId="n1" incomplete>
                <DemoSkin>Incomplete node</DemoSkin>
            </SelectionChrome>
        </Gutter>
    ),
};

/** states = remote — the reserved collaboration-presence cursors (N remote selections). */
export const RemoteSelections: Story = {
    render: () => (
        <Gutter>
            <SelectionChrome
                nodeId="n1"
                remoteSelections={[
                    { ownerId: 'u2', ownerLabel: 'Grace', color: '#059669' },
                    { ownerId: 'u3', ownerLabel: 'Alan', color: '#9333ea' },
                ]}
            >
                <DemoSkin>Node with remote presence</DemoSkin>
            </SelectionChrome>
        </Gutter>
    ),
};

/** states = combined — locally selected AND required AND incomplete, all chrome at once. */
export const Combined: Story = {
    render: () => (
        <Gutter>
            <SelectionChrome nodeId="n1" localSelected required incomplete advisory>
                <DemoSkin>Selected · required · incomplete</DemoSkin>
            </SelectionChrome>
        </Gutter>
    ),
};
