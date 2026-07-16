import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createWidgetRegistry, type SchemaNode, type WidgetRegistry } from '@schemastud/seam';
import { EditableCell } from '../src/EditableCell';
import type { NodeParticipation } from '../src/contexts';

afterEach(cleanup);

/**
 * FC-23 editable `row-cell` runtime, proven against a REAL seam registry — the same
 * resolveEntry path FC-03 resolves through. `email-input` is a controllable RJSF-style
 * widget (value + onChange); `circuit-graph` is flagged heavyweight to exercise cell
 * suppression → read-only projection.
 */
const EmailInput = ({ value, onChange }: any) => (
    <input
        data-testid="email-input"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
    />
);
const CircuitGraph = () => <div data-testid="circuit-graph" />;

function makeRegistry(): WidgetRegistry {
    const r = createWidgetRegistry();
    r.registerWidget('email-input', EmailInput);
    r.registerWidget('circuit-graph', CircuitGraph);
    return r;
}

const node: SchemaNode = { type: 'string' };

function part(p: Partial<NodeParticipation>): NodeParticipation {
    return { participates: true, ...p };
}

describe('EditableCell (row-cell runtime)', () => {
    it('renders a read view; activating mounts the inherited edit widget; commit calls onCommit', () => {
        const registry = makeRegistry();
        const onCommit = vi.fn();
        // edit binds `email-input`; row-cell inherits it (inheritsBinding:true).
        render(
            <EditableCell
                node={node}
                rowCell={part({ inheritsBinding: true })}
                edit={part({ widget: 'email-input' })}
                value="a@b.co"
                onCommit={onCommit}
                registry={registry}
            />,
        );

        // Read view by default — no widget mounted yet.
        expect(screen.queryByTestId('email-input')).toBeNull();
        expect(screen.getByText('a@b.co')).toBeTruthy();

        // Activate → the inherited edit widget mounts.
        fireEvent.click(screen.getByText('a@b.co'));
        const input = screen.getByTestId('email-input') as HTMLInputElement;
        expect(input).toBeTruthy();

        // Edit + commit (blur) → onCommit fires with the new value.
        fireEvent.change(input, { target: { value: 'c@d.co' } });
        fireEvent.blur(screen.getByTestId('email-input').parentElement!);
        expect(onCommit).toHaveBeenCalledWith('c@d.co');
    });

    it('Escape cancels — reverts to the read view without committing', () => {
        const registry = makeRegistry();
        const onCommit = vi.fn();
        render(
            <EditableCell
                node={node}
                rowCell={part({ inheritsBinding: true })}
                edit={part({ widget: 'email-input' })}
                value="a@b.co"
                onCommit={onCommit}
                registry={registry}
            />,
        );

        fireEvent.click(screen.getByText('a@b.co'));
        const input = screen.getByTestId('email-input') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'c@d.co' } });

        // Escape reverts — no commit, back to the read view.
        fireEvent.keyDown(input, { key: 'Escape' });
        expect(onCommit).not.toHaveBeenCalled();
        expect(screen.queryByTestId('email-input')).toBeNull();
        expect(screen.getByText('a@b.co')).toBeTruthy();
    });

    it('an unchanged commit (blur without edit) is a no-op — no host mutation', () => {
        const registry = makeRegistry();
        const onCommit = vi.fn();
        render(
            <EditableCell
                node={node}
                rowCell={part({ inheritsBinding: true })}
                edit={part({ widget: 'email-input' })}
                value="a@b.co"
                onCommit={onCommit}
                registry={registry}
            />,
        );

        fireEvent.click(screen.getByText('a@b.co'));
        fireEvent.blur(screen.getByTestId('email-input').parentElement!);
        expect(onCommit).not.toHaveBeenCalled();
    });

    it('heavyweight suppression: a heavyweight edit binding → read-only projection, NEVER the heavyweight widget', () => {
        const registry = makeRegistry();
        const onCommit = vi.fn();
        render(
            <EditableCell
                node={node}
                rowCell={part({ inheritsBinding: true })}
                edit={part({ widget: 'circuit-graph', heavyweight: true })}
                value="graph-summary"
                onCommit={onCommit}
                registry={registry}
            />,
        );

        // Read-only projection carries the value; the heavyweight editor is never mounted.
        expect(screen.getByText('graph-summary')).toBeTruthy();
        expect(screen.queryByTestId('circuit-graph')).toBeNull();

        // No activation affordance — the read-only twin, not an editable cell.
        const cell = document.querySelector('[data-frame-cell="readonly"]');
        expect(cell).toBeTruthy();
        // Even clicking the projection cannot mount the heavyweight editor.
        if (cell) fireEvent.click(cell);
        expect(screen.queryByTestId('circuit-graph')).toBeNull();
    });

    it('an unbound non-heavyweight field falls to the read projection (no throw)', () => {
        const registry = makeRegistry();
        render(
            <EditableCell
                node={node}
                rowCell={part({ inheritsBinding: true })}
                edit={part({ widget: 'not-registered' })}
                value="plain"
                onCommit={vi.fn()}
                registry={registry}
            />,
        );
        expect(screen.getByText('plain')).toBeTruthy();
        expect(document.querySelector('[data-frame-cell="readonly"]')).toBeTruthy();
    });
});
