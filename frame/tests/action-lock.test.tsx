import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { FrameProvider } from '../src/context';
import { ActionButton } from '../src/ResourceActions';
import type {
    ActionLock,
    FrameInjection,
    FrameNotice,
    FramePrimitives,
    FrameTransport,
    ResourceActionDefinition,
} from '../src/types';

afterEach(cleanup);

/**
 * A host's `actionLock` (agreements 06; Q-06b (a), frame-foundation 13:36Z): frame asks the host whether an action that
 * carries `requires` is locked, draws it locked before any request, and runs the host's `unlock()` before its own form
 * or confirmation. Frame knows nothing of what the lock is. With no injection, no `requires`, or a null answer, the
 * button is exactly today's.
 */

const PUBLISH: ResourceActionDefinition = {
    key: 'publish',
    label: 'Publish',
    scope: 'resource',
    method: 'POST',
    url: '/api/vaults/publish',
    input: null,
    result: 'toast',
    destructive: false,
};

const GATED: ResourceActionDefinition = { ...PUBLISH, requires: ['terms'] };

const primitives: FramePrimitives = {
    Button: ({ children, variant: _v, size: _s, ...p }: any) => <button {...p}>{children}</button>,
    Input: (p: any) => <input {...p} />,
    Label: ({ children, ...p }: any) => <label {...p}>{children}</label>,
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverTrigger: ({ children }: any) => <>{children}</>,
    PopoverContent: ({ children }: any) => <div>{children}</div>,
    SimpleSelect: (p: any) => <select {...p} />,
    Badge: ({ children }: any) => <span>{children}</span>,
    Skeleton: () => <div />,
    SidePanel: ({ children }: any) => <div>{children}</div>,
};

function makeTransport(): FrameTransport {
    return {
        getFilterSchema: vi.fn(async () => ({ properties: {} })),
        getFilterVariants: vi.fn(async (resource) => ({ resource, variants: [] })),
        getFilterOptions: vi.fn(async () => []),
        getSavedFilters: vi.fn(async () => []),
        saveFilter: vi.fn(async () => ({}) as never),
        deleteSavedFilter: vi.fn(async () => undefined),
        list: vi.fn(async () => ({ data: [], total: 0, page: 1, perPage: 25 })),
        get: vi.fn(async (_r, id) => ({ id })),
        getFormSchema: vi.fn(async () => ({ type: 'object', properties: {} })),
        create: vi.fn(async () => ({}) as never),
        save: vi.fn(async (_r, id) => ({ id })),
        remove: vi.fn(async () => undefined),
        invoke: vi.fn(async () => ({ message: 'Published.', data: null })),
        getActionSchema: vi.fn(async () => ({ type: 'object', properties: {} })),
    };
}

