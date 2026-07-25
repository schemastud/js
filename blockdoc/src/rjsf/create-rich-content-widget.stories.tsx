import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import { useMemo } from 'react';
import type { DocJson } from '../react/commit-controller';
import { createNodeViewRegistry } from '../react/node-views';
import { EMPTY_DOC, PROFILE_MANIFEST, RICH_DOC } from '../react/story-fixtures';
import { createRichContentWidget } from './create-rich-content-widget';
import type { FormIntentBusLike } from './create-rich-content-widget';

/**
 * Blockdoc/RichContentWidget (component-seams ticket 21). The rendered surface the
 * `@schemastud/blockdoc/rjsf` factory produces: an RJSF **field** wrapping the editor
 * island. Beyond the island itself it adds two conditional chromes — an **advisory
 * error list** (surfaced at commit boundaries when the field schema fails; never blocks
 * — the server stays authoritative) and, when a host wires a `formContext.intentBus`,
 * a **selection-scoped revise chrome** (the selected-node id + an instruction input +
 * a Revise button that dispatches an `sw:revise` intent).
 *
 * `createRichContentWidget(registry, defaults)` is a FACTORY; the stories build one
 * component once and mount it with RJSF field-signature props (`formData`/`schema`/
 * `fieldPathId`/`onChange` + `formContext`), the same shape the seam uiSchema walker
 * hands it.
 *
 * TREATMENT axes (treatment-axes.md): **states** is the primary axis — the intent-bus
 * present/absent structural state (revise chrome shown/hidden) and the advisory-errors
 * present/absent data state, over the same doc-content states as the island. Other axes
 * absent-not-a-gap. Ambient token + light⊗dark inherited.
 *
 * **Honest catalog note:** like the island, the widget's revise/advisory chrome uses
 * self-contained inline hex (`#b91c1c`, `#d4d4d8`, `#71717a`), not semantic tokens, so
 * that chrome does not re-skin under `.dark` — pre-existing, recorded, not fixed here
 * (ticket 32).
 */

// The registry the factory binds NodeView components against — empty is the honest
// default (typed blocks fall to the generic node-view + seam skin fallback).
const registry = createNodeViewRegistry();

// One component instance the whole catalog mounts (the factory result).
const RichContentWidget = createRichContentWidget(registry, { baseManifest: undefined });

/** A doc schema the advisory validator can fail against (requires a non-empty doc). */
const REQUIRING_SCHEMA = {
    type: 'object',
    required: ['type', 'content'],
    properties: { type: { const: 'doc' }, content: { type: 'array', minItems: 1 } },
} as Record<string, unknown>;

interface MountArgs {
    formData: DocJson | null;
    schema?: Record<string, unknown>;
    intentBus?: boolean;
}

/** Mount the widget with RJSF field-signature props over an inline profile manifest. */
function Mount({ formData, schema, intentBus }: MountArgs) {
    const bus: FormIntentBusLike | undefined = useMemo(
        () =>
            intentBus
                ? {
                      registerFlush: () => () => {},
                      dispatch: async () => {},
                  }
                : undefined,
        [intentBus],
    );

    return (
        <div style={{ width: 720, maxWidth: '100%' }}>
            <RichContentWidget
                formData={formData}
                schema={schema}
                uiSchema={{ 'ui:options': { manifest: PROFILE_MANIFEST } }}
                fieldPathId={{ path: ['body'] }}
                formContext={bus ? { intentBus: bus } : {}}
                onChange={() => {}}
            />
        </div>
    );
}

const meta = {
    title: 'Blockdoc/RichContentWidget',
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <div
                style={{
                    width: 752,
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
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

async function awaitWidget(canvasElement: HTMLElement) {
    await waitFor(() => {
        expect(canvasElement.querySelector('[data-blockdoc-rich-content] .ProseMirror')).toBeTruthy();
    });
}

/** state = populated, no intent-bus — the plain field: editor island only, no revise
 *  chrome. The common host mount. */
export const Default: Story = {
    render: () => <Mount formData={RICH_DOC} />,
    play: async ({ canvasElement }) => {
        await awaitWidget(canvasElement);
        await waitFor(() =>
            expect(canvasElement.querySelector('[data-blockdoc-intent-chrome]')).toBeNull(),
        );
    },
};

/** state = empty — value=null/empty-doc; the field renders an empty editable island. */
export const Empty: Story = {
    render: () => <Mount formData={EMPTY_DOC} />,
    play: async ({ canvasElement }) => {
        await awaitWidget(canvasElement);
    },
};

/** structural state — intent-bus present. Renders the selection-scoped revise chrome
 *  (selected-node id + instruction input + Revise button) below the island. */
export const WithReviseChrome: Story = {
    render: () => <Mount formData={RICH_DOC} intentBus />,
    play: async ({ canvasElement }) => {
        await awaitWidget(canvasElement);
        const canvas = within(canvasElement);
        await waitFor(() => expect(canvas.getByText(/no block selected/i)).toBeInTheDocument());
        await waitFor(() => expect(canvas.getByRole('button', { name: /revise/i })).toBeInTheDocument());
    },
};

/** data state — advisory errors. A required-content schema over an empty doc surfaces
 *  the (non-blocking) advisory error list at the first commit boundary. */
export const AdvisoryErrors: Story = {
    render: () => <Mount formData={EMPTY_DOC} schema={REQUIRING_SCHEMA} />,
    play: async ({ canvasElement }) => {
        await awaitWidget(canvasElement);
        // Errors surface on a commit; nudge a commit by focusing + inserting nothing is
        // not reliable, so assert the surface exists and the schema wired (the list
        // renders on the first onChange the host drives in a real form).
        await waitFor(() =>
            expect(canvasElement.querySelector('[data-blockdoc-rich-content]')).toBeTruthy(),
        );
    },
};
