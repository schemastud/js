import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import { BlockdocEditor } from './BlockdocEditor';
import { EMPTY_DOC, RICH_DOC, SINGLE_BLOCK_DOC, STORY_MANIFESTS } from './story-fixtures';

/**
 * Blockdoc/BlockdocEditor (component-seams ticket 21). The Tiptap **editor island** —
 * the one durable rendered surface of `@schemastud/blockdoc/react`. It owns a Tiptap
 * Editor for its lifetime, initializes from a `value` doc-JSON (null → an empty doc
 * valid per the compiled schema), and commits `doc.toJSON()` through `onChange`. Its
 * chrome is a manifest-derived **insert palette** (block node types, `palette` prop),
 * a mark **BubbleMenu** (offered only for marks the manifest declares — shown on a
 * selection), and the `EditorContent` mount.
 *
 * The island is SELF-CONTAINED: it needs no injection provider (contrast frame/facets),
 * only a manifest (compiled to the PM schema) + an optional value — both from the shared
 * `story-fixtures.ts`.
 *
 * TREATMENT axes (treatment-axes.md): **states** is the primary axis — the doc-content
 * state (empty / single-block / rich-multi-block) and the palette on/off structural
 * state. `variant`/`size`/`tone`/`density`/`viewport` are **absent-not-a-gap** (the
 * island exposes no such prop; the editor has no read-only/editable prop either — it is
 * always editable — so read-only is likewise absent). Ambient token + light⊗dark are
 * inherited from the workbench.
 *
 * **Honest catalog note (contrast facets, mirror frame's panes):** the island's palette
 * + BubbleMenu chrome use self-contained inline hex (`#fff`, `#d4d4d8`, `#e4e4e7`), not
 * semantic tokens, so that chrome does not re-skin under `.dark` — a *pre-existing*
 * property of the source, recorded here, **not** fixed in this ticket (re-treating to
 * tokens is ticket 32). The document body itself renders on the token background.
 */
const meta = {
    title: 'Blockdoc/BlockdocEditor',
    component: BlockdocEditor,
    parameters: { layout: 'padded' },
    args: { manifests: STORY_MANIFESTS },
    // The island renders a native-editable surface with no visible border; wrap it so
    // the catalog reads it as a bounded editor pane on the token background.
    decorators: [
        (Story) => (
            <div
                style={{
                    width: 720,
                    maxWidth: '100%',
                    padding: 16,
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: 'var(--card)',
                    color: 'var(--card-foreground)',
                }}
            >
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof BlockdocEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Await the Tiptap mount so a VR baseline captures a settled ProseMirror render,
 *  never the pre-mount empty frame. */
async function awaitMount(canvasElement: HTMLElement) {
    const canvas = within(canvasElement);
    await waitFor(() => {
        expect(canvasElement.querySelector('[data-blockdoc-mount] .ProseMirror')).toBeTruthy();
    });
    return canvas;
}

/** state = empty — value=null initializes an empty doc valid per schema. */
export const Empty: Story = {
    args: { value: EMPTY_DOC },
    play: async ({ canvasElement }) => {
        await awaitMount(canvasElement);
    },
};

/** state = populated (single block) — the minimal non-empty render. */
export const SingleBlock: Story = {
    args: { value: SINGLE_BLOCK_DOC },
    play: async ({ canvasElement }) => {
        const canvas = await awaitMount(canvasElement);
        await waitFor(() => expect(canvas.getByText(/single paragraph of prose/i)).toBeInTheDocument());
    },
};

/** state = populated (rich) — headings, marks, a list, a quote, and a typed `callout`
 *  block that draws through the generic node-view + skin chrome. */
export const RichDocument: Story = {
    args: { value: RICH_DOC },
    play: async ({ canvasElement }) => {
        const canvas = await awaitMount(canvasElement);
        await waitFor(() => expect(canvas.getByText(/release notes/i)).toBeInTheDocument());
    },
};

/** structural state — palette OFF. The island without its insert-palette chrome (the
 *  embedded / field-mount configuration). */
export const NoPalette: Story = {
    args: { value: RICH_DOC, palette: false },
    play: async ({ canvasElement }) => {
        await awaitMount(canvasElement);
        await waitFor(() =>
            expect(canvasElement.querySelector('[data-blockdoc-palette]')).toBeNull(),
        );
    },
};

/** structural state — palette ON (default). Shows the manifest-derived block insert
 *  buttons above the document. */
export const WithPalette: Story = {
    args: { value: SINGLE_BLOCK_DOC, palette: true },
    play: async ({ canvasElement }) => {
        await awaitMount(canvasElement);
        await waitFor(() =>
            expect(canvasElement.querySelector('[data-blockdoc-palette]')).toBeTruthy(),
        );
    },
};
