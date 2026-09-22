import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { useEffect, type ComponentType } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWidgetRegistry } from '@schemastud/seam';
import { FrameProvider } from '../src/context';
import { EditShell } from '../src/EditShell';
import { ShadcnSaveBar } from '../src/shadcn/edit-slots';
import { mockPrimitives, createMockTransport } from '../src/story-harness';
import { DefaultFormBody } from '../src/slots/defaults';
import type { FormBodySlotProps, FrameInjection } from '../src/types';
import schema from './fixtures/beam-schema-input.json';

// Captured 2026-09-22 from rushing/stephenrushing's booted FrameResourceController::schema
// for resource schemas, using the configured generator and BeamSchemaInputData declaration.
// This is the server wire specimen that exposed the SaveBar validation bypass.
afterEach(cleanup);

function mount(
    form: 'bare' | 'enriched',
    shadcn: boolean,
    body?: ComponentType<FormBodySlotProps>,
) {
    const transport = createMockTransport({ formSchema: { schemas: schema } });
    const save = vi.fn(async (_resource, data) => Response.json({ id: 'new-schema', ...data }).json());
    const injection: FrameInjection = {
        transport: { ...transport, create: save },
        primitives: mockPrimitives,
        registry: createWidgetRegistry(),
        schemaFetcher: async () => schema,
        can: () => true,
        useUrlState: () => [new URLSearchParams(), () => {}] as const,
    };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const tree = (FormBody?: ComponentType<FormBodySlotProps>) => (
        <QueryClientProvider client={client}>
            <FrameProvider value={injection}>
                <EditShell
                    resource="schemas"
                    id={null}
                    container="page"
                    form={form}
                    slots={{
                        ...(shadcn ? { SaveBar: ShadcnSaveBar } : {}),
                        ...(FormBody ? { FormBody } : {}),
                    }}
                />
            </FrameProvider>
        </QueryClientProvider>
    );
    const result = render(tree(body));
    return {
        save,
        ...result,
        replaceBody: (next?: ComponentType<FormBodySlotProps>) => result.rerender(tree(next)),
    };
}

const UnregisteredBody = () => <div>Custom form not ready</div>;

describe('EditShell validated Save request', () => {
    it.each([
        ['bare', false],
        ['enriched', false],
        ['bare', true],
        ['enriched', true],
    ] as const)(
        'validates the actual served artifact schema in %s mode (shadcn=%s)',
        async (form, shadcn) => {
            const { save, findByLabelText, getByRole } = mount(form, shadcn);
            const input = await findByLabelText('artifact');
            fireEvent.change(input, { target: { value: '{broken' } });
            fireEvent.click(getByRole('button', { name: 'Save' }));
            await waitFor(() => expect(input.getAttribute('aria-invalid')).toBe('true'));
            expect(save).not.toHaveBeenCalled();
            const artifact = { $id: 'https://example.test/schema/1', type: 'object' };
            fireEvent.change(input, { target: { value: JSON.stringify(artifact) } });
            fireEvent.click(getByRole('button', { name: 'Save' }));
            await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
            expect(save).toHaveBeenLastCalledWith('schemas', { artifact });
            fireEvent.change(input, { target: { value: '{invalid-after-valid' } });
            fireEvent.click(getByRole('button', { name: 'Save' }));
            await waitFor(() => expect(input.getAttribute('aria-invalid')).toBe('true'));
            expect(save).toHaveBeenCalledTimes(1);
        },
    );

    it('does not save an unregistered custom form draft', async () => {
        const { save, findByRole } = mount('bare', false, UnregisteredBody);
        const button = await findByRole('button', { name: 'Save' });
        expect((button as HTMLButtonElement).disabled).toBe(true);
        fireEvent.click(button);
        expect(save).not.toHaveBeenCalled();
    });

    it('commits pending widget data before requesting validation and saving', async () => {
        const artifact = { $id: 'https://example.test/pending/1', type: 'object' };
        function PendingBody(props: FormBodySlotProps) {
            useEffect(
                () => props.intentBus.registerFlush(() => props.onChange({ artifact })),
                [props.intentBus, props.onChange],
            );
            return <DefaultFormBody {...props} />;
        }
        const { save, findByLabelText, getByRole } = mount('bare', false, PendingBody);
        await findByLabelText('artifact');
        fireEvent.click(getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save).toHaveBeenLastCalledWith('schemas', { artifact });
    });

    it('submits a custom form latest buffered draft through its registered validation handler', async () => {
        const artifact = { $id: 'https://example.test/custom-pending/1' };
        function BufferedBody({
            formData,
            onChange,
            onSubmit,
            registerSubmit,
            intentBus,
        }: FormBodySlotProps) {
            useEffect(() => {
                registerSubmit(() => onSubmit(formData));
                return () => registerSubmit(null);
            }, [formData, onSubmit, registerSubmit]);
            useEffect(
                () => intentBus.registerFlush(() => onChange({ artifact })),
                [intentBus, onChange],
            );
            return <div>Buffered custom form</div>;
        }
        const { save, findByRole } = mount('bare', false, BufferedBody);
        fireEvent.click(await findByRole('button', { name: 'Save' }));
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save).toHaveBeenLastCalledWith('schemas', { artifact });
    });

    it('clears submission registration when the mounted form changes', async () => {
        const { save, findByLabelText, getByRole, replaceBody } = mount('bare', false);
        await findByLabelText('artifact');
        await waitFor(() =>
            expect((getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(
                false,
            ),
        );
        replaceBody(UnregisteredBody);
        expect((getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true);
        fireEvent.click(getByRole('button', { name: 'Save' }));
        expect(save).not.toHaveBeenCalled();
        replaceBody();
        await findByLabelText('artifact');
        await waitFor(() =>
            expect((getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(
                false,
            ),
        );
    });

    it('announces a rejected save, preserves its draft and clears the error on corrected success', async () => {
        const { save, findByLabelText, getByRole, findByRole, queryByRole } = mount('bare', true);
        save.mockRejectedValueOnce(new Error('This schema version already exists.'));
        const input = (await findByLabelText('artifact')) as HTMLTextAreaElement;
        const draft = { $id: 'https://example.test/retry/1', type: 'object' };
        fireEvent.change(input, { target: { value: JSON.stringify(draft) } });
        fireEvent.click(getByRole('button', { name: 'Save' }));
        expect((await findByRole('alert')).textContent).toContain(
            'This schema version already exists.',
        );
        expect(JSON.parse(input.value)).toEqual(draft);
        const corrected = { ...draft, $id: 'https://example.test/retry/2' };
        fireEvent.change(input, { target: { value: JSON.stringify(corrected) } });
        fireEvent.click(getByRole('button', { name: 'Save' }));
        await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(queryByRole('alert')).toBeNull());
        expect(save).toHaveBeenLastCalledWith('schemas', { artifact: corrected });
        expect(JSON.parse(input.value)).toEqual(corrected);
    });

    it('uses the same validation for the native form submit path', async () => {
        const { save, findByLabelText, container } = mount('bare', false);
        const input = await findByLabelText('artifact');
        fireEvent.change(input, { target: { value: '{broken' } });
        fireEvent.submit(container.querySelector('form')!);
        expect(save).not.toHaveBeenCalled();
        const artifact = { $id: 'https://example.test/native/1' };
        fireEvent.change(input, { target: { value: JSON.stringify(artifact) } });
        fireEvent.submit(container.querySelector('form')!);
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save).toHaveBeenLastCalledWith('schemas', { artifact });
    });
});