function Harness({
    children,
    transport,
    actionLock,
    notify,
}: {
    children: ReactNode;
    transport: FrameTransport;
    actionLock?: FrameInjection['actionLock'];
    notify?: (notice: FrameNotice) => void;
}) {
    const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    const [params, setParams] = useState(new URLSearchParams());
    const [registry] = useState(() => createWidgetRegistry());
    const injection: FrameInjection = {
        transport,
        primitives,
        useUrlState: () => [params, (updater) => setParams((prev) => updater(prev))] as const,
        registry,
        schemaFetcher: async () => ({ type: 'object', properties: {} }),
        can: () => true,
        ...(notify ? { notify } : {}),
        ...(actionLock ? { actionLock } : {}),
    };
    return (
        <QueryClientProvider client={client}>
            <FrameProvider value={injection}>{children}</FrameProvider>
        </QueryClientProvider>
    );
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

function markup(action: ResourceActionDefinition, actionLock?: FrameInjection['actionLock']): string {
    const { container, unmount } = render(
        <Harness transport={makeTransport()} actionLock={actionLock}>
            <ActionButton resource="vaults" action={action} />
        </Harness>,
    );
    const html = container.innerHTML;
    unmount();
    return html;
}

describe('a host action lock', () => {
    it('leaves the button exactly as today with no injection, no requires, or a null answer', () => {
        const today = markup(PUBLISH);
        const lock = vi.fn((): ActionLock | null => ({ label: 'Locked', unlock: async () => true }));

        expect(markup(GATED)).toBe(today);
        expect(markup(PUBLISH, lock)).toBe(today);
        expect(lock).not.toHaveBeenCalled();
        expect(markup(GATED, () => null)).toBe(today);
    });

    it('draws a locked action with its reason exposed, reachable by keyboard', async () => {
        const lock = vi.fn((): ActionLock => ({ label: 'Accept the terms first', unlock: async () => false }));
        render(
            <Harness transport={makeTransport()} actionLock={lock}>
                <ActionButton resource="vaults" action={GATED} />
            </Harness>,
        );

        const button = screen.getByRole('button', { name: /Publish/ });
        expect(lock).toHaveBeenCalledWith('vaults', GATED, undefined);
        expect(button.hasAttribute('data-frame-action-locked')).toBe(true);
        expect(button.getAttribute('aria-describedby')).toBeTruthy();
        expect(document.getElementById(button.getAttribute('aria-describedby')!)?.textContent).toBe('Accept the terms first');
        expect((button as HTMLButtonElement).disabled).toBe(false);
        button.focus();
        expect(document.activeElement).toBe(button);
    });

    it('sends nothing before unlock() resolves true, nothing on false, then runs the normal confirmation', async () => {
        const transport = makeTransport();
        let pending = deferred<boolean>();
        const unlock = vi.fn(() => pending.promise);
        render(
            <Harness transport={transport} actionLock={() => ({ label: 'Accept the terms first', unlock })}>
                <ActionButton resource="vaults" action={GATED} />
            </Harness>,
        );

        fireEvent.click(screen.getByRole('button', { name: /Publish/ }));
        expect(unlock).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(transport.invoke).not.toHaveBeenCalled();
        expect(transport.getActionSchema).not.toHaveBeenCalled();

        await act(async () => pending.resolve(false));
        expect(screen.queryByRole('dialog')).toBeNull();
        expect(transport.invoke).not.toHaveBeenCalled();

        pending = deferred<boolean>();
        fireEvent.click(screen.getByRole('button', { name: /Publish/ }));
        expect(screen.queryByRole('dialog')).toBeNull();
        await act(async () => pending.resolve(true));

        const dialog = await screen.findByRole('dialog', { name: 'Publish' });
        expect(transport.invoke).not.toHaveBeenCalled();
        fireEvent.click(
            Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent === 'Publish') as HTMLButtonElement,
        );
        await waitFor(() => expect(transport.invoke).toHaveBeenCalledTimes(1));
    });

    it('keeps the action locked, sends nothing and surfaces an error when unlock() rejects or throws', async () => {
        for (const unlock of [
            vi.fn(async (): Promise<boolean> => {
                throw new Error('The agreement could not be loaded.');
            }),
            vi.fn((): Promise<boolean> => {
                throw new Error('The agreement could not be loaded.');
            }),
        ]) {
            const transport = makeTransport();
            const notify = vi.fn();
            const { unmount } = render(
                <Harness transport={transport} notify={notify} actionLock={() => ({ label: 'Accept the terms first', unlock })}>
                    <ActionButton resource="vaults" action={GATED} />
                </Harness>,
            );

            fireEvent.click(screen.getByRole('button', { name: /Publish/ }));
            await waitFor(() =>
                expect(notify).toHaveBeenCalledWith({ tone: 'error', message: 'The agreement could not be loaded.' }),
            );
            expect(screen.queryByRole('dialog')).toBeNull();
            expect(transport.invoke).not.toHaveBeenCalled();
            expect(screen.getByRole('button', { name: /Publish/ }).hasAttribute('data-frame-action-locked')).toBe(true);
            unmount();
        }
    });
});
