import type { Meta, StoryObj } from '@storybook/react-vite';
import { BlockChromeFallback } from './block-chrome';
import type { SchemaNode, SkinContext, SkinNode } from './types';

/**
 * Seam/BlockChromeFallback (component-seams ticket 17). The built-in fallback skin: when
 * a node-type has no registered skin, the registry resolves to this — a striped "resting
 * card" that names the node-type, hints "Edit via the inspector →", and emits one field
 * anchor (`data-attr`) per attribute so the shell/inspector can target individual fields.
 * It is itself a skin: no frame context, no PM knowledge, no inline form.
 *
 * It is a render function `(node, ctx) => JSX`, not a component — the stories call it and
 * render the result.
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis — how the card enumerates its
 * anchors (Declared-schema attrs / Node-only attrs / Empty). No variant/size/density
 * props ⇒ absent-not-a-gap. Ambient token + light⊗dark wired globally; NOTE the card uses
 * self-contained hex (the "un-skinned striped" look is intentional), so it does not
 * re-skin under `.dark` — a deliberate property of the fallback recorded here, not a
 * catalog defect (re-treating to tokens is ticket 32).
 */
const meta = {
    title: 'Seam/BlockChromeFallback',
    parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * states = declared-schema — the ctx carries an `attrsSchema`, so declared-but-empty
 * attrs still get an anchor (the `subtitle` field renders "—" rather than being absent).
 */
export const WithDeclaredSchema: Story = {
    render: () => {
        const node: SkinNode = {
            type: 'callout',
            attrs: { title: 'Heads up', tone: 'warn' },
        };
        const ctx: SkinContext = {
            attrsSchema: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    tone: { type: 'string' },
                    subtitle: { type: 'string' },
                },
            } as SchemaNode,
        };
        return <div style={{ minWidth: 240 }}>{BlockChromeFallback(node, ctx)}</div>;
    },
};

/** states = node-only — no ctx schema: anchors are the keys actually present on the node. */
export const NodeAttrsOnly: Story = {
    render: () => {
        const node: SkinNode = {
            type: 'embed',
            attrs: { src: 'https://example.com/v', caption: 'A demo embed', ratio: '16:9' },
        };
        return <div style={{ minWidth: 240 }}>{BlockChromeFallback(node)}</div>;
    },
};

/** states = empty — a node with no attrs and no schema: header + hint, zero anchors. */
export const Empty: Story = {
    render: () => {
        const node: SkinNode = { type: 'divider' };
        return <div style={{ minWidth: 240 }}>{BlockChromeFallback(node)}</div>;
    },
};
