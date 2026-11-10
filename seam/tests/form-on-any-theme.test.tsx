// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SchemaForm } from '../src/SchemaForm';
import { createWidgetRegistry } from '../src/registry';
import { RjsfThemeContext, shadcnTheme } from '../src';
import { FLUSH_FIELD } from '../src/theme-overrides';

afterEach(cleanup);

/**
 * frame-foundation 09 (ruling 04 slice 1): a schema form draws on any RJSF theme. Seam's theme-neutral label rule wraps
 * whichever theme is active, and a form with no theme draws exactly what it did: shadcn with seam's corrections.
 */
const schema = { type: 'object', properties: { parent_tenant_id: { type: 'string' } } } as const;

describe('a schema form on any theme', () => {
    it('with theme={{}} renders core’s input with a humanized label for an untitled key', () => {
        const { container } = render(<SchemaForm schema={schema} theme={{}} registry={createWidgetRegistry()} />);

        const input = screen.getByLabelText('Parent tenant') as HTMLInputElement;
        // RJSF core's own text input: a bare `form-control` input, not shadcn's.
        expect(input.className).toBe('form-control');
        expect(container.querySelector('[data-seam-flush]')).toBeNull();
        expect(screen.queryByText('parent_tenant_id')).toBeNull();
    });

    it('with no theme renders the shadcn markup the override tests assert', () => {
        render(<SchemaForm schema={schema} registry={createWidgetRegistry()} />);

        const input = screen.getByLabelText('Parent tenant');
        expect(input.className).not.toBe('form-control');
        expect(input.closest('[data-seam-flush]')?.className).toBe(FLUSH_FIELD);
    });

    it('takes the theme from RjsfThemeContext below the prop, and shadcnTheme is the default', () => {
        const core = {};
        render(
            <RjsfThemeContext.Provider value={core}>
                <SchemaForm schema={schema} registry={createWidgetRegistry()} />
            </RjsfThemeContext.Provider>,
        );
        expect((screen.getByLabelText('Parent tenant') as HTMLInputElement).className).toBe('form-control');
        cleanup();

        render(
            <RjsfThemeContext.Provider value={core}>
                <SchemaForm schema={schema} theme={shadcnTheme} registry={createWidgetRegistry()} />
            </RjsfThemeContext.Provider>,
        );
        expect(screen.getByLabelText('Parent tenant').closest('[data-seam-flush]')).not.toBeNull();
    });
});
