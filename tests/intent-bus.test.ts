import { describe, expect, it, vi } from 'vitest';
import { createFormIntentBus } from '../src/intent-bus';

describe('FormIntentBus', () => {
    it('delivers dispatched intents to subscribed handlers', async () => {
        const bus = createFormIntentBus();
        const handler = vi.fn();
        bus.onIntent(handler);

        await bus.dispatch({ type: 'revise', fieldPath: 'body', target: 'node-1', payload: { instruction: 'tighter' } });

        expect(handler).toHaveBeenCalledWith({
            type: 'revise',
            fieldPath: 'body',
            target: 'node-1',
            payload: { instruction: 'tighter' },
        });
    });

    it('flushes registered commit flushers before handlers run', async () => {
        const bus = createFormIntentBus();
        const order: string[] = [];
        bus.registerFlush(() => order.push('flush'));
        bus.onIntent(() => {
            order.push('handler');
        });

        await bus.dispatch({ type: 'revise', fieldPath: 'body' });

        expect(order).toEqual(['flush', 'handler']);
    });

    it('unsubscribe and unregister take effect', async () => {
        const bus = createFormIntentBus();
        const handler = vi.fn();
        const flush = vi.fn();
        const offIntent = bus.onIntent(handler);
        const offFlush = bus.registerFlush(flush);

        offIntent();
        offFlush();
        await bus.dispatch({ type: 'noop', fieldPath: '' });
        bus.flushCommits();

        expect(handler).not.toHaveBeenCalled();
        expect(flush).not.toHaveBeenCalled();
    });

    it('dispatch with no handlers is a safe no-op', async () => {
        const bus = createFormIntentBus();
        await expect(bus.dispatch({ type: 'noop', fieldPath: 'x' })).resolves.toBeUndefined();
    });

    it('awaits async handlers so callers can sequence on delivery', async () => {
        const bus = createFormIntentBus();
        let settled = false;
        bus.onIntent(async () => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            settled = true;
        });

        await bus.dispatch({ type: 'revise', fieldPath: 'body' });

        expect(settled).toBe(true);
    });
});
