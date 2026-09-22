import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SchemaForm } from '../src/SchemaForm';
import { createWidgetRegistry } from '../src/registry';

const schema = {
    type: 'object',
    properties: { artifact: { type: 'object', title: 'Artifact' } },
    required: ['artifact'],
};
afterEach(cleanup);

describe('open JSON object field', () => {
    it('submits a typed object and blocks malformed and non-object drafts after a valid value', async () => {
        const onSubmit = vi.fn();
        const { getByLabelText, getByText, container } = render(
            <SchemaForm schema={schema} registry={createWidgetRegistry()} onSubmit={onSubmit} />,
        );
        const input = getByLabelText('Artifact');
        const form = container.querySelector('form')!;
        fireEvent.change(input, {
            target: {
                value: '{"$id":"local/1","properties":{"title":{"type":"string"}}}',
            },
        });
        fireEvent.submit(form);
        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
        expect(onSubmit.mock.calls[0][0].formData.artifact).toEqual({
            $id: 'local/1',
            properties: { title: { type: 'string' } },
        });
        for (const invalid of ['{broken', '[]', 'null', '42']) {
            fireEvent.change(input, { target: { value: invalid } });
            fireEvent.submit(form);
            expect(getByText('Enter a valid JSON object.')).toBeTruthy();
            expect(onSubmit).toHaveBeenCalledTimes(1);
        }
        fireEvent.change(input, { target: { value: '{"$id":"local/2"}' } });
        fireEvent.submit(form);
        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
        expect(onSubmit.mock.calls[1][0].formData.artifact).toEqual({
            $id: 'local/2',
        });
    });

    it.each(['disabled', 'readonly'] as const)('honors %s and external record changes', (mode) => {
        const { getByLabelText, rerender } = render(
            <SchemaForm
                schema={schema}
                formData={{ artifact: { value: 1 } }}
                {...{ [mode]: true }}
            />,
        );
        const input = getByLabelText('Artifact') as HTMLTextAreaElement;
        expect(mode === 'disabled' ? input.disabled : input.readOnly).toBe(true);
        rerender(
            <SchemaForm
                schema={schema}
                formData={{ artifact: { value: 2 } }}
                {...{ [mode]: true }}
            />,
        );
        expect(JSON.parse(input.value)).toEqual({ value: 2 });
    });

    it('preserves structured-object controls while supporting explicit JSON overrides', () => {
        const registry = createWidgetRegistry();
        expect(
            registry.resolveWidget({
                type: 'object',
                properties: { title: { type: 'string' } },
            }),
        ).toBeUndefined();
        expect(
            registry.resolveWidget({ type: 'object', additionalProperties: false }),
        ).toBeUndefined();
        expect(
            registry.resolveWidget({
                type: 'object',
                'x-widget': 'json',
                properties: { title: { type: 'string' } },
            }),
        ).toBeTypeOf('function');
    });
});

describe('controlled JSON draft validation', () => {
    it.each(['{broken', '[]', 'null', '42', '"text"'])(
        'announces an invalid initial draft without submitting it: %s',
        (draft) => {
            const onSubmit = vi.fn();
            const { getByLabelText, getByRole, container } = render(
                <SchemaForm schema={schema} formData={{ artifact: draft }} onSubmit={onSubmit} />,
            );
            const input = getByLabelText('Artifact');
            expect(input).toHaveProperty('value', draft);
            expect(input.getAttribute('aria-invalid')).toBe('true');
            const message = getByRole('alert');
            expect(message.textContent).toBe('Enter a valid JSON object.');
            expect(input.getAttribute('aria-describedby')).toBe(message.id);
            fireEvent.submit(container.querySelector('form')!);
            expect(onSubmit).not.toHaveBeenCalled();
        },
    );

    it('keeps text and accessible validation together across controlled replay and replacement', async () => {
        const onSubmit = vi.fn();
        const tree = (artifact: unknown) => (
            <SchemaForm schema={schema} formData={{ artifact }} onSubmit={onSubmit} />
        );
        const { getByLabelText, rerender, container } = render(tree({ version: 1 }));
        const input = getByLabelText('Artifact');
        fireEvent.change(input, { target: { value: '{local-invalid' } });
        expect(input.getAttribute('aria-invalid')).toBe('true');
        // The parent can replay a different invalid draft; it is still invalid data, not a reset.
        rerender(tree('{replayed-invalid'));
        expect(input).toHaveProperty('value', '{replayed-invalid');
        expect(input.getAttribute('aria-invalid')).toBe('true');
        const errorId = input.getAttribute('aria-describedby');
        expect(errorId).toBe('root_artifact-error');
        expect(document.getElementById(errorId!)?.textContent).toBe('Enter a valid JSON object.');
        fireEvent.submit(container.querySelector('form')!);
        expect(onSubmit).not.toHaveBeenCalled();
        rerender(tree({ version: 2 }));
        expect(input).toHaveProperty('value', JSON.stringify({ version: 2 }, null, 2));
        expect(input.getAttribute('aria-invalid')).toBe('false');
        expect(input.hasAttribute('aria-describedby')).toBe(false);
        expect(document.getElementById('root_artifact-error')).toBeNull();
        fireEvent.submit(container.querySelector('form')!);
        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
        expect(onSubmit.mock.calls[0][0].formData).toEqual({ artifact: { version: 2 } });
        rerender(tree('{replayed-invalid'));
        expect(input.getAttribute('aria-invalid')).toBe('true');
        fireEvent.submit(container.querySelector('form')!);
        expect(onSubmit).toHaveBeenCalledTimes(1);
        fireEvent.change(input, { target: { value: '{"version":3}' } });
        fireEvent.submit(container.querySelector('form')!);
        await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
        expect(onSubmit.mock.calls[1][0].formData).toEqual({ artifact: { version: 3 } });
    });
});
