import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { displayLabel } from '../src/display-label';
import { SchemaForm } from '../src/SchemaForm';
import { createWidgetRegistry } from '../src/registry';

/**
 * app-walkthrough APP-09 (APP-21): a rendered label comes from declared display metadata. A schema `title` wins;
 * with none, a PROPERTY label is the humanized property name, and anything else renders nothing, never a class
 * short name, a backing value or a raw key.
 */
afterEach(cleanup);

describe('displayLabel', () => {
    it('prefers the declared title', () => {
        expect(displayLabel({ title: 'Parent workspace' }, 'parent_tenant_id', { property: true })).toBe('Parent workspace');
    });

    it('humanizes a property name when nothing is declared', () => {
        expect(displayLabel({}, 'parent_tenant_id', { property: true })).toBe('Parent tenant');
        expect(displayLabel(undefined, 'billingPeriodEnd', { property: true })).toBe('Billing period end');
        expect(displayLabel(null, 'status', { property: true })).toBe('Status');
    });

    it('renders nothing for an undeclared non-property label', () => {
        expect(displayLabel({}, 'tenant-users')).toBe('');
        expect(displayLabel(undefined, 'UxType')).toBe('');
    });
});

describe('the JSON widget label', () => {
    it('is the humanized property name when the schema declares no title', () => {
        const schema = { type: 'object', properties: { parent_tenant_id: { type: 'object' } } };
        const { getByLabelText } = render(<SchemaForm schema={schema} registry={createWidgetRegistry()} />);
        expect(getByLabelText('Parent tenant')).toBeTruthy();
    });
});
