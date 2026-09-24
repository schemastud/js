// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SchemaForm } from '../src/SchemaForm';

afterEach(() => {
    cleanup();
});

// Radix's RadioGroup measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
} as unknown as typeof ResizeObserver;

/**
 * An enum rendered as radios must show the value it already holds. @rjsf/shadcn's RadioWidget encodes
 * each item's value by index ("0", "1", ...) but seeds Radix's RadioGroup with the raw value ("page")
 * as an uncontrolled `defaultValue`, so the two never match: editing an existing beam-ux-entry showed
 * no Type radio selected (ux-demo screenshot review 2026-09-24, G3-BEAM-FRAME-CONSOLE).
 */
const schema = {
    type: 'object',
    properties: {
        type: { type: 'string', title: 'Type', enum: ['page', 'component', 'theme'] },
    },
} as const;

const uiSchema = { type: { 'ui:widget': 'radio' } };

describe('enum radio value binding', () => {
    it('checks the option the form data already holds', () => {
        render(<SchemaForm schema={schema} uiSchema={uiSchema} formData={{ type: 'component' }} />);
        expect(screen.getByRole('radio', { name: 'component' }).getAttribute('aria-checked')).toBe('true');
        expect(screen.getByRole('radio', { name: 'page' }).getAttribute('aria-checked')).toBe('false');
    });

    it('follows form data that arrives after the first render', () => {
        const { rerender } = render(<SchemaForm schema={schema} uiSchema={uiSchema} formData={{}} />);
        rerender(<SchemaForm schema={schema} uiSchema={uiSchema} formData={{ type: 'theme' }} />);
        expect(screen.getByRole('radio', { name: 'theme' }).getAttribute('aria-checked')).toBe('true');
    });

    it('follows an outside change back to a value it once emitted', () => {
        const { rerender } = render(<SchemaForm schema={schema} uiSchema={uiSchema} formData={{}} />);
        fireEvent.click(screen.getByRole('radio', { name: 'page' }));
        rerender(<SchemaForm schema={schema} uiSchema={uiSchema} formData={{ type: 'page' }} />);
        rerender(<SchemaForm schema={schema} uiSchema={uiSchema} formData={{ type: 'component' }} />);
        rerender(<SchemaForm schema={schema} uiSchema={uiSchema} formData={{ type: 'page' }} />);
        expect(screen.getByRole('radio', { name: 'page' }).getAttribute('aria-checked')).toBe('true');
    });

    it('still reports the real enum value when a radio is chosen', () => {
        const onChange = vi.fn();
        render(<SchemaForm schema={schema} uiSchema={uiSchema} formData={{}} onChange={onChange} />);
        fireEvent.click(screen.getByRole('radio', { name: 'page' }));
        expect(onChange.mock.calls.at(-1)?.[0].formData).toEqual({ type: 'page' });
    });
});
