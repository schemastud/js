import type { Meta, StoryObj } from '@storybook/react-vite';
import type { SchemaNode } from '@schemastud/seam';
import { SchemaView } from './SchemaView';
import type { ContextManifest } from './contexts';
import { MockFrameProvider } from './story-harness';

/**
 * Frame/SchemaView (component-seams ticket 15). The READ-side sibling of SchemaForm:
 * renders a record for the `detail` context (per-property) or the `list-item` card
 * body (whole-record), resolving each node through the same context resolver — but
 * read-only (no submit, no edits). An unbound field falls to a label + scalar default.
 *
 * TREATMENT axes (treatment-axes.md): the context **variant** (`detail` vs.
 * `list-item`) is the primary axis, plus the field **states** an unbound record shows
 * (a scalar projection). No widgets are registered here, so every field takes the
 * read-only scalar default — the honest baseline. Ambient token + light⊗dark wired
 * globally.
 */
const meta = {
    title: 'Frame/SchemaView',
    parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const schema: SchemaNode = {
    type: 'object',
    properties: {
        name: { type: 'string', title: 'Name' },
        email: { type: 'string', title: 'Email' },
        role: { type: 'string', title: 'Role' },
        active: { type: 'boolean', title: 'Active' },
    },
} as SchemaNode;

const record = { name: 'Grace Hopper', email: 'grace@navy.mil', role: 'admin', active: true };

const detailManifest: ContextManifest = {
    byNode: {
        name: { detail: { participates: true, label: 'Full name' } },
        email: { detail: { participates: true, label: 'Email address' } },
        role: { detail: { participates: true, label: 'Role' } },
        active: { detail: { participates: true, label: 'Active' } },
    },
    inherits: {},
    known: ['detail'],
};

const listItemManifest: ContextManifest = {
    byNode: { '': { 'list-item': { participates: true, label: 'Member' } } },
    inherits: {},
    known: ['list-item'],
};

/** context = detail — the per-property read view (label + scalar per field). */
export const Detail: Story = {
    render: () => (
        <MockFrameProvider>
            <SchemaView schema={schema} record={record} manifest={detailManifest} context="detail" />
        </MockFrameProvider>
    ),
};

/** context = list-item — the whole-record card body resolved at pointer "". */
export const ListItem: Story = {
    render: () => (
        <MockFrameProvider>
            <SchemaView schema={schema} record={record} manifest={listItemManifest} context="list-item" />
        </MockFrameProvider>
    ),
};
