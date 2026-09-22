import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useBrowserUrlState } from '../src/useBrowserUrlState';

afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
});

it('synchronizes independent consumers, composes writes and preserves host path/hash/history state', () => {
    window.history.replaceState({ host: 'state' }, '', '/events?tab=all#activity');
    const first = renderHook(useBrowserUrlState);
    const second = renderHook(useBrowserUrlState);
    act(() => {
        first.result.current[1](
            (params) => {
                params.set('cursor', 'a+/=');
                return params;
            },
            { replace: false },
        );
        second.result.current[1]((params) => {
            params.set('per_page', '50');
            return params;
        });
    });
    expect(first.result.current[0].toString()).toBe(second.result.current[0].toString());
    expect(Object.fromEntries(first.result.current[0])).toEqual({
        tab: 'all',
        cursor: 'a+/=',
        per_page: '50',
    });
    expect(window.location.pathname).toBe('/events');
    expect(window.location.hash).toBe('#activity');
    expect(window.history.state).toEqual({ host: 'state' });
});

it('pushes pagination, replaces query edits and observes browser back and forward', async () => {
    window.history.replaceState(null, '', '/events');
    const hook = renderHook(useBrowserUrlState);
    const initialLength = window.history.length;
    act(() =>
        hook.result.current[1](
            (params) => {
                params.set('cursor', 'next');
                return params;
            },
            { replace: false },
        ),
    );
    expect(window.history.length).toBe(initialLength + 1);
    act(() =>
        hook.result.current[1]((params) => {
            params.set('filter[x]', 'yes');
            return params;
        }),
    );
    expect(window.history.length).toBe(initialLength + 1);
    act(() => window.history.back());
    await waitFor(() => expect(hook.result.current[0].toString()).toBe(''));
    act(() => window.history.forward());
    await waitFor(() => expect(hook.result.current[0].get('cursor')).toBe('next'));
    expect(hook.result.current[0].get('filter[x]')).toBe('yes');
});
