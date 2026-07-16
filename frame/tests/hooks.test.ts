import { describe, expect, it, vi } from 'vitest';
import { createFrameHooks } from '../src/hooks';
import type { Row } from '../src/types';

describe('createFrameHooks', () => {
    it('fires a registered handler with the record and context', () => {
        const hooks = createFrameHooks();
        const handler = vi.fn();
        hooks.onSubmitted('tenants', handler);

        const record: Row = { id: '7', name: 'Acme' };
        hooks.fireSubmitted('tenants', record, { resource: 'tenants', mode: 'create' });

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(record, { resource: 'tenants', mode: 'create' });
    });

    it('the returned unregister fn stops the handler', () => {
        const hooks = createFrameHooks();
        const handler = vi.fn();
        const off = hooks.onSubmitted('tenants', handler);

        off();
        hooks.fireSubmitted('tenants', { id: '1' }, { resource: 'tenants', mode: 'edit' });

        expect(handler).not.toHaveBeenCalled();
    });

    it('a handler registered for another resource is not called', () => {
        const hooks = createFrameHooks();
        const tenants = vi.fn();
        const plans = vi.fn();
        hooks.onSubmitted('tenants', tenants);
        hooks.onSubmitted('plans', plans);

        hooks.fireSubmitted('tenants', { id: '1' }, { resource: 'tenants', mode: 'edit' });

        expect(tenants).toHaveBeenCalledTimes(1);
        expect(plans).not.toHaveBeenCalled();
    });

    it('firing a resource with no handlers is a silent no-op', () => {
        const hooks = createFrameHooks();
        expect(() =>
            hooks.fireSubmitted('unknown', { id: '1' }, { resource: 'unknown', mode: 'create' }),
        ).not.toThrow();
    });

    it('supports multiple handlers on one resource', () => {
        const hooks = createFrameHooks();
        const a = vi.fn();
        const b = vi.fn();
        hooks.onSubmitted('tenants', a);
        hooks.onSubmitted('tenants', b);

        hooks.fireSubmitted('tenants', { id: '1' }, { resource: 'tenants', mode: 'create' });

        expect(a).toHaveBeenCalledTimes(1);
        expect(b).toHaveBeenCalledTimes(1);
    });
});
