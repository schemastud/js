import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MessageProvider } from '@schemastud/messages/react';
import { useRjsfRegistry } from '../src/widget-props';
import * as validators from '../src/validator';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const schema = { type: 'boolean' } as const;

it('cell registries reuse the shared validator without constructing one on mount or catalog changes', () => {
    const construct = vi.spyOn(validators, 'createFormValidator');
    const observed = new Set<unknown>();
    function Cell() {
        const registry = useRjsfRegistry(schema);
        observed.add(registry.schemaUtils.getValidator());
        return null;
    }
    const cells = Array.from({ length: 200 }, (_, index) => <Cell key={index} />);
    const plain = render(<>{cells}</>);
    expect(construct).not.toHaveBeenCalled();
    expect([...observed]).toEqual([validators.defaultValidator]);
    plain.unmount();

    const es = { version: 1 as const, locale: 'es', realm: null, direction: 'ltr' as const, messages: {} };
    const { rerender } = render(<MessageProvider value={es}>{cells}</MessageProvider>);
    rerender(<MessageProvider value={{ ...es, locale: 'fr' }}>{cells}</MessageProvider>);
    expect(construct).not.toHaveBeenCalled();
    expect([...observed]).toEqual([validators.defaultValidator]);
});

it('records warmed 200-cell registry mount timing without a timing threshold', () => {
    function Cell() { useRjsfRegistry(schema); return null; }
    const cells = Array.from({ length: 200 }, (_, index) => <Cell key={index} />);
    render(<>{cells}</>).unmount();
    const milliseconds: number[] = [];
    for (let trial = 0; trial < 5; trial++) {
        const start = performance.now();
        const view = render(<>{cells}</>);
        milliseconds.push(performance.now() - start);
        view.unmount();
    }
    const sorted = [...milliseconds].sort((a, b) => a - b);
    console.info('REGISTRY_200_CELL_MOUNT', JSON.stringify({ samplesMs: milliseconds, medianMs: sorted[2] }));
});
