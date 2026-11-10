import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getDefaultRegistry } from '@rjsf/core';
import type { WidgetProps } from '@rjsf/utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry, type SchemaNode } from '@schemastud/seam';
import { KNOWN_CONTEXTS, type ContextManifest } from '../src/contexts';
import { createFrameKit } from '../src/kit';
import { SchemaView } from '../src/SchemaView';
import { EditableCell } from '../src/EditableCell';
import { DashboardCard } from '../src/cards/DashboardCard';
import { createMemoryTransport } from '../src/testing';
import type { DashboardRow } from '../src/cards/types';

afterEach(cleanup);

// Radix measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
} as unknown as typeof ResizeObserver;

/** RJSF core's own `TextWidget`, registered by name: a stock RJSF widget, not one written for frame. */
const { TextWidget } = getDefaultRegistry().widgets;

const manifestOf = (byNode: ContextManifest['byNode']): ContextManifest => ({ byNode, inherits: {}, known: KNOWN_CONTEXTS });

/** A widget that records what reached it. */
function probe() {
    const seen: WidgetProps[] = [];
    const Probe = (props: WidgetProps) => {
        seen.push(props);
        return <span data-probe>{props.id ? 'probed' : 'no id'}</span>;
    };
    return { Probe, seen };
}

const reachedWithTheContract = (props: WidgetProps | undefined) => {
    expect(props).toBeDefined();
    expect(typeof props!.id).toBe('string');
    expect(props!.id.length).toBeGreaterThan(0);
    expect(typeof props!.registry.schemaUtils.retrieveSchema).toBe('function');
    expect(props!.readonly).toBe(true);
};

/**
 * frame-foundation 26 (ruling 04 slice 3): an RJSF widget renders in a detail view, a card and a table cell. Every
 * read surface builds RJSF `WidgetProps` with seam's `widgetProps`; the hand-built bundles are gone.
 */
describe('an RJSF widget in the read surfaces', () => {
    it("core's TextWidget, registered by name, shows its value in a SchemaView detail view, locked", () => {
        const registry = createWidgetRegistry();
        registry.registerWidget('core-text', TextWidget as never);
        const schema: SchemaNode = { type: 'object', properties: { name: { type: 'string', 'x-widget': 'core-text' } } };

        render(
            <SchemaView
                schema={schema}
                record={{ name: 'Ada Lovelace' }}
                manifest={manifestOf({ name: { detail: { participates: true } } })}
                context="detail"
                registry={registry}
            />,
        );

        const input = screen.getByDisplayValue('Ada Lovelace') as HTMLInputElement;
        expect(input.readOnly || input.disabled).toBe(true);
    });

    it("core's TextWidget edits an integer cell, and the cell commits a number", () => {
        const registry = createWidgetRegistry();
        registry.registerWidget('core-text', TextWidget as never);
        const node: SchemaNode = { type: 'integer' };
        const onCommit = vi.fn();

        render(
            <EditableCell
                node={node}
                rootSchema={{ type: 'object', properties: { seats: node } }}
                rowCell={{ participates: true, widget: 'core-text' }}
                edit={undefined}
                value={3}
                onCommit={onCommit}
                registry={registry}
            />,
        );

        fireEvent.click(screen.getByText('3'));
        const input = screen.getByDisplayValue('3');
        fireEvent.change(input, { target: { value: '42' } });
        fireEvent.blur(input);

        expect(onCommit).toHaveBeenCalledWith(42);
        expect(typeof onCommit.mock.calls[0][0]).toBe('number');
    });

    it('a widget receives id, registry.schemaUtils and readonly === true through SchemaView list-item', () => {
        const { Probe, seen } = probe();
        const registry = createWidgetRegistry();
        registry.registerWidget('probe-card', Probe as never);

        render(
            <SchemaView
                schema={{ type: 'object', properties: { name: { type: 'string' } } }}
                record={{ name: 'Ada Lovelace' }}
                manifest={manifestOf({ '': { 'list-item': { participates: true, widget: 'probe-card' } } })}
                context="list-item"
                registry={registry}
            />,
        );

        reachedWithTheContract(seen.at(-1));
        expect(seen.at(-1)!.value).toEqual({ name: 'Ada Lovelace' });
    });

    it('a widget receives id, registry.schemaUtils and readonly === true through DashboardCard', async () => {
        const { Probe, seen } = probe();
        const frame = createFrameKit({
            transport: createMemoryTransport({
                manifest: {
                    resources: [],
                    contexts: { members: manifestOf({ '': { summary: { participates: true, widget: 'probe-card' } } }) },
                },
            }),
            urlState: 'memory',
            widgets: (registry) => registry.registerWidget('probe-card', Probe as never),
        });
        const row: DashboardRow = { resource: 'members', context: 'summary', label: 'Members', href: '/members' };

        render(
            <frame.Provider>
                <DashboardCard {...({ value: row, options: {} } as never)} />
            </frame.Provider>,
        );

        await waitFor(() => expect(document.querySelector('[data-probe]')).not.toBeNull());
        reachedWithTheContract(seen.at(-1));
        expect((seen.at(-1) as WidgetProps & { row?: DashboardRow }).row).toBe(row);
    });

    it("DashboardCard passes the resolver's merged options: the summary entry's own win over the registry config", async () => {
        const { Probe, seen } = probe();
        const frame = createFrameKit({
            transport: createMemoryTransport({
                manifest: {
                    resources: [],
                    contexts: {
                        members: manifestOf({
                            '': { summary: { participates: true, widget: 'probe-card', options: { precision: 2, tone: 'warning' } } },
                        }),
                    },
                },
            }),
            urlState: 'memory',
            widgets: (registry) => registry.registerWidget('probe-card', Probe as never, { precision: 0, unit: 'USD' }),
        });
        const row: DashboardRow = { resource: 'members', context: 'summary', label: 'Members', href: '/members' };

        render(
            <frame.Provider>
                <DashboardCard {...({ value: row, options: {} } as never)} />
            </frame.Provider>,
        );

        await waitFor(() => expect(document.querySelector('[data-probe]')).not.toBeNull());
        expect(seen.at(-1)!.options).toMatchObject({ precision: 2, unit: 'USD', tone: 'warning' });
    });

    // Ruling 04, limit 2: a name that resolves to an RJSF stock NAME (a string) mounts nothing outside the form; the
    // surface draws the read value.
    it('stock name: a detail field naming `textarea` draws its read value, not a control', () => {
        const registry = createWidgetRegistry();
        const schema: SchemaNode = { type: 'object', properties: { bio: { type: 'string', 'x-widget': 'textarea' } } };

        render(
            <SchemaView
                schema={schema}
                record={{ bio: 'Wrote the first program.' }}
                manifest={manifestOf({ bio: { detail: { participates: true } } })}
                context="detail"
                registry={registry}
            />,
        );

        expect(screen.getByText('Wrote the first program.')).toBeTruthy();
        expect(document.querySelector('textarea')).toBeNull();
    });
});
