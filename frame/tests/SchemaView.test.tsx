import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createWidgetRegistry, type SchemaNode } from '@schemastud/seam';
import { SchemaView } from '../src/SchemaView';
import type { ContextManifest } from '../src/contexts';

afterEach(cleanup);

/**
 * SchemaView smoke — a participating registered widget mounts read-only; a
 * non-participating field falls to the read-only scalar default.
 */
const EmailBadge = ({ value }: any) => <span data-testid="email-widget">{String(value)}</span>;

const schema: SchemaNode = {
    type: 'object',
    properties: {
        email: { type: 'string' },
        name: { type: 'string' },
    },
};

const record = { email: 'a@b.co', name: 'Ada' };

const manifest: ContextManifest = {
    byNode: {
        email: { detail: { participates: true, widget: 'email-badge' } },
        name: { detail: { participates: false } },
    },
    inherits: {},
    known: ['detail'],
};

describe('SchemaView (detail)', () => {
    it('mounts a participating registered widget and defaults a non-participating field', () => {
        const registry = createWidgetRegistry();
        registry.registerWidget('email-badge', EmailBadge);

        render(<SchemaView schema={schema} record={record} manifest={manifest} context="detail" registry={registry} />);

        // Participating + bound → the resolved widget renders read-only.
        expect(screen.getByTestId('email-widget').textContent).toBe('a@b.co');
        // Non-participating → read-only scalar default carries the value.
        expect(screen.getByText('Ada')).toBeTruthy();
    });
});
