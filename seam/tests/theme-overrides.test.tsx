// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SchemaForm } from '../src/SchemaForm';
import { DISABLED_PRIMARY, FLUSH_FIELD } from '../src/theme-overrides';
import { createWidgetRegistry } from '../src/registry';

// Radix's select measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
} as unknown as typeof ResizeObserver;

afterEach(() => {
    cleanup();
});

const schema = {
    type: 'object',
    properties: {
        name: { type: 'string', title: 'Name' },
        notes: { type: 'string', title: 'Notes' },
        tier: { type: 'string', title: 'Tier', enum: ['free', 'team', 'paid', 'enterprise', 'custom'] },
    },
} as const;
const uiSchema = { notes: { 'ui:widget': 'textarea' } };

/**
 * beam VR pass 2: the theme's `p-0.5` field box set every input 2px right of its label and of Submit,
 * and its disabled Submit faded to dark-on-muted-green in dark. SchemaForm corrects both by default.
 */
describe('SchemaForm theme overrides', () => {
    it('cancels the horizontal field inset on text, textarea and select fields', () => {
        render(<SchemaForm schema={schema} uiSchema={uiSchema} registry={createWidgetRegistry()} />);

        for (const label of ['Name', 'Notes']) {
            const field = screen.getByLabelText(label);
            expect(field.closest('[data-seam-flush]')?.className).toBe(FLUSH_FIELD);
        }
        expect(document.querySelectorAll('[data-seam-flush]').length).toBe(3);
    });

    it('gives a disabled Submit the muted treatment instead of half opacity', () => {
        render(<SchemaForm schema={schema} disabled registry={createWidgetRegistry()} />);
        const submit = screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement;

        expect(submit.disabled).toBe(true);
        for (const cls of DISABLED_PRIMARY.split(' ')) expect(submit.className).toContain(cls);
        expect(submit.className).not.toContain('disabled:opacity-50');
    });

    it('keeps a caller submit className alongside the disabled treatment', () => {
        render(
            <SchemaForm
                schema={schema}
                uiSchema={{ 'ui:submitButtonOptions': { props: { className: 'w-full' } } }}
                registry={createWidgetRegistry()}
            />,
        );
        const submit = screen.getByRole('button', { name: 'Submit' });

        expect(submit.className).toContain('w-full');
        expect(submit.className).toContain('disabled:bg-muted');
    });
});
