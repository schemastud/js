import {
    QueryClient,
    QueryClientProvider,
    keepPreviousData,
} from '@tanstack/react-query';
import {
    act,
    cleanup,
    fireEvent,
    render,
    renderHook,
    screen,
    waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry, type SchemaNode } from '@schemastud/seam';
import { FrameProvider } from '../src/context';
import { useFormSchema } from '../src/data';
import { EditShell } from '../src/EditShell';
import { mockPrimitives } from '../src/story-harness';
import { createResourceTransport } from '../src/resourceTransport';
import type { FormMode, FrameInjection, FormBodySlotProps } from '../src/types';

afterEach(cleanup);
const write: SchemaNode = {
    type: 'object',
    properties: { title: { type: 'string' } },
};
const read: SchemaNode = {
    type: 'object',
    properties: {
        title: { type: 'string' },
        approvalState: { type: 'string' },
    },
};
function fixture() {
    const schema = vi.fn(
        async (_resource: string, _form: FormMode, purpose = 'write') =>
            purpose === 'read' ? read : write,
    );
    const transport = createResourceTransport(
        {
            list: async () => ({ data: [], total: 0, page: 1, perPage: 25 }),
            get: async (_r, id) => ({
                id,
                title: 'Request',
                approvalState: 'approved',
            }),
            getFormSchema: schema,
            create: async (_r, data) => Response.json(data).json(),
            save: vi.fn(async (_r, id) => ({ id })),
            remove: async () => undefined,
        },
        {
            resourceUrl: (r) => '/resources/' + r,
            read: async () => {
                throw Error('Unexpected filter read');
            },
        },
    );
    const client = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                staleTime: Infinity,
                placeholderData: keepPreviousData,
            },
        },
    });
    let current = transport;
    const injection = (): FrameInjection => ({
        transport: current,
        primitives: mockPrimitives,
        registry: createWidgetRegistry(),
        schemaFetcher: async () => ({}),
        useUrlState: () => [new URLSearchParams(), () => {}],
        can: () => false,
    });
    const Wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>
            <FrameProvider value={injection()}>{children}</FrameProvider>
        </QueryClientProvider>
    );
    return {
        transport,
        schema,
        client,
        Wrapper,
        replace: (next: typeof transport) => {
            current = next;
        },
    };
}
function Body({ schema, readOnly, formData }: FormBodySlotProps) {
    return (
        <>
            {Object.keys(schema.properties ?? {}).map((k) => (
                <input
                    key={k}
                    aria-label={k}
                    disabled={readOnly}
                    value={String(formData[k] ?? '')}
                    readOnly
                />
            ))}
        </>
    );
}

describe('declared schema purpose', () => {
    it('retains default write for a two-argument legacy adapter', async () => {
        const f = fixture();
        f.transport.getFormSchema = async (
            _resource: string,
            _form: FormMode,
        ) => write;
        const { result } = renderHook(() => useFormSchema('requests', 'bare'), {
            wrapper: f.Wrapper,
        });
        await waitFor(() => expect(result.current.data).toEqual(write));
    });
    it.each([
        ['write', 'read'],
        ['read', 'write'],
    ] as const)(
        'does not reuse warm %s schema for %s',
        async (first, second) => {
            const f = fixture();
            const { result, rerender } = renderHook(
                ({ purpose }) => useFormSchema('requests', 'bare', purpose),
                {
                    wrapper: f.Wrapper,
                    initialProps: { purpose: first as 'write' | 'read' },
                },
            );
            await waitFor(() =>
                expect(result.current.data).toEqual(
                    first === 'read' ? read : write,
                ),
            );
            rerender({ purpose: second });
            await waitFor(() =>
                expect(result.current.data).toEqual(
                    second === 'read' ? read : write,
                ),
            );
            expect(f.schema).toHaveBeenCalledTimes(2);
        },
    );
    it('keeps presentation and authority independent and suppresses placeholder schemas', async () => {
        const f = fixture();
        let release!: (value: SchemaNode) => void;
        const delayed = new Promise<SchemaNode>((resolve) => {
            release = resolve;
        });
        const { result, rerender } = renderHook(
            ({ form, purpose }) => useFormSchema('requests', form, purpose),
            {
                wrapper: f.Wrapper,
                initialProps: {
                    form: 'bare' as FormMode,
                    purpose: 'write' as 'read' | 'write',
                },
            },
        );
        await waitFor(() => expect(result.current.data).toEqual(write));
        f.schema.mockImplementationOnce(() => delayed);
        rerender({ form: 'bare', purpose: 'read' });
        expect(result.current.data).toBeUndefined();
        await act(async () => {
            release(read);
        });
        await waitFor(() => expect(result.current.data).toEqual(read));
        rerender({ form: 'enriched', purpose: 'read' });
        await waitFor(() => expect(f.schema).toHaveBeenCalledTimes(3));
        const other = fixture();
        f.replace(other.transport);
        rerender({ form: 'enriched', purpose: 'read' });
        expect(result.current.data).toBeUndefined();
        await waitFor(() =>
            expect(other.schema).toHaveBeenCalledWith(
                'requests',
                'enriched',
                'read',
            ),
        );
    });
    it('renders explicit read detail and retries failure without offering Save', async () => {
        const f = fixture();
        f.schema.mockRejectedValueOnce(Error('offline'));
        render(
            <EditShell
                resource="requests"
                id="1"
                readOnly
                schemaPurpose="read"
                container="bare"
                slots={{ FormBody: Body }}
            />,
            { wrapper: f.Wrapper },
        );
        await screen.findByRole('alert');
        expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
        const value = await screen.findByRole('textbox', {
            name: 'approvalState',
        });
        expect((value as HTMLInputElement).value).toBe('approved');
        expect((value as HTMLInputElement).disabled).toBe(true);
        expect(f.transport.save).not.toHaveBeenCalled();
    });
    it('keeps legacy actor-disabled editors and every create on write', async () => {
        const f = fixture();
        const view = render(
            <EditShell
                resource="requests"
                id="1"
                container="bare"
                slots={{ FormBody: Body }}
            />,
            { wrapper: f.Wrapper },
        );
        await screen.findByRole('textbox', { name: 'title' });
        expect(
            screen.queryByRole('textbox', { name: 'approvalState' }),
        ).toBeNull();
        expect((screen.getByRole('textbox') as HTMLInputElement).disabled).toBe(
            true,
        );
        view.rerender(
            <EditShell
                resource="requests"
                id={null}
                schemaPurpose="read"
                container="bare"
                slots={{ FormBody: Body }}
            />,
        );
        await waitFor(() =>
            expect(screen.getByRole('textbox', { name: 'title' })).toBeTruthy(),
        );
        expect(
            screen.queryByRole('textbox', { name: 'approvalState' }),
        ).toBeNull();
        expect(
            f.schema.mock.calls.every(
                ([, , purpose]) => purpose === undefined || purpose === 'write',
            ),
        ).toBe(true);
    });
});
