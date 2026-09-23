// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ComboboxWidget } from '../src/widgets/combobox';
import { SchemaForm } from '../src/SchemaForm';
import { createWidgetRegistry } from '../src/registry';

afterEach(() => {
    cleanup();
});

/**
 * A form widget must stay visible in a host that defines no `--stud-*` tokens. Only Storybook's
 * preview.css declares them; every Beam host themes with shadcn tokens instead. On 2026-09-23 the
 * ux-demo replay found the Frame console's Realm field (a combobox) rendering as a borderless,
 * transparent input: `border: 1px solid var(--stud-line-strong)` resolves to nothing without the
 * token. Each colour must chain host token -> `--stud-*` -> literal, as big-calendar's theme does.
 */
const BARE_STUD = /var\(--stud-[a-z-]+\)/;

describe('field widgets carry a token fallback chain', () => {
    it('combobox: no bare --stud-* colour', () => {
        const { container } = render(<ComboboxWidget id="realm" onChange={() => {}} />);
        const style = container.querySelector('input')!.getAttribute('style') ?? '';
        expect(style).toContain('var(--input');
        expect(style).not.toMatch(BARE_STUD);
    });

    it('json: no bare --stud-* colour', () => {
        const schema = { type: 'object', properties: { artifact: { type: 'object', title: 'Artifact' } } };
        const { getByLabelText } = render(<SchemaForm schema={schema} registry={createWidgetRegistry()} />);
        const style = getByLabelText('Artifact').getAttribute('style') ?? '';
        expect(style).toContain('var(--input');
        expect(style).not.toMatch(BARE_STUD);
    });
});
