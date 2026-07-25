import type { Meta, StoryObj } from '@storybook/react-vite';
import { PalettePane } from './PalettePane';
import { MockMount, makeMount } from './story-harness';

/**
 * Frame/PalettePane (component-seams ticket 15). The grammar palette hoisted from
 * blockdoc's in-canvas button-row into the left shell pane (ED-09). It renders the
 * grammar-legal insert candidates published on the EditShellMount's palette channel,
 * with affordance labels (`max 1`, `→ target`, `pick-many → target`), and issues an
 * insert back through the channel on click.
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis — `empty` ("Nothing
 * insertable here") vs. a populated candidate list. The candidate channel is typed
 * `unknown[]`; these fixtures mirror ED-03's InsertableCandidate structurally. Ambient
 * token + light⊗dark wired globally. NOTE: item chrome uses self-contained hex, so it
 * does not re-skin under `.dark` (pre-existing; re-treatment is ticket 32).
 */
const meta = {
    title: 'Frame/PalettePane',
    component: PalettePane,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof PalettePane>;

export default meta;
type Story = StoryObj<typeof meta>;

const CANDIDATES = [
    { nodeType: 'heading', label: 'Heading', category: 'block' },
    { nodeType: 'paragraph', label: 'Paragraph', category: 'block' },
    { nodeType: 'title', label: 'Title', category: 'meta', arity: { min: 1, max: 1 } },
    {
        nodeType: 'author-ref',
        label: 'Author',
        edgeTarget: { attr: 'authorId', target: 'people', pickMany: false },
    },
    {
        nodeType: 'tag-refs',
        label: 'Tags',
        edgeTarget: { attr: 'tagIds', target: 'tags', pickMany: true },
    },
];

/** Populated — the browsable candidate list with its affordance labels. */
export const Candidates: Story = {
    render: () => (
        <MockMount value={makeMount({ candidates: CANDIDATES })}>
            <div style={{ width: 240 }}>
                <PalettePane />
            </div>
        </MockMount>
    ),
};

/** Empty — nothing grammar-legal is insertable at the cursor. */
export const Empty: Story = {
    render: () => (
        <MockMount value={makeMount({ candidates: [] })}>
            <div style={{ width: 240 }}>
                <PalettePane />
            </div>
        </MockMount>
    ),
};
