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
