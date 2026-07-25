import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { userEvent, within } from 'storybook/test';
import { createWidgetRegistry, type SchemaNode, type WidgetRegistry } from '@schemastud/seam';
import { EditableCell } from './EditableCell';
import type { NodeParticipation } from './contexts';

/**
 * Frame/EditableCell (component-seams ticket 15). The interactive `row-cell` runtime
 * (FC-03/FC-23): a read view of a field value that, on activation, mounts the resolved
 * edit widget in place and commits through `onCommit`. Heavyweight bindings are
 * suppressed (never inlined into a cell); an unbound non-heavyweight falls to the read
 * projection.
 *
 * TREATMENT axes (treatment-axes.md): the **states** axis — read projection (no bound
 * widget), the editable resting state (bound, click-to-edit), and the active editing
 * state (mounted widget). A small inline text widget is registered on a local registry
 * so a component actually resolves. Ambient token + light⊗dark wired globally.
 */
const meta = {
    title: 'Frame/EditableCell',
    parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const node: SchemaNode = { type: 'string', title: 'Name' } as SchemaNode;

/** A minimal inline text widget — enough for the cell to resolve a real editable component. */
function CellTextWidget({
    value,
    onChange,
}: {
    value?: unknown;
    onChange?: (v: unknown) => void;
}) {
    return (
        <input
            autoFocus
            defaultValue={value == null ? '' : String(value)}
            onChange={(e) => onChange?.(e.target.value)}
            className="rounded-md border border-input bg-transparent px-2 py-1 text-sm"
        />
    );
}

function boundRegistry(): WidgetRegistry {
    const registry = createWidgetRegistry();
    registry.registerWidget((s) => s['x-widget'] === 'cell-text', CellTextWidget);
    return registry;
}

const boundRowCell: NodeParticipation = { participates: true, widget: 'cell-text' };
const unboundRowCell: NodeParticipation = { participates: true };

function Harness({ rowCell, registry }: { rowCell: NodeParticipation; registry?: WidgetRegistry }) {
    const [value, setValue] = useState<unknown>('Ada Lovelace');
    return (
        <div className="rounded-md border p-2" style={{ width: 260 }}>
            <EditableCell
                node={node}
                rowCell={rowCell}
                edit={undefined}
                value={value}
                onCommit={setValue}
                registry={registry ?? boundRegistry()}
            />
        </div>
    );
}

/** Read projection — a row-cell with no bound widget: just the scalar value, no editing. */
export const ReadProjection: Story = { render: () => <Harness rowCell={unboundRowCell} /> };

/** Editable (resting) — a bound cell in its read state; click/focus mounts the editor. */
export const Editable: Story = { render: () => <Harness rowCell={boundRowCell} /> };

/** Editing (active) — the play function activates the cell so the mounted widget shows. */
export const Editing: Story = {
    render: () => <Harness rowCell={boundRowCell} />,
    play: async ({ canvasElement }) => {
        const cell = within(canvasElement).getByText('Ada Lovelace');
        await userEvent.click(cell);
    },
};
