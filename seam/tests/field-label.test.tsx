import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SchemaForm } from '../src';

/**
 * app-walkthrough APP-09b (APP-21; owner-36): a form field is labelled by displayLabel's property rule. A declared title
 * wins; with none, the humanized property name; never the raw property key ("name", "model", "parent_tenant_id").
 */
const labels = (container: HTMLElement) => [...container.querySelectorAll('label')].map((l) => l.textContent?.replace(/\*$/, '').trim()).filter(Boolean);

afterEach(cleanup);

// Radix's checkbox measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
} as unknown as typeof ResizeObserver;

describe('form field labels', () => {
    it('humanizes an untitled property and keeps a declared title', () => {
        const { container } = render(
            <SchemaForm
                schema={{ type: 'object', properties: { name: { type: 'string' }, parent_tenant_id: { type: 'string' }, model: { type: 'string', title: 'AI model' } } }}
            />,
        );
        expect(labels(container)).toEqual(expect.arrayContaining(['Name', 'Parent tenant', 'AI model']));
        expect(labels(container)).not.toContain('name');
        expect(labels(container)).not.toContain('parent_tenant_id');
    });

    it('lets a ui:title win', () => {
        const { container } = render(<SchemaForm schema={{ type: 'object', properties: { name: { type: 'string' } } }} uiSchema={{ name: { 'ui:title': 'Agent name' } }} />);
        expect(labels(container)).toContain('Agent name');
    });

    it('humanizes an untitled boolean, whose checkbox draws its own label', () => {
        const { container } = render(<SchemaForm schema={{ type: 'object', properties: { is_active: { type: 'boolean' }, notify: { type: 'boolean', title: 'Email me' } } }} />);
        const text = container.textContent ?? '';
        expect(text).toContain('Is active');
        expect(text).toContain('Email me');
        expect(text).not.toContain('is_active');
    });
});
